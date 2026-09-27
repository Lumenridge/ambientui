import { z } from "zod"

import type { IconName } from "@ambient-ui/ui/components/icon"

import type { ContextChip } from "./assistant-context"
import type {
  DiffHunk,
  DiffLine,
  FileStat,
  ParallelCall,
  TimelineStep,
} from "./tool-kit"
import type { KitBlock, KitReference, KitResponse } from "./response-kit"
import type { ReasoningStep } from "./message-kit"
import type { ReportSection, SearchSource } from "./knowledge-kit"

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
 * parsed against the schemas below before anything renders, so a backend
 * that returns the wrong shape produces the failure state with its reason,
 * not a crash three components deep. The schemas are typed against the
 * kits' own interfaces, so the grammar and its validation cannot drift.
 *
 * `createAssistantApi` is the one way in: pass it the host's functions and
 * hand the result to the provider.
 *
 * AN ANSWER CAN ARRIVE WHOLE OR AS A STREAM. `ask` may resolve to a finished
 * KitResponse (a REST endpoint) or return an async iterable of AskEvents
 * (text deltas, evidence and artifact blocks, refs, follow-ups). The layer
 * only ever sees the iterable, so any transport that can become one fits:
 * server-sent events today (`eventsFromSSE`), and a WebSocket, a WebRTC data
 * channel or a gRPC stream later, each needing only its own small adapter.
 *
 *   export const assistantApi = createAssistantApi({
 *     ask: (input, { signal }) => http.post("/assistant/ask", input, { signal }),
 *     suggestions: (input, { signal }) => http.post("/assistant/suggestions", input, { signal }),
 *     recents: ({ signal }) => http.get("/assistant/recents", { signal }),
 *   })
 */

/* ------------------------------- schemas -------------------------------- */

// Icon names are the host's own vocabulary, drawn by its configured library;
// the boundary checks the shape, the Icon component resolves the name.
const iconName = z.string() as unknown as z.ZodType<IconName>

const contextChip: z.ZodType<ContextChip> = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum([
    "page",
    "control",
    "target",
    "cell",
    "file",
    "symbol",
    "selection",
  ]),
  icon: iconName.optional(),
})

const reference: z.ZodType<KitReference> = z.object({
  label: z.string(),
  icon: iconName.optional(),
  logo: z.string().optional(),
  href: z.string().optional(),
})

const reasoningStep: z.ZodType<ReasoningStep> = z.object({
  title: z.string(),
  detail: z.string().optional(),
})

const parallelCall: z.ZodType<ParallelCall> = z.object({
  tool: z.string(),
  target: z.string().optional(),
  status: z.enum(["running", "done", "failed"]).optional(),
  duration: z.string().optional(),
})

const searchSource: z.ZodType<SearchSource> = z.object({
  title: z.string(),
  domain: z.string(),
  href: z.string().optional(),
  logo: z.string().optional(),
})

const diffLine: z.ZodType<DiffLine> = z.object({
  sign: z.enum([" ", "+", "-"]),
  text: z.string(),
})

const diffHunk: z.ZodType<DiffHunk> = z.object({
  header: z.string().optional(),
  lines: z.array(diffLine),
})

const timelineStep: z.ZodType<TimelineStep> = z.object({
  verb: z.string(),
  target: z.string().optional(),
  icon: iconName.optional(),
})

const fileStat: z.ZodType<FileStat> = z.object({
  path: z.string(),
  added: z.number().optional(),
  removed: z.number().optional(),
})

const reportSection: z.ZodType<ReportSection> = z.object({
  title: z.string(),
  body: z.string().optional(),
  status: z.enum(["done", "running", "pending"]).optional(),
  sources: z.number().optional(),
})

export const kitBlockSchema: z.ZodType<KitBlock> = z.discriminatedUnion(
  "kind",
  [
    z.object({
      kind: z.literal("reasoning"),
      steps: z.array(reasoningStep),
      seconds: z.number().optional(),
    }),
    z.object({
      kind: z.literal("parallel"),
      summary: z.string(),
      calls: z.array(parallelCall),
    }),
    z.object({
      kind: z.literal("tool"),
      verb: z.string(),
      request: z.string().optional(),
      result: z.string().optional(),
    }),
    z.object({
      kind: z.literal("search"),
      query: z.string(),
      sources: z.array(searchSource),
    }),
    z.object({
      kind: z.literal("diff"),
      path: z.string(),
      lines: z.array(diffLine),
    }),
    z.object({
      kind: z.literal("review"),
      path: z.string(),
      hunks: z.array(diffHunk),
    }),
    z.object({
      kind: z.literal("terminal"),
      command: z.string(),
      lines: z.array(z.string()),
      exitCode: z.number().optional(),
    }),
    z.object({
      kind: z.literal("timeline"),
      steps: z.array(timelineStep),
      files: z.array(fileStat).optional(),
    }),
    z.object({
      kind: z.literal("failure"),
      tool: z.string(),
      target: z.string().optional(),
      error: z.string(),
      attempt: z.number().optional(),
      attempts: z.number().optional(),
    }),
    z.object({
      kind: z.literal("report"),
      title: z.string(),
      sections: z.array(reportSection),
      sourcesRead: z.number().optional(),
    }),
  ]
)

