import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@ambientui/ui/components/button"
import { Icon, type IconName } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"
import { useMotionSpring, useMotionTransition } from "@ambientui/foundation"
import { useAssistant } from "ambientui/assistant-context"
import { Composer } from "ambientui/composer"
import { OrbField, OrbHeat } from "ambientui/orb-character"
import { StreamingText } from "ambientui/streaming-text"

/**
 * OVERVIEW — the wordmark, and the UI starting right beneath it.
 *
 * THE WORDMARK IS THE IDENTITY AT IDENTITY SCALE: glyphs clipped over the
 * orb's exact heat (OrbHeat — same engine, springs, palette), riding the
 * layer's real orbState, on the field ground under a theme-following veil
 * (sanctioned in DESIGN.md §12).
 *
 * THE DEMO IS THE PALETTE'S REAL BEHAVIOR, filmed. A dashboard for a
 * fictional product sits under the layer's surface, and the script acts
 * out the spotlight's one-input-two-intents rule: a short query ranks
 * LINE ITEMS from the product; the moment the query grows into a
 * long-tail question (the same heuristic the palette documents — 4+
 * words, a leading interrogative, or a trailing ?), Ask AI takes the top
 * row; sending flips the surface in place into the answer. Real parts
 * throughout — the glass, the Composer, StreamingText — and the answer
 * is grounded in the same data the dashboard renders, because an answer
 * about nothing proves nothing.
 */

/* ---------------------- the fictional product's data ---------------------- */

const APP = { org: "northbeam", service: "checkout-api" }

const VERSIONS = [
  { id: "2db5ed7", msg: "Fix day dividers rendering twice", when: "18h ago" },
  { id: "46cee28", msg: "Sweep dead code from the composer", when: "2d ago" },
  { id: "b3c2e39", msg: "One SurfaceHeader across panels", when: "2d ago" },
  { id: "5831257", msg: "Fix the failed deploy: target the built dist", when: "4d ago", failed: true },
  { id: "ebf2e21", msg: "Manually deployed", when: "4d ago" },
]

const DEMO_QUERY = "why did the deploy to checkout-api fail?"

// grounded in the versions list the dashboard is showing
const DEMO_ANSWER = `The 4-day-old deploy failed because the build step targeted a directory the CI image never produced. Version 5831257 pointed the deploy at the built dist, and the next version (ebf2e21) went out clean. Nothing since has hit the same path.`

/** the line items a short query ranks — the product's own destinations */
const ITEMS: { icon: IconName; label: string; sub: string }[] = [
  { icon: "play", label: "New deployment", sub: `${APP.service} · Deploy` },
  { icon: "globe", label: "Domains & routes", sub: `${APP.service}.${APP.org}.dev` },
  { icon: "history", label: "5831257 · Fix the failed deploy", sub: "Versions · 4d ago" },
]

/** the palette's documented intent heuristic, mirrored for the film */
const isQuestion = (q: string) =>
  q.trim().split(/\s+/).length >= 4 ||
  /^(why|how|what|where)/i.test(q.trim()) ||
  q.trim().endsWith("?")

/* ------------------------------ the dashboard ------------------------------ */

