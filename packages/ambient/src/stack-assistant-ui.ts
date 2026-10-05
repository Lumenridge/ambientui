import type { AmbientConversationTurn } from "./responder"
import type { AmbientAnswerEvent } from "./responder-schemas"
import {
  answerFromParts,
  cachedTurns,
  createPartsReader,
  createPushQueue,
  unfinishedCalls,
  type AmbientStack,
  type StackOptions,
  type StackPart,
} from "./stack-parts"

/**
 * ASSISTANT-UI, UNDER THE AMBIENT LAYER.
 *
 * A product that runs an assistant-ui runtime (`useChatRuntime`,
 * `useLocalRuntime`, an external store) keeps the runtime: its model
 * adapter, its tools, its model context, its thread. The layer becomes the
 * surface. It asks through the runtime's thread, reads the answer from the
 * message the run builds, answers its approvals and waiting tools, and
 * follows the thread, so a message sent from anywhere in the product is in
 * the layer's transcript too.
 *
 *   const runtime = useChatRuntime()
 *   const api = React.useMemo(
 *     () => createAmbientApi(assistantUIThread(() => runtime.thread)),
 *     [runtime]
 *   )
 *
 * The thread is described structurally, so the layer does not import
 * assistant-ui. The page context travels on each run as
 * `runConfig.custom.ambient`.
 */

/** The parts of an assistant-ui message this adapter reads. */
export type AssistantUIPart = { readonly type: string; readonly [key: string]: unknown }

export type AssistantUIMessage = {
  readonly id: string
  readonly role: string
  readonly content: readonly AssistantUIPart[]
  readonly status?: {
    readonly type: string
    readonly reason?: string
    readonly error?: unknown
  }
}

/** The slice of assistant-ui's ThreadRuntime the layer uses. */
export type AssistantUIThread = {
  append(message: {
    role: "user"
    content: { type: "text"; text: string }[]
    runConfig?: { custom?: Record<string, unknown> }
  }): void
  subscribe(callback: () => void): () => void
  getState(): {
    readonly messages: readonly AssistantUIMessage[]
    readonly isRunning: boolean
    /** An AI SDK runtime keeps its chat here. */
    readonly extras?: unknown
  }
  cancelRun(): void
  /** Clears the thread. */
  reset(): void
  getMessageById(id: string): {
    /** Run the answer again, as a new branch. */
    reload(config?: { runConfig?: { custom?: Record<string, unknown> } }): void
    getMessagePartByToolCallId(toolCallId: string): {
      addToolResult(result: unknown): void
      resumeToolCall(payload: unknown): void
      respondToToolApproval(response: {
        approved: boolean
        reason?: string
      }): Promise<void>
    }
  }
}

export type AssistantUIOptions = StackOptions & {
  /**
   * What clearing the conversation does. Default: `thread.reset()`. A
   * product with a thread list keeps the old thread instead:
   * `() => runtime.threads.switchToNewThread()`.
   */
  reset?: () => void | Promise<void>
}

type Approval = {
  id: string
  prompt?: string
  approved?: boolean
  resolution?: string
}

