"use client"

import * as React from "react"

import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@ambientui/ui/lib/utils"
import { Icon, type IconName } from "@ambientui/ui/components/icon"

import { useAmbientRuntime } from "./ambient-runtime"
import { useAssistant, type ContextChip } from "./assistant-context"
import { OrbCharacter } from "./orb-character"

/**
 * THE SHARED MARKS — the small pieces the assistant's own input row wears.
 *
 * These lived in assistant.tsx, which is the 1,700-line surface shell. Only
 * composer.tsx used them, and that one import edge meant EVERY component in
 * the layer transitively required the entire surface: asking the registry for
 * a ReasoningPanel produced sixteen files, nearly the whole package.
 *
 * Nothing here is new. They were always a separate thing — the shell just
 * happened to be where they were written. Splitting them costs nothing and
 * lets a kit be installed as a kit.
 */


/**
 * THE AI FORM'S PLACEHOLDER — the shimmer belongs to every ambient input,
 * not just the palette's: it is how a form says the assistant is listening.
 * Rendered as an overlay because an <input>'s own placeholder can't carry a
 * background-clipped gradient.
 */
export function ShimmerPlaceholder({
  show,
  children,
  className,
}: {
  show: boolean
  children: React.ReactNode
  className?: string
}) {
  if (!show) return null
  return (
    <span
      aria-hidden
      className={cn(
        // inset-0, not left-0: the ghost stands in for a single-line <input>,
        // so it must be bounded by the field's box and truncate the way the
        // input would. Unbounded, a long suggestion wrapped to two lines the
        // moment the scaling base grew (95% fit by luck; 100% did not).
        "ambient-shimmer pointer-events-none absolute inset-0 flex items-center text-base",
        className
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}


/**
 * The assistant's mark: the real OrbCharacter — one shader instance per
 * surface mark, riding the live ambient state. (The CSS OrbGlyph remains
 * for incidental marks: the footer brand and settled transcript entries,
 * where a context per row would stack up — DESIGN.md §12.)
 */
export function AssistantMark({ size }: { size: number }) {
  const runtime = useAmbientRuntime()
  const { orbState } = useAssistant()
  return (
    <span className="inline-flex shrink-0">
      <OrbCharacter
        size={size}
        state={orbState}
        colors={runtime.orb.useAccent ? undefined : runtime.orb.colors}
        speeds={runtime.orb.speeds}
      />
    </span>
  )
}


/**
 * What each kind of context LOOKS like. Sparkles is gone from this map on
 * purpose: in this system sparkles means the ASSISTANT — its mark, AskAI,
 * the follow-up heading — and a context chip is not the assistant. It is the
 * thing the assistant can see, so it wears the icon of the thing.
 *
 * Names, not icon modules: these are drawn by whichever library the
 * Foundation has configured (rule 6), like every other icon in the product.
 */
const chipKindIcon: Record<ContextChip["kind"], IconName> = {
  page: "document",
  control: "sliders",
  target: "layers",
  cell: "layers",
  file: "code",
  symbol: "code",
  selection: "type",
}


export function IconTile({
  icon,
  compact,
}: {
  icon: IconName
  compact?: boolean
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-[var(--ambient-accent-wash)] text-[var(--ambient-accent)]",
        compact ? "size-4 rounded-[4px]" : "size-5 rounded-[5px]"
      )}
    >
      <Icon name={icon} size={compact ? 10 : 12} />
    </span>
  )
}


/**
 * CONTEXT CHIP — one attachment the assistant will answer against: the page
 * itself, or anything the user right-clicked into the conversation.
 *
 * THE ANATOMY IS ONE OBJECT, not a per-surface treatment: icon tile (typed by
 * what was attached) · label · a squared remove control. Two sizes only —
 * `default` where the composer has a row of its own (palette, panel), and
 * `compact` where chips share a line with the input (quick ask). Nothing
 * else varies; a surface picks the size, never the look.
 */
export function ContextChipView({
  chip,
  compact,
  onRemove,
  className,
}: {
  chip: ContextChip
  compact?: boolean
  onRemove?: () => void
  className?: string
}) {
  return (
    <span
      className={cn(
        // shrink-0: these ride in a scrolling slider, where a flex child that
        // shrinks squeezes instead of scrolling and every chip loses its label
        "inline-flex max-w-full shrink-0 items-center rounded-lg border border-border bg-(--wash) font-medium",
        compact
          ? "gap-1.5 py-0.5 ps-1 pe-0.5 text-[11.5px]"
          : "gap-2 py-1 ps-1.5 pe-1 text-[12.5px]",
        className
      )}
    >
      {/* the chip's own icon when it has one — the page knows what it is */}
      <IconTile icon={chip.icon ?? chipKindIcon[chip.kind]} compact={compact} />
      <span className="max-w-56 min-w-0 truncate">{chip.label}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${chip.label}`}
          onClick={onRemove}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md bg-accent text-muted-foreground hover:text-foreground",
            compact ? "size-[18px]" : "size-[22px]"
          )}
        >
          <HugeiconsIcon
            icon={Cancel01Icon}
            size={compact ? 11 : 13}
            strokeWidth={1.8}
          />
        </button>
      )}
    </span>
  )
}