import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@ambientui/ui/components/button"
import { Icon, type IconName } from "@ambientui/ui/components/icon"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ambientui/ui/components/tooltip"
import { cn } from "@ambientui/ui/lib/utils"

import { useTheme } from "@/components/theme-provider"

import { useMotionSpring, useMotionTransition } from "@ambientui/foundation"

/**
 * VIEW MENU — every destination visible, the current one wearing its name.
 *
 * One pill of segments, one per destination. The segment you are ON is
 * expanded: icon plus label. Every other collapses to its icon in a circle,
 * so the whole set of places stays one glance and one click away without
 * spending label-width on views you are not in. Selecting a segment is what
 * expands it — the label growing in on the surface spring IS the state
 * change (Figma: View Menu, states 162:166 / 162:211).
 *
 * This replaced the disclosure form (pill + drop-down list). The disclosure
 * hid the destinations behind a burger to save room, but with a handful of
 * views the icons cost almost nothing, and a menu that must be opened to be
 * seen makes every switch two clicks. The collapsed icons carry real
 * Tooltips, because the name of an icon-only control is not optional.
 *
 * It carries no character mark: the assistant's identity belongs to the
 * assistant, and a navigation control wearing it says the wrong thing.
 * It is still the pointer twin of the spotlight's "Jump to" — both read
 * the same list, so they cannot disagree.
 *
 * HOME LEADS, when the app gives it one and home is not already a view.
 * It renders as a leading icon segment: a way back is not one destination
 * among others. The component is TOLD where home is — it never assumes.
 *
 * Appearance rides at the trailing edge in the same circle treatment. It is
 * the one control here that is not a destination — always one press away,
 * and never expanded, so it cannot be mistaken for somewhere to be.
 */
export function ViewMenu({
  items,
  value,
  onSelect,
  home,
  className,
}: {
  items: readonly { id: string; label: string; icon?: IconName }[]
  value: string
  onSelect: (id: string) => void
  /**
   * Where home is, decided by the APP — rendered as a leading icon segment.
   * Omit it when home is already one of the views, or when there is no way
   * back: a component that invents a destination is a component that will
   * send someone somewhere wrong.
   */
  home?: { label?: string; onSelect: () => void }
  className?: string
}) {
  const { theme, setTheme } = useTheme()
  // "system" is a real setting, so the control has to resolve what is
  // actually on screen before it can offer the opposite of it
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

  return (
    <div
      className={cn(
        // popover ground, not glass: this is product chrome, and only the
        // assistant's surfaces wear the ambient material (DESIGN.md §8)
        "bg-popover border-border pointer-events-auto flex items-center gap-2 rounded-full border p-1",
        className
      )}
    >
      {home && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label={home.label ?? "Home"}
              onClick={home.onSelect}
              className="rounded-full"
            >
              <Icon name="home" size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{home.label ?? "Home"}</TooltipContent>
        </Tooltip>
      )}

      {items.map((item) => {
        const active = item.id === value
        const segment = (
          <Button
            key={item.id}
            type="button"
            size={active ? "sm" : "icon-sm"}
            variant="secondary"
            aria-current={active ? "page" : undefined}
            aria-label={active ? undefined : item.label}
            onClick={() => onSelect(item.id)}
            className="rounded-full"
          >
            <Icon name={item.icon ?? "document"} size={14} />
            {/* the label growing in IS the state change: width rides the
                surface spring, the fade rides micro — the enter pair */}
            <AnimatePresence initial={false}>
              {active && (
                <motion.span
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0, transition: micro }}
                  transition={{ ...spring, opacity: micro }}
                  className="overflow-hidden text-sm font-medium whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        )
        // only the collapsed segments need a tooltip — the expanded one
        // is wearing its name
        return active ? (
          segment
        ) : (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>{segment}</TooltipTrigger>
            <TooltipContent>{item.label}</TooltipContent>
          </Tooltip>
        )
      })}

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
    </div>
  )
}
