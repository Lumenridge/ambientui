import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@ambientui/ui/components/button"
import { Icon } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"
import { useMotionSpring, useMotionTransition } from "@ambientui/foundation"
import { useAssistant } from "ambientui/assistant-context"
import { Composer } from "ambientui/composer"
import { OrbField, OrbHeat } from "ambientui/orb-character"
import { StreamingText } from "ambientui/streaming-text"

/**
 * OVERVIEW — the front door as a single held breath: the wordmark, the
 * ground, the presence. Nothing else.
 *
 * THE WORDMARK IS THE IDENTITY AT IDENTITY SCALE. The glyphs are filled
 * with the orb's EXACT shader — OrbHeat, the character's own heat engine,
 * springs, palette, and circle image, unwrapped from the glass shell —
 * rendered as a full circle behind the text band, so the clip shows the
 * rim's slice sweeping through the glyphs, riding the layer's real
 * orbState. The name breathes, listens, and thinks with the assistant.
 * This is the one page where the mark is the subject rather than chrome
 * (sanctioned in DESIGN.md §12); the character itself stays where it
 * lives — the resting orb — one character per surface.
 *
 * Drawn as SVG so the mark scales like the graphic it is: the type scale
 * governs text, and a wordmark is a drawing of a name. The clip text uses
 * the Foundation's configured font family, so the mark re-typesets with
 * the theme like everything else.
 *
 * The one control is the arrow at the bottom — the reference's scroll
 * cue, made honest: it opens the Architecture, because that is where
 * reading on leads. Placed above bottom-center, which the resting orb
 * owns.
 */
/* ------------------------- the shell demo ------------------------- */

const DEMO_QUERY = "How do I refund a duplicate invoice?"
const DEMO_ANSWER =
  "Open the invoice pair in Billing and keep the original. Issue a credit note on the duplicate — the refund posts to the same ledger line, so the customer sees one charge and one correction."

/**
 * A SaaS product that never heard of the layer, drawn as wireframe — and
 * the layer arriving over it. When the section scrolls into view the
 * palette surface springs in over the shell, the question types itself,
 * and the surface flips in place into the AI answer, exactly the
 * spotlight's ask transition. Real parts throughout: the glass material,
 * the Composer, StreamingText; only the product beneath is a drawing,
 * because the point is that the product can be anything.
 *
 * The cadences here are demo choreography (a film of an interaction),
 * not product motion — the surfaces themselves still enter on the roles.
 */
