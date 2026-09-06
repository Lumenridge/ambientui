"use client"

import * as React from "react"

import { Button } from "@ambient-ui/ui/components/button"
import { Icon, type IconName } from "@ambient-ui/ui/components/icon"
import { cn } from "@ambient-ui/ui/lib/utils"

import { useAmbientRuntime } from "./ambient-runtime"

import { StageQueueContext, useStageQueue } from "./stage-queue"
import { StreamingText } from "./streaming-text"
import {
  FeedbackDialog,
  FollowUpSuggestions,
  MessageActions,
  ReasoningPanel,
  type MessageRating,
  type ReasoningStep,
} from "./message-kit"
import {
  ResearchReport,
  WebSearch,
  type ReportSection,
  type SearchSource,
} from "./knowledge-kit"
import {
  CodeDiff,
  ParallelTools,
  ReviewableDiff,
  TerminalBlock,
  ToolCall,
  ToolFailure,
  ToolTimeline,
  type DiffHunk,
  type DiffLine,
  type FileStat,
  type ParallelCall,
  type TimelineStep,
} from "./tool-kit"

/**
 * THE RESPONSE KIT (v0) — the assistant's answers are composed OBJECTS,
 * not paragraphs. This first cut exists to make the ambient pipeline real
 * end-to-end: send → thinking → a streamed answer block → settle. The
 * composition is canned (composeResponse); wiring a model in replaces the
 * composer, never the objects. Object inventory and references live in
 * notes/response-kit-inspiration.md; each object ships documented in /ds.
 */

export interface KitReference {
  label: string
  /**
   * A source MARK, in a fixed precedence: logo, then icon, then nothing.
   *
   * `logo` is the source's own image (a favicon or product mark) — data the
   * caller supplies, never something the design system invents; it falls back
   * to a monogram if it fails to load, so a dead image never leaves a hole.
   * `icon` is for typed internal sources, drawn by the Foundation's configured
   * library like every other icon. With neither, the chip is exactly what it
   * has always been: a number and a name.
   */
  icon?: IconName
  logo?: string
  /** Makes the chip a link to the source — citations that can be followed. */
  href?: string
}

/**
 * THE BLOCKS AN ANSWER CAN BE MADE OF.
 *
 * A real answer is not a paragraph with a citation stapled on: it is what the
 * assistant did, what it concluded, and what it is proposing. This union is
 * the whole grammar — every member maps to one documented component, and a
 * model wiring in emits these rather than markdown.
 */
export type KitBlock =
  | { kind: "reasoning"; steps: ReasoningStep[]; seconds?: number }
  | { kind: "parallel"; summary: string; calls: ParallelCall[] }
  | {
      kind: "tool"
      verb: string
      request?: string
      result?: string
    }
  | { kind: "search"; query: string; sources: SearchSource[] }
  | { kind: "diff"; path: string; lines: DiffLine[] }
  | { kind: "review"; path: string; hunks: DiffHunk[] }
  | { kind: "terminal"; command: string; lines: string[]; exitCode?: number }
  | { kind: "timeline"; steps: TimelineStep[]; files?: FileStat[] }
  | { kind: "failure"; tool: string; target?: string; error: string; attempt?: number; attempts?: number }
  | { kind: "report"; title: string; sections: ReportSection[]; sourcesRead?: number }

export interface KitResponse {
  text: string
  refs: KitReference[]
  /**
   * What the assistant DID, rendered above the answer — reasoning, tool
   * calls, searches. Evidence comes first because it is what the answer
   * rests on; the reader can collapse it, but never has to go looking.
   */
  evidence?: KitBlock[]
  /**
   * What the answer PRODUCED — a diff to review, a test run, the session
   * summary. Below the prose, because these are consequences of the answer
   * rather than support for it.
   */
  artifacts?: KitBlock[]
  /** Offered next turns; the surface decides what picking one does. */
  followUps?: string[]
  /**
   * A WORKSPACE EFFECT — what this answer did to the product, announced to
   * whichever surface owns it once the answer settles. The assistant knows
   * nothing about editors; it just relays the name ("fix-composer"), and the
   * workspace decides what changing means.
   */
  effect?: string
}


/**
 * The source mark on a citation chip. One slot, three fillings in a fixed
 * order — the source's own logo, a typed icon, or the monogram the logo falls
 * back to. The number is NOT part of this: it is the citation's identity in
 * the text and always shows, so the mark is recognition, never identification.
 */
