import type { z } from "zod"

import type { AmbientAnswer, AmbientBlock } from "./response-kit"
import {
  ambientAnswerEventSchema,
  ambientAnswerSchema,
  ambientQuestionSchema,
  ambientRecentsSchema,
  ambientResponseSchema,
  ambientSuggestionsInputSchema,
  ambientSuggestionsSchema,
  type AmbientAnswerEvent,
  type AmbientQuestion,
  type AmbientRecent,
  type AmbientResponse,
  type AmbientSuggestionsInput,
} from "./responder-schemas"
/**
 * THE ASSISTANT API — the contract between the layer and the host's server.
 *
 * The layer never makes a request. It calls the functions the host hands to
 * `<AssistantProvider api>`, and the host decides where they go: its own
 * backend, a model it runs, or stubs while neither exists. Which one is a
 * setting of the HOST'S API layer, never of this one — the layer cannot
 * tell, and must not need to.
 *
 * What the layer owns is the boundary. Every request and every response is
 * parsed against the schemas in responder-schemas.ts before anything renders, so a backend
 * that returns the wrong shape produces the failure state with its reason,
 * not a crash three components deep. The schemas are typed against the
 * kits' own interfaces, so the grammar and its validation cannot drift.
 *
 * `createAmbientApi` is the one way in: pass it the host's functions and
 * hand the result to the provider.
 *
 * AN ANSWER CAN ARRIVE WHOLE OR AS A STREAM. `ask` may resolve to a finished
 * AmbientAnswer (a REST endpoint) or return an async iterable of AmbientAnswerEvents
 * (text deltas, evidence and artifact blocks, refs, follow-ups). The layer
 * only ever sees the iterable, so any transport that can become one fits:
 * server-sent events today (`answerEventsFromSSE`), and a WebSocket, a WebRTC data
 * channel or a gRPC stream later, each needing only its own small adapter.
 *
 *   export const ambientApi = createAmbientApi({
 *     ask: (input, { signal }) => http.post("/ambient/ask", input, { signal }),
 *     suggestions: (input, { signal }) => http.post("/ambient/suggestions", input, { signal }),
 *     recents: ({ signal }) => http.get("/ambient/recents", { signal }),
 *   })
 */

/* ------------------------------- answers -------------------------------- */

/** A block joins its list, or takes the place of the one with its id. */
const withBlock = (blocks: AmbientBlock[] = [], block: AmbientBlock) => {
  const at = block.id ? blocks.findIndex((b) => b.id === block.id) : -1
  return at < 0
    ? [...blocks, block]
    : blocks.map((b, i) => (i === at ? block : b))
}

/** The answer so far, with one more event applied. */
export function applyAnswerEvent(
  kit: AmbientAnswer,
  event: AmbientAnswerEvent
): AmbientAnswer {
  switch (event.type) {
    case "evidence":
      return { ...kit, evidence: withBlock(kit.evidence, event.block) }
    case "text":
      return { ...kit, text: kit.text + event.delta }
    case "artifact":
      return { ...kit, artifacts: withBlock(kit.artifacts, event.block) }
    case "refs":
      return { ...kit, refs: [...kit.refs, ...event.refs] }
    case "followUps":
      return { ...kit, followUps: event.followUps }
    case "effect":
      return { ...kit, effect: event.effect }
    case "answer":
      return event.answer
    case "error":
      return kit
  }
}

/** Where an answer starts before its first event. */
export const EMPTY_ANSWER: AmbientAnswer = { text: "", refs: [] }

/* -------------------------------- the api ------------------------------- */

export type AmbientRequestOptions = { signal: AbortSignal }

/**
 * One turn of a conversation the HOST keeps (see `conversation` below). An
 * assistant turn carries its answer in the layer's own grammar; `running`
 * while the host is still producing it.
 */
export type AmbientConversationTurn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; answer: AmbientAnswer; running?: boolean }

/**
 * A CONVERSATION THE HOST KEEPS. A host whose chat stack owns the thread
 * (assistant-ui, CopilotKit, the AI SDK's Chat) hands the layer a view of
 * it, and the layer's transcript follows: a turn that started anywhere in
 * the product shows in the layer, and the two never disagree.
 *
 * `getTurns` must return the same array until something changed (it is
 * read the way a store snapshot is).
 */
