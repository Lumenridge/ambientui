import {
  answerEventsFromSSE,
  failureReason,
  type AmbientConversationTurn,
} from "./responder"
import type {
  AmbientAnswerEvent,
  AmbientQuestion,
  AmbientResponse,
} from "./responder-schemas"
import {
  answerFromParts,
  createPartsReader,
  createRunPump,
  createTurnList,
  createWaitingRoom,
  lastAnswerTo,
  MAX_ROUNDS,
  noBrowserTool,
  NotWaitingError,
  openCalls,
  PENDING_TURN,
  tooManyRounds,
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

/** What the browser will do about a call the stream left with no output. */
export type ClientCall = (name: string) => Pick<StackToolPart, "state" | "error">

/**
 * A UI message's parts in the terms every stack shares. `idle` is whether
 * the stream has stopped: a call with input and no output is running while
 * the stream is live, and afterwards is whatever `clientCall` says the
 * browser will do about it.
 */
export function uiMessageParts(
  parts: readonly UIPartLike[],
  idle: boolean,
  clientCall: ClientCall = () => ({ state: "waiting" })
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
          idle && !part.providerExecuted
            ? { ...call, ...clientCall(name) }
            : { ...call, state: "running" },
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
   * component drawn for it calls `respond`. A call to a tool that is not
   * listed here fails, naming the tool.
   */
  tools?: Record<
    string,
    ((input: unknown) => unknown | Promise<unknown>) | typeof waitForPerson
  >
  /** How many times one answer may continue after tools. Default MAX_ROUNDS. */
  maxRounds?: number
}

/** The layer on an AI SDK chat route. */
export function aiSdkRoute(options: AiSdkRouteOptions): AmbientStack {
  const send = options.fetch ?? fetch
  const rounds = options.maxRounds ?? MAX_ROUNDS
  const room = createWaitingRoom<AmbientResponse>()
  const clientCall: ClientCall = (name) => {
    const tool = options.tools?.[name]
    if (tool === waitForPerson) return { state: "waiting" }
    if (tool) return { state: "running" }
    // not registered: a missing tool must not read as one that succeeded
    return { state: "failed", error: noBrowserTool(name) }
  }

  async function* ask(
    input: AmbientQuestion,
    { signal }: { signal: AbortSignal }
  ): AsyncGenerator<AmbientAnswerEvent> {
    const base = toUIMessages(input)
    const builder = createUIMessageBuilder(`${input.conversationId}-${base.length}`)
    const read = createPartsReader(options)
    // An approval is asked once the stream has stopped, when there is a
    // waiter for the answer; until then the call reads as still out.
    const parts = (idle: boolean) =>
      uiMessageParts(builder.message.parts, idle, clientCall).map((part) =>
        !idle && part.type === "tool" && part.state === "approval"
          ? { ...part, state: "running" as const, approval: undefined }
          : part
      )

    for (let round = 0; ; round++) {
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
      const mine = builder
        .clientCalls()
        .filter((call) => typeof options.tools?.[toolNameOf(call)] === "function")
      const open = openCalls(parts(true))
      if (!open.length && !mine.length) break
      // the outputs below would never reach the model: say so, do not end quietly
      if (round + 1 >= rounds) {
        yield tooManyRounds(rounds)
        return
      }
      await Promise.all(
        mine.map(async (call) => {
          const tool = options.tools![toolNameOf(call)] as (input: unknown) => unknown
          try {
            builder.setOutput(String(call.toolCallId), await tool(call.input))
          } catch (error) {
            builder.setOutput(String(call.toolCallId), undefined, failureReason(error))
          }
        })
      )
      // wait BEFORE the blocks are sent, so an answer always finds a waiter
      const answers = Promise.all(open.map((call) => room.wait(call.id, signal)))
      // what the browser ran is done before the person is asked anything
      yield* read(parts(true), false)
      for (const answer of await answers) {
        if (!answer) continue
        if ("approved" in answer) {
          const approval = open.find((call) => call.id === answer.id)?.approval
          if (approval) builder.setApproval(approval.id, answer.approved, answer.reason)
        } else builder.setOutput(answer.id, answer.output)
      }
      if (signal.aborted) return
      yield* read(parts(false), false)
    }
    yield* read(parts(true), true)
  }

  return { ask, respond: room.answer }
}

/**
 * A UI message stream response → answer events, for a host's own `ask`. A
 * call the stream leaves with no output is the host's to continue, so it
 * is shown as the call, with no result.
 */
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
  yield* read(uiMessageParts(builder.message.parts, true, () => ({ state: "done" })), true)
}

