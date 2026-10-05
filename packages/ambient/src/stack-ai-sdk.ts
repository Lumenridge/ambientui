import {
  answerEventsFromSSE,
  type AmbientConversationTurn,
} from "./responder"
import type {
  AmbientAnswerEvent,
  AmbientQuestion,
  AmbientResponse,
} from "./responder-schemas"
import {
  answerFromParts,
  cachedTurns,
  createPartsReader,
  createPushQueue,
  createWaitingRoom,
  openCalls,
  unfinishedCalls,
  waitForPerson,
  type AmbientStack,
  type StackOptions,
  type StackPart,
  type StackToolPart,
} from "./stack-parts"

/**
 * THE VERCEL AI SDK, UNDER THE AMBIENT LAYER.
 *
 * Two ways in, for the two ways a product uses the SDK:
 *
 * `aiSdkRoute` — the product has a chat route
 * (`streamText(…).toUIMessageStreamResponse()`) and the layer is its only
 * chat UI. The layer posts the conversation to the route and reads the UI
 * message stream back. Tools the browser runs, tools that wait for the
 * person and tools that need approval all continue the same answer.
 *
 *   const api = createAmbientApi(aiSdkRoute({ api: "/api/chat" }))
 *
 * `aiSdkChat` — the product keeps a `Chat` (the object behind `useChat`)
 * and other parts of it read that chat too. The layer asks through it, so
 * its `onToolCall`, its transport and its messages stay the product's, and
 * the layer follows every message in it.
 *
 *   const chat = new Chat({ transport })           // shared with useChat({ chat })
 *   const api = createAmbientApi(aiSdkChat(() => chat))
 *
 * The page context travels in the request body as `ambient` (the page chip,
 * the chips, the locale), beside `messages`.
 *
 * Nothing here imports `ai`: the wire format is server-sent events of JSON
 * chunks, and the shapes below are the parts of it this file reads. A chunk
 * or part type it does not know is kept and passed back untouched, so a
 * newer SDK adds parts without breaking the answer.
 */

/** A UI message part, as far as this file reads it. */
export type UIPartLike = { type: string; [key: string]: unknown }

/** A UI message as the AI SDK's chat route expects it. */
export type UIMessageLike = {
  id: string
  role: "system" | "user" | "assistant"
  parts: UIPartLike[]
}

/** The conversation so far, then the question, as UI messages. */
export function toUIMessages(input: AmbientQuestion): UIMessageLike[] {
  const turns = [
    ...input.history,
    { role: "user" as const, text: input.question },
  ]
  return turns.map((turn, index) => ({
    id: `${input.conversationId}-${index}`,
    role: turn.role,
    parts: [{ type: "text", text: turn.text }],
  }))
}

const ambientOf = (input: AmbientQuestion) => ({
  pageChip: input.pageChip,
  chips: input.chips,
  locale: input.locale,
})

const str = (value: unknown) => (typeof value === "string" ? value : undefined)

/* ------------------------- UI message → the parts ------------------------ */

type Approval = { id: string; approved?: boolean; requestReason?: string; reason?: string }

/**
 * A UI message's parts in the terms every stack shares. `idle` is whether
 * the stream has stopped: a call with input and no output is running while
 * the stream is live, and afterwards is whatever `clientCall` says the
 * browser will do about it.
 */
export function uiMessageParts(
  parts: readonly UIPartLike[],
  idle: boolean,
  clientCall: (name: string) => StackToolPart["state"] = () => "waiting"
): StackPart[] {
  return parts.flatMap((part): StackPart[] => {
    if (part.type === "text") return [{ type: "text", text: String(part.text ?? "") }]
    if (part.type === "reasoning")
      return [
        {
          type: "reasoning",
          text: String(part.text ?? ""),
          done: part.state === "done",
        },
      ]
    if (part.type === "source-url" || part.type === "source-document")
      return [{ type: "source", url: str(part.url), title: str(part.title) }]
    if (part.type.startsWith("data-"))
      return [{ type: "data", name: part.type.slice(5), data: part.data }]
    const name =
      part.type === "dynamic-tool"
        ? str(part.toolName)
        : part.type.startsWith("tool-")
          ? part.type.slice(5)
          : undefined
    if (!name || part.state === "input-streaming") return []
    const approval = part.approval as Approval | undefined
    const call = {
      type: "tool" as const,
      id: String(part.toolCallId),
      name,
      title: str(part.title),
      input: part.input,
      approval: approval && {
        id: approval.id,
        reason: approval.requestReason,
        approved: approval.approved,
      },
    }
    switch (part.state) {
      case "approval-requested":
        return [{ ...call, state: "approval" }]
      case "approval-responded":
        return [{ ...call, state: approval?.approved ? "running" : "denied" }]
      case "output-available":
        return [
          part.preliminary
            ? { ...call, state: "running" }
            : { ...call, state: "done", output: part.output },
        ]
      case "output-error":
        return [{ ...call, state: "failed", error: String(part.errorText) }]
      case "output-denied":
        return [{ ...call, state: "denied", error: approval?.reason }]
      default:
        return [
          {
            ...call,
            state: idle && !part.providerExecuted ? clientCall(name) : "running",
          },
        ]
    }
  })
}

