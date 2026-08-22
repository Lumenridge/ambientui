import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@workspace/ui/components/button"
import { Icon, type IconName } from "@workspace/ui/components/icon"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import { useMotionTransition } from "@/foundation/foundation-context"

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
      size="icon-xs"
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
        size="icon-xs"
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
 * They stagger in because they arrive after the answer settles, and a row
 * that appears all at once reads as chrome that was always there. `list`
 * exists for narrow surfaces, where pills wrap into an unreadable thicket.
 */
export function FollowUpSuggestions({
  suggestions,
  onPick,
  layout = "pills",
  className,
}: {
  suggestions: string[]
  onPick?: (suggestion: string) => void
  layout?: "pills" | "list"
  className?: string
}) {
  const transition = useMotionTransition("control")
  if (suggestions.length === 0) return null
  return (
    <div
      className={cn(
        "mt-3 flex gap-1.5",
        layout === "pills" ? "flex-wrap" : "flex-col items-stretch",
        className
      )}
    >
      {suggestions.map((s, i) => (
        <motion.div
          key={s}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          // each one lands a beat after the last: the row assembles
          transition={{ ...transition, delay: i * 0.05 }}
        >
          <Button
            size="xs"
            variant="outline"
            onClick={() => onPick?.(s)}
            className={cn(
              "font-normal",
              layout === "pills"
                ? "rounded-full"
                : "w-full justify-start rounded-lg"
            )}
          >
            {s}
          </Button>
        </motion.div>
      ))}
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
        <div className="text-[13px] font-medium">{title}</div>
        {detail && <p className="mt-0.5 text-[13px] opacity-80">{detail}</p>}
      </div>
      {onRetry && (
        <Button
          size="xs"
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
 * user hold a thought, and interrupting throws away work in progress. A
 * queue keeps both — and stays EDITABLE, because a queued turn is a plan,
 * not a commitment: promote one that matters more, cancel one the running
 * answer already covered.
 */
export function MessageQueue({
  running,
  queued,
  onPromote,
  onCancel,
  className,
}: {
  /** The turn currently being answered. */
  running?: string
  queued: QueuedTurn[]
  onPromote?: (id: string) => void
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
          <span className="min-w-0 flex-1 truncate text-[13px]">{running}</span>
          <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
            running
          </span>
        </div>
      )}
      {queued.length > 0 && (
        <>
          <div className="text-muted-foreground flex items-baseline justify-between px-1 text-[11px]">
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
                <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                  {i + 1}
                </span>
                <span className="text-muted-foreground min-w-0 flex-1 truncate text-[13px]">
                  {q.text}
                </span>
                {onPromote && i > 0 && (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Send "${q.text}" next`}
                    onClick={() => onPromote(q.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <Icon name="arrow-up" size={13} />
                  </Button>
                )}
                {onCancel && (
                  <Button
                    size="icon-xs"
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
  className,
}: {
  steps: ReasoningStep[]
  /** How long the thinking took; shown in the settled summary. */
  seconds?: number
  running?: boolean
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(defaultOpen ?? running)
  const transition = useMotionTransition("surface")
  // a run that starts opens the trace; finishing collapses it back
  const wasRunning = React.useRef(running)
  React.useEffect(() => {
    if (running !== wasRunning.current) {
      wasRunning.current = running
      if (defaultOpen === undefined) setOpen(running)
    }
  }, [running, defaultOpen])

  return (
    <div className={cn("flex flex-col", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 self-start text-[13px] transition-colors"
      >
        {running
          ? "Thinking…"
          : seconds !== undefined
            ? `Thought for ${seconds}s`
            : "Reasoning"}
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
            {steps.map((s) => (
              <li key={s.title} className="flex gap-2.5 pt-3">
                {/* the timeline: a mark per step, not a connector — the
                    steps are ordered, not causally chained */}
                <span
                  aria-hidden
                  className="bg-muted-foreground/40 mt-1.5 size-1.5 shrink-0 rounded-full"
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{s.title}</div>
                  {s.detail && (
                    <p className="text-muted-foreground mt-0.5 text-[13px]">
                      {s.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  )
}

export const REASONING_EFFORTS = ["low", "medium", "high", "max"] as const
export type ReasoningEffortLevel = (typeof REASONING_EFFORTS)[number]

/**
 * REASONING EFFORT — how hard to think, and what that budget actually cost.
 *
 * The control and the meter belong together: an effort setting with no
 * spend reading is a preference with invisible consequences. Showing both
 * is what lets someone learn that "high" is worth it here and not there.
 */
export function ReasoningEffort({
  level,
  onChange,
  spent,
  budget,
  label = "Thinking",
  className,
}: {
  level: ReasoningEffortLevel
  onChange?: (level: ReasoningEffortLevel) => void
  /** Tokens spent against the budget; omit both to hide the meter. */
  spent?: number
  budget?: number
  label?: string
  className?: string
}) {
  const ratio =
    spent !== undefined && budget ? Math.min(1, spent / budget) : null
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px] font-medium">{label}</span>
        {ratio !== null && (
          <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
            {spent!.toLocaleString()} / {budget!.toLocaleString()}
          </span>
        )}
      </div>
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
              "flex-1 rounded-full px-3 py-1 text-[13px] capitalize transition-colors",
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
  kind?: "image" | "document" | "file"
  /** A thumbnail for images; falls back to the kind's icon. */
  thumbnail?: string
  onOpen?: () => void
}

const ATTACHMENT_ICON: Record<
  NonNullable<MessageAttachment["kind"]>,
  IconName
> = { image: "image", document: "document", file: "paperclip" }

/**
 * MESSAGE ATTACHMENTS — files as RECEIVED, not as staged.
 *
 * The composer's attachment chips are editable and removable; these are a
 * record of what was sent, so they carry no remove control. An image can be
 * opened, everything else states what it is and how big — enough to know
 * whether it is the file you meant.
 */
export function MessageAttachments({
  attachments,
  className,
}: {
  attachments: MessageAttachment[]
  className?: string
}) {
  if (attachments.length === 0) return null
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {attachments.map((a) => {
        const kind = a.kind ?? "file"
        const openable = Boolean(a.onOpen)
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
              <span className="block truncate text-[13px]">{a.name}</span>
              {(a.size || a.meta) && (
                <span className="text-muted-foreground block font-mono text-[11px]">
                  {[a.size, a.meta].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
            {openable && (
              <span className="text-muted-foreground shrink-0">
                <Icon name={ATTACHMENT_ICON[kind]} size={14} />
              </span>
            )}
          </Row>
        )
      })}
    </div>
  )
}

/* ----------------------------- quote reply ----------------------------- */

export type QuoteAction = "quote" | "explain" | "rewrite"

const QUOTE_ACTIONS: { id: QuoteAction; label: string; icon: IconName }[] = [
  { id: "quote", label: "Quote", icon: "quote" },
  { id: "explain", label: "Explain", icon: "sparkles" },
  { id: "rewrite", label: "Rewrite", icon: "edit" },
]

/**
 * QUOTE REPLY — a selection inside an answer, and the three things worth
 * doing with it.
 *
 * The point is scope: without this, following up on one clause means
 * re-typing it and hoping the assistant picks the right referent. The
 * toolbar turns a selection into the subject of the next turn.
 *
 * It appears on selection and nowhere else — a persistent toolbar over an
 * answer would be chrome that is wrong 99% of the time.
 */
export function QuoteReply({
  children,
  onAction,
  className,
}: {
  children: React.ReactNode
  onAction?: (action: QuoteAction, selection: string) => void
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [selection, setSelection] = React.useState("")
  const transition = useMotionTransition("control")

  React.useEffect(() => {
    const read = () => {
      const sel = window.getSelection()
      const text = sel?.toString().trim() ?? ""
      const inside =
        sel && sel.anchorNode && ref.current?.contains(sel.anchorNode)
      setSelection(text && inside ? text : "")
    }
    document.addEventListener("selectionchange", read)
    return () => document.removeEventListener("selectionchange", read)
  }, [])

  return (
    <div ref={ref} className={cn("relative", className)}>
      {children}
      <AnimatePresence>
        {selection && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={transition}
            className="border-border bg-card mt-2 inline-flex items-center gap-0.5 rounded-full border p-1 shadow-xs"
          >
            {QUOTE_ACTIONS.map((a) => (
              <Button
                key={a.id}
                size="xs"
                variant="ghost"
                onClick={() => onAction?.(a.id, selection)}
                className="rounded-full font-normal"
              >
                <Icon name={a.icon} size={13} />
                {a.label}
              </Button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* --------------------------- feedback dialog --------------------------- */

export const FEEDBACK_REASONS = [
  "Not factual",
  "Didn't follow instructions",
  "Too long",
  "Unsafe",
] as const

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
        <span className="flex-1 text-[13px] font-medium">What went wrong?</span>
        <span className="text-muted-foreground font-mono text-[11px]">
          optional
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FEEDBACK_REASONS.map((r) => (
          <Button
            key={r}
            size="xs"
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
          <Button size="xs" variant="ghost" onClick={onDismiss}>
            Cancel
          </Button>
        )}
        <Button size="xs" onClick={() => onSubmit?.({ reasons, note })}>
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
      <span className="text-muted-foreground font-mono text-[11px]">
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
        "text-muted-foreground pointer-events-none font-mono text-[11px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        className
      )}
    >
      {time}
    </span>
  )
}
