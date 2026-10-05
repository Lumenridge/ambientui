import {
  applyAnswerEvent,
  EMPTY_ANSWER,
  type AmbientApiHandlers,
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
  followUps: "ambient-followUps",
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
  if (call.approval && (call.state === "approval" || call.state === "denied"))
    return {
      kind: "approval",
      id: call.id,
      tool: verb,
      request,
      reason: call.approval.reason,
      decision: call.state === "denied" ? "denied" : undefined,
    }
  const drawn = options.toolBlock?.(call)
  if (drawn !== undefined) return drawn && { ...drawn, id: call.id }
  if (call.state === "failed" || call.state === "denied")
    return {
      kind: "failure",
      id: call.id,
      tool: verb,
      target: request,
      error: call.error ?? "Denied.",
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
 */
export function createPartsReader(options: StackOptions = {}) {
  const textSent = new Map<number, number>()
  const said = new Map<number, string>()
  let wroteText = false

  return function read(
    parts: readonly StackPart[],
    finished: boolean
  ): AmbientAnswerEvent[] {
    const events: AmbientAnswerEvent[] = []
    parts.forEach((part, index) => {
      const settled = finished || index < parts.length - 1
      switch (part.type) {
        case "text": {
          const sent = textSent.get(index)
          // a later text part (after a tool step) is a new paragraph
          if (sent === undefined && part.text && wroteText)
            events.push({ type: "text", delta: "\n\n" })
          const from = sent ?? 0
          if (part.text.length > from) {
            events.push({ type: "text", delta: part.text.slice(from) })
            wroteText = true
          }
          if (part.text) textSent.set(index, part.text.length)
          break
        }
        case "reasoning": {
          if (said.has(index) || !(part.done || settled)) return
          said.set(index, "")
          const block = reasoningBlock(part.text)
          if (block) events.push({ type: "evidence", block })
          break
        }
        case "tool": {
          const block = toolCallBlock(part, options)
          const signature = JSON.stringify(block)
          if (said.get(index) === signature) return
          said.set(index, signature)
          if (block) events.push({ type: "evidence", block })
          break
        }
        case "source": {
          if (said.has(index)) return
          said.set(index, "")
          const ref = sourceReference(part)
          if (ref) events.push({ type: "refs", refs: [ref] })
          break
        }
        case "data": {
          if (said.has(index)) return
          said.set(index, "")
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
 * WHERE AN ANSWER WAITS FOR THE PERSON. The adapter waits on a block's id;
 * `answer` (the Ambient API's `respond`) delivers. An answer that arrives
 * before anyone waits is kept, so a fast click is never lost.
 */
export function createWaitingRoom<T extends { id: string }>() {
  const waiters = new Map<string, (response: T) => void>()
  const early = new Map<string, T>()
  return {
    answer(response: T) {
      const waiter = waiters.get(response.id)
      if (waiter) waiter(response)
      else early.set(response.id, response)
    },
    /** Resolves with the answer, or null when the turn is stopped. */
    wait(id: string, signal: AbortSignal) {
      return new Promise<T | null>((resolve) => {
        const kept = early.get(id)
        if (kept) {
          early.delete(id)
          return resolve(kept)
        }
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

/**
 * A thread view that is recomputed only when the stack said something
 * changed, so `getTurns` keeps returning the same array in between.
 */
export function cachedTurns<T>(compute: () => readonly T[]) {
  let turns: readonly T[] | null = null
  return {
    get: () => (turns ??= compute()),
    invalidate: () => void (turns = null),
  }
}