export type AmbientConversation = {
  subscribe: (listener: () => void) => () => void
  getTurns: () => readonly AmbientConversationTurn[]
  /** Cancel the run in flight, for a turn the layer did not start. */
  stop?: () => void
}

/**
 * What the host implements. Only `ask` is required; without `suggestions`
 * and `recents` the palette simply offers none (a page can still announce
 * its own through PageIntel, for state only the page knows).
 */
export type AmbientApiHandlers = {
  /**
   * Resolve to a finished AmbientAnswer (REST), or return an async iterable of
   * AmbientAnswerEvents (a stream). Either shape is validated before it renders.
   */
  ask: (
    input: AmbientQuestion,
    options: AmbientRequestOptions
  ) => Promise<unknown> | AsyncIterable<unknown>
  suggestions?: (
    input: AmbientSuggestionsInput,
    options: AmbientRequestOptions
  ) => Promise<unknown>
  recents?: (options: AmbientRequestOptions) => Promise<unknown>
  /**
   * The person answered a waiting block: approved or denied a tool, or gave
   * a waiting call its output. The answer in flight continues from it.
   */
  respond?: (response: AmbientResponse) => void | Promise<void>
  /** The person cleared the conversation; a host that keeps a thread clears it. */
  reset?: () => void | Promise<void>
  /** The host's own thread, when it keeps one. */
  conversation?: AmbientConversation
}

/**
 * What the layer calls: the same functions, validated on both sides. `ask`
 * is always a stream to the layer; a whole answer arrives as one `answer`
 * event.
 */
export type AmbientApi = {
  ask: (input: AmbientQuestion, options: AmbientRequestOptions) => AsyncIterable<AmbientAnswerEvent>
  suggestions: (
    input: AmbientSuggestionsInput,
    options: AmbientRequestOptions
  ) => Promise<string[]>
  recents: (options: AmbientRequestOptions) => Promise<AmbientRecent[]>
  respond: (response: AmbientResponse) => Promise<void>
  reset: () => Promise<void>
  conversation: AmbientConversation | null
}

/**
 * A request that could not be answered: the handler threw, or what came
 * back does not match the contract. `message` is what the person reads.
 */
export class AmbientApiError extends Error {
  constructor(
    message: string,
    readonly endpoint: keyof AmbientApiHandlers,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = "AmbientApiError"
  }
}

const isAbort = (error: unknown, signal: AbortSignal) =>
  signal.aborted ||
  (error instanceof DOMException && error.name === "AbortError")

function contractError(
  endpoint: keyof AmbientApiHandlers,
  what: string,
  error: z.ZodError
) {
  const issue = error.issues[0]
  const where = issue?.path.length ? ` at ${issue.path.join(".")}` : ""
  return new AmbientApiError(
    `The ${what} did not match the assistant's contract${where}: ${issue?.message ?? "invalid shape"}.`,
    endpoint,
    error
  )
}

async function call<T>(
  endpoint: keyof AmbientApiHandlers,
  run: () => Promise<unknown>,
  schema: z.ZodType<T>,
  signal: AbortSignal
): Promise<T> {
  let raw: unknown
  try {
    raw = await run()
  } catch (error) {
    // an abort is not a failure: whoever aborted already knows
    if (isAbort(error, signal)) throw error
    throw new AmbientApiError(failureDetail(error), endpoint, error)
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success)
    throw contractError(endpoint, `${endpoint} response`, parsed.error)
  return parsed.data
}

const isAsyncIterable = (value: unknown): value is AsyncIterable<unknown> =>
  typeof value === "object" &&
  value !== null &&
  Symbol.asyncIterator in value

