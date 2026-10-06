import {
  applyAnswerEvent,
  EMPTY_ANSWER,
  type AmbientApiHandlers,
  type AmbientConversationTurn,
} from "./responder"
import type { AmbientAnswer, AmbientBlock, AmbientReference } from "./response-kit"
import type { AmbientAnswerEvent } from "./responder-schemas"

/**
 * THE PIECES EVERY CHAT STACK HAS — and what each becomes in an answer.
 *
 * The Vercel AI SDK, assistant-ui and AG-UI (CopilotKit) all describe an
 * answer with the same things: prose, reasoning, tool calls, sources. Each
 * adapter (stack-ai-sdk.ts, stack-assistant-ui.ts, stack-ag-ui.ts) only
 * reads its own stack's message into the parts below. Turning parts into
 * answer events happens once, here, so the three stacks produce the same
 * answer for the same work, and an approval or a waiting tool behaves the
 * same on all of them.
 *
 * Nothing here imports any of the stacks. Their shapes are described
 * structurally, so the layer takes no dependency on a library the host may
 * not use.
 */

/** What an adapter hands `createAmbientApi`: `createAmbientApi(aiSdkRoute(…))`. */
export type AmbientStack = Pick<
  AmbientApiHandlers,
  "ask" | "respond" | "reset" | "conversation"
>

/** One tool call, wherever it is in its life. */
export type StackToolPart = {
  type: "tool"
  /** The call's id in its stack. */
  id: string
  /** The tool's name as the model called it. */
  name: string
  /** A human title, when the stack has one. */
  title?: string
  input: unknown
  output?: unknown
  /** Why the call failed. */
  error?: string
  /**
   * running: out, no result yet. waiting: the person has to give it its
   * output. approval: needs a yes before it runs. denied: got a no.
   */
  state: "running" | "waiting" | "approval" | "denied" | "done" | "failed"
  /** The request for approval and, once given, the answer. */
  approval?: { id: string; reason?: string; approved?: boolean }
}

/**
 * In an adapter's `tools`: leave this browser-side tool for the person.
 * The component drawn for it collects what is needed and calls `respond`.
 */
export const waitForPerson = Symbol("waitForPerson")

/** An assistant message, in the terms every stack shares. */
export type StackPart =
  | { type: "text"; text: string }
  /** `done` when the stack says so; otherwise a later part settles it. */
  | { type: "reasoning"; text: string; done?: boolean }
  | StackToolPart
  | { type: "source"; url?: string; title?: string }
  | { type: "data"; name: string; data: unknown }

/** What a host can tune, the same way, on every stack's adapter. */
export type StackOptions = {
  /**
   * Draw a tool call as a richer block: a `search` tool as a search block,
   * a code tool as a diff. Return null to leave the call out of the answer,
   * undefined to fall back to the generic tool block. Called again as the
   * call progresses; the block replaces its earlier self.
   */
  toolBlock?: (call: StackToolPart) => AmbientBlock | null | undefined
}

/**
 * THE NAME A NATIVE BLOCK TRAVELS UNDER. A server that already knows the
 * layer's grammar can send its blocks through any stack: an AI SDK data
 * part `data-ambient-evidence`, an AG-UI CUSTOM event named
 * `ambient-evidence`, an assistant-ui data part with the same name. The
 * value is the event's payload as the Ambient API defines it.
 */
export const AMBIENT_DATA = {
  evidence: "ambient-evidence",
  artifact: "ambient-artifact",
  refs: "ambient-refs",
  followUps: "ambient-follow-ups",
  effect: "ambient-effect",
} as const

/**
 * A stack's named data, as an answer event — or null when the name is not
 * one of the layer's. The value is not checked here: createAmbientApi
 * validates every event, so a malformed block fails the turn with its
 * reason like any other.
 */
export function ambientDataEvent(
  name: string,
  data: unknown
): AmbientAnswerEvent | null {
  const value = data as never
  switch (name) {
    case AMBIENT_DATA.evidence:
      return { type: "evidence", block: value }
    case AMBIENT_DATA.artifact:
      return { type: "artifact", block: value }
    case AMBIENT_DATA.refs:
      return { type: "refs", refs: value }
    case AMBIENT_DATA.followUps:
      return { type: "followUps", followUps: value }
    case AMBIENT_DATA.effect:
      return { type: "effect", effect: value }
    default:
      return null
  }
}

