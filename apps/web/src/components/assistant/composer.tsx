import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

import { Button } from "@workspace/ui/components/button"
import { Icon } from "@workspace/ui/components/icon"

import { AssistantMark, ContextChipView, ShimmerPlaceholder } from "./assistant"
import type { ContextChip } from "./assistant-context"

/**
 * THE COMPOSER — the one place a question is written, extracted so every
 * form factor shares a single anatomy: context chips · input · one control.
 *
 * ONE CONTROL, TWO MEANINGS. Send while idle, STOP while an answer is
 * composing or streaming — always the one that applies right now. (An orb
 * was tried in this slot and removed: the identity already lives in the
 * shell, and a character where a control belongs read as decoration, not
 * as an affordance.)
 *
 * Send only lights up once there is something to send: the affordance
 * states its own availability.
 *
 * `variant`: `panel` is the in-surface row (panel and dock); `quick` is the
 * same anatomy inside quick ask's pill — the pill supplies the glass and the
 * height, the composer supplies everything the user touches; `inline` is the
 * one that stands on its own inside another object (a review thread), so it
 * brings its own frame and sits at the smaller type size. The spotlight's
 * search-or-ask band is next.
 */
export type ComposerVariant = "panel" | "quick" | "inline"

export function Composer({
  inputRef,
  value,
  onChange,
  onSend,
  onStop,
  onEscape,
  busy = false,
  pageChip,
  chips = [],
  removeChip,
  placeholder,
  mark = false,
  suggestion,
  onAcceptSuggestion,
  variant = "panel",
  className,
}: {
  inputRef?: React.RefObject<HTMLInputElement | null>
  value: string
  onChange: (v: string) => void
  onSend: () => void
  /** Interrupt the running answer. Shown only while `busy`. */
  onStop?: () => void
  /** Dismiss the surface (quick ask closes on Escape). */
  onEscape?: () => void
  /** An answer is composing or streaming — the orb yields to Stop. */
  busy?: boolean
  pageChip?: ContextChip | null
  chips?: ContextChip[]
  removeChip?: (id: string) => void
  placeholder: string
  /**
   * Show the assistant's character at the head of the row. It is an IDENTITY
   * MARK, not a control — it reacts (still / listening / thinking / answer)
   * so the row says who is listening, and it never takes the send slot,
   * where a character reads as decoration rather than an affordance.
   */
  mark?: boolean
  /**
   * What to do next, offered in the empty field. Ghost text rather than a
   * button: it costs no room, and it is a proposal the user can type straight
   * over. Tab accepts it.
   */
  suggestion?: string
  /** Tab was pressed on the offer — run it. */
  onAcceptSuggestion?: () => void
  variant?: ComposerVariant
  className?: string
}) {
  // an offer only stands while the field is empty: the moment the user types,
  // their own words win
  const offering = Boolean(suggestion && onAcceptSuggestion && value === "")
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        // panel: the row brings its own height. quick: the pill does.
        // inline: nothing else will, so it brings frame and padding too.
        variant === "panel" && "min-h-14",
        variant === "quick" && "h-full min-w-0 flex-1 gap-2",
        variant === "inline" &&
          "border-(--glass-border) w-full gap-2 rounded-lg border px-2.5 py-1",
        className
      )}
    >
      {mark && <AssistantMark size={28} />}
      {pageChip && <ContextChipView chip={pageChip} compact />}
      {chips.map((c) => (
        <ContextChipView
          key={c.id}
          chip={c}
          compact
          onRemove={removeChip ? () => removeChip(c.id) : undefined}
        />
      ))}
      <div className="relative min-w-0 flex-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSend()
            if (e.key === "Escape") onEscape?.()
            // Tab accepts the offer — the shell's own convention for
            // completing something already proposed
            if (e.key === "Tab" && offering) {
              e.preventDefault()
              onAcceptSuggestion?.()
            }
          }}
          aria-label={placeholder}
          className={cn(
            "w-full bg-transparent outline-none",
            variant === "inline" ? "text-sm" : "text-base"
          )}
        />
        <ShimmerPlaceholder
          show={value === ""}
          className={variant === "inline" ? "text-sm" : undefined}
        >
          {offering ? suggestion : placeholder}
        </ShimmerPlaceholder>
      </div>
      {offering && (
        <kbd className="border-border text-muted-foreground pointer-events-none hidden shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs sm:inline">
          Tab
        </kbd>
      )}

      {/* the sanctioned Button, both meanings: filled (primary) to send once
          there is text, outline to stop. Disabled states its availability.
          While busy WITH text, a third state: queue — the instruction stacks
          behind the running turn instead of interrupting it. */}
      {busy && value.trim() !== "" && (
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          aria-label="Queue this instruction"
          title="Queue — sends when the running turn finishes"
          onClick={onSend}
          className="shrink-0 rounded-full"
        >
          <Icon name="arrow-up" size={14} />
        </Button>
      )}
      {busy ? (
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label="Stop the answer"
          title="Stop"
          onClick={onStop}
          className="shrink-0 rounded-full"
        >
          <Icon name="stop" size={13} />
        </Button>
      ) : (
        <Button
          type="button"
          size={variant === "inline" ? "icon-xs" : "icon-sm"}
          variant="default"
          aria-label="Send"
          title="Send"
          onClick={onSend}
          disabled={value.trim() === ""}
          className="shrink-0 rounded-full"
        >
          <Icon name="arrow-up" size={variant === "inline" ? 13 : 15} />
        </Button>
      )}
    </div>
  )
}