/* -------------------------------- the chat ------------------------------- */

/**
 * The slice of the AI SDK's `Chat` the layer uses. The `Chat` class from
 * `@ai-sdk/react` fits; the object `useChat` returns does not, because it
 * cannot be subscribed to from outside a component. Share one instance:
 * `useChat({ chat })`.
 *
 * The two `~register…` methods are the SDK's own hooks for its React
 * binding, not documented API: they are the only way to follow a `Chat`
 * from outside a component. `aiSdkChat` checks for them and fails with a
 * message naming them if an SDK release has moved them.
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

export type AiSdkChatOptions = StackOptions & {
  /**
   * Resubmit the chat when a tool output or an approval is in and nothing
   * continued it. Default true. Pass false when the chat's own
   * `sendAutomaticallyWhen` is asynchronous and can take longer than
   * CONTINUE_GRACE_MS to decide: both would then submit. An answer that
   * nobody continues ends after CONTINUE_TIMEOUT_MS.
   */
  resubmit?: boolean
}

/**
 * How long a chat that owes a continuation is given to start it itself
 * (its `sendAutomaticallyWhen` runs a tick after the output lands) before
 * the adapter resubmits. Long enough for a synchronous predicate on a slow
 * device, short enough not to read as a stall.
 */
export const CONTINUE_GRACE_MS = 250

/**
 * How long an answer waits for a continuation it is owed before it is
 * treated as over. Whoever continues (the chat's `sendAutomaticallyWhen`,
 * or the adapter's resubmit) has started long before this; when nobody
 * does (a predicate that decided not to, with `resubmit: false`), the turn
 * must still end rather than hold the layer busy.
 */
