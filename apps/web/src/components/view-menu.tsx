import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@workspace/ui/components/button"
import { Icon } from "@workspace/ui/components/icon"
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
 * growing it, and the trigger holds a fixed width so Menu and Close occupy
 * exactly the same box: a control that walks out from under the pointer as
 * it opens makes closing a game of catch-up. It rides the Foundation's
 * surface spring and closes on Escape or an outside click, because a menu
 * you cannot dismiss the ordinary way is a trap.
 *
 * Appearance rides along at the bottom. It belongs here because it is the
 * other thing you reach for without meaning to leave the page, and it states
 * what it will DO rather than what is currently true — a row reading "Dark"
 * in a menu is ambiguous about whether it is a label or a switch.
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
      <div className="ambient-glass border-(--glass-border) flex items-center gap-2 rounded-full border p-1 ps-3">
        {current && (
          <span className="text-sm font-medium whitespace-nowrap">
            {current.label}
          </span>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-expanded={open}
          aria-label={open ? "Close the view menu" : "Open the view menu"}
          onClick={() => setOpen((v) => !v)}
          // fixed width: "Menu" and "Close" land on the same pixels
          className="w-20 rounded-full"
        >
          {open ? "Close" : "Menu"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99, transition: micro }}
            transition={spring}
            className="ambient-glass border-(--glass-border) absolute inset-x-0 top-full z-10 mt-2 flex origin-top flex-col gap-0.5 rounded-2xl border p-1.5"
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
            <span className="bg-(--glass-border) mx-2 my-1 h-px" />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="text-muted-foreground justify-start gap-2 rounded-xl"
            >
              <Icon name={isDark ? "sun" : "moon"} size={14} />
              {isDark ? "Switch to light" : "Switch to dark"}
              <kbd className="bg-(--glass-wash) ms-auto rounded px-1.5 py-0.5 font-mono text-xs">
                D
              </kbd>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
