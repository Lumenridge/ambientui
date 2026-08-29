"use client"

import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { useMotionSpring, useMotionTransition } from "@ambientui/foundation"
import { Icon, type IconName } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"
import type { ContextChip } from "ambientui/assistant-context"

import { Reveal } from "@/components/reveal"

/**
 * THE CONTEXT CONTRACT, SHOWN RATHER THAN CLAIMED.
 *
 * The paper's third section says the layer never reaches into the product
 * to guess: each page declares what the layer may know, and the current
 * context is visible as a chip before you ask. That is the philosophical
 * centre of the whole thing, and the site asserted it in one sentence
 * under a screenshot.
 *
 * So this section shows the contract's SHAPE. A small product moves — page,
 * then page, then a file, then a selection inside it — and the chip follows,
 * because each beat carries the chip its page would have declared.
 *
 * WHAT IS REAL AND WHAT IS NOT, stated plainly: the chips are real
 * `ContextChip` objects typed by the layer's own exported type, so if the
 * contract's shape changes this file stops compiling. The loop itself is
 * local state, NOT a live `setPageChip` call — driving the page's actual
 * assistant from a section that scrolls past would hand the real layer a
 * context the reader never chose. The live contract is demonstrated where
 * it belongs, in the dev tool demo, which declares its context for real.
 *
 * It is a KEPT-LOCAL composition (watchlist, DESIGN.md §13): a narrative
 * device for one section of one page, not a vocabulary component. If a
 * second surface ever wants it, that is a governance event.
 */

/** One beat: what the user is looking at, and what the page therefore says. */
type Beat = {
  /** Where the mock product is. */
  where: { nav: string; crumb?: string; line?: string }
  /** What that page declares — a real chip, not a picture of one. */
  chip: ContextChip
  /** What the assistant could answer, given only that chip. */
  ask: string
}

const BEATS: Beat[] = [
  {
    where: { nav: "Overview" },
    chip: { id: "b1", label: "checkout-api · Overview", kind: "page", icon: "home" },
    ask: "How is this service doing today?",
  },
  {
    where: { nav: "Billing", crumb: "Invoices" },
    chip: { id: "b2", label: "Billing · Invoices", kind: "page", icon: "document" },
    ask: "Which invoices failed to send this week?",
  },
  {
    where: { nav: "Code", crumb: "composer.tsx" },
    chip: { id: "b3", label: "Editor · composer.tsx", kind: "file", icon: "code" },
    ask: "Why do drafts vanish when I switch threads?",
  },
  {
    where: { nav: "Code", crumb: "composer.tsx", line: "const [draft, setDraft] = useState(\"\")" },
    chip: { id: "b4", label: "composer.tsx:4", kind: "symbol", icon: "code" },
    ask: "Move this into the runtime store.",
  },
]

const NAV: { label: string; icon: IconName }[] = [
  { label: "Overview", icon: "home" },
  { label: "Billing", icon: "document" },
  { label: "Code", icon: "code" },
]

/** The chip, drawn the way the composer draws it. */
function Chip({ chip }: { chip: ContextChip }) {
  return (
    <span className="border-border bg-(--wash) inline-flex max-w-full shrink-0 items-center gap-2 rounded-lg border py-1 pe-2 ps-1.5 font-medium">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-[var(--ambient-accent-wash)] text-[var(--ambient-accent)]">
        <Icon name={chip.icon ?? "document"} size={12} />
      </span>
      <span className="min-w-0 truncate text-xs">{chip.label}</span>
    </span>
  )
}

export function ContextSection() {
  const [i, setI] = React.useState(0)
  const [running, setRunning] = React.useState(false)
  const spring = useMotionSpring()
  const micro = useMotionTransition("micro")
  const ref = React.useRef<HTMLDivElement | null>(null)

  // Same rule as every other demo on this page: it starts when it is
  // actually on screen, not when the page loads.
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => setRunning(!!e?.isIntersecting),
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  React.useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => setI((n) => (n + 1) % BEATS.length), 2600)
    return () => window.clearInterval(t)
  }, [running])

  const beat = BEATS[i]!

  return (
    <div ref={ref}>
      <Reveal>
        <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          The contract
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          It already knows where you are
        </h2>
        <p className="text-muted-foreground mt-6 max-w-2xl leading-relaxed">
          The defining habit of embedded AI is that you re-explain your
          situation to it every time. Paste the error, describe the page,
          name the file. An ambient layer inverts that: every page declares
          itself, the context travels with you as you move, and it stays
          visible as a chip so you can see what the assistant is looking at
          before you ask. The layer never reaches into the product to guess.
          The product states what the layer may know.
        </p>
      </Reveal>

      <Reveal className="mt-10">
        <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-2xl">
          {/* the product */}
          <div className="flex min-h-80">
            <div className="border-border hidden w-44 shrink-0 flex-col gap-1 border-e p-3 sm:flex">
              {NAV.map((n) => {
                const on = n.label === beat.where.nav
                return (
                  <motion.span
                    key={n.label}
                    animate={{ opacity: on ? 1 : 0.55 }}
                    transition={micro}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                      on
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon name={n.icon} size={15} />
                    {n.label}
                  </motion.span>
                )
              })}
            </div>

            <div className="min-w-0 flex-1 p-5">
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span>checkout-api</span>
                <Icon name="chevron-right" size={12} />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={beat.where.nav + (beat.where.crumb ?? "")}
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 3 }}
                    transition={micro}
                    className="text-foreground font-medium"
                  >
                    {beat.where.crumb ?? beat.where.nav}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* the thing being looked at: a page body, or a line of code */}
              <div className="mt-5">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={beat.chip.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={micro}
                    className="space-y-2"
                  >
                    {beat.where.line ? (
                      <pre className="bg-muted/60 text-foreground overflow-x-auto rounded-lg p-3 font-mono text-xs">
                        <span className="text-muted-foreground me-3">4</span>
                        <span className="bg-[var(--ambient-accent-wash)] rounded px-1">
                          {beat.where.line}
                        </span>
                      </pre>
                    ) : (
                      <>
                        <span className="bg-muted block h-3 w-2/3 rounded-full" />
                        <span className="bg-muted block h-3 w-1/2 rounded-full" />
                        <span className="bg-muted block h-3 w-3/5 rounded-full" />
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* the layer's composer row — the chip is the whole point */}
          <div className="border-border bg-muted/30 border-t p-3">
            <div className="flex items-center gap-2">
              <motion.span layout="position" transition={spring}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={beat.chip.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ ...spring, opacity: micro }}
                    className="inline-block"
                  >
                    <Chip chip={beat.chip} />
                  </motion.span>
                </AnimatePresence>
              </motion.span>
              <span className="text-muted-foreground truncate text-sm">
                {beat.ask}
              </span>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-8">
        <div className="border-border grid gap-6 border-t pt-6 sm:grid-cols-3">
          <div>
            <p className="text-sm font-medium">The page declares</p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              One call, <code className="font-mono text-xs">setPageChip</code>,
              the way a page sets its title. A page that forgets is an
              incomplete feature.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">The layer never guesses</p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              It reads no DOM and infers nothing. What it may know is exactly
              what it was told, which is what makes the boundary auditable.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">You can see it first</p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              The chip is visible before you type, so &ldquo;fix this&rdquo;
              is never a guess about what &ldquo;this&rdquo; meant.
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