async function* askStream(
  handler: AmbientApiHandlers["ask"],
  input: AmbientQuestion,
  options: AmbientRequestOptions
): AsyncGenerator<AmbientAnswerEvent> {
  let result: unknown
  try {
    result = await handler(ambientQuestionSchema.parse(input), options)
  } catch (error) {
    if (isAbort(error, options.signal)) throw error
    throw new AmbientApiError(failureDetail(error), "ask", error)
  }
  if (!isAsyncIterable(result)) {
    const parsed = ambientAnswerSchema.safeParse(result)
    if (!parsed.success) throw contractError("ask", "ask response", parsed.error)
    yield { type: "answer", answer: parsed.data }
    return
  }
  try {
    for await (const raw of result) {
      const parsed = ambientAnswerEventSchema.safeParse(raw)
      if (!parsed.success) throw contractError("ask", "ask event", parsed.error)
      if (parsed.data.type === "error")
        throw new AmbientApiError(parsed.data.message, "ask")
      yield parsed.data
    }
  } catch (error) {
    if (isAbort(error, options.signal) || error instanceof AmbientApiError)
      throw error
    throw new AmbientApiError(failureDetail(error), "ask", error)
  }
}

export function createAmbientApi(
  handlers: AmbientApiHandlers
): AmbientApi {
  return {
    ask: (input, options) => askStream(handlers.ask, input, options),
    suggestions: (input, options) =>
      handlers.suggestions
        ? call(
            "suggestions",
            () =>
              handlers.suggestions!(
                ambientSuggestionsInputSchema.parse(input),
                options
              ),
            ambientSuggestionsSchema,
            options.signal
          )
        : Promise.resolve([]),
    recents: (options) =>
      handlers.recents
        ? call(
            "recents",
            () => handlers.recents!(options),
            ambientRecentsSchema,
            options.signal
          )
        : Promise.resolve([]),
    respond: async (response) => {
      await handlers.respond?.(ambientResponseSchema.parse(response))
    },
    reset: async () => {
      await handlers.reset?.()
    },
    conversation: handlers.conversation
      ? checkedConversation(handlers.conversation)
      : null,
  }
}

/**
 * The host's thread, with every answer checked against the contract. A turn
 * whose answer does not match is left out, so a malformed block cannot
 * reach a component; the check runs once per change, not per read.
 */
function checkedConversation(source: AmbientConversation): AmbientConversation {
  let seen: readonly AmbientConversationTurn[] | null = null
  let checked: readonly AmbientConversationTurn[] = []
  return {
    subscribe: source.subscribe,
    stop: source.stop,
    getTurns() {
      const turns = source.getTurns()
      if (turns === seen) return checked
      seen = turns
      checked = turns.flatMap((turn): AmbientConversationTurn[] => {
        if (turn.role === "user") return [turn]
        const parsed = ambientAnswerSchema.safeParse(turn.answer)
        return parsed.success ? [{ ...turn, answer: parsed.data }] : []
      })
      return checked
    },
  }
}

/**
 * What the layer uses when no host has connected an API: every question
 * fails with the reason, so the failure state says what is missing instead
 * of an answer pretending to be one.
 */
export const disconnectedAmbientApi: AmbientApi = createAmbientApi({
  ask: async () => {
    throw new Error(
      "No Ambient API is connected. Pass one to <AssistantProvider api>."
    )
  },
})

/* ------------------------------ transports ------------------------------ */

/**
 * SERVER-SENT EVENTS → AmbientAnswerEvents. For a host whose `ask` endpoint streams
 * `text/event-stream`: each event's `data:` line is one AmbientAnswerEvent as JSON,
 * and `data: [DONE]` (or the end of the body) ends the answer.
 *
 *   ask: async (input, { signal }) =>
 *     answerEventsFromSSE(await fetch("/ambient/ask/stream", {
 *       method: "POST", body: JSON.stringify(input), signal,
 *     }))
 *
 * Any other transport — a WebSocket, a WebRTC data channel, a gRPC stream —
 * needs only the same thing: turn its messages into an async iterable of
 * AmbientAnswerEvents. The layer does not change.
 */
export async function* answerEventsFromSSE(
  response: Response
): AsyncGenerator<unknown> {
  if (!response.ok)
    throw new Error(`The assistant request failed (${response.status}).`)
  if (!response.body) throw new Error("The assistant stream had no body.")
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      let end: number
      while ((end = buffer.search(/\r?\n\r?\n/)) >= 0) {
        const block = buffer.slice(0, end)
        buffer = buffer.slice(end).replace(/^\r?\n\r?\n/, "")
        const data = block
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, ""))
          .join("\n")
        if (!data) continue
        if (data === "[DONE]") return
        yield JSON.parse(data)
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/** What a failed turn says, when the error has anything worth saying. */
export function failureDetail(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return "The assistant could not answer."
}
