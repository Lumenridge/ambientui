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

/** What every question carries: the question, and what the person is looking at. */
export const askInputSchema = z.object({
  question: z.string().min(1),
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
  ask: (input: AskInput, options: RequestOptions) => Promise<unknown>
  suggestions?: (
    input: SuggestionsInput,
    options: RequestOptions
  ) => Promise<unknown>
  recents?: (options: RequestOptions) => Promise<unknown>
}

/** What the layer calls: the same functions, validated on both sides. */
export type AssistantApi = {
  ask: (input: AskInput, options: RequestOptions) => Promise<KitResponse>
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

async function call<T>(
  endpoint: keyof AssistantApiHandlers,
  run: () => Promise<unknown>,
  schema: z.ZodType<T>
): Promise<T> {
  let raw: unknown
  try {
    raw = await run()
  } catch (error) {
    // an abort is not a failure: whoever aborted already knows
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new AssistantApiError(failureDetail(error), endpoint, error)
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue?.path.length ? ` at ${issue.path.join(".")}` : ""
    throw new AssistantApiError(
      `The ${endpoint} response did not match the assistant's contract${where}: ${issue?.message ?? "invalid shape"}.`,
      endpoint,
      parsed.error
    )
  }
  return parsed.data
}

export function createAssistantApi(
  handlers: AssistantApiHandlers
): AssistantApi {
  return {
    ask: (input, options) =>
      call(
        "ask",
        () => handlers.ask(askInputSchema.parse(input), options),
        kitResponseSchema
      ),
    suggestions: (input, options) =>
      handlers.suggestions
        ? call(
            "suggestions",
            () =>
              handlers.suggestions!(
                suggestionsInputSchema.parse(input),
                options
              ),
            suggestionsSchema
          )
        : Promise.resolve([]),
    recents: (options) =>
      handlers.recents
        ? call("recents", () => handlers.recents!(options), recentsSchema)
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

/** What a failed turn says, when the error has anything worth saying. */
export function failureDetail(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return "The assistant could not answer."
}
