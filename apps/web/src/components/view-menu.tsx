import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@workspace/ui/components/button"
import { Icon } from "@workspace/ui/components/icon"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { useTheme } from "@/components/theme-provider"

import { useMotionSpring, useMotionTransition } from "@/foundation/foundation-context"

/**
 * VIEW MENU — the app's destinations as a disclosure, not a tab strip.
 *
 * A tab strip spends horizontal room proportional to how many destinations
 * exist, permanently, on a surface whose whole argument is that chrome should
 * get out of the way. This collapses to one pill naming where you are;
 * opening it is what costs space, and only while you are choosing. It carries
 * no character mark: the assistant's identity belongs to the assistant, and a
 * navigation control wearing it says the wrong thing about what it does.
 *
 * It is the pointer twin of the spotlight's "Jump to" — same destinations,
 * reached by hand rather than by ⌘K. They must never disagree: both read the
 * same list.
 *
 * THE TRIGGER DOES NOT MOVE. The list drops beneath the pill rather than
 * growing it, and both of the pill's controls are the same icon box, so
 * opening cannot resize the row: a control that walks out from under the
 * pointer as it opens makes closing a game of catch-up. Appearance and the
 * disclosure wear one treatment, because they are peers — two controls on
 * the pill, neither of which is a destination. Both are icon-only, so both
 * carry a real tooltip rather than a native `title`: the name of an
 * icon-only control is not optional, and `title` waits a second, cannot be
 * styled, and never appears for keyboard focus. It rides the Foundation's
 * surface spring and closes on Escape or an outside click, because a menu
 * you cannot dismiss the ordinary way is a trap.
 *
 * Appearance rides at the HEAD of the closed pill as a ghost icon, not
 * inside the menu.
 * It is the one thing here you reach for without meaning to go anywhere, so
 * putting it in the list cost it a click and, worse, drew it exactly like
 * the destinations above it — a two-state setting reading as a fourth place
 * to go. Outside, it is always one press away and never mistaken for a
 * destination; ghost keeps it quieter than the view's own name.
 */
export function ViewMenu({
  items,
  value,
  onSelect,
  className,
}: {
  items: readonly { id: string; label: string }[]
  value: string
  onSelect: (id: string) => void
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const { theme, setTheme } = useTheme()
  // "system" is a real setting, so the row has to resolve what is actually
  // on screen before it can offer the opposite of it
  const [systemDark, setSystemDark] = React.useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  )
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  const isDark = theme === "dark" || (theme === "system" && systemDark)
  const spring = useMotionSpring()
  const micro = useMotionTransition("micro")
  const ref = React.useRef<HTMLDivElement | null>(null)
  const current = items.find((i) => i.id === value)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cn("pointer-events-auto relative", className)}>
      {/* the pill never changes size, so nothing under the pointer moves */}
      {/* leading padding drops to p-1: the icon button carries its own inset,
          and ps-3 was there for a text label that no longer starts the row */}
      <div className="ambient-glass border-(--glass-border) flex items-center gap-2 rounded-full border p-1">
        {/* Appearance sits on the CLOSED pill, not inside the menu: it is
            the one thing here you reach for without meaning to go anywhere,
            and burying a two-state setting one click deep — drawn like the
            destinations above it — made it read as a fourth destination.
            Ghost, so it stays quieter than the view's own name. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label={isDark ? "Switch to light" : "Switch to dark"}
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="rounded-full"
            >
              {/* the icon names the STEP IT TAKES, matching the label */}
              <Icon name={isDark ? "sun" : "moon"} size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isDark ? "Switch to light" : "Switch to dark"}
          </TooltipContent>
        </Tooltip>
        {current && (
          <span className="pe-1 text-sm font-medium whitespace-nowrap">
            {current.label}
          </span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-expanded={open}
              aria-label={open ? "Close the view menu" : "Open the view menu"}
              onClick={() => setOpen((v) => !v)}
              // both states are one icon box, so the trigger still cannot
              // move under the pointer as it opens
              className="rounded-full"
            >
              {/* chevron says a list drops below; close says dismiss it */}
              <Icon name={open ? "close" : "chevron-down"} size={14} />
            </Button>
          </TooltipTrigger>
          {/* only while closed: open, the menu itself is the explanation,
              and a hint floating over the list it describes is noise */}
          {!open && <TooltipContent>Change view</TooltipContent>}
        </Tooltip>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99, transition: micro }}
            transition={spring}
            // sized by its OWN content, never by the pill: the pill's width
            // follows the current view's name, so inheriting it truncated
            // the longest row and pushed the keycap past the edge
            className="ambient-glass border-(--glass-border) absolute start-0 top-full z-10 mt-2 flex w-max max-w-xs min-w-full origin-top flex-col gap-0.5 rounded-2xl border p-1.5"
          >
            {items.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                aria-current={item.id === value ? "page" : undefined}
                onClick={() => {
                  onSelect(item.id)
                  setOpen(false)
                }}
                className={cn(
                  "justify-start rounded-xl",
                  item.id === value
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
