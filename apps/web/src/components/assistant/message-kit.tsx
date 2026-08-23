import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@workspace/ui/components/button"
import { Icon, type IconName } from "@workspace/ui/components/icon"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import { useMotionTransition } from "@/foundation/foundation-context"

import { Composer } from "./composer"
import { StageSkeleton, StagedItem } from "./staging"
import { StreamingText } from "./streaming-text"
import { useElapsedSeconds, useStagedReveal } from "./use-staged-reveal"

import {
  FEEDBACK_REASONS,
  REASONING_EFFORTS,
  type ReasoningEffortLevel,
} from "./kit-vocabulary"

/**
 * How long the thinking state holds at minimum. Work that appears to finish
 * instantly reads as a lookup; this is a real wait, so the counter measuring
 * it stays a measurement rather than a decoration.
 */
export const THINKING_FLOOR_MS = 15_000

/**
 * THE MESSAGE KIT — the objects a conversation is made of once an answer
 * exists: what you can do to it, what it offers next, what it costs, and
 * how it fails.
 *
 * Every one of these is composed from the product vocabulary (Button, Input,
 * Icon) and the system's tokens. None of them defines a color, a blur, or a
 * duration of its own: status comes from --positive / --destructive, timing
 * from the motion roles.
 *
 * A shared rule runs through the whole file: THE ASSISTANT'S OBJECTS ARE
 * QUIET UNTIL THEY MATTER. Actions stay ghost-weight, failures state the
 * fact and offer the one useful move, and nothing animates that the user
 * did not cause.
 */

/* ------------------------------ actions ------------------------------- */

export type MessageRating = "up" | "down" | null

/**
 * MESSAGE ACTIONS — copy, rate, regenerate: the small row under an answer.
 *
 * Each action confirms ITSELF rather than raising a toast. Copy becomes a
 * check for a beat, a rating stays lit, and regenerate hands off to whoever
 * owns the answer. A toast for a copy is a notification about something the
 * user is already looking at.
 */
export function MessageActions({
  onCopy,
  rating = null,
  onRate,
  onRegenerate,
  onMore,
  text,
  className,
}: {
  /** Called after the text is on the clipboard; the check is handled here. */
  onCopy?: () => void
  rating?: MessageRating
  onRate?: (rating: MessageRating) => void
  onRegenerate?: () => void
  onMore?: () => void
  /** The text to copy. Omit to handle copying yourself via onCopy. */
  text?: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1400)
    return () => window.clearTimeout(t)
  }, [copied])

  const copy = async () => {
    if (text) {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        // clipboard can be denied; the check would be a lie, so bail quietly
        onCopy?.()
        return
      }
    }
    setCopied(true)
    onCopy?.()
  }

  const act = (name: IconName, label: string, on?: () => void, lit?: boolean) => (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={label}
      title={label}
      aria-pressed={lit}
      onClick={on}
      className={cn(
        "text-muted-foreground hover:text-foreground",
        lit && "text-foreground"
      )}
    >
      <Icon name={name} size={13} />
    </Button>
  )

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={copied ? "Copied" : "Copy"}
        title={copied ? "Copied" : "Copy"}
        onClick={copy}
        className={cn(
          "text-muted-foreground hover:text-foreground",
          copied && "text-(--positive)"
        )}
      >
        <Icon name={copied ? "check" : "copy"} size={13} />
      </Button>
      {act("thumbs-up", "Good answer", () => onRate?.(rating === "up" ? null : "up"), rating === "up")}
      {act("thumbs-down", "Bad answer", () => onRate?.(rating === "down" ? null : "down"), rating === "down")}
      {onRegenerate && act("replay", "Regenerate", onRegenerate)}
      {onMore && act("more", "More actions", onMore)}
    </div>
  )
}

/* --------------------------- follow-up prompts -------------------------- */

/**
 * FOLLOW-UP SUGGESTIONS — the next turns the assistant thinks are worth
 * taking, offered as prompts rather than performed.
 *
 * A titled group of rows, and deliberately only that. A pill row was the
 * obvious second shape and it was wrong: a real follow-up is a sentence, so it
 * wraps to two lines and needs a target the width of the surface. Squeezing it
 * into a pill produced something that could neither be read at a glance nor
 * scanned as a list.
 *
 * They stagger in because they arrive after the answer settles — a group that
 * appears all at once reads as chrome that was always there.
 */