// keyed by logo at the call site, so a changed logo mounts a fresh mark
// rather than resetting this one's state from an effect
function RefMark({ reference }: { reference: KitReference }) {
  const [failed, setFailed] = React.useState(false)

  if (reference.logo && !failed) {
    return (
      <img
        src={reference.logo}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        // a favicon is somebody else's artwork at an unknown aspect: contain
        // it in our own square rather than letting it set the chip's height
        className="size-3.5 shrink-0 rounded-sm object-contain"
      />
    )
  }
  if (reference.logo && failed) {
    return (
      <span
        aria-hidden
        className="bg-accent text-muted-foreground flex size-3.5 shrink-0 items-center justify-center rounded-sm text-[0.625rem] font-medium uppercase"
      >
        {reference.label.trim().charAt(0)}
      </span>
    )
  }
  if (reference.icon) {
    return (
      <span className="text-muted-foreground flex shrink-0 items-center">
        <Icon name={reference.icon} size={12} />
      </span>
    )
  }
  return null
}

/**
 * REFERENCE CHIPS — numbered provenance under an answer: what the assistant
 * grounded its reply in, in the order it was grounded.
 *
 * The anatomy is one thing with an optional slot — number · mark · label —
 * rather than a set of variants, so a row mixing a web source, an internal
 * document, and an unmarked reference still reads as one list. A chip with an
 * href is a link and says so on hover; one without stays inert text.
 */
