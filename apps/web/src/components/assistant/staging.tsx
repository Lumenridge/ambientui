import * as React from "react"

import { motion } from "framer-motion"

import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import { useMotionTransition } from "@/foundation/foundation-context"

/**
 * The two rendering halves of staged arrival; the hook that drives them is
 * use-staged-reveal.ts (a file that exports both a hook and components loses
 * Fast Refresh for everything importing it).
 */

/** The shimmer stand-in, sized to the rows it is standing in for. */
export function StageSkeleton({
  rows = 2,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2 pt-3", className)} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <Skeleton className="mt-1.5 size-1.5 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 rounded-md" style={{ width: "38%" }} />
            <Skeleton
              className="h-3 rounded-md"
              style={{ width: i % 2 ? "72%" : "88%" }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * One item landing. Subtle on purpose: this is reporting, not choreography.
 *
 * Height animates alongside opacity because the row below is what the eye is
 * actually resting on — a row that appears at full height shoves everything
 * under it in a single frame, and that jump reads as jank no matter how the
 * row itself fades. The outer div owns the reveal (height + clip), the inner
 * div owns the layout, so flex rows never fight the overflow clip.
 */
export function StagedItem({
  index = 0,
  children,
  className,
}: {
  index?: number
  children: React.ReactNode
  className?: string
}) {
  const transition = useMotionTransition("control")
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={transition}
      className="overflow-hidden"
      data-stage-index={index}
    >
      <motion.div
        initial={{ y: 6 }}
        animate={{ y: 0 }}
        transition={transition}
        className={className}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

/** The line a block shows while it is still working. */
export function StageLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn("ambient-shimmer text-sm", className)}>
      {children}
    </span>
  )
}
