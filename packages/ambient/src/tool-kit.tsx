"use client"

import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@ambientui/ui/components/button"
import { Icon, type IconName } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"

import { useMotionTransition } from "./ambient-runtime"

import { FeedbackDialog } from "./message-kit"
import { StageSkeleton, StagedItem } from "./staging"
import { StreamingText } from "./streaming-text"
import { useElapsedSeconds, useStagedReveal } from "./use-staged-reveal"

/**
 * THE TOOL KIT — what the assistant DID, as objects in the transcript.
 *
 * One principle decides every component here: A TOOL CALL IS A CLAIM, AND A
 * CLAIM MUST BE AUDITABLE. The collapsed row is the claim ("searched the
 * docs"), and the disclosure holds the evidence (the exact request, the
 * exact result). Hiding the evidence entirely asks for trust the assistant
 * has not earned; showing it always buries the answer.
 *
 * Collapsed by default, therefore — with one exception: failures open,
 * because a failure the user has to go looking for is a failure they will
 * miss.
 */

/* ------------------------------ one call ------------------------------- */

export type ToolStatus = "running" | "done" | "failed"

function StatusMark({ status }: { status: ToolStatus }) {
  if (status === "running")
    return (
      <span
        aria-label="Running"
        className="border-muted-foreground/30 border-t-primary size-3.5 shrink-0 animate-spin rounded-full border-2"
      />
    )
  return (
    <span
      aria-label={status === "done" ? "Succeeded" : "Failed"}
      className={cn(
        "shrink-0",
        status === "done" ? "text-(--positive)" : "text-destructive"
      )}
    >
      <Icon name={status === "done" ? "check" : "alert"} size={14} />
    </span>
  )
}

/**
 * TOOL CALL — one invocation, its request, and its result.
 *
 * The verb is written in plain language ("Searched the docs") with the
 * argument that mattered beside it as a code chip. That pairing is the whole
 * design: the sentence is for reading, the chip is for verifying.
 */
