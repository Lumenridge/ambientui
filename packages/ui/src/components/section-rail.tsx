"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * SectionRail — an ambientui extension to the product vocabulary: a
 * right-edge rail of dashes, one per page section. The active section's
 * dash grows and shows its label; clicking any dash smooth-scrolls to
 * that section. Motion rides the control role (CSS transitions on the
 * motion tokens); active tracking follows the nearest scroll container.
 */

export interface SectionRailSection {
  id: string
  label: string
}

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let n = el?.parentElement ?? null
  while (n) {
    const { overflowY } = getComputedStyle(n)
    if (overflowY === "auto" || overflowY === "scroll") return n
    n = n.parentElement
  }
  return null
}

export function SectionRail({
  sections,
  className,
}: {
  sections: SectionRailSection[]
  className?: string
}) {
  const [active, setActive] = React.useState<string | undefined>(
    sections[0]?.id
  )

  React.useEffect(() => {
    const first = document.getElementById(sections[0]?.id ?? "")
    if (!first) return
    const rootEl = getScrollParent(first)
    const onScroll = () => {
      const rootTop = rootEl ? rootEl.getBoundingClientRect().top : 0
      let current = sections[0]!.id
      for (const s of sections) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top - rootTop <= 120)
          current = s.id
      }
      setActive(current)
    }
    onScroll()
    const target: HTMLElement | Window = rootEl ?? window
    target.addEventListener("scroll", onScroll, { passive: true })
    return () => target.removeEventListener("scroll", onScroll)
  }, [sections])

  return (
    <nav
      aria-label="Page sections"
      className={cn(
        "fixed top-1/2 right-5 z-30 flex -translate-y-1/2 flex-col items-end gap-3",
        className
      )}
    >
      {sections.map((s) => {
        const isActive = active === s.id
        return (
          <button
            key={s.id}
            type="button"
            aria-current={isActive || undefined}
            aria-label={`Go to ${s.label}`}
            onClick={() =>
              document
                .getElementById(s.id)
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="group flex items-center gap-2 outline-none"
          >
            <span
              className={cn(
                "text-xs font-medium tracking-wide uppercase transition-all duration-(--motion-control) ease-(--motion-ease)",
                isActive
                  ? "text-foreground opacity-100"
                  : "text-muted-foreground opacity-0 group-hover:opacity-100"
              )}
            >
              {s.label}
            </span>
            <span
              className={cn(
                "h-0.5 rounded-full transition-all duration-(--motion-control) ease-(--motion-ease)",
                isActive
                  ? "bg-foreground w-6"
                  : "bg-muted-foreground group-hover:bg-foreground w-2.5"
              )}
            />
          </button>
        )
      })}
    </nav>
  )
}
