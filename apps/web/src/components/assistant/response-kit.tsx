import * as React from "react"

import { useAnimationFrame } from "framer-motion"

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

/** Numbered reference chips under an answer (Raycast-style). */
export function ReferenceChips({ refs }: { refs: KitReference[] }) {
  if (refs.length === 0) return null
  return (
    <div className="mt-3">
      <div className="text-muted-foreground mb-1.5 text-[11px] font-medium">
        References
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {refs.map((r, i) => (
          <span
            key={r.label + i}
            className="bg-(--glass-wash) inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px]"
          >
            <span className="text-muted-foreground font-mono">{i + 1}</span>
            {r.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * An answer block: the orb glyph as the author mark, streamed text, then
 * references. Fires onSettled once the stream completes — the assistant
 * uses it to bring the ambient state back to rest.
 */
export function ResponseBlock({
  response,
  onSettled,
  live = true,
  className,
}: {
  response: KitResponse
  onSettled?: () => void
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
  const orbColors = config.orb.useAccent ? undefined : config.orb.colors
  const orbCore = orbColors?.[Math.min(1, orbColors.length - 1)]

  const [shown, setShown] = React.useState(0)
  const settledRef = React.useRef(false)
  const onSettledRef = React.useRef(onSettled)
  onSettledRef.current = onSettled

  // Time-based reveal on the frame clock (~125 chars/s) — interval timers
  // get throttled when the tab is hidden; elapsed time doesn't lie.
  const startRef = React.useRef<number | null>(null)
  useAnimationFrame((t) => {
    if (settledRef.current) return
    if (startRef.current === null) startRef.current = t
    const total = response.text.length
    const next = Math.min(total, Math.floor((t - startRef.current) / 8))
    setShown(next)
    if (next >= total) {
      settledRef.current = true
      window.setTimeout(() => onSettledRef.current?.(), 400)
    }
  })

  const done = shown >= response.text.length
  return (
    <div
      className={cn(
        // the answer is an OBJECT, not loose text: an inset card on the
        // surface, hairlined and washed like the reference
        "border-(--glass-border) bg-(--glass-wash) flex max-w-full items-start gap-2.5 rounded-xl border p-3",
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
        <div className="text-[13px] leading-relaxed">
          {response.text.slice(0, shown)}
          {!done && (
            <span className="bg-foreground/70 ms-0.5 inline-block h-3.5 w-0.5 animate-pulse align-middle" />
          )}
        </div>
        {done && <ReferenceChips refs={response.refs} />}
      </div>
    </div>
  )
}