export function ReferenceChips({ refs }: { refs: KitReference[] }) {
  if (refs.length === 0) return null
  return (
    <div className="mt-3">
      <div className="text-muted-foreground mb-1.5 text-xs font-medium">
        References
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {refs.map((r, i) => {
          const inner = (
            <>
              <span className="text-muted-foreground font-mono">{i + 1}</span>
              <RefMark key={r.logo ?? "none"} reference={r} />
              <span className="truncate">{r.label}</span>
            </>
          )
          const shape =
            "bg-(--glass-wash) inline-flex max-w-64 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs"
          return r.href ? (
            <a
              key={r.label + i}
              href={r.href}
              target="_blank"
              rel="noreferrer"
              // the only citation affordance: it opens its source
              className={cn(
                shape,
                "hover:bg-(--wash-strong) transition-colors hover:underline"
              )}
            >
              {inner}
            </a>
          ) : (
            <span key={r.label + i} className={shape}>
              {inner}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/**
 * An answer block: the orb glyph as the author mark, streamed text, then
 * references. Fires onSettled once the stream completes — the assistant
 * uses it to bring the ambient state back to rest.
 */

/* --------------------------- the message pair --------------------------- */

/**
 * How an exchange is presented. Bubble gives the question a surface of its
 * own; flat lets both sides sit on the transcript with only alignment and
 * tone separating them. This is a presentation choice, not two components:
 * the anatomy is identical either way.
 */
export type MessageVariant = "bubble" | "flat"

/** The user's half of a pair. */
export function UserMessage({
  text,
  variant,
  className,
}: {
  text: string
  /** Override the runtime presentation (messageVariant). */
  variant?: MessageVariant
  className?: string
}) {
  const runtime = useAmbientRuntime()
  const shape = variant ?? runtime.messageVariant
  return (
    <div
      className={cn(
        "ms-auto max-w-[85%] text-sm leading-relaxed",
        shape === "bubble"
          ? "border-(--glass-border) bg-(--wash) rounded-2xl border px-3 py-2"
          : "text-muted-foreground",
        className
      )}
    >
      {text}
    </div>
  )
}

/**
 * MESSAGE PAIR — the unit of a conversation: one question and the answer
 * it produced. Pairing them is what makes a transcript readable; a list of
 * undifferentiated messages is a log.
 */
export function MessagePair({
  question,
  response,
  variant,
  live = true,
  onSettled,
  className,
}: {
  question: string
  response?: KitResponse
  variant?: MessageVariant
  live?: boolean
  onSettled?: () => void
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <UserMessage text={question} variant={variant} />
      {response && (
        <ResponseBlock
          response={response}
          live={live}
          onSettled={onSettled}
          variant={variant}
        />
      )}
    </div>
  )
}

/* ------------------------------- branches ------------------------------- */

/**
 * MESSAGE BRANCHES — regenerated versions of the same answer, navigable
 * without losing your place.
 *
 * A regenerated answer does not replace its predecessor: it joins it. The
 * pager is deliberately quiet (it is navigation, not content) and sits
 * under the answer it belongs to, so a branch reads as a version of THIS
 * reply rather than as a new turn.
 *
 * Only a freshly generated branch streams; moving back to one you have
 * already read shows it settled. History is written, not replayed.
 */
export function MessageBranches({
  branches,
  variant,
  live = true,
  onSettled,
  onAnswerStart,
  onRegenerate,
  onFollowUp,
  className,
}: {
  branches: KitResponse[]
  variant?: MessageVariant
  /** Whether the newest branch is still arriving. */
  live?: boolean
  onSettled?: () => void
  /** The evidence finished and the prose is starting. */
  onAnswerStart?: () => void
  /** Regenerating appends a branch; the pager keeps the others reachable. */
  onRegenerate?: () => void
  onFollowUp?: (text: string) => void
  className?: string
}) {
  const [index, setIndex] = React.useState(branches.length - 1)
  // a new branch arriving becomes the one you are looking at
  const countRef = React.useRef(branches.length)
  React.useEffect(() => {
    if (branches.length !== countRef.current) {
      countRef.current = branches.length
      setIndex(branches.length - 1)
    }
  }, [branches.length])

  const current = branches[Math.min(index, branches.length - 1)]
  if (!current) return null
  const isNewest = index === branches.length - 1

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <ResponseBlock
        key={index}
        response={current}
        variant={variant}
        // only the newest branch is still being written
        live={live && isNewest}
        onSettled={onSettled}
        onAnswerStart={onAnswerStart}
        onRegenerate={onRegenerate}
        // a follow-up is offered by the version you are looking at
        onFollowUp={onFollowUp}
      />
      {branches.length > 1 && (
        <div className="text-muted-foreground flex items-center gap-1 self-center">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Previous version"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="text-muted-foreground hover:text-foreground"
          >
            <Icon name="chevron-left" size={13} />
          </Button>
          <span className="font-mono text-xs tabular-nums">
            {index + 1} / {branches.length}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Next version"
            disabled={index === branches.length - 1}
            onClick={() =>
              setIndex((i) => Math.min(branches.length - 1, i + 1))
            }
            className="text-muted-foreground hover:text-foreground"
          >
            <Icon name="chevron-right" size={13} />
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * THE ONE MAPPING from an answer's blocks to components. A model wiring in
 * emits blocks; this is where they become UI, and it is the only place that
 * decides what a `kind` looks like. No surface renders a block itself.
 */
function KitBlockView({
  block,
  staged = true,
}: {
  block: KitBlock
  /** False for a settled message: history is written, not replayed. */
  staged?: boolean
}) {
  switch (block.kind) {
    case "reasoning":
      return (
        <ReasoningPanel
          steps={block.steps}
          seconds={block.seconds}
          staged={staged}
        />
      )
    case "parallel":
      return (
        <ParallelTools
          summary={block.summary}
          calls={block.calls}
          staged={staged}
        />
      )
    case "tool":
      return (
        <ToolCall
          verb={block.verb}
          request={block.request}
          result={block.result}
          staged={staged}
        />
      )
    case "search":
      return (
        <WebSearch query={block.query} sources={block.sources} staged={staged} />
      )
    case "diff":
      return <CodeDiff path={block.path} lines={block.lines} staged={staged} />
    case "review":
      return (
        <ReviewableDiff path={block.path} hunks={block.hunks} staged={staged} />
      )
    case "terminal":
      return (
        <TerminalBlock
          command={block.command}
          lines={block.lines}
          exitCode={block.exitCode}
          staged={staged}
        />
      )
    case "timeline":
      return (
        <ToolTimeline
          steps={block.steps}
          files={block.files}
          defaultOpen={false}
          staged={staged}
        />
      )
    case "failure":
      return (
        <ToolFailure
          tool={block.tool}
          target={block.target}
          error={block.error}
          attempt={block.attempt}
          attempts={block.attempts}
        />
      )
    case "report":
      return (
        <ResearchReport
          title={block.title}
          sections={block.sections}
          sourcesRead={block.sourcesRead}
          staged={staged}
        />
      )
  }
}

export function ResponseBlock({
  response,
  onSettled,
  onAnswerStart,
  onRegenerate,
  onFollowUp,
  live = true,
  variant,
  className,
}: {
  response: KitResponse
  onSettled?: () => void
  /**
   * The evidence is done and the prose is starting. The shell holds its
   * thinking state until this fires — the work is not over when the answer
   * was composed, it is over when the answer starts being said.
   */
  onAnswerStart?: () => void
  /** Override the runtime presentation (messageVariant). */
  variant?: MessageVariant
  live?: boolean
  /** Offered under a settled answer; omit and the row does not appear. */
  onRegenerate?: () => void
  /** What picking a follow-up does — asking it is the surface's decision. */
  onFollowUp?: (text: string) => void
  className?: string
}) {
  // the saved component config decides presentation, so a variant chosen in
  // the Inspect rail reaches the real transcript, not just /ds
  const runtime = useAmbientRuntime()
  const shape = variant ?? runtime.messageVariant

  // the stream owns its own reveal; the block only needs to know when the
  // answer has landed, to settle its mark and show the references
  const [done, setDone] = React.useState(!live)
  const [rating, setRating] = React.useState<MessageRating>(null)
  // a thumbs-down asks why, in place — the moment of the reaction is the
  // only time the user actually knows the reason (see FeedbackDialog)
  const [showFeedback, setShowFeedback] = React.useState(false)
  const evidence = response.evidence ?? []
  const artifacts = response.artifacts ?? []
  // THE ANSWER ARRIVES IN ORDER. Evidence blocks share one queue (each waits
  // for the one before it), and the prose waits for all of them: the sentence
  // explaining the work cannot precede the work. See stage-queue.ts.
  const { queue, settled: evidenceSettled } = useStageQueue(evidence.length)
  const evidenceDone = !live || evidence.length === 0 || evidenceSettled
  // announced once — a ref, not state: this latch changes nothing on screen,
  // and setState in an effect would cascade a render for a notification
  const announcedRef = React.useRef(false)
  React.useEffect(() => {
    if (evidenceDone && live && !announcedRef.current) {
      announcedRef.current = true
      onAnswerStart?.()
    }
  }, [evidenceDone, live, onAnswerStart])
  return (
    <div
      className={cn(
        "flex max-w-full items-start gap-2.5",
        // bubble: the answer is an object on its own inset card. flat: it
        // sits directly on the transcript, separated by alignment alone.
        shape === "bubble" &&
          "border-(--glass-border) bg-(--glass-wash) rounded-xl border p-3",
        className
      )}
    >
      {/* NO AUTHOR MARK. The message does not sign itself: the identity
          lives in the SHELL — the orb, the live border, the heat field — so
          every answer stamping its own orb repeated the shell's signature
          once per message. Alignment alone says who is speaking (DESIGN.md
          §12, 2026-08-22). */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* what it DID — above the answer, because it is what the answer
            rests on. Collapsed by default; never hidden. */}
        <StageQueueContext.Provider value={queue}>
          {evidence.map((b, i) => (
            <KitBlockView key={`e${i}`} block={b} staged={live} />
          ))}
        </StageQueueContext.Provider>
        {/* the prose does not exist until the work behind it is done — not
            merely hidden, because a StreamingText that is mounted has already
            started */}
        {evidenceDone && (
          <div className="min-w-0">
            <StreamingText
              text={response.text}
              live={live}
              className="block text-sm leading-relaxed"
              onSettled={() => {
                setDone(true)
                onSettled?.()
              }}
            />
            {done && <ReferenceChips refs={response.refs} />}
          </div>
        )}
        {/* what it PRODUCED — below, and only once the answer has landed, so
            a diff never arrives before the sentence explaining it */}
        {done &&
          artifacts.map((b, i) => (
            <KitBlockView key={`a${i}`} block={b} staged={live} />
          ))}
        {done && (onRegenerate || onFollowUp) && (
          <div className="flex flex-col gap-1">
            <MessageActions
              text={response.text}
              rating={rating}
              onRate={(r) => {
                setRating(r)
                setShowFeedback(r === "down")
              }}
              onRegenerate={onRegenerate}
            />
            {showFeedback && (
              <FeedbackDialog
                onSubmit={() => setShowFeedback(false)}
                onDismiss={() => setShowFeedback(false)}
              />
            )}
            {onFollowUp && response.followUps && (
              <FollowUpSuggestions
                suggestions={response.followUps}
                onPick={onFollowUp}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export { StreamingText } from "./streaming-text"