const toolNameOf = (part: UIPartLike) =>
  part.type === "dynamic-tool" ? String(part.toolName) : part.type.slice(5)

const textOf = (message: UIMessageLike) =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => String(part.text ?? ""))
    .join("\n\n")

/* --------------------------- chunks → UI message ------------------------- */

type Chunk = { type: string; [key: string]: unknown }

const isChunk = (value: unknown): value is Chunk =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Chunk).type === "string"

/**
 * THE ASSISTANT MESSAGE A STREAM IS WRITING, assembled from its chunks the
 * way the SDK's own client does. It is kept whole (provider metadata, step
 * boundaries) because it is posted back when the answer continues: after a
 * tool the browser ran, or an approval.
 */
export function createUIMessageBuilder(id: string) {
  const message: UIMessageLike = { id, role: "assistant", parts: [] }
  const open = new Map<string, UIPartLike>()
  const tools = new Map<string, UIPartLike>()
  const tool = (chunk: Chunk) => {
    const callId = String(chunk.toolCallId)
    let part = tools.get(callId)
    if (!part) {
      part = chunk.dynamic
        ? { type: "dynamic-tool", toolName: chunk.toolName, toolCallId: callId }
        : { type: `tool-${String(chunk.toolName)}`, toolCallId: callId }
      tools.set(callId, part)
      message.parts.push(part)
    }
    return part
  }
  const byApproval = (approvalId: string) =>
    [...tools.values()].find(
      (part) => (part.approval as Approval | undefined)?.id === approvalId
    )

  return {
    message,
    /** Fold one chunk in. */
    apply(chunk: Chunk) {
      const meta = chunk.providerMetadata
      switch (chunk.type) {
        case "start":
          if (typeof chunk.messageId === "string") message.id = chunk.messageId
          break
        case "start-step":
          message.parts.push({ type: "step-start" })
          break
        case "text-start":
        case "reasoning-start": {
          const part: UIPartLike = {
            type: chunk.type === "text-start" ? "text" : "reasoning",
            text: "",
            state: "streaming",
            ...(meta ? { providerMetadata: meta } : {}),
          }
          open.set(`${part.type}:${String(chunk.id)}`, part)
          message.parts.push(part)
          break
        }
        case "text-delta":
        case "reasoning-delta":
        case "text-end":
        case "reasoning-end": {
          const kind = chunk.type.startsWith("text") ? "text" : "reasoning"
          const part = open.get(`${kind}:${String(chunk.id)}`)
          if (!part) break
          if (chunk.type.endsWith("delta")) part.text = String(part.text) + String(chunk.delta ?? "")
          else part.state = "done"
          if (meta) part.providerMetadata = meta
          break
        }
        case "tool-input-start":
        case "tool-input-available":
        case "tool-input-error": {
          const part = tool(chunk)
          if (chunk.title !== undefined) part.title = chunk.title
          if (chunk.providerExecuted !== undefined) part.providerExecuted = chunk.providerExecuted
          if (meta) part.callProviderMetadata = meta
          if (chunk.type === "tool-input-start") {
            part.state = "input-streaming"
          } else if (chunk.type === "tool-input-available") {
            part.state = "input-available"
            part.input = chunk.input
          } else {
            part.state = "output-error"
            part.input = chunk.input
            part.errorText = chunk.errorText
          }
          break
        }
        case "tool-approval-request": {
          const part = tool(chunk)
          part.state = "approval-requested"
          part.approval = {
            id: chunk.approvalId,
            requestReason: chunk.reason,
            descriptor: chunk.approvalDescriptor,
            inputSchemaInput: chunk.inputSchemaInput,
            isAutomatic: chunk.isAutomatic,
            signature: chunk.signature,
          }
          break
        }
        case "tool-output-available":
        case "tool-output-error":
        case "tool-output-denied": {
          const part = tools.get(String(chunk.toolCallId))
          if (!part) break
          if (meta) part.resultProviderMetadata = meta
          if (chunk.type === "tool-output-available") {
            part.state = "output-available"
            part.output = chunk.output
            part.preliminary = chunk.preliminary
          } else if (chunk.type === "tool-output-error") {
            part.state = "output-error"
            part.errorText = chunk.errorText
          } else part.state = "output-denied"
          break
        }
        case "source-url":
        case "source-document":
          message.parts.push({ ...chunk })
          break
        default:
          if (chunk.type.startsWith("data-") && !chunk.transient)
            message.parts.push({ type: chunk.type, data: chunk.data })
      }
    },
    /** The browser's answer to a call the stream left open. */
    setOutput(callId: string, output: unknown, errorText?: string) {
      const part = tools.get(callId)
      if (!part) return
      if (errorText === undefined) {
        part.state = "output-available"
        part.output = output
      } else {
        part.state = "output-error"
        part.errorText = errorText
      }
    },
    setApproval(approvalId: string, approved: boolean, reason?: string) {
      const part = byApproval(approvalId)
      if (!part) return
      part.state = "approval-responded"
      part.approval = { ...(part.approval as Approval), approved, reason }
    },
    /** Calls with input and no output that the server did not run. */
    clientCalls: () =>
      [...tools.values()].filter(
        (part) => part.state === "input-available" && !part.providerExecuted
      ),
  }
}