const compact = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * A tool call as a block: the block its state calls for. While it needs a
 * yes it is the approval; a no leaves it there, decided. Otherwise it is
 * the host's drawing, else the call or its failure. Every state carries
 * the call's id, so each replaces the one before it in the same place.
 */
export function toolCallBlock(
  call: StackToolPart,
  options: StackOptions = {}
): AmbientBlock | null {
  const verb = call.title ?? call.name
  const request = compact(call.input)
  // a no is the approval, decided, whether or not the stack kept the request
  if (call.state === "denied" || (call.approval && call.state === "approval"))
    return {
      kind: "approval",
      id: call.id,
      tool: verb,
      request,
      reason: call.approval?.reason,
      decision: call.state === "denied" ? "denied" : undefined,
    }
  const drawn = options.toolBlock?.(call)
  if (drawn !== undefined) return drawn && { ...drawn, id: call.id }
  if (call.state === "failed")
    return {
      kind: "failure",
      id: call.id,
      tool: verb,
      target: request,
      // "" is a failure that gave no reason: the layer words it
      error: call.error ?? "",
    }
  return {
    kind: "tool",
    id: call.id,
    verb,
    request,
    result: compact(call.output),
    name: call.name,
    input: call.input,
    output: call.output,
    ...(call.state === "running" || call.state === "waiting"
      ? { status: call.state }
      : {}),
  }
}

/**
 * Reasoning text as a reasoning block. Each paragraph is a step: its first
 * line is the title, the rest the detail.
 */
export function reasoningBlock(text: string): AmbientBlock | null {
  const steps = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const [first, ...rest] = paragraph.split("\n")
      const detail = rest.join("\n").trim()
      return detail ? { title: first!.trim(), detail } : { title: first!.trim() }
    })
  return steps.length ? { kind: "reasoning", steps } : null
}

/** A cited source as a reference chip. */
export function sourceReference(source: {
  url?: string
  title?: string
}): AmbientReference | null {
  if (source.title) return { label: source.title, href: source.url }
  if (!source.url) return null
  try {
    return { label: new URL(source.url).hostname, href: source.url }
  } catch {
    return { label: source.url, href: source.url }
  }
}

/**
 * READS ONE ASSISTANT MESSAGE AS IT GROWS, and says each piece once: new
 * text as deltas, reasoning when it is finished, a source once. A tool
 * call is said every time its state changes, under the same id, so the
 * running call becomes the finished one in place.
 *
 * What has been said is remembered per PIECE, not per position: a call by
 * its id, anything else by its place among its own kind. A stack may slot
 * a call in ahead of parts that are already there (its input was still
 * streaming), and nothing after it is said twice.
 */
export function createPartsReader(options: StackOptions = {}) {
  const textSent = new Map<string, number>()
  const said = new Map<string, string>()
  let wroteText = false

  return function read(
    parts: readonly StackPart[],
    finished: boolean
  ): AmbientAnswerEvent[] {
    const events: AmbientAnswerEvent[] = []
    const seen: Record<string, number> = {}
    parts.forEach((part, index) => {
      const key =
        part.type === "tool"
          ? `tool:${part.id}`
          : `${part.type}:${(seen[part.type] = (seen[part.type] ?? -1) + 1)}`
      const settled = finished || index < parts.length - 1
      switch (part.type) {
        case "text": {
          const sent = textSent.get(key)
          // a later text part (after a tool step) is a new paragraph
          if (sent === undefined && part.text && wroteText)
            events.push({ type: "text", delta: "\n\n" })
          const from = sent ?? 0
          if (part.text.length > from) {
            events.push({ type: "text", delta: part.text.slice(from) })
            wroteText = true
          }
          if (part.text) textSent.set(key, part.text.length)
          break
        }
        case "reasoning": {
          if (said.has(key) || !(part.done || settled)) return
          said.set(key, "")
          const block = reasoningBlock(part.text)
          if (block) events.push({ type: "evidence", block })
          break
        }
        case "tool": {
          const block = toolCallBlock(part, options)
          const signature = JSON.stringify(block)
          if (said.get(key) === signature) return
          said.set(key, signature)
          if (block) events.push({ type: "evidence", block })
          break
        }
        case "source": {
          if (said.has(key)) return
          said.set(key, "")
          const ref = sourceReference(part)
          if (ref) events.push({ type: "refs", refs: [ref] })
          break
        }
        case "data": {
          if (said.has(key)) return
          said.set(key, "")
          const event = ambientDataEvent(part.name, part.data)
          if (event) events.push(event)
          break
        }
      }
    })
    return events
  }
}

