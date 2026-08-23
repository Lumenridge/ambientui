import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { useMotionSpring, useMotionTransition } from "@/foundation/foundation-context"

import { OrbGlyph } from "@/components/assistant/orb-character"

/**
 * VIEW MENU — the app's destinations as a disclosure, not a tab strip.
 *
 * A tab strip spends horizontal room proportional to how many destinations
 * exist, permanently, on a surface whose whole argument is that chrome should
 * get out of the way. This collapses to one pill carrying the mark and where
 * you are; opening it is what costs space, and only while you are choosing.
 *
 * It is the pointer twin of the spotlight's "Jump to" — same destinations,
 * reached by hand rather than by ⌘K. They must never disagree: both read the
 * same list.
 *
 * The morph is a LAYOUT animation, not a swap: the pill becomes the card, so
 * the thing you clicked is the thing that opened. Everything rides the
 * Foundation's surface spring and closes on Escape or an outside click,
 * because a menu you cannot dismiss the ordinary way is a trap.
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
    <motion.div
      ref={ref}
      layout
      transition={spring}
      className={cn(
        "ambient-glass border-(--glass-border) pointer-events-auto flex flex-col border p-1",
        open ? "items-stretch rounded-2xl" : "items-center rounded-full",
        className
      )}
    >
      <motion.div layout className="flex items-center gap-2">
        <span className="ps-2">
          <OrbGlyph size={18} />
        </span>
        {!open && current && (
          <motion.span
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={micro}
            className="text-sm font-medium whitespace-nowrap"
          >
            {current.label}
          </motion.span>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-expanded={open}
          aria-label={open ? "Close the view menu" : "Open the view menu"}
          onClick={() => setOpen((v) => !v)}
          className="rounded-full"
        >
          {open ? "Close" : "Menu"}
        </Button>
      </motion.div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-0.5 px-1 pt-2 pb-1">
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
                    "justify-start rounded-xl text-base",
                    item.id === value
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
