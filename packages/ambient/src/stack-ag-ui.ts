import { failureDetail, type AmbientConversationTurn } from "./responder"
import type { AmbientAnswerEvent, AmbientResponse } from "./responder-schemas"
import {
  ambientDataEvent,
  answerFromParts,
  createPartsReader,
  createPushQueue,
  createWaitingRoom,
  MAX_ROUNDS,
  noBrowserTool,
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
 * AG-UI AGENTS (COPILOTKIT, LANGGRAPH, MASTRA…), UNDER THE AMBIENT LAYER.
 *
 * AG-UI is the protocol CopilotKit speaks, and that LangGraph, Mastra and
 * other agent servers expose. A product keeps its agent: the layer adds
 * the question to the agent's messages, runs it, reads the answer from the
 * messages the run writes, answers its interrupts, and follows the agent's
 * thread, so the layer is the one surface for it.
 *
 * A plain AG-UI endpoint:
 *
 *   const agent = new HttpAgent({ url: "/api/agent" })
 *   const api = createAmbientApi(agUIAgent(() => agent))
 *
 * Inside CopilotKit, run through CopilotKit, so its frontend tools,
 * human-in-the-loop tools and shared context (`useAgentContext`) apply:
 *
 *   const { agent } = useAgent()
 *   const { copilotkit } = useCopilotKit()
 *   const api = React.useMemo(
 *     () =>
 *       createAmbientApi(
 *         agUIAgent(() => agent, {
 *           run: (agent, { resume }) => copilotkit.runAgent({ agent, resume }),
 *           stop: (agent) => copilotkit.stopAgent({ agent }),
 *         })
 *       ),
 *     [agent, copilotkit]
 *   )
 *
 * The agent is described structurally, so the layer does not import
 * @ag-ui/client or CopilotKit.
 */

export { waitForPerson }

/** One AG-UI event, as far as this adapter reads it. */
export type AgUIEvent = { type: string; [key: string]: unknown }

/** One AG-UI message, as far as this adapter reads it. */
export type AgUIMessage = {
  id: string
  role: string
  content?: unknown
  toolCalls?: {
    id: string
    function: { name: string; arguments: string }
  }[]
  toolCallId?: string
  error?: string
}

export type AgUIInterrupt = {
  id: string
  reason: string
  message?: string
  toolCallId?: string
}

/** What a run is started with. */
export type AgUIRunParameters = {
  context: { description: string; value: string }[]
  tools: { name: string; description: string; parameters?: unknown }[]
  resume?: { interruptId: string; status: "resolved" | "cancelled"; payload?: unknown }[]
}

/** The slice of an AG-UI AbstractAgent the layer uses. */
export type AgUIAgent = {
  messages: AgUIMessage[]
  threadId: string
  isRunning: boolean
  pendingInterrupts?: AgUIInterrupt[]
  addMessage(
    message:
      | { id: string; role: "user"; content: string }
      | { id: string; role: "tool"; toolCallId: string; content: string; error?: string }
  ): void
  setMessages(messages: AgUIMessage[]): void
  // method syntax: AG-UI passes more than these read, and may await the result
  subscribe(subscriber: {
    onEvent?(params: { event: AgUIEvent }): void
    onMessagesChanged?(params: unknown): void
    onRunInitialized?(params: unknown): void
    onRunFinalized?(params: unknown): void
    onRunFailed?(params: unknown): void
  }): { unsubscribe: () => void }
  runAgent(parameters?: Partial<AgUIRunParameters>): Promise<unknown>
  abortRun(): void
}

export type AgUIOptions<A extends AgUIAgent> = StackOptions & {
  /**
   * How a run starts. Default: `agent.runAgent(parameters)`. CopilotKit
   * hosts pass `copilotkit.runAgent`, which also runs their frontend tools.
   */
  run?: (agent: A, parameters: AgUIRunParameters) => Promise<unknown>
  /** How a run is cancelled. Default: `agent.abortRun()`. */
  stop?: (agent: A) => void
  /**
   * The tools the BROWSER runs, for an agent that is not behind CopilotKit
   * (which has its own). Each is told to the agent, and when the agent
   * calls one, `run` is its output; `waitForPerson` leaves it to the
   * component drawn for it.
   */
  tools?: Record<
    string,
    {
      description: string
      /** JSON Schema of the input. */
      parameters?: unknown
      run: ((input: unknown) => unknown | Promise<unknown>) | typeof waitForPerson
    }
  >
  /**
   * What an interrupt is resumed with. Default: `{ approved, reason }`.
   * The agent defines what it expects.
   */
  resumePayload?: (
    answer: { approved: boolean; reason?: string },
    interrupt: AgUIInterrupt
  ) => unknown
  /**
   * How many times one answer may run again after the browser's tools.
   * Default MAX_ROUNDS. A host runner (CopilotKit) keeps its own count.
   */
  maxRounds?: number
}

const textOf = (content: unknown): string =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content
          .map((part) =>
            part && typeof part === "object" && "text" in part
              ? String((part as { text: unknown }).text)
              : ""
          )
          .join("")
      : ""

const parsed = (text: string): unknown => {
  if (!/^\s*[[{]/.test(text)) return text
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * The messages of one answer in the terms every stack shares. `idle` is
 * whether the run has stopped: a call with no result is running while the
 * run is live, and afterwards is whatever `clientCall` says the browser
 * will do about it.
 */
export function agUIParts(
  messages: readonly AgUIMessage[],
  idle: boolean,
  interrupts: readonly AgUIInterrupt[] = [],
  clientCall: (name: string) => Pick<StackToolPart, "state" | "error"> = (name) => ({
    state: "failed",
    error: noBrowserTool(name),
  })
): StackPart[] {
  const results = new Map(
    messages.filter((m) => m.role === "tool").map((m) => [m.toolCallId, m])
  )
  const claimed = new Set<string>()
  const parts = messages.flatMap((message): StackPart[] => {
    if (message.role === "reasoning")
      return [{ type: "reasoning", text: textOf(message.content) }]
    if (message.role !== "assistant") return []
    const text = textOf(message.content)
    return [
      ...(text ? [{ type: "text" as const, text }] : []),
      ...(message.toolCalls ?? []).map((call): StackPart => {
        const result = results.get(call.id)
        const interrupt = interrupts.find((i) => i.toolCallId === call.id)
        if (interrupt) claimed.add(interrupt.id)
        const base = {
          type: "tool" as const,
          id: call.id,
          name: call.function.name,
          input: call.function.arguments ? parsed(call.function.arguments) : undefined,
          approval: interrupt && {
            id: interrupt.id,
            reason: interrupt.message ?? interrupt.reason,
          },
        }
        if (result)
          return result.error
            ? { ...base, state: "failed", error: result.error }
            : { ...base, state: "done", output: parsed(textOf(result.content)) }
        if (interrupt) return { ...base, state: "approval" }
        return idle
          ? { ...base, ...clientCall(call.function.name) }
          : { ...base, state: "running" }
      }),
    ]
  })
  // an interrupt that is not about one call is still a question to answer
  for (const interrupt of interrupts)
    if (!claimed.has(interrupt.id))
      parts.push({
        type: "tool",
        id: interrupt.id,
        name: interrupt.reason,
        input: undefined,
        state: "approval",
        approval: { id: interrupt.id, reason: interrupt.message },
      })
  return parts
}

let next = 0
const newId = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now().toString(36)}-${next++}`

const stringify = (value: unknown) =>
  value === undefined || value === null
    ? ""
    : typeof value === "string"
      ? value
      : JSON.stringify(value)

/** The layer on an AG-UI agent. */
export function agUIAgent<A extends AgUIAgent>(
  getAgent: () => A,
  options: AgUIOptions<A> = {}
): AmbientStack {
  const room = createWaitingRoom<AmbientResponse>()
  const rounds = options.maxRounds ?? MAX_ROUNDS
  // a call the run left open is the browser's: one of `tools`, or nobody's.
  // (A host runner like CopilotKit answers its own before the run returns.)
  const clientCall = (name: string): Pick<StackToolPart, "state" | "error"> => {
    const tool = options.tools?.[name]
    if (!tool) return { state: "failed", error: noBrowserTool(name) }
    return { state: tool.run === waitForPerson ? "waiting" : "running" }
  }
  const tools = Object.entries(options.tools ?? {}).map(([name, tool]) => ({
    name,
    description: tool.description,
    parameters: tool.parameters,
  }))
  const run = options.run ?? ((agent: A, parameters) => agent.runAgent(parameters))
  const stopRun = options.stop ?? ((agent: A) => agent.abortRun())

  // Finished groups keep their turn between changes. A group is the
  // messages of one answer, so it is known by their ids (and by how many
  // interrupts are open, which changes what an unanswered call means).
  let kept = new Map<string, AmbientConversationTurn>()
  let list: readonly AmbientConversationTurn[] = []
  let stale = true
  const readTurns = () => {
    if (!stale) return list
    stale = false
    const agent = getAgent()
    const interrupts = agent.pendingInterrupts ?? []
    const next: AmbientConversationTurn[] = []
    const seen = new Map<string, AmbientConversationTurn>()
    const reuse = (key: string, build: () => AmbientConversationTurn) => {
      const turn = kept.get(key) ?? build()
      seen.set(key, turn)
      return turn
    }
    let group: AgUIMessage[] = []
    const flush = (live: boolean) => {
      if (!group.length) return
      const messages = group
      group = []
      const build = (): AmbientConversationTurn => ({
        id: messages[0]!.id,
        role: "assistant",
        answer: answerFromParts(
          agUIParts(messages, !live, live ? [] : interrupts, clientCall),
          !live,
          options
        ),
        running: live,
      })
      next.push(
        live
          ? build()
          : reuse(`a:${messages.map((m) => m.id).join(",")}:${interrupts.length}`, build)
      )
    }
    for (const message of agent.messages) {
      if (message.role === "user") {
        flush(false)
        const text = textOf(message.content)
        next.push(reuse(`u:${message.id}:${text}`, () => ({ id: message.id, role: "user", text })))
      } else if (message.role !== "system" && message.role !== "developer")
        group.push(message)
    }
    const asked = !group.length && next[next.length - 1]?.role === "user"
    flush(agent.isRunning)
    // asked, and nothing has come back yet
    if (agent.isRunning && asked) next.push(PENDING_TURN)
    kept = seen
    if (next.length !== list.length || next.some((turn, i) => turn !== list[i])) list = next
    return list
  }

  return {
    ask(input, { signal }) {
      const agent = getAgent()
      const queue = createPushQueue<AmbientAnswerEvent>()
      const read = createPartsReader(options)

      // Regenerate redoes the thread's LAST answer: the thread goes back to
      // the question it answers and runs again. An earlier answer cannot be
      // redone without dropping every turn after it, so that is a new turn.
      let asked = -1
      if (input.regenerate) {
        const last = agent.messages.map((m) => m.role).lastIndexOf("user")
        if (last >= 0 && textOf(agent.messages[last]!.content) === input.question)
          asked = last
      }
      if (asked >= 0) agent.setMessages(agent.messages.slice(0, asked + 1))
      else
        agent.addMessage({
          id: newId("ambient"),
          role: "user",
          content: input.question,
        })
      const from = (asked >= 0 ? asked : agent.messages.length - 1) + 1

      const parts = (idle: boolean) =>
        agUIParts(
          agent.messages.slice(from),
          idle,
          idle ? (agent.pendingInterrupts ?? []) : [],
          clientCall
        )
      const say = (idle: boolean, finished = false) => {
        for (const event of read(parts(idle), finished)) queue.push(event)
      }
      const subscription = agent.subscribe({
        onMessagesChanged: () => say(false),
        onEvent: ({ event }) => {
          if (event.type === "CUSTOM") {
            const mapped = ambientDataEvent(String(event.name), event.value)
            if (mapped) queue.push(mapped)
          } else if (event.type === "RUN_ERROR") {
            queue.push({
              type: "error",
              message: failureDetail(event.message),
            })
            queue.close()
          } else if (event.type === "RUN_STARTED") {
            // a runner that adds tool results itself (CopilotKit) does not
            // announce them; its next run starting is when they are there
            say(false)
          }
        },
      })
      const stop = () => stopRun(agent)
      signal.addEventListener("abort", stop, { once: true })

      const context = [
        {
          description: "Where the person is in the product, and what they pointed at",
          value: JSON.stringify({
            page: input.pageChip,
            chips: input.chips,
            locale: input.locale,
          }),
        },
      ]

      ;(async () => {
        let resume: AgUIRunParameters["resume"]
        for (let round = 0; ; round++) {
          await run(agent, { context, tools, ...(resume ? { resume } : {}) })
          resume = undefined
          if (signal.aborted) break
          // what the run left for the browser: tools to run, and questions
          // only the person can answer
          const now = parts(true)
          const mine = now.filter(
            (part): part is StackToolPart =>
              part.type === "tool" &&
              part.state === "running" &&
              typeof options.tools?.[part.name]?.run === "function"
          )
          const open = openCalls(now)
          if (!mine.length && !open.length) break
          // the results below would never reach the agent: say so
          if (round + 1 >= rounds) {
            queue.push(tooManyRounds(rounds))
            return queue.close()
          }
          // wait BEFORE the blocks are sent, so an answer always finds a waiter
          const answers = Promise.all(open.map((call) => room.wait(call.id, signal)))
          say(true)

          await Promise.all(
            mine.map(async (call) => {
              const result = { id: newId("tool"), role: "tool" as const, toolCallId: call.id }
              try {
                const tool = options.tools![call.name]!.run as (input: unknown) => unknown
                agent.addMessage({ ...result, content: stringify(await tool(call.input)) })
              } catch (error) {
                // AG-UI's own field for a failed tool, so it reads as one
                const message = failureDetail(error)
                agent.addMessage({ ...result, content: message, error: message })
              }
            })
          )
          const interrupts = agent.pendingInterrupts ?? []
          for (const answer of await answers) {
            if (!answer) continue
            if ("approved" in answer) {
              const interrupt = interrupts.find(
                (i) => (i.toolCallId ?? i.id) === answer.id
              )
              if (!interrupt) continue
              const said = { approved: answer.approved, reason: answer.reason }
              ;(resume ??= []).push({
                interruptId: interrupt.id,
                status: "resolved",
                payload: options.resumePayload?.(said, interrupt) ?? said,
              })
            } else
              agent.addMessage({
                id: newId("tool"),
                role: "tool",
                toolCallId: answer.id,
                content: stringify(answer.output),
              })
          }
          if (signal.aborted) break
        }
        say(true, true)
        queue.close()
      })().catch((error: unknown) => queue.fail(error))

      return (async function* () {
        try {
          yield* queue.drain()
        } finally {
          subscription.unsubscribe()
          signal.removeEventListener("abort", stop)
        }
      })()
    },

    respond: room.answer,

    reset() {
      const agent = getAgent()
      if (agent.isRunning) stopRun(agent)
      agent.setMessages([])
      agent.threadId = newId("thread")
    },

    conversation: {
      subscribe(listener) {
        const changed = () => {
          stale = true
          listener()
        }
        return getAgent().subscribe({
          onMessagesChanged: changed,
          onRunInitialized: changed,
          onRunFinalized: changed,
          onRunFailed: changed,
        }).unsubscribe
      },
      getTurns: readTurns,
      stop: () => stopRun(getAgent()),
    },
  }
}