/** A finished (or still growing) message as an answer, for a thread view. */
export function answerFromParts(
  parts: readonly StackPart[],
  finished: boolean,
  options: StackOptions = {}
): AmbientAnswer {
  return createPartsReader(options)(parts, finished).reduce(
    applyAnswerEvent,
    EMPTY_ANSWER
  )
}

/** Which calls are still the person's to answer. */
export const openCalls = (parts: readonly StackPart[]) =>
  parts.filter(
    (part): part is StackToolPart =>
      part.type === "tool" &&
      (part.state === "waiting" ||
        (part.state === "approval" && part.approval?.approved === undefined))
  )

/** Calls the answer cannot end on: the person's, and ones still out. */
export const unfinishedCalls = (parts: readonly StackPart[]) =>
  parts.filter(
    (part) =>
      part.type === "tool" &&
      (part.state === "running" ||
        part.state === "waiting" ||
        (part.state === "approval" && part.approval?.approved === undefined))
  )

/**
 * How many times one answer may continue after the browser's tools, on an
 * adapter that runs the rounds itself. A model that keeps calling a tool
 * is stopped there, with an error.
 */
export const MAX_ROUNDS = 8

/** What the turn fails with when it used up its rounds. */
export const tooManyRounds = (rounds: number): AmbientAnswerEvent => ({
  type: "error",
  message: `The assistant was still calling tools after ${rounds} rounds, and was stopped.`,
})

/** What a call the browser was left with, and has no tool for, fails with. */
export const noBrowserTool = (name: string) =>
  `No tool named "${name}" is registered in the browser, so this call was never answered.`

/** `respond` was given an id nothing is waiting on (the turn was stopped). */
export class NotWaitingError extends Error {
  constructor() {
    super("That is no longer waiting for an answer.")
    this.name = "NotWaitingError"
  }
}

/**
 * WHERE AN ANSWER WAITS FOR THE PERSON. The adapter waits on a block's id,
 * BEFORE it sends the block, so there is always a waiter by the time
 * anyone can answer; `answer` (the Ambient API's `respond`) delivers.
 * Nothing is kept for an id nobody waits on: `answer` throws, so a click
 * on a stopped turn's block is told so instead of being held forever.
 */
export function createWaitingRoom<T extends { id: string }>() {
  const waiters = new Map<string, (response: T) => void>()
  return {
    answer(response: T) {
      const waiter = waiters.get(response.id)
      if (!waiter) throw new NotWaitingError()
      waiter(response)
    },
    /** Resolves with the answer, or null when the turn is stopped. */
    wait(id: string, signal: AbortSignal) {
      return new Promise<T | null>((resolve) => {
        // a listener on a signal that already fired would never run
        if (signal.aborted) return resolve(null)
        const stop = () => {
          waiters.delete(id)
          resolve(null)
        }
        signal.addEventListener("abort", stop, { once: true })
        waiters.set(id, (response) => {
          signal.removeEventListener("abort", stop)
          waiters.delete(id)
          resolve(response)
        })
      })
    },
  }
}

/**
 * A push → pull bridge. Stacks that report through callbacks (a thread's
 * subscribe, an agent's subscriber) push into it; the adapter's generator
 * pulls from it. `close` ends the stream, `fail` ends it with an error.
 */
export function createPushQueue<T>() {
  const items: T[] = []
  let done = false
  let failure: { error: unknown } | null = null
  let wake: (() => void) | null = null
  const notify = () => {
    wake?.()
    wake = null
  }
  return {
    push(item: T) {
      if (done) return
      items.push(item)
      notify()
    },
    close() {
      done = true
      notify()
    },
    fail(error: unknown) {
      if (done) return
      failure = { error }
      done = true
      notify()
    },
    async *drain(): AsyncGenerator<T> {
      for (;;) {
        while (items.length) yield items.shift()!
        if (failure) throw failure.error
        if (done) return
        await new Promise<void>((resolve) => (wake = resolve))
      }
    },
  }
}

