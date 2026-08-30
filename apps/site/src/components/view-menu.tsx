"use client"

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
import { THEME_TOGGLE_KEY } from "@/lib/theme-constants"

import { useMotionSpring, useMotionTransition } from "@ambientui/foundation"

const SCHEME_QUERY = "(prefers-color-scheme: dark)"
function subscribeToScheme(onChange: () => void) {
  const mql = window.matchMedia(SCHEME_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

/** The seam between two kinds of control in one pill. */
function Rule({ desktopOnly = false }: { desktopOnly?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-border mx-0.5 h-5 w-px shrink-0",
        // a rule introducing a group that is entirely hidden would be a
        // divider with nothing on the far side of it
        desktopOnly && "hidden sm:block"
      )}
    />
  )
}

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
 * and never expanded, so it cannot be mistaken for somewhere to be. Its
 * tooltip names its keyboard shortcut, read from the same constant the
 * handler binds.
 *
 * KINDS ARE SEPARATED BY A RULE. The pill holds more than one sort of
 * thing — the product's own pages, demos of it, and appearance, which is
 * not a place at all — and a single unbroken row of circles said they were
 * all the same sort. The app supplies a `group` per item; the seam is
 * drawn wherever it changes, so this component never hardcodes an index.
 */
export function ViewMenu({
  items,
  value,
  onSelect,
  home,
  className,
}: {
  /**
   * The destinations, in order. `group` is a free-form kind name: a thin
   * rule is drawn wherever it changes, so the app decides what belongs
   * together and this component only renders the seam.
   */
  items: readonly {
    id: string
    label: string
    icon?: IconName
    group?: string
    /**
     * Hidden below the `sm` breakpoint — HIDDEN, not removed. The link
     * stays in the emitted HTML so a mobile-first crawler still follows
     * it; only the pill declines to offer it at a width where the
     * destination is not worth arriving at.
     */
    desktopOnly?: boolean
  }[]
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
  // actually on screen before it can offer the opposite of it.
  //
  // The colour scheme is an EXTERNAL STORE, read as one — same pattern and
  // same reason as useIsMobile: mirroring it into state costs a cascading
  // render, and matchMedia does not exist during a prerender at all. The
  // server snapshot is `false`, which is both the safer assumption and the
  // markup that ships in static HTML.
  const systemDark = React.useSyncExternalStore(
    subscribeToScheme,
    () => window.matchMedia(SCHEME_QUERY).matches,
    () => false
  )
  const isDark = theme === "dark" || (theme === "system" && systemDark)
  const spring = useMotionSpring()
  const micro = useMotionTransition("micro")

  return (
    // POSITION-ONLY layout on the segments: the real width change is the
    // label span animating width, so wrappers only slide to make room —
    // full layout would FLIP-scale the buttons and visibly distort them
    // mid-move. The pill needs no layout of its own: it auto-sizes from
    // children that already animate continuously.
    <div
      className={cn(
        // popover ground, not glass: this is product chrome, and only the
        // assistant's surfaces wear the ambient material (DESIGN.md §8)
        "bg-popover border-border pointer-events-auto flex items-center gap-2 rounded-full border p-1",
        className
      )}
    >
      {home && (
        <motion.div layout="position" transition={spring}>
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
        </motion.div>
      )}

      {items.map((item, i) => {
        const active = item.id === value
        // A RULE BETWEEN KINDS, not between items. The pill mixes two
        // different things — places that are the product, and demos of it
        // — and ran them together as one undifferentiated row of circles.
        // The divider is drawn where `group` changes, so the grouping
        // lives in the data the app passes rather than in an index this
        // component would have to keep in step.
        const newGroup = i > 0 && item.group !== items[i - 1].group
        // the rule belongs to the group it opens, so it disappears with it
        const groupHidden = items
          .filter((x) => x.group === item.group)
          .every((x) => x.desktopOnly)
        const segment = (
          <Button
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
                surface spring, the fade rides micro — the enter pair.
                THE LABEL BOX IS THE WIDEST LABEL, ALWAYS. Every label is
                stacked in one grid cell and only the live one is visible,
                so the cell is as wide as the longest name whichever page
                you are on. Without this the pill changed width per route
                — 343px on the overview, 378px on the design system — and
                because it is centred, that moved BOTH edges: every icon
                in the chrome slid sideways on every navigation. */}
            <AnimatePresence initial={false}>
              {active && (
                <motion.span
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0, transition: micro }}
                  transition={{ ...spring, opacity: micro }}
                  className="grid overflow-hidden text-sm font-medium whitespace-nowrap"
                >
                  {items.map((other) => (
                    <span
                      key={other.id}
                      aria-hidden={other.id !== item.id}
                      className={cn(
                        "col-start-1 row-start-1",
                        other.id === item.id ? "" : "invisible"
                      )}
                    >
                      {other.label}
                    </span>
                  ))}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        )
        // only the collapsed segments need a tooltip — the expanded one
        // is wearing its name
        return (
          <React.Fragment key={item.id}>
            {newGroup && <Rule desktopOnly={groupHidden} />}
            <motion.div
              layout="position"
              transition={spring}
              className={cn(item.desktopOnly && "hidden sm:block")}
            >
              {active ? (
                segment
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>{segment}</TooltipTrigger>
                  <TooltipContent>{item.label}</TooltipContent>
                </Tooltip>
              )}
            </motion.div>
          </React.Fragment>
        )
      })}

      {/* Appearance is not a destination, so it sits behind a rule of its
          own rather than at the end of the list of places. */}
      <Rule />
      <motion.div layout="position" transition={spring}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            aria-label={isDark ? "Switch to light" : "Switch to dark"}
            aria-keyshortcuts={THEME_TOGGLE_KEY.toUpperCase()}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="rounded-full"
          >
            {/* the icon names the STEP IT TAKES, matching the label */}
            <Icon name={isDark ? "sun" : "moon"} size={14} />
          </Button>
        </TooltipTrigger>
        {/* The key comes from the same constant the handler listens for,
            so the tooltip cannot promise a binding that no longer exists. */}
        <TooltipContent className="flex items-center gap-2">
          {isDark ? "Switch to light" : "Switch to dark"}
          <kbd className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[11px]">
            {THEME_TOGGLE_KEY.toUpperCase()}
          </kbd>
        </TooltipContent>
      </Tooltip>
      </motion.div>
    </div>
  )
}
