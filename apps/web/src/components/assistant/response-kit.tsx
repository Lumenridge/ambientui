import * as React from "react"

import { useAnimationFrame } from "framer-motion"

import { Button } from "@workspace/ui/components/button"
import { Icon, type IconName } from "@workspace/ui/components/icon"
import { cn } from "@workspace/ui/lib/utils"

import { useFoundation } from "@/foundation/foundation-context"

import type { ContextChip } from "./assistant-context"
import { OrbCharacter, OrbGlyph } from "./orb-character"

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

export interface KitResponse {
  text: string
  refs: KitReference[]
}

/** v0 composer: grounded in the attached context, honest about being canned. */
export function composeResponse(
  _question: string,
  pageChip: ContextChip | null,
  chips: ContextChip[]
): KitResponse {
  const ground = pageChip?.label ?? "this page"
  const extras =
    chips.length > 0
      ? ` plus ${chips.length} attached item${chips.length > 1 ? "s" : ""}`
      : ""
  return {
    text:
      `Grounded in ${ground}${extras}. ` +
      `This reply is the response kit composing itself end-to-end — ` +
      `thinking, streaming, settling — so the ambient states around it ` +
      `(the orb, the live border) are the real pipeline, not a mock. ` +
      `Wire a model into the composer and this text becomes the answer.`,
    refs: [
      ...(pageChip ? [{ label: pageChip.label }] : []),
      ...chips.map((c) => ({ label: c.label })),
      { label: "Response kit v0" },
    ],
  }
}

/**
 * The source mark on a citation chip. One slot, three fillings in a fixed
 * order — the source's own logo, a typed icon, or the monogram the logo falls
 * back to. The number is NOT part of this: it is the citation's identity in
 * the text and always shows, so the mark is recognition, never identification.
 */