export const kitResponseSchema: z.ZodType<KitResponse> = z.object({
  text: z.string(),
  refs: z.array(reference),
  evidence: z.array(kitBlockSchema).optional(),
  artifacts: z.array(kitBlockSchema).optional(),
  followUps: z.array(z.string()).optional(),
  effect: z.string().optional(),
})

/** One earlier turn of the conversation, as text. */
export const historyTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
})
export type HistoryTurn = z.infer<typeof historyTurnSchema>

/**
 * What every question carries: the question, what the person is looking at,
 * and the conversation it belongs to. `history` is every earlier turn in
 * order (answers as their prose), so a stateless server can answer in
 * context; `conversationId` is stable until the conversation is cleared, so
 * a server that keeps its own threads can key on it instead.
 */
export const askInputSchema = z.object({
  question: z.string().min(1),
  conversationId: z.string(),
  history: z.array(historyTurnSchema),
  pageChip: contextChip.nullable(),
  chips: z.array(contextChip),
})
export type AskInput = z.infer<typeof askInputSchema>

/** What the suggestions endpoint is told: where the person is. */
export const suggestionsInputSchema = z.object({
  pageChip: contextChip.nullable(),
})
export type SuggestionsInput = z.infer<typeof suggestionsInputSchema>

export const suggestionsSchema = z.array(z.string())

/**
 * One piece of a streamed answer. The layer assembles them into a
 * KitResponse in arrival order, so send evidence before the prose that rests
 * on it. `response` replaces everything so far with a complete answer (a
 * stream may end with one); `error` fails the turn with its message.
 */
export const askEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("evidence"), block: kitBlockSchema }),
  z.object({ type: z.literal("text"), delta: z.string() }),
  z.object({ type: z.literal("artifact"), block: kitBlockSchema }),
  z.object({ type: z.literal("refs"), refs: z.array(reference) }),
  z.object({ type: z.literal("followUps"), followUps: z.array(z.string()) }),
  z.object({ type: z.literal("effect"), effect: z.string() }),
  z.object({ type: z.literal("response"), response: kitResponseSchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
])
export type AskEvent = z.infer<typeof askEventSchema>

/** The answer so far, with one more event applied. */
export function applyAskEvent(
  kit: KitResponse,
  event: AskEvent
): KitResponse {
  switch (event.type) {
    case "evidence":
      return { ...kit, evidence: [...(kit.evidence ?? []), event.block] }
    case "text":
      return { ...kit, text: kit.text + event.delta }
    case "artifact":
      return { ...kit, artifacts: [...(kit.artifacts ?? []), event.block] }
    case "refs":
      return { ...kit, refs: [...kit.refs, ...event.refs] }
    case "followUps":
      return { ...kit, followUps: event.followUps }
    case "effect":
      return { ...kit, effect: event.effect }
    case "response":
      return event.response
    case "error":
      return kit
  }
}

/** Where an answer starts before its first event. */
export const EMPTY_RESPONSE: KitResponse = { text: "", refs: [] }

export const recentSchema = z.object({ text: z.string(), when: z.string() })
export const recentsSchema = z.array(recentSchema)
export type Recent = z.infer<typeof recentSchema>

/* -------------------------------- the api ------------------------------- */

export type RequestOptions = { signal: AbortSignal }

/**
 * What the host implements. Only `ask` is required; without `suggestions`
 * and `recents` the palette simply offers none (a page can still announce
 * its own through PageIntel, for state only the page knows).
 */
export type AssistantApiHandlers = {
  /**
   * Resolve to a finished KitResponse (REST), or return an async iterable of
   * AskEvents (a stream). Either shape is validated before it renders.
   */
  ask: (
    input: AskInput,
    options: RequestOptions
  ) => Promise<unknown> | AsyncIterable<unknown>
  suggestions?: (
    input: SuggestionsInput,
    options: RequestOptions
  ) => Promise<unknown>
  recents?: (options: RequestOptions) => Promise<unknown>
}

