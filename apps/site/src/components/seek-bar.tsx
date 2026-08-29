"use client"

import * as React from "react"

import { motion, useTransform, type MotionValue } from "framer-motion"

import { Button } from "@ambientui/ui/components/button"
import { Icon } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"

/**
 * SEEK BAR — one segment per chapter, a control at the head.
 *
 * Born in the OrbCharacter playground as the lifecycle bar, and promoted
 * here when the home page's demos became its second consumer (the pattern
 * watchlist's own trigger, DESIGN.md §13). It stays an app-level
 * composition rather than entering the vocabulary: it is a presentation
 * device for showing a scripted run, not a product control.
 *
 * SEGMENTS, NOT A SINGLE TRACK. A run made of named chapters has a shape,
 * and one long bar hides it: five segments say "five things happen" before
 * anything has happened, and the one filling says which.
 *
 * SCRUBBING IS OPTIONAL AND HONEST. Pass `onSeek` and the track takes
 * pointer input and wears a pointer cursor; omit it and the bar is a
 * read-out with no affordance suggesting otherwise. A demo whose script
 * cannot be rewound must not render a control that looks like it can.
 */

function Segment({
  progress,
  index,
  label,
}: {
  /** Chapters completed, fractionally — 2.5 means halfway through the third. */
  progress: MotionValue<number>
  index: number
  label?: string
}) {
  const scaleX = useTransform(progress, (p) =>
    Math.min(1, Math.max(0, p - index))
  )
  return (
    <div
      title={label}
      className="bg-muted relative h-1 flex-1 overflow-hidden rounded-full"
    >
      <motion.div
        className="bg-primary absolute inset-y-0 left-0 w-full origin-left"
        style={{ scaleX }}
      />
    </div>
  )
}

export function SeekBar({
  segments,
  progress,
  playing,
  ended,
  onToggle,
  onSeek,
  className,
}: {
  /** One entry per chapter; the string is its tooltip. */
  segments: readonly string[]
  progress: MotionValue<number>
  playing: boolean
  /** The run finished — the control reads as replay until the next action. */
  ended?: boolean
  onToggle: () => void
  /** Omit to render a read-out with no scrub affordance. */
  onSeek?: (progress: number) => void
  className?: string
}) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const seekFromEvent = (e: React.PointerEvent) => {
    if (!onSeek) return
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    onSeek(f * segments.length)
  }
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button
        size="xs"
        variant="outline"
        className="size-6 shrink-0 p-0"
        aria-label={
          playing ? "Pause the demo" : ended ? "Replay the demo" : "Play the demo"
        }
        onClick={onToggle}
      >
        <Icon name={playing ? "pause" : ended ? "replay" : "play"} size={12} />
      </Button>
      <div
        ref={trackRef}
        className={cn(
          "flex flex-1 items-center gap-1 py-2",
          onSeek && "cursor-pointer"
        )}
        onPointerDown={
          onSeek
            ? (e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                seekFromEvent(e)
              }
            : undefined
        }
        onPointerMove={
          onSeek
            ? (e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  seekFromEvent(e)
              }
            : undefined
        }
      >
        {segments.map((label, i) => (
          <Segment key={label} progress={progress} index={i} label={label} />
        ))}
      </div>
    </div>
  )
}
