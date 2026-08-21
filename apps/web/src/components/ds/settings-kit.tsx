import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * The settings-page pattern (promoted through governance, DESIGN.md §12):
 * a large page title, sentence-case section headings, and cards of rows —
 * each row a title + description on the left with its control on the
 * right, or a full-width control zone underneath for pickers that need
 * the room. Hairline-divided, one card per topic.
 */

export function SettingsTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-3xl font-semibold tracking-tight">{children}</h1>
}

export function SettingsSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-12 first:mt-10">
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