const errorText = (value: unknown): string => {
  if (typeof value === "string") return value
  if (value && typeof value === "object" && "error" in value)
    return errorText((value as { error: unknown }).error)
  if (value && typeof value === "object" && "message" in value)
    return String((value as { message: unknown }).message)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * An assistant-ui message in the terms every stack shares. `idle` is
 * whether the run has stopped: a call with no result is running while the
 * run is live, and afterwards is waiting on the person.
 */
export function assistantUIParts(
  message: AssistantUIMessage,
  idle: boolean
): StackPart[] {
  return message.content.flatMap((part): StackPart[] => {
    switch (part.type) {
      case "text":
        return [{ type: "text", text: String(part.text ?? "") }]
      case "reasoning":
        return [{ type: "reasoning", text: String(part.text ?? "") }]
      case "source":
        return [
          {
            type: "source",
            url: typeof part.url === "string" ? part.url : undefined,
            title: typeof part.title === "string" ? part.title : undefined,
          },
        ]
      case "data":
        return [{ type: "data", name: String(part.name), data: part.data }]
      case "tool-call": {
        const approval = part.approval as Approval | undefined
        const call = {
          type: "tool" as const,
          id: String(part.toolCallId),
          name: String(part.toolName),
          input: part.args,
          approval: approval && {
            id: approval.id,
            reason: approval.prompt,
            approved: approval.approved,
          },
        }
        if (part.result !== undefined)
          return [
            approval?.approved === false
              ? { ...call, state: "denied", error: errorText(part.result) }
              : part.isError
                ? { ...call, state: "failed", error: errorText(part.result) }
                : { ...call, state: "done", output: part.result },
          ]
        if (approval && approval.resolution) return [{ ...call, state: "denied" }]
        if (approval && approval.approved === undefined)
          return [{ ...call, state: "approval" }]
        if (approval?.approved === false) return [{ ...call, state: "denied" }]
        // a human interrupt is the person's to answer even mid-run
        if (part.interrupt != null) return [{ ...call, state: "waiting" }]
        return [{ ...call, state: idle && !approval ? "waiting" : "running" }]
      }
      default:
        return []
    }
  })
}

/** Nothing has been said since the last tool call: the model has not answered it. */
const endsOnToolCall = (message: AssistantUIMessage) => {
  const types = message.content.map((part) => part.type)
  const call = types.lastIndexOf("tool-call")
  return (
    call >= 0 &&
    !message.content.slice(call + 1).some((part) => part.type === "text" && part.text)
  )
}

/** The AI SDK chat behind the thread, when the runtime is that kind. */
const chatOf = (thread: AssistantUIThread) => {
  const extras = thread.getState().extras as
    | { chat?: { sendMessage?: () => Promise<void> } }
    | undefined
  const chat = extras?.chat
  return chat && typeof chat.sendMessage === "function"
    ? (chat as { sendMessage: () => Promise<void> })
    : null
}

const textOf = (message: AssistantUIMessage) =>
  message.content
    .filter((part) => part.type === "text")
    .map((part) => String(part.text ?? ""))
    .join("\n\n")

const failureOf = (message: AssistantUIMessage): string | null => {
  const status = message.status
  if (status?.type !== "incomplete" || status.reason !== "error") return null
  return status.error === undefined
    ? "The assistant could not answer."
    : errorText(status.error)
}

/** The layer on an assistant-ui thread. */
export function assistantUIThread(
  getThread: () => AssistantUIThread,
  options: AssistantUIOptions = {}
): AmbientStack {
  /** The assistant message that answers `question`, newest first. */
  const answerTo = (messages: readonly AssistantUIMessage[], question: string) => {
    for (let i = messages.length - 1; i > 0; i--)
      if (
        messages[i]!.role === "assistant" &&
        messages[i - 1]!.role === "user" &&
        textOf(messages[i - 1]!) === question
      )
        return messages[i]!
  }

  const turns = cachedTurns((): AmbientConversationTurn[] => {
    const { messages, isRunning } = getThread().getState()
    const list = messages.flatMap((message, index): AmbientConversationTurn[] => {
      if (message.role === "user")
        return [{ id: message.id, role: "user", text: textOf(message) }]
      if (message.role !== "assistant") return []
      const live = isRunning && index === messages.length - 1
      return [
        {
          id: message.id,
          role: "assistant",
          answer: answerFromParts(assistantUIParts(message, !live), !live, options),
          running: live,
        },
      ]
    })
    // asked, and nothing has come back yet
    if (isRunning && messages[messages.length - 1]?.role === "user")
      list.push({ id: "pending", role: "assistant", answer: { text: "", refs: [] }, running: true })
    return list
  })

  return {
    ask(input, { signal }) {
      const thread = getThread()
      const shown = thread.getState().messages
      const replaced = input.regenerate ? answerTo(shown, input.question) : undefined
      const before = new Set(shown.map((m) => m.id))
      const queue = createPushQueue<AmbientAnswerEvent>()
      const read = createPartsReader(options)
      let started = false
      let owed: ReturnType<typeof setTimeout> | null = null
      let resubmitted = false

      const update = () => {
        const { messages, isRunning } = thread.getState()
        if (isRunning) started = true
        if (isRunning && owed) {
          clearTimeout(owed)
          owed = null
        }
        const idle = started && !isRunning
        const last = messages[messages.length - 1]
        const answer =
          last?.role === "assistant" && !before.has(last.id) ? last : undefined
        const parts = answer ? assistantUIParts(answer, idle) : []
        // a call that is the person's, or approved and not yet run, keeps
        // the answer open: it continues from there
        const open = idle ? unfinishedCalls(parts) : []
        for (const event of read(parts, idle && !open.length)) queue.push(event)
        if (!idle) return
        const failure = answer && failureOf(answer)
        if (failure) queue.push({ type: "error", message: failure })
        if (failure) return queue.close()
        if (open.length) return
        // A call just got its result and the model has not answered it.
        // The runtime continues the run; an AI SDK runtime that was not
        // set up to (no sendAutomaticallyWhen) is resubmitted through its
        // own chat. Only when neither happens is the answer over.
        if (answer && endsOnToolCall(answer)) {
          if (owed) return
          owed = setTimeout(() => {
            if (thread.getState().isRunning) return void (owed = null)
            const chat = chatOf(thread)
            if (!chat || resubmitted) return queue.close()
            resubmitted = true
            owed = null
            void chat.sendMessage()
            // if even that starts nothing, there is nothing more to wait for
            setTimeout(() => !thread.getState().isRunning && update(), 1500)
          }, 2500)
          return
        }
        queue.close()
      }

      const unsubscribe = thread.subscribe(update)
      const stop = () => thread.cancelRun()
      signal.addEventListener("abort", stop, { once: true })
      const runConfig = {
        custom: {
          ambient: {
            pageChip: input.pageChip,
            chips: input.chips,
            locale: input.locale,
          },
        },
      }
      if (replaced) thread.getMessageById(replaced.id).reload({ runConfig })
      else
        thread.append({
          role: "user",
          content: [{ type: "text", text: input.question }],
          runConfig,
        })
      update()

      return (async function* () {
        try {
          yield* queue.drain()
        } finally {
          unsubscribe()
          if (owed) clearTimeout(owed)
          signal.removeEventListener("abort", stop)
        }
      })()
    },

    async respond(response) {
      const thread = getThread()
      for (const message of thread.getState().messages)
        for (const part of message.content) {
          if (part.type !== "tool-call") continue
          if (part.toolCallId !== response.id) continue
          const call = thread
            .getMessageById(message.id)
            .getMessagePartByToolCallId(String(part.toolCallId))
          if ("approved" in response)
            await call.respondToToolApproval({
              approved: response.approved,
              reason: response.reason,
            })
          else if (part.interrupt != null) call.resumeToolCall(response.output)
          else call.addToolResult(response.output)
          return
        }
    },

    async reset() {
      if (options.reset) return options.reset()
      const thread = getThread()
      if (thread.getState().isRunning) thread.cancelRun()
      thread.reset()
    },

    conversation: {
      subscribe: (listener) =>
        getThread().subscribe(() => {
          turns.invalidate()
          listener()
        }),
      getTurns: turns.get,
      stop: () => getThread().cancelRun(),
    },
  }
}
