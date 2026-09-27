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
import type { AmbientBlock, AmbientReference, AmbientAnswer } from "./response-kit"
import type { ReasoningStep } from "./message-kit"
import type { ReportSection, SearchSource } from "./knowledge-kit"

/**
 * THE ASSISTANT'S SCHEMAS — every shape that crosses between the layer and
 * the host's API, as zod.
 *
 * They are typed against the kits' own interfaces (AmbientAnswer,
 * AmbientBlock, AmbientReference…), so the grammar the layer renders and the
 * contract it checks cannot drift: change a block and this file stops
 * compiling. The API that uses them lives in responder.ts; a TypeScript
 * server can import them from here to validate on its side too.
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

const reference: z.ZodType<AmbientReference> = z.object({
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

export const ambientBlockSchema: z.ZodType<AmbientBlock> = z.discriminatedUnion(
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

export const ambientAnswerSchema: z.ZodType<AmbientAnswer> = z.object({
  text: z.string(),
  refs: z.array(reference),
  evidence: z.array(ambientBlockSchema).optional(),
  artifacts: z.array(ambientBlockSchema).optional(),
  followUps: z.array(z.string()).optional(),
  effect: z.string().optional(),
})

/** One earlier turn of the conversation, as text. */
export const ambientTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
})
export type AmbientTurn = z.infer<typeof ambientTurnSchema>

/**
 * What every question carries: the question, what the person is looking at,
 * and the conversation it belongs to. `history` is every earlier turn in
 * order (answers as their prose), so a stateless server can answer in
 * context; `conversationId` is stable until the conversation is cleared, so
 * a server that keeps its own threads can key on it instead.
 */
export const ambientQuestionSchema = z.object({
  question: z.string().min(1),
  conversationId: z.string(),
  history: z.array(ambientTurnSchema),
  pageChip: contextChip.nullable(),
  chips: z.array(contextChip),
})
export type AmbientQuestion = z.infer<typeof ambientQuestionSchema>

/** What the suggestions endpoint is told: where the person is. */
export const ambientSuggestionsInputSchema = z.object({
  pageChip: contextChip.nullable(),
})
export type AmbientSuggestionsInput = z.infer<typeof ambientSuggestionsInputSchema>

export const ambientSuggestionsSchema = z.array(z.string())

/**
 * One piece of a streamed answer. The layer assembles them into a
 * AmbientAnswer in arrival order, so send evidence before the prose that rests
 * on it. `answer` replaces everything so far with a complete answer (a
 * stream may end with one); `error` fails the turn with its message.
 */
export const ambientAnswerEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("evidence"), block: ambientBlockSchema }),
  z.object({ type: z.literal("text"), delta: z.string() }),
  z.object({ type: z.literal("artifact"), block: ambientBlockSchema }),
  z.object({ type: z.literal("refs"), refs: z.array(reference) }),
  z.object({ type: z.literal("followUps"), followUps: z.array(z.string()) }),
  z.object({ type: z.literal("effect"), effect: z.string() }),
  z.object({ type: z.literal("answer"), answer: ambientAnswerSchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
])
export type AmbientAnswerEvent = z.infer<typeof ambientAnswerEventSchema>

export const ambientRecentSchema = z.object({ text: z.string(), when: z.string() })
export const ambientRecentsSchema = z.array(ambientRecentSchema)
export type AmbientRecent = z.infer<typeof ambientRecentSchema>