/* --------------------- a run on a thread the stack keeps ------------------ */

/** What a thread-backed stack's run looks like right now. */
export type RunSnapshot = {
  /** The answer's message so far. */
  parts: readonly StackPart[]
  /** The run has stopped (it may still be owed a continuation). */
  idle: boolean
  /** Why the run failed, when it did. "" is a failure with no reason given. */
  failure?: string | null
}

/**
 * ONE RUN, PUMPED INTO ANSWER EVENTS. The stack calls `update` whenever
 * its thread changes; each call says what is new and decides whether the
 * answer is over. It is not over while a call is the person's or still
 * out, nor while `owes` says the stack is about to continue.
 */
export function createRunPump(
  snapshot: () => RunSnapshot,
  options: StackOptions & {
    /**
     * True while a continuation of this answer is due (see each adapter).
     * "over" when one was due and nobody made it: the answer ends where it
     * is, even with a call that was allowed and never ran.
     */
    owes?: () => boolean | "over"
  } = {}
) {
  const queue = createPushQueue<AmbientAnswerEvent>()
  const read = createPartsReader(options)
  return {
    events: queue,
    update() {
      const { parts, idle, failure } = snapshot()
      const open = idle ? unfinishedCalls(parts) : []
      for (const event of read(parts, idle && !open.length)) queue.push(event)
      if (!idle) return
      if (failure != null) {
        queue.push({ type: "error", message: failure })
        return queue.close()
      }
      // a call that is the person's to answer: nothing is owed until they do
      if (openCalls(parts).length) return
      const owed = options.owes?.()
      if (owed !== "over" && (open.length || owed)) return
      queue.close()
    },
  }
}

/** The turn for "asked, and nothing has come back yet". */
export const PENDING_TURN: AmbientConversationTurn = {
  id: "pending",
  role: "assistant",
  answer: EMPTY_ANSWER,
  running: true,
}

/**
 * The thread's LAST answer, when it answers `question`. Regenerating
 * replaces that one; an earlier answer cannot be redone on a thread
 * without dropping every turn after it, so it is asked as a new turn.
 */
export function lastAnswerTo<M extends { role: string }>(
  messages: readonly M[],
  question: string,
  textOf: (message: M) => string
): M | undefined {
  const last = messages[messages.length - 1]
  const asked = messages[messages.length - 2]
  return last?.role === "assistant" &&
    asked?.role === "user" &&
    textOf(asked) === question
    ? last
    : undefined
}

/**
 * THE THREAD AS TURNS, REBUILT CHEAPLY. A stack reports every token, and
 * only the answer being written changes. So the turns are rebuilt only
 * after the stack said something changed (`invalidate`); a finished turn
 * keeps the one it was given the first time; and the list handed out is
 * the same array until some turn in it differs.
 *
 * A finished turn is known by a KEY: the message object itself, for a
 * stack whose messages are replaced when they change, or a string, for a
 * stack that has to say what a turn is made of (several messages, by id).
 * String keys that a rebuild did not ask for are forgotten.
 */
export function createTurnList() {
  const byObject = new WeakMap<object, AmbientConversationTurn>()
  let byName = new Map<string, AmbientConversationTurn>()
  let asked = new Map<string, AmbientConversationTurn>()
  let list: readonly AmbientConversationTurn[] = []
  let stale = true
  return {
    /** The turn for one key; `live` ones are built every time. */
    turn(key: object | string, live: boolean, build: () => AmbientConversationTurn) {
      if (live) return build()
      if (typeof key === "string") {
        const turn = byName.get(key) ?? build()
        asked.set(key, turn)
        return turn
      }
      let turn = byObject.get(key)
      if (!turn) byObject.set(key, (turn = build()))
      return turn
    },
    invalidate: () => void (stale = true),
    get(compute: () => AmbientConversationTurn[]) {
      if (!stale) return list
      stale = false
      asked = new Map()
      const next = compute()
      byName = asked
      if (next.length !== list.length || next.some((turn, i) => turn !== list[i]))
        list = next
      return list
    },
  }
}