export const CONTINUE_TIMEOUT_MS = 5000

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
  // prose after the last call is the model answering it
  const answered = step
    .slice(step.lastIndexOf(calls[calls.length - 1]!) + 1)
    .some((p) => p.type === "text" && p.text)
  return (
    calls.length > 0 &&
    !answered &&
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
 * Continue a chat that owes one, unless it has started by itself within
 * the grace. One look at a time per chat, so two callers never both
 * resubmit.
 */
const looking = new WeakSet<AiSdkChat>()
function continueWhenStalled(chat: AiSdkChat) {
  if (looking.has(chat)) return
  looking.add(chat)
  setTimeout(() => {
    looking.delete(chat)
    if (!busy(chat) && owesContinuation(chat.messages[chat.messages.length - 1]))
      void chat.sendMessage()
  }, CONTINUE_GRACE_MS)
}

/** The layer on the product's own AI SDK `Chat`. */
export function aiSdkChat(
  getChat: () => AiSdkChat,
  options: AiSdkChatOptions = {}
): AmbientStack {
  const subscribe = (chat: AiSdkChat, listener: () => void) => {
    for (const hook of ["~registerMessagesCallback", "~registerStatusCallback"] as const)
      if (typeof chat[hook] !== "function")
        throw new Error(
          `aiSdkChat needs the AI SDK Chat's "${hook}" to follow it, and this Chat has none. Pass the Chat instance (not what useChat returns); if it is one, this SDK version moved the hook.`
        )
    const offMessages = chat["~registerMessagesCallback"](listener)
    const offStatus = chat["~registerStatusCallback"](listener)
    return () => {
      offMessages()
      offStatus()
    }
  }

  const turns = createTurnList()
  const readTurns = () =>
    turns.get(() => {
      const chat = getChat()
      const running = busy(chat)
      const messages = chat.messages
      const list = messages.flatMap((message, index): AmbientConversationTurn[] => {
        if (message.role !== "user" && message.role !== "assistant") return []
        const live = running && index === messages.length - 1
        return [
          turns.turn(message, live, () =>
            message.role === "user"
              ? { id: message.id, role: "user", text: textOf(message) }
              : {
                  id: message.id,
                  role: "assistant",
                  answer: answerFromParts(uiMessageParts(message.parts, !live), !live, options),
                  running: live,
                }
          ),
        ]
      })
      // asked, and nothing has come back yet
      if (running && messages[messages.length - 1]?.role === "user") list.push(PENDING_TURN)
      return list
    })

  return {
    ask(input, { signal }) {
      const chat = getChat()
      const replaced = input.regenerate
        ? lastAnswerTo(chat.messages, input.question, textOf)
        : undefined
      const before = new Set(
        chat.messages.filter((m) => m !== replaced).map((m) => m.id)
      )
      let started = false
      // continuations of this answer: counted once each, capped like rounds
      let continued = 0
      let awaiting = false
      // nobody continued in time: the answer ends where it is
      let gaveUp = false
      let timeout: ReturnType<typeof setTimeout> | undefined

      const answerNow = () => {
        const last = chat.messages[chat.messages.length - 1]
        return last?.role === "assistant" && !before.has(last.id) ? last : undefined
      }
      const pump = createRunPump(
        () => {
          if (busy(chat)) {
            started = true
            awaiting = false
            clearTimeout(timeout)
          }
          const idle = started && !busy(chat)
          return {
            parts: uiMessageParts(answerNow()?.parts ?? [], idle),
            idle,
            failure: chat.status === "error" ? failureReason(chat.error) : null,
          }
        },
        {
          ...options,
          // outputs are in and the model has not answered them: more is coming
          owes() {
            if (gaveUp) return "over"
            if (!owesContinuation(answerNow())) return false
            if (awaiting) return true
            if (continued >= MAX_ROUNDS) {
              pump.events.push(tooManyRounds(MAX_ROUNDS))
              return false
            }
            continued++
            awaiting = true
            if (options.resubmit !== false) continueWhenStalled(chat)
            timeout = setTimeout(() => {
              if (busy(chat)) return
              gaveUp = true
              pump.update()
            }, CONTINUE_TIMEOUT_MS)
            return true
          },
        }
      )

      const unsubscribe = subscribe(chat, pump.update)
      const stop = () => void chat.stop()
      signal.addEventListener("abort", stop, { once: true })
      const body = { ambient: ambientOf(input) }
      const sent = replaced
        ? chat.regenerate({ messageId: replaced.id, body })
        : chat.sendMessage({ text: input.question }, { body })
      sent.catch((error: unknown) => pump.events.fail(error))
      pump.update()

      return (async function* () {
        try {
          yield* pump.events.drain()
        } finally {
          unsubscribe()
          clearTimeout(timeout)
          signal.removeEventListener("abort", stop)
        }
      })()
    },

    async respond(response) {
      const chat = getChat()
      const part = chat.messages
        .flatMap((m) => m.parts)
        .find((p) => p.toolCallId === response.id)
      if (!part) throw new NotWaitingError()
      if ("approved" in response) {
        const approval = part.approval as Approval | undefined
        if (!approval) throw new NotWaitingError()
        await chat.addToolApprovalResponse({
          id: approval.id,
          approved: response.approved,
          reason: response.reason,
        })
      } else {
        await chat.addToolOutput({ tool: toolNameOf(part), toolCallId: response.id, output: response.output })
      }
      if (options.resubmit !== false) continueWhenStalled(chat)
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
      getTurns: readTurns,
      stop: () => void getChat().stop(),
    },
  }
}