export function ToolCall({
  verb,
  status = "done",
  request,
  result,
  defaultOpen = false,
  staged = true,
  className,
}: {
  /** What it did, in plain language: "Searched the docs". */
  verb: string
  status?: ToolStatus
  /** The exact request — evidence, so it is monospaced and unedited. */
  request?: string
  result?: string
  defaultOpen?: boolean
  /** Stage the call: working with a live count, then the result streams. */
  staged?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(defaultOpen || status === "failed")
  const transition = useMotionTransition("surface")
  const hasBody = Boolean(request || result)
  // a call that returns instantly is a call that never went anywhere
  const { pending, working: counting } = useStagedReveal(1, {
    enabled: staged,
    delay: 2200,
    interval: 0,
  })
  const elapsed = useElapsedSeconds(counting)
  const working = staged && pending

  return (
    <div className={cn("flex flex-col", className)}>
      <button
        type="button"
        onClick={() => hasBody && setOpen((v) => !v)}
        aria-expanded={hasBody ? open : undefined}
        disabled={!hasBody}
        className="flex items-center gap-2 self-start text-start text-sm disabled:cursor-default"
      >
        {hasBody && (
          <span className="text-muted-foreground shrink-0">
            <Icon name={open ? "chevron-down" : "chevron-right"} size={13} />
          </span>
        )}
        {/* the verb alone: the exact argument is evidence, and evidence
            lives in the disclosure — a chip up here duplicated the request
            line one click away */}
        <span className={cn("font-medium", working && "ambient-shimmer")}>
          {verb}
        </span>
        {working && (
          <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
            {elapsed}s
          </span>
        )}
        <StatusMark status={working ? "running" : status} />
      </button>
      <AnimatePresence initial={false}>
        {open && hasBody && !working && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={transition}
            className="overflow-hidden"
          >
            <div className="bg-muted mt-2 flex flex-col gap-2 rounded-xl px-3 py-2">
              {request && (
                <div>
                  <div className="text-muted-foreground font-mono text-xs">
                    Request
                  </div>
                  <pre className="mt-0.5 overflow-x-auto font-mono text-xs whitespace-pre-wrap">
                    {request}
                  </pre>
                </div>
              )}
              {request && result && <span className="bg-border h-px" />}
              {result && (
                <div>
                  <div className="text-muted-foreground font-mono text-xs">
                    Result
                  </div>
                  {/* the result is quoted as it came back — written, not
                      revealed, because that is how it actually arrived */}
                  <StreamingText
                    text={result}
                    live={staged}
                    className="mt-0.5 block overflow-x-auto font-mono text-xs whitespace-pre-wrap"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------ timeline ------------------------------- */

export interface TimelineStep {
  verb: string
  target?: string
  icon?: IconName
}

export interface FileStat {
  path: string
  added?: number
  removed?: number
}

/**
 * TOOL TIMELINE — a whole working session as verbs, targets, and what
 * changed on disk.
 *
 * A long agent run is a list of individual calls nobody reads. Summarizing
 * it as "4 steps · 2 files changed" answers the only two questions that
 * matter at a glance — how much did it do, and what did it touch — and the
 * file stats sit at the bottom because a change to your files is the part
 * with consequences.
 */
export function ToolTimeline({
  steps,
  files = [],
  defaultOpen = true,
  staged = true,
  onStepSelect,
  className,
}: {
  steps: TimelineStep[]
  files?: FileStat[]
  defaultOpen?: boolean
  /** Stage the arrival — see staging.tsx. False renders settled. */
  staged?: boolean
  /** Jump to a step — open the file, reveal the diff. Rows render as ghost
      buttons either way so the record always looks traversable. */
  onStepSelect?: (step: TimelineStep, index: number) => void
  className?: string
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const transition = useMotionTransition("surface")
  // the summary counts what has actually happened, so it climbs as the
  // session does rather than announcing the total before the work
  const { shown, pending, working: counting } = useStagedReveal(steps.length, {
    enabled: staged,
    delay: 2000,
    interval: 900,
  })
  const landed = steps.slice(0, shown)
  const working = staged && shown < steps.length
  const elapsed = useElapsedSeconds(counting)
  const shownFiles = working ? [] : files
  return (
    <div className={cn("flex flex-col", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 self-start text-sm transition-colors"
      >
        <Icon name={open ? "chevron-down" : "chevron-right"} size={13} />
        <span className={cn(working && "ambient-shimmer")}>
          {working
            ? `Working… ${elapsed}s · ${shown} step${shown === 1 ? "" : "s"}`
            : `${steps.length} step${steps.length === 1 ? "" : "s"}${
                files.length > 0
                  ? ` · ${files.length} file${files.length === 1 ? "" : "s"} changed`
                  : ""
              }`}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={transition}
            className="overflow-hidden"
          >
            {pending && <StageSkeleton rows={2} />}
            <ol className="mt-1 flex flex-col">
              {landed.map((s, i) => (
                <StagedItem key={`${s.verb}-${i}`} index={i}>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={
                      onStepSelect ? () => onStepSelect(s, i) : undefined
                    }
                    className="w-fit max-w-full justify-start gap-2 px-2 font-normal"
                  >
                    <span className="text-muted-foreground shrink-0">
                      <Icon name={s.icon ?? "code"} size={14} />
                    </span>
                    <span className="text-sm">{s.verb}</span>
                    {s.target && (
                      <span className="bg-muted text-muted-foreground truncate rounded-md px-1.5 py-0.5 font-mono text-xs">
                        {s.target}
                      </span>
                    )}
                  </Button>
                </StagedItem>
              ))}
            </ol>
            {shownFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {shownFiles.map((f) => (
                  <span
                    key={f.path}
                    className="bg-muted inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-xs"
                  >
                    {f.path}
                    {f.added ? (
                      <span className="text-(--positive)">+{f.added}</span>
                    ) : null}
                    {f.removed ? (
                      <span className="text-destructive">−{f.removed}</span>
                    ) : null}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------ terminal ------------------------------- */

/**
 * TERMINAL BLOCK — command output, streaming line by line.
 *
 * Output is quoted verbatim: monospaced, unwrapped, scrollable. The cursor
 * while a run is live is the only decoration, and it earns its place by
 * being the difference between "still going" and "produced nothing".
 *
 * `tone="ink"` is for presenting a run as an artifact (a dark console);
 * `paper` keeps it on the surface it lives in, which is right inside a
 * conversation.
 */
export function TerminalBlock({
  command,
  lines,
  running = false,
  exitCode,
  tone = "paper",
  staged = true,
  className,
}: {
  command: string
  lines: string[]
  running?: boolean
  /** Shown when the run ends; 0 reads as success, anything else as failure. */
  exitCode?: number
  tone?: "paper" | "ink"
  /** Stage the run: output lands line by line, the way it actually arrives. */
  staged?: boolean
  className?: string
}) {
  const ink = tone === "ink"
  const { shown, pending, working: counting } = useStagedReveal(lines.length, {
    enabled: staged,
    delay: 1600,
    interval: 700,
  })
  const live = staged ? shown < lines.length : running
  const elapsed = useElapsedSeconds(counting)
  const printed = lines.slice(0, shown)
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border",
        ink ? "border-transparent bg-(--color-zinc-900)" : "border-border bg-card",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 font-mono text-xs",
          ink ? "text-(--color-zinc-100)" : "text-foreground"
        )}
      >
        <span
          className={cn("min-w-0 flex-1 truncate", live && "ambient-shimmer")}
        >
          {command}
        </span>
        {live && (
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {elapsed}s
          </span>
        )}
        {live ? (
          <span className="border-muted-foreground/30 border-t-primary size-3.5 shrink-0 animate-spin rounded-full border-2" />
        ) : exitCode !== undefined ? (
          <span
            className={cn(
              "shrink-0 text-xs",
              exitCode === 0 ? "text-(--positive)" : "text-destructive"
            )}
          >
            exit {exitCode}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "overflow-x-auto px-3 pb-2 font-mono text-xs leading-relaxed",
          ink ? "text-(--color-zinc-400)" : "text-muted-foreground"
        )}
      >
        {printed.map((l, i) => (
          <StagedItem key={i} index={i} className="whitespace-pre">
            {l}
          </StagedItem>
        ))}
        {pending && (
          <div className="text-muted-foreground/60 whitespace-pre">…</div>
        )}
        {live && (
          <span className="bg-primary inline-block h-3.5 w-1.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  )
}

/* -------------------------------- diffs -------------------------------- */

export type DiffLine = { sign: " " | "+" | "-"; text: string }
export interface DiffHunk {
  /** The @@ header, quoted as the tool produced it. */
  header?: string
  lines: DiffLine[]
}

function DiffRows({
  lines,
  staged = false,
  delay = 0,
}: {
  lines: DiffLine[]
  staged?: boolean
  delay?: number
}) {
  // a patch arrives as lines, so it lands as lines
  const { shown } = useStagedReveal(lines.length, {
    enabled: staged,
    delay,
    interval: 140,
  })
  return (
    <div className="overflow-x-auto font-mono text-xs leading-relaxed">
      {lines.slice(0, shown).map((l, i) => (
        <StagedItem
          key={i}
          index={i}
          className={cn(
            "flex gap-3 px-3 whitespace-pre",
            l.sign === "+" && "bg-(--positive-wash) text-(--positive)",
            l.sign === "-" && "bg-(--destructive-wash) text-destructive",
            l.sign === " " && "text-muted-foreground"
          )}
        >
          <span aria-hidden className="w-2 shrink-0 select-none">
            {l.sign === " " ? "" : l.sign === "+" ? "+" : "−"}
          </span>
          <span>{l.text}</span>
        </StagedItem>
      ))}
    </div>
  )
}

/**
 * CODE DIFF — a unified diff sized for a conversation.
 *
 * Read-only by design: this is the assistant showing what it changed, not
 * asking anything. Tint carries the sign so the eye finds the change before
 * reading it, and the sign column stays anyway — color alone is not a
 * signal everyone receives.
 */
export function CodeDiff({
  path,
  lines,
  added,
  removed,
  staged = true,
  className,
}: {
  path: string
  lines: DiffLine[]
  added?: number
  removed?: number
  /** Stage the arrival — see staging.tsx. False renders settled. */
  staged?: boolean
  className?: string
}) {
  const plus = added ?? lines.filter((l) => l.sign === "+").length
  const minus = removed ?? lines.filter((l) => l.sign === "-").length
  const { shown, working: counting } = useStagedReveal(lines.length, {
    enabled: staged,
    delay: 1800,
    interval: 140,
  })
  const working = staged && shown < lines.length
  const elapsed = useElapsedSeconds(counting)
  return (
    <div
      className={cn(
        "border-border bg-card overflow-hidden rounded-xl border",
        className
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-mono text-xs",
            working && "ambient-shimmer"
          )}
        >
          {path}
        </span>
        {working ? (
          <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
            {elapsed}s
          </span>
        ) : (
          <span className="shrink-0 font-mono text-xs">
            <span className="text-(--positive)">+{plus}</span>{" "}
            <span className="text-destructive">−{minus}</span>
          </span>
        )}
      </div>
      <DiffRows lines={lines} staged={staged} delay={1800} />
    </div>
  )
}

/**
 * REVIEWABLE DIFF — the same diff, but every hunk is a decision.
 *
 * The difference from CodeDiff is consequence, not appearance: here the
 * assistant is asking permission per hunk, and Apply commits only what
 * survived. It counts what is left to review and disables Apply at zero, so
 * "apply" can never mean "apply nothing" by accident.
 */
export function ReviewableDiff({
  path,
  hunks,
  onApply,
  staged = true,
  className,
}: {
  path: string
  hunks: DiffHunk[]
  onApply?: (keptIndexes: number[]) => void
  /** Stage the arrival — see staging.tsx. False renders settled. */
  staged?: boolean
  className?: string
}) {
  // undefined = undecided; the third state is the point of the component
  const [kept, setKept] = React.useState<Record<number, boolean | undefined>>({})
  const [applied, setApplied] = React.useState<number | null>(null)
  const { shown, working: counting } = useStagedReveal(hunks.length, {
    enabled: staged,
    delay: 2000,
    interval: 900,
  })
  const working = staged && shown < hunks.length
  const elapsed = useElapsedSeconds(counting)
  const landed = hunks.slice(0, shown)
  const keptIndexes = hunks
    .map((_, i) => i)
    .filter((i) => kept[i] === true)
  const undecided = hunks.filter((_, i) => kept[i] === undefined).length

  return (
    <div
      className={cn(
        "border-border bg-card divide-border divide-y overflow-hidden rounded-xl border",
        className
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-mono text-xs",
            working && "ambient-shimmer"
          )}
        >
          {path}
        </span>
        <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
          {working
            ? `${elapsed}s`
            : `${keptIndexes.length} of ${hunks.length} kept`}
        </span>
      </div>
      {landed.map((h, i) => (
        <div key={i} className={cn(kept[i] === false && "opacity-50")}>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
              {h.header}
            </span>
            <Button
              size="sm"
              variant="ghost"
              aria-pressed={kept[i] === false}
              onClick={() => setKept((k) => ({ ...k, [i]: false }))}
              className="text-muted-foreground hover:text-foreground font-normal"
            >
              <Icon name="close" size={12} />
              Discard
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-pressed={kept[i] === true}
              onClick={() => setKept((k) => ({ ...k, [i]: true }))}
              className={cn(
                "font-normal",
                kept[i] === true
                  ? "bg-(--positive-wash) text-(--positive)"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon name="check" size={12} />
              Keep
            </Button>
          </div>
          <DiffRows lines={h.lines} staged={staged} delay={2000 + i * 900} />
        </div>
      ))}
      {!working && (
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          {applied !== null ? (
            // the change is a consequence, so applying says so rather than
            // leaving the user to infer it from a button that stopped working
            <span className="text-(--positive) flex items-center gap-1.5 font-mono text-xs">
              <Icon name="check" size={12} />
              applied {applied} hunk{applied === 1 ? "" : "s"} to {path}
            </span>
          ) : (
            <span className="text-muted-foreground font-mono text-xs">
              {undecided > 0 ? `${undecided} left to review` : "all reviewed"}
            </span>
          )}
          <Button
            size="sm"
            disabled={keptIndexes.length === 0 || applied !== null}
            onClick={() => {
              setApplied(keptIndexes.length)
              onApply?.(keptIndexes)
            }}
          >
            {applied !== null ? "Applied" : `Apply ${keptIndexes.length}`}
          </Button>
        </div>
      )}
    </div>
  )
}

/* ---------------------------- parallel calls ---------------------------- */

export interface ParallelCall {
  tool: string
  target?: string
  status?: ToolStatus
  /** Elapsed time, already formatted: "42ms". */
  duration?: string
}

/**
 * PARALLEL TOOLS — calls that went out together, collapsed to one row.
 *
 * Concurrency is an implementation fact, and stacking five rows makes it
 * look like five decisions. One row states the batch and its outcome;
 * opening it shows each call with its own timing, which is the only reason
 * anyone opens it.
 */
export function ParallelTools({
  summary,
  calls,
  defaultOpen = false,
  staged = true,
  className,
}: {
  /** What the batch was for: "Read 4 files in parallel". */
  summary: string
  calls: ParallelCall[]
  defaultOpen?: boolean
  /** Stage the arrival — see staging.tsx. False renders settled. */
  staged?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const transition = useMotionTransition("surface")
  // calls that went out together still come BACK one at a time, and the
  // count in the header should climb the way it actually did
  const { shown, pending } = useStagedReveal(calls.length, {
    enabled: staged,
    delay: 600,
    interval: 260,
  })
  const landed = calls.slice(0, shown)
  const done = landed.filter((c) => (c.status ?? "done") === "done").length
  const failed = landed.some((c) => c.status === "failed")
  const settled = shown === calls.length

  return (
    <div
      className={cn(
        "border-border bg-card overflow-hidden rounded-xl border",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-start"
      >
        <span className="text-muted-foreground shrink-0">
          <Icon name={open ? "chevron-down" : "chevron-right"} size={13} />
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium",
            pending && "ambient-shimmer"
          )}
        >
          {summary}
        </span>
        <span className="text-muted-foreground shrink-0 font-mono text-xs">
          {done} done
        </span>
        <StatusMark
          status={settled ? (failed ? "failed" : "done") : "running"}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={transition}
            className="border-border overflow-hidden border-t"
          >
            {pending && <StageSkeleton rows={2} className="px-3 pb-2" />}
            {landed.map((c, i) => (
              <StagedItem
                key={`${c.tool}-${i}`}
                index={i}
                className="flex items-center gap-2 px-3 py-1.5"
              >
                <StatusMark status={c.status ?? "done"} />
                <span className="text-muted-foreground shrink-0 font-mono text-xs">
                  {c.tool}
                </span>
                {c.target && (
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {c.target}
                  </span>
                )}
                {c.duration && (
                  <span className="text-muted-foreground ms-auto shrink-0 font-mono text-xs">
                    {c.duration}
                  </span>
                )}
              </StagedItem>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ----------------------------- tool failure ---------------------------- */

/**
 * TOOL FAILURE — one call that failed, without taking the turn with it.
 *
 * The attempt count is the honest part: "1/3" tells the user a retry is
 * already policy, not a suggestion. Skip exists because a failed call is
 * often not fatal to the answer, and forcing a retry to continue is how a
 * transient network blip becomes a dead conversation.
 */
export function ToolFailure({
  tool,
  target,
  error,
  attempt,
  attempts,
  onRetry,
  onSkip,
  onFeedback,
  className,
}: {
  tool: string
  target?: string
  error: string
  attempt?: number
  attempts?: number
  onRetry?: () => void
  onSkip?: () => void
  /** Capture what went wrong from the user's side — opens the same
      FeedbackDialog the message actions use, inline under the failure. */
  onFeedback?: (feedback: { reasons: string[]; note: string }) => void
  className?: string
}) {
  const [reporting, setReporting] = React.useState(false)
  return (
    <div
      role="alert"
      className={cn(
        "border-border bg-card flex flex-col gap-2 rounded-xl border p-3",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-destructive shrink-0">
          <Icon name="alert" size={14} />
        </span>
        <span className="text-muted-foreground shrink-0 font-mono text-xs">
          {tool}
        </span>
        {target && (
          <span className="min-w-0 flex-1 truncate text-sm">{target}</span>
        )}
        {attempt !== undefined && attempts !== undefined && (
          <span className="text-muted-foreground ms-auto shrink-0 font-mono text-xs">
            {attempt}/{attempts}
          </span>
        )}
      </div>
      <pre className="bg-(--destructive-wash) text-destructive overflow-x-auto rounded-lg px-2.5 py-1.5 font-mono text-xs whitespace-pre-wrap">
        {error}
      </pre>
      <div className="flex items-center justify-end gap-1.5">
        {onFeedback && (
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={reporting}
            onClick={() => setReporting((v) => !v)}
            className="text-muted-foreground hover:text-foreground me-auto"
          >
            <Icon name="thumbs-down" size={12} />
            Report
          </Button>
        )}
        {onSkip && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip
          </Button>
        )}
        {onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry}>
            <Icon name="replay" size={12} />
            Retry
          </Button>
        )}
      </div>
      {reporting && onFeedback && (
        <FeedbackDialog
          onSubmit={(f) => {
            onFeedback(f)
            setReporting(false)
          }}
          onDismiss={() => setReporting(false)}
        />
      )}
    </div>
  )
}

/* ----------------------------- code runner ----------------------------- */

/**
 * CODE RUNNER — a snippet with a run button, and the output it produced
 * attached beneath it.
 *
 * Attachment is the whole idea: output that floats free of the code that
 * made it is a screenshot. Keeping them in one object means re-running
 * replaces the result rather than appending another orphan block.
 */
export function CodeRunner({
  language,
  code,
  output,
  duration,
  running = false,
  onRun,
  staged = true,
  className,
}: {
  language: string
  code: string
  output?: string
  duration?: string
  running?: boolean
  onRun?: () => void
  /** Stage the run: the output is produced, not pre-printed. */
  staged?: boolean
  className?: string
}) {
  // pressing play IS a run: the output clears, the clock restarts, and the
  // result streams back in — the same arrival the first render performed
  const [runId, setRunId] = React.useState(0)
  const { pending } = useStagedReveal(1, {
    enabled: staged,
    delay: 1800,
    replay: runId,
  })
  const live = staged ? pending : running
  const elapsed = useElapsedSeconds(live)
  return (
    <div
      className={cn(
        "border-border bg-card divide-border divide-y overflow-hidden rounded-xl border",
        className
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
          {language}
        </span>
        <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
          {live ? `${elapsed}s` : duration}
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={live ? "Running" : "Run"}
          title={live ? "Running" : "Run"}
          disabled={live}
          onClick={() => {
            if (staged) setRunId((r) => r + 1)
            onRun?.()
          }}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <Icon name={live ? "pause" : "play"} size={13} />
        </Button>
      </div>
      <pre className="overflow-x-auto px-3 py-2 font-mono text-xs leading-relaxed">
        {code}
      </pre>
      {output !== undefined && !live && (
        <div key={runId} className="px-3 py-2">
          <div className="text-muted-foreground font-mono text-xs">
            output
          </div>
          <StreamingText
            text={output}
            live={staged}
            className="text-muted-foreground mt-0.5 block overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre-wrap"
          />
        </div>
      )}
    </div>
  )
}