function DemoDashboard() {
  const nav: { icon: IconName; label: string; active?: boolean }[] = [
    { icon: "home", label: "Account home" },
    { icon: "history", label: "Recents" },
    { icon: "code", label: "Services", active: true },
    { icon: "globe", label: "Domains" },
    { icon: "layers", label: "Queues" },
    { icon: "settings", label: "Settings" },
  ]
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border text-xs shadow-sm">
      {/* header: brand · breadcrumb */}
      <div className="border-border flex h-11 items-center gap-3 border-b px-4">
        <span className="bg-primary size-3 rounded-sm" />
        <span className="font-medium">{APP.org}</span>
        <span className="text-muted-foreground">
          Services <span className="mx-1">/</span> {APP.service}
        </span>
        <span className="text-muted-foreground ms-auto hidden sm:inline">
          Support
        </span>
      </div>
      <div className="flex">
        {/* sidebar */}
        <div className="border-border hidden w-44 flex-col gap-0.5 border-e p-2 sm:flex">
          {nav.map((n) => (
            <span
              key={n.label}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5",
                n.active
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              <Icon name={n.icon} size={13} />
              {n.label}
            </span>
          ))}
        </div>
        {/* main: tabs + versions */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex items-center gap-1">
            {["Overview", "Metrics", "Deployments", "Domains", "Settings"].map(
              (t, i) => (
                <span
                  key={t}
                  className={cn(
                    "rounded-md px-2.5 py-1",
                    i === 0
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {t}
                </span>
              )
            )}
            <span className="bg-primary text-primary-foreground ms-auto hidden rounded-md px-2.5 py-1 font-medium sm:inline">
              New deployment
            </span>
          </div>
          <div className="border-border rounded-lg border">
            <p className="border-border border-b px-3 py-2 font-medium">
              Versions
            </p>
            {VERSIONS.map((v) => (
              <div
                key={v.id}
                className="border-border flex items-center gap-3 border-b px-3 py-2 last:border-b-0"
              >
                <span className="text-muted-foreground font-mono">{v.id}</span>
                <span className="min-w-0 truncate">{v.msg}</span>
                {v.failed && (
                  <span className="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-[10px] font-medium">
                    failed
                  </span>
                )}
                <span className="text-muted-foreground ms-auto shrink-0">
                  {v.when}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------- the film ------------------------------- */

/**
 * The cadences here are demo choreography (a film of an interaction), not
 * product motion — the surfaces themselves still enter on the roles.
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
        // script effect never sets state synchronously in its body
        if (!visible) {
          setPhase("idle")
          setTyped("")
        }
      },
      { threshold: 0.4 }
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
      at(1300 + i * 38, () => setTyped(DEMO_QUERY.slice(0, i + 1)))
    )
    const sent = 1300 + DEMO_QUERY.length * 38 + 900
    at(sent, () => setPhase("thinking"))
    at(sent + 1800, () => setPhase("answer"))
    // hold the settled answer, then run the film again
    at(sent + 1800 + 11000, () => {
      setTyped("")
      setPhase("search")
      setCycle((c) => c + 1)
    })
    return () => {
      alive = false
      timers.forEach(clearTimeout)
    }
  }, [inView, cycle])

  const question = isQuestion(typed)

  return (
    <div ref={ref} className="relative w-full max-w-3xl">
      <DemoDashboard />

      {/* the layer, arriving over it */}
      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: micro }}
            transition={{ ...spring, opacity: micro }}
            className="ambient-glass border-(--glass-border) absolute inset-x-4 top-14 rounded-2xl border p-2 shadow-xl sm:inset-x-16"
          >
            {phase === "search" ? (
              <>
                <Composer
                  value={typed}
                  onChange={setTyped}
                  onSend={() => {}}
                  placeholder={`Search ${APP.service}, or ask anything…`}
                />
                <div className="flex flex-col gap-0.5 p-1 pt-2">
                  {/* the one-input-two-intents rule, live: a question puts
                      Ask AI first; anything shorter ranks the product */}
                  {question && (
                    <div className="bg-(--wash) flex items-center gap-3 rounded-lg px-2.5 py-2">
                      <Icon
                        name="sparkles"
                        size={14}
                        className="text-(--ambient-accent)"
                      />
                      <span className="min-w-0 truncate text-sm font-medium">
                        Ask AI — “{typed.trim()}”
                      </span>
                      <kbd className="bg-muted text-muted-foreground ms-auto rounded px-1.5 font-mono text-[10px]">
                        ↵
                      </kbd>
                    </div>
                  )}
                  {ITEMS.map((it) => (
                    <div
                      key={it.label}
                      className="flex items-center gap-3 rounded-lg px-2.5 py-2"
                    >
                      <Icon
                        name={it.icon}
                        size={14}
                        className="text-muted-foreground"
                      />
                      <span className="min-w-0 truncate text-sm">{it.label}</span>
                      <span className="text-muted-foreground ms-auto shrink-0 text-xs">
                        {it.sub}
                      </span>
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
        One input, two intents: a short query ranks the product, a long-tail
        question becomes the AI — and the answer knows the page.
      </p>
    </div>
  )
}

/* ------------------------------- the page ------------------------------- */

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

      {/* the wordmark — and the UI starts right beneath it */}
      <section className="relative flex items-center justify-center pt-40 pb-16 sm:pt-48">
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
      </section>

      {/* the demo, starting under the word */}
      <section className="relative flex justify-center px-6 pb-20">
        <ShellDemo />
      </section>

      {/* pb-40: the resting orb owns the viewport's bottom-center */}
      <div className="relative flex justify-center pb-40">
        <Button variant="outline" onClick={() => onNavigate("architecture")}>
          Read: Stop AI drift
          <Icon name="chevron-right" size={14} />
        </Button>
      </div>
    </div>
  )
}