export { waitForPerson }

/* -------------------------------- the route ------------------------------ */

export type AiSdkRouteOptions = StackOptions & {
  /** The chat route: `/api/chat`. */
  api: string
  /** The product's own fetch, when it wraps auth or a base path. */
  fetch?: typeof fetch
  headers?: Record<string, string>
  /** Extra fields for the request body, beside `messages` and `ambient`. */
  body?: Record<string, unknown>
  /**
   * The tools the BROWSER runs (declared on the server with no `execute`).
   * A function runs and its return value is the call's output; a tool the
   * person has to answer (a form, a picker) is `waitForPerson`, and the
   * component drawn for it calls `respond`. A tool not listed here ends
   * the answer with the call shown and no result.
   */
  tools?: Record<
    string,
    ((input: unknown) => unknown | Promise<unknown>) | typeof waitForPerson
  >
  /** How many times one answer may continue after tools. Default 8. */
  maxRounds?: number
}

/** The layer on an AI SDK chat route. */
export function aiSdkRoute(options: AiSdkRouteOptions): AmbientStack {
  const send = options.fetch ?? fetch
  const room = createWaitingRoom<AmbientResponse>()
  const clientCall = (name: string): StackToolPart["state"] => {
    const tool = options.tools?.[name]
    return tool === waitForPerson ? "waiting" : tool ? "running" : "done"
  }

  async function* ask(
    input: AmbientQuestion,
    { signal }: { signal: AbortSignal }
  ): AsyncGenerator<AmbientAnswerEvent> {
    const base = toUIMessages(input)
    const builder = createUIMessageBuilder(`${input.conversationId}-${base.length}`)
    const read = createPartsReader(options)
    const parts = (idle: boolean) => uiMessageParts(builder.message.parts, idle, clientCall)

    for (let round = 0; round < (options.maxRounds ?? 8); round++) {
      const response = await send(options.api, {
        method: "POST",
        headers: { "content-type": "application/json", ...options.headers },
        body: JSON.stringify({
          ...options.body,
          id: input.conversationId,
          messages: round ? [...base, builder.message] : base,
          trigger: "submit-message",
          ...(round ? { messageId: builder.message.id } : {}),
          ambient: ambientOf(input),
        }),
        signal,
      })
      for await (const chunk of answerEventsFromSSE(response)) {
        if (!isChunk(chunk)) continue
        if (chunk.type === "error") {
          yield { type: "error", message: String(chunk.errorText) }
          return
        }
        if (chunk.type === "abort") return
        builder.apply(chunk)
        yield* read(parts(false), false)
      }

      // what the stream left for the browser: tools to run, and questions
      // only the person can answer
      const calls = builder.clientCalls()
      const open = openCalls(parts(true))
      if (!open.length && !calls.some((call) => clientCall(toolNameOf(call)) === "running"))
        break
      await Promise.all(
        calls.map(async (call) => {
          const tool = options.tools?.[toolNameOf(call)]
          if (typeof tool !== "function") return
          try {
            builder.setOutput(String(call.toolCallId), await tool(call.input))
          } catch (error) {
            builder.setOutput(
              String(call.toolCallId),
              undefined,
              error instanceof Error ? error.message : String(error)
            )
          }
        })
      )
      // what the browser ran is done before the person is asked anything
      yield* read(parts(true), false)
      const answers = await Promise.all(
        open.map((call) => room.wait(call.id, signal))
      )
      if (signal.aborted) return
      for (const answer of answers) {
        if (!answer) continue
        if ("approved" in answer) {
          const approval = open.find((call) => call.id === answer.id)?.approval
          if (approval) builder.setApproval(approval.id, answer.approved, answer.reason)
        }
        else builder.setOutput(answer.id, answer.output)
      }
      yield* read(parts(false), false)
    }
    yield* read(parts(true), true)
  }

  return {
    ask,
    respond: room.answer,
  }
}