function ShellDemo() {
  const spring = useMotionSpring()
  const micro = useMotionTransition("micro")
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = React.useState(false)
  const [phase, setPhase] = React.useState<
    "idle" | "search" | "thinking" | "answer"
  >("idle")
  const [typed, setTyped] = React.useState("")
  const [cycle, setCycle] = React.useState(0)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        const visible = e!.isIntersecting
        setInView(visible)
        // reset from the observer callback (an external event), so the
        // script effect never has to set state synchronously in its body
        if (!visible) {
          setPhase("idle")
          setTyped("")
        }
      },
      { threshold: 0.45 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  React.useEffect(() => {
    if (!inView) return
    let alive = true
    const timers: number[] = []
    const at = (ms: number, fn: () => void) =>
      timers.push(window.setTimeout(() => alive && fn(), ms))

    at(500, () => setPhase("search"))
    DEMO_QUERY.split("").forEach((_, i) =>
      at(1300 + i * 34, () => setTyped(DEMO_QUERY.slice(0, i + 1)))
    )
    const sent = 1300 + DEMO_QUERY.length * 34 + 700
    at(sent, () => setPhase("thinking"))
    at(sent + 1800, () => setPhase("answer"))
    // hold the settled answer, then run the film again
    at(sent + 1800 + 9000, () => {
      setTyped("")
      setPhase("search")
      setCycle((c) => c + 1)
    })
    return () => {
      alive = false
      timers.forEach(clearTimeout)
    }
  }, [inView, cycle])

  return (
    <div ref={ref} className="relative w-full max-w-3xl">
      {/* the product: any SaaS app, drawn as wireframe */}
      <div className="border-border bg-card/80 overflow-hidden rounded-xl border shadow-sm backdrop-blur-sm">
        <div className="border-border flex h-10 items-center gap-1.5 border-b px-4">
          <span className="bg-muted size-2.5 rounded-full" />
          <span className="bg-muted size-2.5 rounded-full" />
          <span className="bg-muted size-2.5 rounded-full" />
          <span className="bg-muted ms-4 h-2 w-40 rounded-full" />
        </div>
        <div className="flex">
          <div className="border-border hidden w-40 flex-col gap-3 border-e p-4 sm:flex">
            <span className="bg-muted h-2 w-24 rounded-full" />
            <span className="bg-muted h-2 w-20 rounded-full" />
            <span className="bg-muted h-2 w-28 rounded-full" />
            <span className="bg-muted h-2 w-16 rounded-full" />
            <span className="bg-muted h-2 w-24 rounded-full" />
          </div>
          <div className="flex min-h-72 flex-1 flex-col gap-3 p-5">
            <span className="bg-muted h-3 w-32 rounded-full" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="border-border flex items-center gap-4 rounded-lg border p-3">
                <span className="bg-muted size-5 rounded" />
                <span className="bg-muted h-2 w-1/3 rounded-full" />
                <span className="bg-muted ms-auto h-2 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* the layer, arriving over it */}
      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: micro }}
            transition={{ ...spring, opacity: micro }}
            className="ambient-glass border-(--glass-border) absolute inset-x-4 top-12 rounded-2xl border p-2 shadow-xl sm:inset-x-16"
          >
            {phase === "search" ? (
              <>
                <Composer
                  value={typed}
                  onChange={setTyped}
                  onSend={() => {}}
                  placeholder="Search the product, or ask anything…"
                />
                <div className="flex flex-col gap-1 p-1 pt-2">
                  {["w-36", "w-28"].map((w) => (
                    <div key={w} className="flex items-center gap-3 rounded-lg px-2 py-2">
                      <span className="bg-(--wash) size-4 rounded" />
                      <span className={cn("bg-(--wash) h-2 rounded-full", w)} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-3">
                <p className="text-muted-foreground text-xs">{DEMO_QUERY}</p>
                {phase === "thinking" ? (
                  <p className="ambient-shimmer mt-3 text-sm">Thinking…</p>
                ) : (
                  <StreamingText
                    key={cycle}
                    text={DEMO_ANSWER}
                    className="mt-3 block text-sm leading-relaxed"
                  />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-muted-foreground mt-4 text-center text-xs">
        Any product underneath. One keystroke, one surface — search becomes
        an answer in place. This is the layer the architecture exists for.
      </p>
    </div>
  )
}

export function OverviewView({
  onNavigate,
}: {
  onNavigate: (view: string) => void
}) {
  const { setPageIntel, orbState } = useAssistant()
  const spring = useMotionSpring()
  const micro = useMotionTransition("micro")

  React.useEffect(() => {
    setPageIntel({
      suggestions: [
        "What is ambientui?",
        "How do I install the ambient layer?",
        "What is design architecture?",
      ],
      askPlaceholder: "Ask about ambientui…",
    })
    return () => setPageIntel(null)
  }, [setPageIntel])

  const demoRef = React.useRef<HTMLElement | null>(null)

  return (
    <div className="bg-background relative overflow-hidden">
      {/* the ground is the identity's own field under a tint — a veil per
          §8 (never a raw shader). The tint is the BACKGROUND role, so it
          follows the theme: a light veil in light mode, a dark one in
          dark, and the field glows through both */}
      <OrbField state={orbState} strength="stage" />
      <div
        aria-hidden
        className="bg-background/75 pointer-events-none absolute inset-0"
      />
      <section className="relative flex h-svh items-center justify-center">
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, opacity: micro }}
        className="relative w-full px-6"
      >
        <span className="sr-only">Ambient UI</span>
        <svg
          viewBox="0 0 640 150"
          aria-hidden
          className="mx-auto block w-full select-none"
        >
          <defs>
            <clipPath id="wordmark-clip">
              <text
                x="320"
                y="114"
                textAnchor="middle"
                fontSize="118"
                fontWeight="500"
                letterSpacing="-0.03em"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {"Ambient UI"}
              </text>
            </clipPath>
          </defs>
          {/* the glyph base — the FOREGROUND role, the tint's opposite:
              dark glyphs on the light veil, bright ones on the dark, so
              the name pops in both modes and the heat rides it as color.
              Also the fallback while the shader warms up. */}
          <g clipPath="url(#wordmark-clip)">
            <rect
              width="640"
              height="150"
              className="fill-foreground"
              opacity="0.75"
            />
            {/* the heat shaped to the wordmark's band, its frame OVERSIZED
                past the clip: the warm span covers the whole name and the
                cool margins fall outside the glyphs */}
            <foreignObject x="-96" y="-22" width="832" height="195">
              <OrbHeat
                state={orbState}
                width={832}
                height={195}
                image="/orb-rect-banner.svg?v=1"
                scale={1.7}
                className="h-full w-full"
              />
            </foreignObject>
          </g>
        </svg>
      </motion.h1>

      {/* bottom-20, not bottom-10: the resting orb owns bottom-center */}
      <div className="absolute inset-x-0 bottom-20 flex justify-center">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="See the layer in action"
          onClick={() =>
            demoRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          className="text-muted-foreground hover:text-foreground rounded-full"
        >
          <Icon name="chevron-down" size={16} />
        </Button>
      </div>
      </section>

      {/* the second screen: the layer arriving over any product */}
      <section
        ref={demoRef}
        className="relative flex min-h-svh items-center justify-center px-6 py-24"
      >
        <ShellDemo />
      </section>

      <div className="relative flex justify-center pb-24">
        <Button variant="outline" onClick={() => onNavigate("architecture")}>
          Read: Stop AI drift
          <Icon name="chevron-right" size={14} />
        </Button>
      </div>
    </div>
  )
}