/**
 * What the layer calls: the same functions, validated on both sides. `ask`
 * is always a stream to the layer; a whole answer arrives as one `response`
 * event.
 */
export type AssistantApi = {
  ask: (input: AskInput, options: RequestOptions) => AsyncIterable<AskEvent>
  suggestions: (
    input: SuggestionsInput,
    options: RequestOptions
  ) => Promise<string[]>
  recents: (options: RequestOptions) => Promise<Recent[]>
}

/**
 * A request that could not be answered: the handler threw, or what came
 * back does not match the contract. `message` is what the person reads.
 */
export class AssistantApiError extends Error {
  constructor(
    message: string,
    readonly endpoint: keyof AssistantApiHandlers,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = "AssistantApiError"
  }
}

const isAbort = (error: unknown, signal: AbortSignal) =>
  signal.aborted ||
  (error instanceof DOMException && error.name === "AbortError")

function contractError(
  endpoint: keyof AssistantApiHandlers,
  what: string,
  error: z.ZodError
) {
  const issue = error.issues[0]
  const where = issue?.path.length ? ` at ${issue.path.join(".")}` : ""
  return new AssistantApiError(
    `The ${what} did not match the assistant's contract${where}: ${issue?.message ?? "invalid shape"}.`,
    endpoint,
    error
  )
}

async function call<T>(
  endpoint: keyof AssistantApiHandlers,
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
    throw new AssistantApiError(failureDetail(error), endpoint, error)
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
  handler: AssistantApiHandlers["ask"],
  input: AskInput,
  options: RequestOptions
): AsyncGenerator<AskEvent> {
  let result: unknown
  try {
    result = await handler(askInputSchema.parse(input), options)
  } catch (error) {
    if (isAbort(error, options.signal)) throw error
    throw new AssistantApiError(failureDetail(error), "ask", error)
  }
  if (!isAsyncIterable(result)) {
    const parsed = kitResponseSchema.safeParse(result)
    if (!parsed.success) throw contractError("ask", "ask response", parsed.error)
    yield { type: "response", response: parsed.data }
    return
  }
  try {
    for await (const raw of result) {
      const parsed = askEventSchema.safeParse(raw)
      if (!parsed.success) throw contractError("ask", "ask event", parsed.error)
      if (parsed.data.type === "error")
        throw new AssistantApiError(parsed.data.message, "ask")
      yield parsed.data
    }
  } catch (error) {
    if (isAbort(error, options.signal) || error instanceof AssistantApiError)
      throw error
    throw new AssistantApiError(failureDetail(error), "ask", error)
  }
}

export function createAssistantApi(
  handlers: AssistantApiHandlers
): AssistantApi {
  return {
    ask: (input, options) => askStream(handlers.ask, input, options),
    suggestions: (input, options) =>
      handlers.suggestions
        ? call(
            "suggestions",
            () =>
              handlers.suggestions!(
                suggestionsInputSchema.parse(input),
                options
              ),
            suggestionsSchema,
            options.signal
          )
        : Promise.resolve([]),
    recents: (options) =>
      handlers.recents
        ? call(
            "recents",
            () => handlers.recents!(options),
            recentsSchema,
            options.signal
          )
        : Promise.resolve([]),
  }
}

/**
 * What the layer uses when no host has connected an API: every question
 * fails with the reason, so the failure state says what is missing instead
 * of an answer pretending to be one.
 */
export const disconnectedApi: AssistantApi = createAssistantApi({
  ask: async () => {
    throw new Error(
      "No assistant API is connected. Pass one to <AssistantProvider api>."
    )
  },
})

/* ------------------------------ transports ------------------------------ */

/**
 * SERVER-SENT EVENTS → AskEvents. For a host whose `ask` endpoint streams
 * `text/event-stream`: each event's `data:` line is one AskEvent as JSON,
 * and `data: [DONE]` (or the end of the body) ends the answer.
 *
 *   ask: async (input, { signal }) =>
 *     eventsFromSSE(await fetch("/assistant/ask/stream", {
 *       method: "POST", body: JSON.stringify(input), signal,
 *     }))
 *
 * Any other transport — a WebSocket, a WebRTC data channel, a gRPC stream —
 * needs only the same thing: turn its messages into an async iterable of
 * AskEvents. The layer does not change.
 */
export async function* eventsFromSSE(
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