function RefMark({ reference }: { reference: KitReference }) {
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => setFailed(false), [reference.logo])

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
        className="bg-accent text-muted-foreground flex size-3.5 shrink-0 items-center justify-center rounded-sm text-[9px] font-medium uppercase"
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
      <div className="text-muted-foreground mb-1.5 text-[11px] font-medium">
        References
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {refs.map((r, i) => {
          const inner = (
            <>
              <span className="text-muted-foreground font-mono">{i + 1}</span>
              <RefMark reference={r} />
              <span className="truncate">{r.label}</span>
            </>
          )
          const shape =
            "bg-(--glass-wash) inline-flex max-w-64 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px]"
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
/** How many characters trail behind the write head, warm then blurred. */
const TAIL = 26
const EDGE = 8

/**
 * STREAMING TEXT — text that arrives rather than appears.
 *
 * Three zones travel with the write head: settled text in the foreground,
 * a warm tail in the ambient accent, and a blurred edge behind a fading
 * mask. The reveal runs on the FRAME CLOCK, not a timer: interval timers
 * are throttled in hidden tabs, which would strand an answer mid-sentence.
 *
 * `live={false}` renders the whole string settled — history is written,
 * not replayed, so a re-rendered older message never re-types itself.
 */
export function StreamingText({
  text,
  live = true,
  charsPerSecond,
  onSettled,
  className,
}: {
  text: string
  live?: boolean
  /**
   * Override the saved pace (config.components.streamCharsPerSecond). The
   * default reads as deliberate writing, not a printer.
   */
  charsPerSecond?: number
  onSettled?: () => void
  className?: string
}) {
  // THE COMPONENT-LAYER CONFIG: the pace is a saved product decision, so the
  // prop is an override, not the source of truth. Same rule as the orb's
  // palette — the rail edits the theme, the theme drives every instance.
  const { config } = useFoundation()
  const cps = charsPerSecond ?? config.components.streamCharsPerSecond
  const [shown, setShown] = React.useState(() => (live ? 0 : text.length))
  const settledRef = React.useRef(!live)
  const onSettledRef = React.useRef(onSettled)
  onSettledRef.current = onSettled
  const startRef = React.useRef<number | null>(null)

  useAnimationFrame((t) => {
    if (settledRef.current || !live) return
    if (startRef.current === null) startRef.current = t
    const next = Math.min(
      text.length,
      Math.floor(((t - startRef.current) / 1000) * cps)
    )
    setShown(next)
    if (next >= text.length) {
      settledRef.current = true
      window.setTimeout(() => onSettledRef.current?.(), 400)
    }
  })

  const done = shown >= text.length

  return (
    <span className={className}>
      {text.slice(0, done ? text.length : Math.max(0, shown - TAIL))}
      {!done && (
        <>
          <span className="ambient-stream-warm">
            {text.slice(Math.max(0, shown - TAIL), Math.max(0, shown - EDGE))}
          </span>
          <span className="ambient-stream-edge">
            {text.slice(Math.max(0, shown - EDGE), shown)}
          </span>
          <span className="bg-primary ms-0.5 inline-block h-3.5 w-0.5 animate-pulse align-middle" />
        </>
      )}
    </span>
  )
}

export function ResponseBlock({
  response,
  onSettled,
  live = true,
  variant,
  className,
}: {
  response: KitResponse
  onSettled?: () => void
  /** Override the saved presentation (config.components.messageVariant). */
  variant?: MessageVariant
  /**
   * The newest answer wears the real OrbCharacter (the shader identity);
   * older blocks fall back to the CSS glyph so a long transcript can't
   * stack WebGL contexts (DESIGN.md §12, the OrbGlyph decision).
   */
  live?: boolean
  className?: string
}) {
  // the saved orb config drives every instance of the character —
  // accent-linked or the custom heat ramp, plus per-state speeds
  const { config } = useFoundation()
  // ...and the saved component config decides presentation, so a variant
  // chosen in the Inspect rail reaches the real transcript, not just /ds
  const shape = variant ?? config.components.messageVariant
  const orbColors = config.orb.useAccent ? undefined : config.orb.colors
  const orbCore = orbColors?.[Math.min(1, orbColors.length - 1)]

  // the stream owns its own reveal; the block only needs to know when the
  // answer has landed, to settle its mark and show the references
  const [done, setDone] = React.useState(!live)
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
      <span className="mt-0.5 shrink-0">
        {/* the character itself while this answer is live: thinking-grade
            movement while it streams, settling once it lands */}
        {live ? (
          <OrbCharacter
            size={24}
            state={done ? "still" : "answer"}
            colors={orbColors}
            speeds={config.orb.speeds}
          />
        ) : (
          <OrbGlyph size={24} color={orbCore} />
        )}
      </span>
      <div className="min-w-0">
        <StreamingText
          text={response.text}
          live={live}
          className="block text-[13px] leading-relaxed"
          onSettled={() => {
            setDone(true)
            onSettled?.()
          }}
        />
        {done && <ReferenceChips refs={response.refs} />}
      </div>
    </div>
  )
}

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
  /** Override the saved presentation (config.components.messageVariant). */
  variant?: MessageVariant
  className?: string
}) {
  const { config } = useFoundation()
  const shape = variant ?? config.components.messageVariant
  return (
    <div
      className={cn(
        "ms-auto max-w-[85%] text-[13px] leading-relaxed",
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
  className,
}: {
  branches: KitResponse[]
  variant?: MessageVariant
  /** Whether the newest branch is still arriving. */
  live?: boolean
  onSettled?: () => void
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
      />
      {branches.length > 1 && (
        <div className="text-muted-foreground flex items-center gap-1 self-center">
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Previous version"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="text-muted-foreground hover:text-foreground"
          >
            <Icon name="chevron-left" size={13} />
          </Button>
          <span className="font-mono text-[11px] tabular-nums">
            {index + 1} / {branches.length}
          </span>
          <Button
            size="icon-xs"
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
