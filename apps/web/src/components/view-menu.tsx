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
 * IT IS ONE FORM IN TWO SHAPES. Closed, the pill is the width of the view's
 * own name; open, it takes the width of the list beneath it, animated on the
 * surface spring, so the pair reads as a single object changing shape rather
 * than two panels that happen to be stacked. The width is measured from the
 * menu, never guessed — the list is sized by its longest row, and that
 * changes with whatever destinations an app registers.
 *
 * The trigger stays where the pointer left it VERTICALLY: the list drops
 * beneath the pill rather than pushing it, and both pill controls are the
 * same icon box, so opening never changes the row's height. Appearance and the
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
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const [menuWidth, setMenuWidth] = React.useState<number | null>(null)
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

  // THE PILL TAKES THE MENU'S WIDTH. Measured rather than guessed: the list
  // is sized by its own longest row, and that changes with the destinations
  // an app registers. Written from a ResizeObserver callback, never
  // synchronously in the effect body — the first paint has no layout to read.
  React.useEffect(() => {
    const el = menuRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setMenuWidth(el.offsetWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  return (
    <div ref={ref} className={cn("pointer-events-auto relative", className)}>
      {/* leading padding drops to p-1: the icon button carries its own inset,
          and ps-3 was there for a text label that no longer starts the row */}
      {/* One form, two shapes: closed it is the width of its own label, open
          it is the width of the list beneath it, and the change is animated
          on the Foundation's surface spring so the two read as one object
          rather than two panels that happen to be stacked. The label takes
          the slack (flex-1), so the disclosure stays pinned to the trailing
          edge and the pill grows around the controls instead of pushing
          them apart unevenly. */}
      <motion.div
        animate={{ width: open && menuWidth ? menuWidth : "auto" }}
        transition={spring}
        className="ambient-glass border-(--glass-border) flex items-center gap-2 overflow-hidden rounded-full border p-1"
      >
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
          <span className="min-w-0 flex-1 truncate pe-1 text-sm font-medium whitespace-nowrap">
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
      </motion.div>

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
            ref={menuRef}
            // NO min-w-full any more: the pill now takes ITS width, and a
            // menu that also took the pill's would leave the two with no
            // content driving either — each waiting on the other
            className="ambient-glass border-(--glass-border) absolute start-0 top-full z-10 mt-2 flex w-max max-w-xs origin-top flex-col gap-0.5 rounded-2xl border p-1.5"
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
