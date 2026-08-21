import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import {
  useMotionSpring,
  useMotionTransition,
} from "@/foundation/foundation-context"

/**
 * The settings-page pattern (promoted through governance, DESIGN.md §12):
 * a large page title, sentence-case section headings, and cards of rows —
 * each row a title + description on the left with its control on the
 * right, or a full-width control zone underneath for pickers that need
 * the room. Hairline-divided, one card per topic. SaveReminder is the
 * pattern's save affordance: a bar that rises from the bottom only while
 * there are unsaved changes.
 */

export function SettingsTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-3xl font-semibold tracking-tight">{children}</h1>
}

/**
 * The save reminder — rises from the bottom only while `open`, so saving
 * is never forgotten and the page carries no chrome once everything is
 * stored. Saving dismisses it immediately; confirmation feedback belongs
 * to a toast (Sonner), not the reminder. Enters on the configured
 * character's spring, exits with a quick micro fade.
 */
export function SaveReminder({
  open,
  onSave,
  onDiscard,
  message = "Unsaved changes — edits apply live but aren't stored yet.",
  saveLabel = "Save",
  discardLabel = "Discard",
  className,
}: {
  open: boolean
  onSave: () => void
  onDiscard?: () => void
  message?: string
  saveLabel?: string
  discardLabel?: string
  className?: string
}) {
  const microT = useMotionTransition("micro")
  const spring = useMotionSpring()
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="save-reminder"
          className={cn(
            "border-border bg-card fixed bottom-6 left-1/2 z-40 flex items-center gap-3 rounded-xl border py-2 ps-4 pe-2 shadow-lg",
            className
          )}
          style={{ x: "-50%" }}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 28, transition: microT }}
          transition={{ ...spring, opacity: microT }}
        >
          <span className="text-sm">{message}</span>
          {onDiscard && (
            <Button variant="ghost" size="sm" onClick={onDiscard}>
              {discardLabel}
            </Button>
          )}
          <Button size="sm" onClick={onSave}>
            {saveLabel}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function SettingsSection({
  title,
  id,
  children,
}: {
  title: string
  /** Anchor for SectionRail jumps; scroll-mt keeps the heading clear of the card edge. */
  id?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-6 first:mt-10">
      <h2 className="mb-4 text-lg font-medium">{title}</h2>
      {children}
    </section>
  )
}

export function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border bg-card divide-border divide-y rounded-xl border">
      {children}
    </div>
  )
}

export function SettingsRow({
  title,
  description,
  control,
  children,
  className,
}: {
  title: string
  description?: string
  /** Compact control, right-aligned beside the title. */
  control?: React.ReactNode
  /** Full-width control zone under the header, for pickers that need room. */
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("px-5 py-4", className)}>
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          {description && (
            <div className="text-muted-foreground mt-0.5 text-sm">
              {description}
            </div>
          )}
        </div>
        {control && <div className="shrink-0">{control}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