/** A UI message stream response → answer events, for a host's own `ask`. */
export async function* answerEventsFromUIMessageStream(
  response: Response,
  options: StackOptions = {}
): AsyncGenerator<AmbientAnswerEvent> {
  const builder = createUIMessageBuilder("answer")
  const read = createPartsReader(options)
  for await (const chunk of answerEventsFromSSE(response)) {
    if (!isChunk(chunk)) continue
    if (chunk.type === "error") {
      yield { type: "error", message: String(chunk.errorText) }
      return
    }
    if (chunk.type === "abort") return
    builder.apply(chunk)
    yield* read(uiMessageParts(builder.message.parts, false), false)
  }
  yield* read(uiMessageParts(builder.message.parts, true, () => "done"), true)
}

/* -------------------------------- the chat ------------------------------- */

/**
 * The slice of the AI SDK's `Chat` the layer uses. The `Chat` class from
 * `@ai-sdk/react` fits; the object `useChat` returns does not, because it
 * cannot be subscribed to from outside a component. Share one instance:
 * `useChat({ chat })`.
 */
export type AiSdkChat = {
  messages: UIMessageLike[]
  readonly status: string
  readonly error: Error | undefined
  sendMessage(
    message?: { text: string },
    options?: { body?: object }
  ): Promise<void>
  regenerate(options?: { messageId?: string; body?: object }): Promise<void>
  stop(): Promise<void>
  addToolOutput(output: {
    tool: string
    toolCallId: string
    output: unknown
  }): void | PromiseLike<void>
  addToolApprovalResponse(response: {
    id: string
    approved: boolean
    reason?: string
  }): void | PromiseLike<void>
  "~registerMessagesCallback"(onChange: () => void): () => void
  "~registerStatusCallback"(onChange: () => void): () => void
}

const busy = (chat: AiSdkChat) =>
  chat.status === "submitted" || chat.status === "streaming"

/**
 * The message stopped on tool calls that now all have their outcome: the
 * model has not seen them yet, so the answer is not over. (When the server
 * ran the tools it also took the next step, and the message ends on that.)
 */
function owesContinuation(message: UIMessageLike | undefined) {
  if (message?.role !== "assistant") return false
  const step = message.parts.slice(
    message.parts.map((p) => p.type).lastIndexOf("step-start") + 1
  )
  const calls = step.filter(
    (p) =>
      (p.type === "dynamic-tool" || p.type.startsWith("tool-")) &&
      !p.providerExecuted
  )
  return (
    calls.length > 0 &&
    calls.every(
      (p) =>
        (p.state === "output-available" && !p.preliminary) ||
        p.state === "output-error" ||
        p.state === "output-denied" ||
        p.state === "approval-responded"
    )
  )
}

/**
 * Continue a chat that owes one. A chat set up to continue by itself
 * (`sendAutomaticallyWhen`) has started by the time this looks; one that
 * is not is resubmitted here.
 */
const looking = new WeakSet<AiSdkChat>()
function continueWhenStalled(getChat: () => AiSdkChat) {
  const chat = getChat()
  // one look at a time, so two callers never both resubmit
  if (looking.has(chat)) return
  looking.add(chat)
  setTimeout(() => {
    looking.delete(chat)
    if (!busy(chat) && owesContinuation(chat.messages[chat.messages.length - 1]))
      void chat.sendMessage()
  }, 60)
}