export function FollowUpSuggestions({
  suggestions,
  onPick,
  label = "Ask more",
  className,
}: {
  suggestions: string[]
  onPick?: (suggestion: string) => void
  /** The group's heading; pass null to drop it. */
  label?: string | null
  className?: string
}) {
  const transition = useMotionTransition("control")
  if (suggestions.length === 0) return null

  return (
    <div
      className={cn(
        "border-border bg-card mt-3 overflow-hidden rounded-xl border",
        className
      )}
    >
      {label && (
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
          <span className="text-muted-foreground">
            <Icon name="sparkles" size={13} />
          </span>
          <span className="text-sm font-medium">{label}</span>
        </div>
      )}
      <div className={cn("divide-border divide-y", label && "border-border border-t")}>
        {suggestions.map((s, i) => (
          <motion.button
            key={s}
            type="button"
            onClick={() => onPick?.(s)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: i * 0.05 }}
            className="group/row hover:bg-(--wash) flex w-full items-start gap-3 px-3 py-2.5 text-start transition-colors"
          >
            {/* the question wraps — it is a sentence, not a label */}
            <span className="min-w-0 flex-1 text-sm leading-relaxed">
              {s}
            </span>
            <span className="bg-muted text-muted-foreground group-hover/row:text-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md transition-colors">
              <Icon name="arrow-up-right" size={12} />
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------ failure -------------------------------- */

/**
 * ERROR STATE — a run that stopped, stated in place.
 *
 * A failed answer is not a system-level event: it belongs in the transcript
 * where the answer would have been, not in a modal over the user's work. It
 * says what happened, and offers the single move that helps.
 */
export function ErrorState({
  title = "Generation stopped",
  detail,
  onRetry,
  retryLabel = "Retry",
  className,
}: {
  title?: string
  detail?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        "bg-(--destructive-wash) text-destructive flex items-start gap-2.5 rounded-xl px-3 py-2.5",
        className
      )}
    >
      <span className="mt-0.5 shrink-0">
        <Icon name="alert" size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        {detail && <p className="mt-0.5 text-sm opacity-80">{detail}</p>}
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRetry}
          className="text-destructive hover:text-destructive shrink-0 hover:bg-(--destructive-wash)"
        >
          <Icon name="replay" size={13} />
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

/* ------------------------------- queue --------------------------------- */

export interface QueuedTurn {
  id: string
  text: string
}

/**
 * MESSAGE QUEUE — turns typed while a run was in flight.
 *
 * The alternative designs both lose something: blocking the input makes the
 * user hold a thought, and interrupting on every send throws away work in
 * progress. A queue keeps both — and stays EDITABLE, because a queued turn is
 * a plan, not a commitment: cancel one the running answer already covered, or
 * send one NOW and let the running turn go back in the queue behind it.
 */
export function MessageQueue({
  running,
  queued,
  onInterrupt,
  onCancel,
  className,
}: {
  /** The turn currently being answered. */
  running?: string
  queued: QueuedTurn[]
  /**
   * Send this turn NOW — which necessarily interrupts the running one and
   * puts it back at the head of the queue. It is not a reorder: a queue whose
   * items can be shuffled while one of them is mid-answer implies the running
   * turn can be overtaken quietly, and it cannot.
   */
  onInterrupt?: (id: string) => void
  onCancel?: (id: string) => void
  className?: string
}) {
  const transition = useMotionTransition("control")
  if (!running && queued.length === 0) return null
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {running && (
        <div className="border-border bg-card flex items-center gap-2.5 rounded-xl border px-3 py-2">
          <span className="bg-primary size-2 shrink-0 animate-pulse rounded-full" />
          <span className="min-w-0 flex-1 truncate text-sm">{running}</span>
          {/* the state says it is working, so it wears the working treatment */}
          <span className="ambient-shimmer shrink-0 font-mono text-xs">
            running
          </span>
        </div>
      )}
      {queued.length > 0 && (
        <>
          <div className="text-muted-foreground flex items-baseline justify-between px-1 text-xs">
            <span>{queued.length} queued</span>
            <span className="font-mono">sends when this finishes</span>
          </div>
          <AnimatePresence initial={false}>
            {queued.map((q, i) => (
              <motion.div
                key={q.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={transition}
                className="bg-muted flex items-center gap-2.5 rounded-xl px-3 py-2"
              >
                <span className="text-muted-foreground shrink-0 font-mono text-xs">
                  {i + 1}
                </span>
                <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
                  {q.text}
                </span>
                {onInterrupt && running && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Send "${q.text}" now, interrupting the running turn`}
                    title="Send now — interrupts the running turn"
                    onClick={() => onInterrupt(q.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <Icon name="arrow-up" size={13} />
                  </Button>
                )}
                {onCancel && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove "${q.text}" from the queue`}
                    onClick={() => onCancel(q.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <Icon name="close" size={13} />
                  </Button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

/* ----------------------------- reasoning ------------------------------- */

export interface ReasoningStep {
  title: string
  detail?: string
}

/**
 * REASONING PANEL — the trace, collapsed by default once it is over.
 *
 * Reasoning is interesting WHILE it happens and reference material after, so
 * the panel opens itself during the run and settles to a one-line summary
 * ("Thought for 5s") when it finishes. The user can always reopen it; it
 * just stops competing with the answer.
 */
export function ReasoningPanel({
  steps,
  seconds,
  running = false,
  defaultOpen,
  staged = true,
  className,
}: {
  steps: ReasoningStep[]
  /** How long the thinking took; shown in the settled summary. */
  seconds?: number
  running?: boolean
  defaultOpen?: boolean
  /**
   * Stage the arrival: shimmer, hold, then one step at a time. False renders
   * settled — an older trace re-rendered must never re-think itself.
   */
  staged?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(defaultOpen ?? running)
  const transition = useMotionTransition("surface")
  // the trace arrives the way it was produced: a beat of nothing, then a
  // step, then the next
  const { shown, pending, working: counting } = useStagedReveal(steps.length, {
    // THINKING TAKES TIME. The steps land at their own pace, but the panel
    // holds the thinking state to a floor — an answer that appears to think
    // for two seconds and then knows everything is not what the work looked
    // like. The floor is a real wait, so the counter still measures it.
    minDuration: THINKING_FLOOR_MS,
    enabled: staged,
    // long enough to be a real wait, and paced so a step can be READ before
    // the next one lands rather than three arriving on top of each other
    delay: 2600,
    interval: 1500,
  })
  const working = staged && (pending || shown < steps.length)
  const elapsed = useElapsedSeconds(counting)
  // the settled summary quotes the time it ACTUALLY took, not a prop
  const took = staged ? Math.max(1, elapsed) : seconds
  // A run that starts opens the trace; finishing collapses it back — adjusted
  // DURING render on the transition, not from an effect, so the panel never
  // paints in the stale state first. (react.dev: adjusting state when a prop
  // changes.) The user's own toggle still wins until running flips again.
  const [wasRunning, setWasRunning] = React.useState(running)
  if (running !== wasRunning) {
    setWasRunning(running)
    if (defaultOpen === undefined) setOpen(running)
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 self-start text-sm transition-colors"
      >
        <span className={cn(working && "ambient-shimmer")}>
          {running || working
            ? `Thinking… ${elapsed}s`
            : took !== undefined
              ? `Thought for ${took}s`
              : "Reasoning"}
        </span>
        <Icon name={open ? "chevron-down" : "chevron-right"} size={13} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ol
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={transition}
            className="overflow-hidden"
          >
            {pending && <StageSkeleton rows={Math.min(2, steps.length)} />}
            {steps.slice(0, shown).map((s, i) => (
              <li key={s.title}>
                <StagedItem index={i} className="flex gap-2.5 pt-3">
                  {/* the timeline: a mark per step, not a connector — the
                      steps are ordered, not causally chained */}
                  <span
                    aria-hidden
                    className="bg-muted-foreground/40 mt-1.5 size-1.5 shrink-0 rounded-full"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{s.title}</div>
                    {s.detail && (
                      // the detail is written, not revealed — the same
                      // component the answer itself streams through
                      <StreamingText
                        text={s.detail}
                        live={staged}
                        className="text-muted-foreground mt-0.5 block text-sm"
                      />
                    )}
                  </div>
                </StagedItem>
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  )
}


/**
 * REASONING EFFORT — how hard to think, and what that budget actually cost.
 *
 * COLLAPSED BY DEFAULT, behind a ghost trigger that states the current level.
 * This is a setting, not a status: it earns a permanent strip of the composer
 * only if the user is changing it constantly, and they are not. The trigger
 * carries the one fact worth glancing at, and opening it reveals the choice
 * and the spend together.
 *
 * The control and the meter belong together: an effort setting with no spend
 * reading is a preference with invisible consequences. Showing both is what
 * lets someone learn that "high" is worth it here and not there.
 */
export function ReasoningEffort({
  level,
  onChange,
  spent,
  budget,
  label = "Thinking",
  defaultOpen = false,
  className,
}: {
  level: ReasoningEffortLevel
  onChange?: (level: ReasoningEffortLevel) => void
  /** Tokens spent against the budget; omit both to hide the meter. */
  spent?: number
  budget?: number
  label?: string
  /** Start expanded — for a settings surface, where it IS the content. */
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const transition = useMotionTransition("surface")
  const ratio =
    spent !== undefined && budget ? Math.min(1, spent / budget) : null

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Button
        size="sm"
        variant="ghost"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground -ms-2 self-start font-normal"
      >
        <Icon name="sparkles" size={12} />
        {label}
        <span className="text-foreground capitalize">{level}</span>
        <Icon name={open ? "chevron-down" : "chevron-right"} size={12} />
      </Button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={transition}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1.5 pt-1">
              {ratio !== null && (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-muted-foreground text-xs">
                    spent
                  </span>
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
                    {spent!.toLocaleString()} / {budget!.toLocaleString()}
                  </span>
                </div>
              )}
              <div
                role="radiogroup"
                aria-label={label}
                className="bg-muted flex items-center gap-0.5 rounded-full p-0.5"
              >
                {REASONING_EFFORTS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    role="radio"
                    aria-checked={e === level}
                    onClick={() => onChange?.(e)}
                    className={cn(
                      "flex-1 rounded-full px-3 py-1 text-sm capitalize transition-colors",
                      e === level
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
              {ratio !== null && (
                <div className="bg-muted h-1 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-[width] duration-(--motion-surface)"
                    style={{ width: `${ratio * 100}%` }}
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

/* ---------------------------- attachments ------------------------------ */

export interface MessageAttachment {
  id: string
  name: string
  /** Human-readable size, e.g. "412 KB" — formatting is the caller's data. */
  size?: string
  /** Extra fact worth showing, e.g. "14 pages". */
  meta?: string
  kind?: "image" | "document" | "file" | "text"
  /** A thumbnail for images; falls back to the kind's icon. */
  thumbnail?: string
  onOpen?: () => void
}

const ATTACHMENT_ICON: Record<
  NonNullable<MessageAttachment["kind"]>,
  IconName
> = { image: "image", document: "document", file: "paperclip", text: "quote" }

/**
 * MESSAGE ATTACHMENTS — what was attached, before or after sending.
 *
 * One component for both, because they are the same object at two moments,
 * and REMOVABILITY is the only honest difference: pass `onRemove` while the
 * attachment is still staged in the composer, omit it once the message is
 * sent and the attachment is a record. Two components would have drifted
 * into two ideas of what an attachment looks like.
 *
 * An image can be opened; everything else states what it is and how big —
 * enough to know whether it is the thing you meant. Pasted text is a `text`
 * attachment: it is quoted material, not a file, and it says so.
 */
export function MessageAttachments({
  attachments,
  onRemove,
  compact = false,
  className,
}: {
  attachments: MessageAttachment[]
  /** Present while the attachment can still be taken back — see above. */
  onRemove?: (id: string) => void
  /**
   * The composer's density: chips in one scrolling row rather than stacked
   * cards. Staged attachments sit BESIDE context chips and mean the same
   * thing — here is what the question is about — so they read as the same
   * kind of object. Stacked, four of them pushed the input off the surface,
   * which is the wrong trade for material you are only referring to.
   */
  compact?: boolean
  className?: string
}) {
  if (attachments.length === 0) return null

  if (compact) {
    return (
      <div
        className={cn(
          "no-scrollbar flex items-center gap-1.5 overflow-x-auto",
          className
        )}
      >
        {attachments.map((a) => (
          <span
            key={a.id}
            title={`${a.name}${a.meta ? ` · ${a.meta}` : ""}`}
            className="border-border inline-flex max-w-full shrink-0 items-center gap-2 rounded-lg border bg-(--wash) py-1 ps-1.5 pe-1 text-xs font-medium"
          >
            <span className="text-muted-foreground bg-card flex size-5 shrink-0 items-center justify-center rounded-[5px]">
              <Icon name={ATTACHMENT_ICON[a.kind ?? "file"]} size={12} />
            </span>
            <span className="max-w-44 min-w-0 truncate">{a.name}</span>
            {onRemove && (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label={`Remove ${a.name}`}
                title="Remove"
                onClick={() => onRemove(a.id)}
                className="text-muted-foreground hover:text-foreground size-[22px] shrink-0 rounded-md bg-accent"
              >
                <Icon name="close" size={11} />
              </Button>
            )}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {attachments.map((a) => {
        const kind = a.kind ?? "file"
        // a removable row already contains a button, so it must not BE one:
        // while staged, removing wins over opening
        const openable = Boolean(a.onOpen) && !onRemove
        const Row = openable ? "button" : "div"
        return (
          <Row
            key={a.id}
            {...(openable
              ? { type: "button" as const, onClick: a.onOpen }
              : {})}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start",
              openable
                ? "border-border bg-card hover:bg-muted border transition-colors"
                : "bg-muted"
            )}
          >
            {a.thumbnail ? (
              <img
                src={a.thumbnail}
                alt=""
                className="size-9 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span
                className={cn(
                  "text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg",
                  openable ? "bg-muted" : "bg-card"
                )}
              >
                <Icon name={ATTACHMENT_ICON[kind]} size={16} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{a.name}</span>
              {(a.size || a.meta) && (
                <span className="text-muted-foreground block font-mono text-xs">
                  {[a.size, a.meta].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
            {openable && !onRemove && (
              <span className="text-muted-foreground shrink-0">
                <Icon name={ATTACHMENT_ICON[kind]} size={14} />
              </span>
            )}
            {onRemove && (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label={`Remove ${a.name}`}
                title="Remove"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(a.id)
                }}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <Icon name="close" size={12} />
              </Button>
            )}
          </Row>
        )
      })}
    </div>
  )
}

/* ----------------------------- quote reply ----------------------------- */

export type QuoteAction =
  | "explain"
  | "improve"
  | "shorten"
  | "tone"
  | "grammar"
  | "prompt"

type QuoteMode = "idle" | "thinking" | "streaming" | "result"

const PRIMARY_ACTIONS: { id: QuoteAction; label: string; icon: IconName }[] = [
  { id: "explain", label: "Explain", icon: "sparkles" },
  { id: "improve", label: "Improve", icon: "edit" },
]
const MORE_ACTIONS: { id: QuoteAction; label: string; icon: IconName }[] = [
  { id: "shorten", label: "Shorten", icon: "scissors" },
  { id: "tone", label: "Tone", icon: "smile" },
  { id: "grammar", label: "Grammar", icon: "type" },
]
const BUSY_LABEL: Record<QuoteAction, string> = {
  explain: "Explaining",
  improve: "Improving",
  shorten: "Shortening",
  tone: "Changing tone",
  grammar: "Fixing grammar",
  prompt: "Editing",
}

/**
 * QUOTE REPLY — select a phrase and a contextual bar attaches beneath it.
 *
 * ANCHORED, ABSOLUTELY. The bar measures the selection (`getClientRects`) and
 * positions itself under the LAST line, centred on the full bounds — so a
 * selection that wraps still reads as one object with its bar. Re-measured on
 * selection change and resize, batched through requestAnimationFrame so
 * mid-layout positions never paint.
 *
 * A STATE MACHINE, not a toolbar: idle (prompt input + actions) → thinking
 * (spinner + shimmer with the real elapsed count) → streaming (the rewrite
 * arrives INTO the selection through StreamingText) → result (Keep / Discard /
 * Retry). Rewriting in place requires owning the prose, so the component takes
 * `text` and an optional `rewrite` seam; without one it only reports actions,
 * which is what a surface that cannot mutate its content should get.
 */
export function QuoteReply({
  text,
  children,
  rewrite,
  onAction,
  className,
}: {
  /** The prose, when the component owns it (enables rewrite-in-place). */
  text?: string
  /** Alternatively, arbitrary content — actions are report-only. */
  children?: React.ReactNode
  /** The model seam: produce the replacement for a selection. */
  rewrite?: (action: QuoteAction, selection: string, prompt?: string) => string
  onAction?: (action: QuoteAction, selection: string) => void
  className?: string
}) {
  const hostRef = React.useRef<HTMLDivElement | null>(null)
  const frameRef = React.useRef<number | null>(null)
  const [selection, setSelection] = React.useState("")
  const [range, setRange] = React.useState<[number, number] | null>(null)
  const [anchor, setAnchor] = React.useState<{ x: number; y: number } | null>(null)
  const [mode, setMode] = React.useState<QuoteMode>("idle")
  const [action, setAction] = React.useState<QuoteAction>("improve")
  const [prompt, setPrompt] = React.useState("")
  const [expanded, setExpanded] = React.useState(false)
  const [replacement, setReplacement] = React.useState("")
  const transition = useMotionTransition("control")
  const elapsed = useElapsedSeconds(mode === "thinking")

  /* attach beneath the final selected line, centred on the whole selection */
  const place = React.useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      const host = hostRef.current
      const sel = window.getSelection()
      if (!host || !sel || sel.rangeCount === 0) return
      const rects = Array.from(sel.getRangeAt(0).getClientRects())
      const last = rects.at(-1)
      const bounds = sel.getRangeAt(0).getBoundingClientRect()
      if (!last || bounds.width === 0) return
      const hostBounds = host.getBoundingClientRect()
      setAnchor({
        x: Math.round(bounds.left - hostBounds.left + bounds.width / 2),
        y: Math.round(last.bottom - hostBounds.top + 8),
      })
    })
  }, [])

  React.useEffect(() => {
    const read = () => {
      // the bar owns the interaction once a run starts; the selection
      // collapsing (a click on the bar) must not dismiss mid-run
      if (mode !== "idle") return
      const sel = window.getSelection()
      const value = sel?.toString().trim() ?? ""
      const inside = sel?.anchorNode && hostRef.current?.contains(sel.anchorNode)
      if (value && inside) {
        setSelection(value)
        if (text && sel && sel.rangeCount > 0) {
          const i = text.indexOf(value)
          setRange(i >= 0 ? [i, i + value.length] : null)
        }
        place()
      } else {
        setSelection("")
        setAnchor(null)
        setPrompt("")
        setExpanded(false)
      }
    }
    document.addEventListener("selectionchange", read)
    window.addEventListener("resize", place)
    return () => {
      document.removeEventListener("selectionchange", read)
      window.removeEventListener("resize", place)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [mode, place, text])

  const canRewrite = Boolean(text && rewrite && range)
  const run = (a: QuoteAction, p?: string) => {
    setAction(a)
    setExpanded(false)
    onAction?.(a, selection)
    if (!canRewrite || a === "explain") {
      // explain reads, it does not edit — and without the rewrite seam
      // there is nothing to write into
      setSelection("")
      setAnchor(null)
      return
    }
    setReplacement(rewrite!(a, selection, p))
    setMode("thinking")
    window.setTimeout(() => setMode("streaming"), 1400)
  }
  const settle = (keep: boolean) => {
    if (keep && range) setApplied({ range, value: replacement })
    setMode("idle")
    setSelection("")
    setAnchor(null)
    setPrompt("")
  }
  const [applied, setApplied] = React.useState<{
    range: [number, number]
    value: string
  } | null>(null)

  /* the prose, with the selection swapped live while a rewrite streams */
  const renderText = () => {
    if (!text) return children
    const base = applied
      ? text.slice(0, applied.range[0]) + applied.value + text.slice(applied.range[1])
      : text
    if ((mode === "streaming" || mode === "result") && range && !applied) {
      return (
        <>
          {text.slice(0, range[0])}
          <span className="bg-(--wash) rounded-[3px] box-decoration-clone">
            {mode === "streaming" ? (
              <StreamingText
                text={replacement}
                live
                onSettled={() => setMode("result")}
                className="inline"
              />
            ) : (
              replacement
            )}
          </span>
          {text.slice(range[1])}
        </>
      )
    }
    return base
  }


  return (
    <div ref={hostRef} className={cn("relative", className)}>
      {text ? <p className="text-sm leading-relaxed">{renderText()}</p> : children}
      <AnimatePresence>
        {(anchor && (selection || mode !== "idle")) && (
          <motion.div
            key="bar"
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={transition}
            className="absolute top-0 left-0 z-10"
            style={{
              transform: `translate(${anchor.x}px, ${anchor.y}px) translateX(-50%)`,
            }}
          >
            <div
              // pressing a control must not collapse the selection: the
              // collapse fires selectionchange, which would unmount this bar
              // before the click it was aimed at ever lands
              onPointerDown={(e) => e.preventDefault()}
              className="border-border bg-card flex h-9 w-fit max-w-[calc(100vw-3rem)] items-center gap-0.5 overflow-hidden rounded-full border p-1 shadow-lg"
            >
              {(mode === "thinking" || mode === "streaming") && (
                <span className="flex h-7 items-center gap-1.5 px-2.5 text-xs whitespace-nowrap">
                  <span className="border-muted-foreground/30 border-t-primary size-3 shrink-0 animate-spin rounded-full border-[1.5px]" />
                  {mode === "thinking" ? (
                    <span className="ambient-shimmer tabular-nums">
                      {BUSY_LABEL[action]}… {elapsed}s
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {BUSY_LABEL[action]}…
                    </span>
                  )}
                </span>
              )}

              {mode === "result" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => settle(true)}
                    className="shrink-0 rounded-full"
                  >
                    <Icon name="check" size={12} />
                    Keep
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => settle(false)}
                    className="shrink-0 rounded-full font-normal"
                  >
                    <Icon name="close" size={12} />
                    Discard
                  </Button>
                  <span className="bg-border mx-0.5 h-4 w-px shrink-0" />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Try again"
                    onClick={() => run(action, prompt || undefined)}
                    className="shrink-0 rounded-full"
                  >
                    <Icon name="replay" size={13} />
                  </Button>
                </>
              )}

              {mode === "idle" && (
                <>
                  <form
                    className="flex h-7 shrink-0 items-center"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (prompt.trim()) run("prompt", prompt.trim())
                    }}
                  >
                    <input
                      value={prompt}
                      onPointerDown={(e) => e.stopPropagation()}
                      onChange={(e) => setPrompt(e.target.value)}
                      aria-label="Describe edits"
                      placeholder="Describe edits"
                      className="placeholder:text-muted-foreground h-7 w-32 bg-transparent ps-2.5 pe-1 text-xs outline-none"
                    />
                  </form>
                  {prompt.trim() ? (
                    <Button
                      size="icon-sm"
                      aria-label="Send edit instruction"
                      onClick={() => run("prompt", prompt.trim())}
                      className="shrink-0 rounded-full"
                    >
                      <Icon name="arrow-up" size={13} />
                    </Button>
                  ) : (
                    <>
                      <span className="bg-border mx-0.5 h-4 w-px shrink-0" />
                      {PRIMARY_ACTIONS.map((a) => (
                        <Button
                          key={a.id}
                          size="sm"
                          variant="ghost"
                          onClick={() => run(a.id)}
                          className="shrink-0 rounded-full font-normal"
                        >
                          <Icon name={a.icon} size={12} />
                          {a.label}
                        </Button>
                      ))}
                      {/* the long tail unfolds inside the pill, so the bar
                          grows instead of becoming a menu */}
                      <motion.div
                        animate={{
                          width: expanded ? "auto" : 0,
                          opacity: expanded ? 1 : 0,
                        }}
                        transition={transition}
                        className="flex items-center gap-0.5 overflow-hidden"
                      >
                        {MORE_ACTIONS.map((a) => (
                          <Button
                            key={a.id}
                            size="sm"
                            variant="ghost"
                            onClick={() => run(a.id)}
                            className="shrink-0 rounded-full font-normal"
                          >
                            <Icon name={a.icon} size={12} />
                            {a.label}
                          </Button>
                        ))}
                      </motion.div>
                      <span className="bg-border mx-0.5 h-4 w-px shrink-0" />
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={expanded ? "Show fewer actions" : "Show more actions"}
                        aria-expanded={expanded}
                        onClick={() => setExpanded((v) => !v)}
                        className="shrink-0 rounded-full"
                      >
                        <motion.span
                          animate={{ rotate: expanded ? 180 : 0 }}
                          transition={transition}
                          className="flex"
                        >
                          <Icon name="chevron-right" size={13} />
                        </motion.span>
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* --------------------------- feedback dialog --------------------------- */


/**
 * FEEDBACK DIALOG — the thumbs-down that asks why.
 *
 * A bare rating is a number nobody can act on. Asking for a reason at the
 * moment of the reaction is the only time the user actually knows it. Every
 * field is optional, and the reasons are preset because free text is a tax
 * on the person doing you a favor.
 *
 * Not a modal: it opens under the answer it is about. (The system has no
 * Dialog — see the /ds registry's known gaps — and this is a case where
 * that constraint produced the better interaction.)
 */
export function FeedbackDialog({
  onSubmit,
  onDismiss,
  className,
}: {
  onSubmit?: (feedback: { reasons: string[]; note: string }) => void
  onDismiss?: () => void
  className?: string
}) {
  const [reasons, setReasons] = React.useState<string[]>([])
  const [note, setNote] = React.useState("")
  const toggle = (r: string) =>
    setReasons((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]))

  return (
    <div
      role="group"
      aria-label="What went wrong?"
      className={cn(
        "border-border bg-card flex w-full max-w-sm flex-col gap-3 rounded-xl border p-3 shadow-xs",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg">
          <Icon name="thumbs-down" size={14} />
        </span>
        <span className="flex-1 text-sm font-medium">What went wrong?</span>
        <span className="text-muted-foreground font-mono text-xs">
          optional
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FEEDBACK_REASONS.map((r) => (
          <Button
            key={r}
            size="sm"
            variant={reasons.includes(r) ? "secondary" : "ghost"}
            aria-pressed={reasons.includes(r)}
            onClick={() => toggle(r)}
            className={cn(
              "rounded-full font-normal",
              !reasons.includes(r) && "bg-muted"
            )}
          >
            {r}
          </Button>
        ))}
      </div>
      {/* the system has no Textarea; a single line is the documented
          substitute, and it also discourages an essay nobody will read */}
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything else?"
        aria-label="Anything else?"
      />
      <div className="flex items-center justify-end gap-1.5">
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={() => onSubmit?.({ reasons, note })}>
          Send feedback
        </Button>
      </div>
    </div>
  )
}

/* ----------------------------- timestamps ------------------------------ */

/**
 * DAY DIVIDER — chronology in a long thread, marked only where it changes.
 *
 * A timestamp on every message is noise; a day boundary is the only moment
 * a reader actually needs orienting. Exact times live on hover (see
 * MessageTime), so precision is available without being ambient.
 */
export function DayDivider({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <div
      className={cn("flex items-center gap-3 py-1", className)}
      role="separator"
      aria-label={label}
    >
      <span className="bg-border h-px flex-1" />
      <span className="text-muted-foreground font-mono text-xs">
        {label}
      </span>
      <span className="bg-border h-px flex-1" />
    </div>
  )
}

/** The exact time for one message: present, but only on hover or focus. */
export function MessageTime({
  time,
  className,
}: {
  time: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "text-muted-foreground pointer-events-none font-mono text-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        className
      )}
    >
      {time}
    </span>
  )
}

export type { ReasoningEffortLevel }

/* ---------------------------- review comment ---------------------------- */

export type ReviewStatus = "comment" | "change-requested" | "resolved"

const REVIEW_STATUS: Record<ReviewStatus, { label: string; className: string }> = {
  comment: { label: "Comment", className: "bg-muted text-muted-foreground" },
  "change-requested": {
    label: "Change requested",
    className: "bg-(--destructive-wash) text-destructive",
  },
  resolved: {
    label: "Resolved",
    className: "bg-(--positive-wash) text-(--positive)",
  },
}

/**
 * REVIEW COMMENT — a human's note threaded into the code it is about, with
 * the assistant reachable from inside the thread.
 *
 * The anchoring is the whole point. A review comment in a side panel makes
 * the reader hold a line number in their head and scroll; threaded under the
 * line, the question and the code it questions are one object. That is also
 * what makes the reply seam honest: "resolve this" has an unambiguous
 * referent, so the assistant is answering about a specific line rather than
 * about a file.
 *
 * The status is stated, not implied by color alone — a red tint is not a
 * word, and "Change requested" is the difference between an opinion and a
 * blocker.
 */
export function ReviewComment({
  author,
  when,
  status = "comment",
  text,
  onReply,
  replyPlaceholder = "Leave a reply…",
  className,
}: {
  author: string
  when?: string
  status?: ReviewStatus
  text: string
  /** Omit and the thread is read-only — a record, with no reply affordance. */
  onReply?: (text: string) => void
  replyPlaceholder?: string
  className?: string
}) {
  const [reply, setReply] = React.useState("")
  const badge = REVIEW_STATUS[status]
  const send = () => {
    const t = reply.trim()
    if (!t) return
    onReply?.(t)
    setReply("")
  }
  return (
    <div
      className={cn(
        // the ambient glass: a thread the assistant can act on belongs to
        // the layer's material, not to the editor's chrome
        "ambient-glass border-(--glass-border) flex flex-col gap-2 rounded-xl border p-3",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-medium uppercase"
        >
          {author.trim().charAt(0)}
        </span>
        <span className="text-sm font-medium">{author}</span>
        {when && (
          <span className="text-muted-foreground font-mono text-xs">{when}</span>
        )}
        <span
          className={cn(
            "ms-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
            badge.className
          )}
        >
          {badge.label}
        </span>
      </div>
      <p className="text-sm leading-relaxed">{text}</p>
      {/* THE ONE COMPOSER, inline variant. Replying here is not a comment
          box that happens to look similar — it is the same instrument, and
          what the user writes hands over to the ambient layer with this line
          already attached as context. */}
      {onReply && (
        <Composer
          variant="inline"
          value={reply}
          onChange={setReply}
          onSend={send}
          placeholder={replyPlaceholder}
        />
      )}
    </div>
  )
}
