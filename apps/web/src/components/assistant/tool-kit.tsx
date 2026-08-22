import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@workspace/ui/components/button"
import { Icon, type IconName } from "@workspace/ui/components/icon"
import { cn } from "@workspace/ui/lib/utils"

import { useMotionTransition } from "@/foundation/foundation-context"

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
  argument,
  status = "done",
  request,
  result,
  defaultOpen = false,
  className,
}: {
  /** What it did, in plain language: "Searched the docs". */
  verb: string
  /** The argument worth showing inline: a query, a path, a command. */
  argument?: string
  status?: ToolStatus
  /** The exact request — evidence, so it is monospaced and unedited. */
  request?: string
  result?: string
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(defaultOpen || status === "failed")
  const transition = useMotionTransition("surface")
  const hasBody = Boolean(request || result)

  return (
    <div className={cn("flex flex-col", className)}>
      <button
        type="button"
        onClick={() => hasBody && setOpen((v) => !v)}
        aria-expanded={hasBody ? open : undefined}
        disabled={!hasBody}
        className="flex items-center gap-2 self-start text-start text-[13px] disabled:cursor-default"
      >
        {hasBody && (
          <span className="text-muted-foreground shrink-0">
            <Icon name={open ? "chevron-down" : "chevron-right"} size={13} />
          </span>
        )}
        <span className="font-medium">{verb}</span>
        {argument && (
          <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 font-mono text-[11px]">
            {argument}
          </span>
        )}
        <StatusMark status={status} />
      </button>
      <AnimatePresence initial={false}>
        {open && hasBody && (
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
                  <div className="text-muted-foreground font-mono text-[11px]">
                    Request
                  </div>
                  <pre className="mt-0.5 overflow-x-auto font-mono text-[12px] whitespace-pre-wrap">
                    {request}
                  </pre>
                </div>
              )}
              {request && result && <span className="bg-border h-px" />}
              {result && (
                <div>
                  <div className="text-muted-foreground font-mono text-[11px]">
                    Result
                  </div>
                  <pre className="mt-0.5 overflow-x-auto font-mono text-[12px] whitespace-pre-wrap">
                    {result}
                  </pre>
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
  className,
}: {
  steps: TimelineStep[]
  files?: FileStat[]
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const transition = useMotionTransition("surface")
  return (
    <div className={cn("flex flex-col", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 self-start text-[13px] transition-colors"
      >
        <Icon name={open ? "chevron-down" : "chevron-right"} size={13} />
        {steps.length} step{steps.length === 1 ? "" : "s"}
        {files.length > 0 && ` · ${files.length} file${files.length === 1 ? "" : "s"} changed`}
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
            <ol className="mt-1.5 flex flex-col gap-1.5">
              {steps.map((s, i) => (
                <li key={`${s.verb}-${i}`} className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">
                    <Icon name={s.icon ?? "code"} size={14} />
                  </span>
                  <span className="text-[13px]">{s.verb}</span>
                  {s.target && (
                    <span className="bg-muted text-muted-foreground truncate rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                      {s.target}
                    </span>
                  )}
                </li>
              ))}
            </ol>
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {files.map((f) => (
                  <span
                    key={f.path}
                    className="bg-muted inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[11px]"
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
  className,
}: {
  command: string
  lines: string[]
  running?: boolean
  /** Shown when the run ends; 0 reads as success, anything else as failure. */
  exitCode?: number
  tone?: "paper" | "ink"
  className?: string
}) {
  const ink = tone === "ink"
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
          "flex items-center gap-2 px-3 py-2 font-mono text-[12px]",
          ink ? "text-(--color-zinc-100)" : "text-foreground"
        )}
      >
        <span className="min-w-0 flex-1 truncate">{command}</span>
        {running ? (
          <span className="border-muted-foreground/30 border-t-primary size-3.5 shrink-0 animate-spin rounded-full border-2" />
        ) : exitCode !== undefined ? (
          <span
            className={cn(
              "shrink-0 text-[11px]",
              exitCode === 0 ? "text-(--positive)" : "text-destructive"
            )}
          >
            exit {exitCode}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "overflow-x-auto px-3 pb-2 font-mono text-[12px] leading-relaxed",
          ink ? "text-(--color-zinc-400)" : "text-muted-foreground"
        )}
      >
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre">
            {l}
          </div>
        ))}
        {running && (
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

function DiffRows({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="overflow-x-auto font-mono text-[12px] leading-relaxed">
      {lines.map((l, i) => (
        <div
          key={i}
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
        </div>
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
  className,
}: {
  path: string
  lines: DiffLine[]
  added?: number
  removed?: number
  className?: string
}) {
  const plus = added ?? lines.filter((l) => l.sign === "+").length
  const minus = removed ?? lines.filter((l) => l.sign === "-").length
  return (
    <div
      className={cn(
        "border-border bg-card overflow-hidden rounded-xl border",
        className
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[12px]">
          {path}
        </span>
        <span className="shrink-0 font-mono text-[11px]">
          <span className="text-(--positive)">+{plus}</span>{" "}
          <span className="text-destructive">−{minus}</span>
        </span>
      </div>
      <DiffRows lines={lines} />
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
  className,
}: {
  path: string
  hunks: DiffHunk[]
  onApply?: (keptIndexes: number[]) => void
  className?: string
}) {
  // undefined = undecided; the third state is the point of the component
  const [kept, setKept] = React.useState<Record<number, boolean | undefined>>({})
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
        <span className="min-w-0 flex-1 truncate font-mono text-[12px]">
          {path}
        </span>
        <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
          {keptIndexes.length} of {hunks.length} kept
        </span>
      </div>
      {hunks.map((h, i) => (
        <div key={i} className={cn(kept[i] === false && "opacity-50")}>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11px]">
              {h.header}
            </span>
            <Button
              size="xs"
              variant="ghost"
              aria-pressed={kept[i] === false}
              onClick={() => setKept((k) => ({ ...k, [i]: false }))}
              className="text-muted-foreground hover:text-foreground font-normal"
            >
              <Icon name="close" size={12} />
              Discard
            </Button>
            <Button
              size="xs"
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
          <DiffRows lines={h.lines} />
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <span className="text-muted-foreground font-mono text-[11px]">
          {undecided > 0 ? `${undecided} left to review` : "all reviewed"}
        </span>
        <Button
          size="xs"
          disabled={keptIndexes.length === 0}
          onClick={() => onApply?.(keptIndexes)}
        >
          Apply {keptIndexes.length}
        </Button>
      </div>
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
  className,
}: {
  /** What the batch was for: "Read 4 files in parallel". */
  summary: string
  calls: ParallelCall[]
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const transition = useMotionTransition("surface")
  const done = calls.filter((c) => (c.status ?? "done") === "done").length
  const failed = calls.some((c) => c.status === "failed")

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
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {summary}
        </span>
        <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
          {done} done
        </span>
        <StatusMark status={failed ? "failed" : "done"} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={transition}
            className="border-border overflow-hidden border-t"
          >
            {calls.map((c, i) => (
              <li
                key={`${c.tool}-${i}`}
                className="flex items-center gap-2 px-3 py-1.5"
              >
                <StatusMark status={c.status ?? "done"} />
                <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                  {c.tool}
                </span>
                {c.target && (
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    {c.target}
                  </span>
                )}
                {c.duration && (
                  <span className="text-muted-foreground ms-auto shrink-0 font-mono text-[11px]">
                    {c.duration}
                  </span>
                )}
              </li>
            ))}
          </motion.ul>
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
  className,
}: {
  tool: string
  target?: string
  error: string
  attempt?: number
  attempts?: number
  onRetry?: () => void
  onSkip?: () => void
  className?: string
}) {
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
        <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
          {tool}
        </span>
        {target && (
          <span className="min-w-0 flex-1 truncate text-[13px]">{target}</span>
        )}
        {attempt !== undefined && attempts !== undefined && (
          <span className="text-muted-foreground ms-auto shrink-0 font-mono text-[11px]">
            {attempt}/{attempts}
          </span>
        )}
      </div>
      <pre className="bg-(--destructive-wash) text-destructive overflow-x-auto rounded-lg px-2.5 py-1.5 font-mono text-[12px] whitespace-pre-wrap">
        {error}
      </pre>
      <div className="flex items-center justify-end gap-1.5">
        {onSkip && (
          <Button
            size="xs"
            variant="ghost"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip
          </Button>
        )}
        {onRetry && (
          <Button size="xs" variant="ghost" onClick={onRetry}>
            <Icon name="replay" size={12} />
            Retry
          </Button>
        )}
      </div>
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
  className,
}: {
  language: string
  code: string
  output?: string
  duration?: string
  running?: boolean
  onRun?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "border-border bg-card divide-border divide-y overflow-hidden rounded-xl border",
        className
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11px]">
          {language}
        </span>
        {duration && (
          <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
            {duration}
          </span>
        )}
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={running ? "Running" : "Run"}
          title={running ? "Running" : "Run"}
          disabled={running}
          onClick={onRun}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <Icon name={running ? "pause" : "play"} size={13} />
        </Button>
      </div>
      <pre className="overflow-x-auto px-3 py-2 font-mono text-[12px] leading-relaxed">
        {code}
      </pre>
      {output !== undefined && (
        <div className="px-3 py-2">
          <div className="text-muted-foreground font-mono text-[11px]">
            output
          </div>
          <pre className="text-muted-foreground mt-0.5 overflow-x-auto font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      )}
    </div>
  )
}