/** The layer on the product's own AI SDK `Chat`. */
export function aiSdkChat(
  getChat: () => AiSdkChat,
  options: StackOptions = {}
): AmbientStack {
  const subscribe = (chat: AiSdkChat, listener: () => void) => {
    const offMessages = chat["~registerMessagesCallback"](listener)
    const offStatus = chat["~registerStatusCallback"](listener)
    return () => {
      offMessages()
      offStatus()
    }
  }
  /** The assistant message that answers `question`, when it is an earlier one. */
  const answerTo = (chat: AiSdkChat, question: string) => {
    const messages = chat.messages
    for (let i = messages.length - 1; i > 0; i--)
      if (
        messages[i]!.role === "assistant" &&
        messages[i - 1]!.role === "user" &&
        textOf(messages[i - 1]!) === question
      )
        return messages[i]!
  }

  const turns = cachedTurns((): AmbientConversationTurn[] => {
    const chat = getChat()
    const running = busy(chat)
    const messages = chat.messages
    const list = messages.flatMap((message, index): AmbientConversationTurn[] => {
      if (message.role === "user")
        return [{ id: message.id, role: "user", text: textOf(message) }]
      if (message.role !== "assistant") return []
      const live = running && index === messages.length - 1
      return [
        {
          id: message.id,
          role: "assistant",
          answer: answerFromParts(uiMessageParts(message.parts, !live), !live, options),
          running: live,
        },
      ]
    })
    // asked, and nothing has come back yet
    if (running && messages[messages.length - 1]?.role === "user")
      list.push({ id: "pending", role: "assistant", answer: { text: "", refs: [] }, running: true })
    return list
  })

  return {
    ask(input, { signal }) {
      const chat = getChat()
      const replaced = input.regenerate ? answerTo(chat, input.question) : undefined
      const before = new Set(
        chat.messages.filter((m) => m !== replaced).map((m) => m.id)
      )
      const queue = createPushQueue<AmbientAnswerEvent>()
      const read = createPartsReader(options)
      let started = false
      let continued = 0

      const update = () => {
        if (busy(chat)) started = true
        const idle = started && !busy(chat)
        const last = chat.messages[chat.messages.length - 1]
        const answer =
          last?.role === "assistant" && !before.has(last.id) ? last : undefined
        const parts = answer ? uiMessageParts(answer.parts, idle) : []
        // a call that is the person's, or approved and not yet run, keeps
        // the answer open: it continues from there
        const open = idle ? unfinishedCalls(parts) : []
        for (const event of read(parts, idle && !open.length)) queue.push(event)
        if (!idle) return
        if (chat.status === "error")
          queue.push({
            type: "error",
            message: chat.error?.message ?? "The assistant could not answer.",
          })
        if (chat.status === "error") return queue.close()
        if (open.length) return
        // outputs are in and the model has not answered them: more is coming
        if (answer && owesContinuation(answer) && continued++ < 8)
          return continueWhenStalled(() => chat)
        queue.close()
      }

      const unsubscribe = subscribe(chat, update)
      const stop = () => void chat.stop()
      signal.addEventListener("abort", stop, { once: true })
      const body = { ambient: ambientOf(input) }
      const sent = replaced
        ? chat.regenerate({ messageId: replaced.id, body })
        : chat.sendMessage({ text: input.question }, { body })
      sent.catch((error: unknown) => queue.fail(error))
      update()

      return (async function* () {
        try {
          yield* queue.drain()
        } finally {
          unsubscribe()
          signal.removeEventListener("abort", stop)
        }
      })()
    },

    async respond(response) {
      const chat = getChat()
      const part = chat.messages
        .flatMap((m) => m.parts)
        .find((p) => p.toolCallId === response.id)
      if (!part) return
      if ("approved" in response) {
        const approval = part.approval as Approval | undefined
        if (!approval) return
        await chat.addToolApprovalResponse({
          id: approval.id,
          approved: response.approved,
          reason: response.reason,
        })
      } else {
        await chat.addToolOutput({ tool: toolNameOf(part), toolCallId: response.id, output: response.output })
      }
      continueWhenStalled(getChat)
    },

    async reset() {
      const chat = getChat()
      await chat.stop()
      chat.messages = []
    },

    conversation: {
      subscribe: (listener) =>
        subscribe(getChat(), () => {
          turns.invalidate()
          listener()
        }),
      getTurns: turns.get,
      stop: () => void getChat().stop(),
    },
  }
}
