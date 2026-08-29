import * as React from "react"

import { Icon, type IconName } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"
import { Assistant } from "ambientui/assistant"
import {
  AssistantProvider,
  useAssistant,
} from "ambientui/assistant-context"
import { OrbField, OrbHeat } from "ambientui/orb-character"

import { Reveal } from "@/components/reveal"

/**
 * OVERVIEW — the wordmark, and the UI starting right beneath it.
 *
 * THE WORDMARK IS THE IDENTITY AT IDENTITY SCALE: glyphs clipped over the
 * orb's exact heat (OrbHeat — same engine, springs, palette), riding the
 * layer's real orbState, on the field ground under a theme-following veil
 * (sanctioned in DESIGN.md §12).
 *
 * THE DEMO IS THE ACTUAL COMPONENT. A dashboard for a fictional product
 * (northbeam / checkout-api) sits inside a frame, and a second, fully
 * real ambient layer is MOUNTED INSIDE THAT FRAME — its own
 * AssistantProvider, its own Assistant, its own resting orb — scoped to
 * the frame by transform containment (a transformed ancestor is the
 * containing block for fixed descendants). When the frame scrolls into
 * view its spotlight opens: the real ⌘K surface with the real intent
 * rule, real suggestions grounded in the product's data, and the real
 * answer pipeline. Nothing is filmed; the visitor can type into it.
 * `hotkeys={false}` keeps the embedded layer from fighting the page's
 * own for ⌘K — the frame is northbeam's product, and its layer answers
 * to its own chrome only.
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

/** what the embedded layer offers on this page — grounded in the data below */
/** the statement section: the philosophy, in the enterprise frame */
const PRINCIPLES: { word: string; body: string; link?: boolean }[] = [
  {
    word: "Ambient",
    body: "Enterprise screens are crowded enough. The AI takes no tab, no panel, no corner of the record — it is a presence above the interface, arriving at whatever size the moment deserves and leaving when it is done.",
    link: true,
  },
  {
    word: "Grounded",
    body: "It works on top of the system of record. Each page declares its records to the layer through one narrow contract, so the AI acts on the row you are looking at — never on a paste of it.",
  },
  {
    word: "Composed",
    body: "Answers arrive as working UI, not chat: a diff against the record, a run with its exit code, references into your own data — built from your product's components, in place.",
  },
  {
    word: "Inherited",
    body: "Infrastructure-first: the layer ships with no look of its own. It inherits your design system and your governance, so it deploys into an enterprise product without adding a brand — or a drift surface.",
  },
]

const DEMO_SUGGESTIONS = [
  `Why did the deploy to ${APP.service} fail?`,
  "Roll back to the last clean version",
  "What shipped in the last 24 hours?",
]

const DEMO_NAV = [
  { id: "overview", label: "Overview", desc: `${APP.service} · service home` },
  { id: "deployments", label: "Deployments", desc: "History and rollbacks" },
  { id: "domains", label: "Domains & routes", desc: `${APP.service}.${APP.org}.dev` },
  { id: "metrics", label: "Metrics", desc: "Last 24 hours" },
]

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
    <div className="bg-card flex h-full flex-col overflow-hidden text-sm">
      {/* header: brand · breadcrumb */}
      <div className="border-border flex h-14 items-center gap-3 border-b px-6">
        <span className="bg-primary size-4 rounded-sm" />
        <span className="font-medium">{APP.org}</span>
        <span className="text-muted-foreground">
          Services <span className="mx-1.5">/</span> {APP.service}
        </span>
        <span className="text-muted-foreground ms-auto hidden sm:inline">
          Support
        </span>
      </div>
      <div className="flex min-h-0 flex-1">
        {/* sidebar */}
        <div className="border-border hidden w-56 flex-col gap-1 border-e p-3 sm:flex">
          {nav.map((n) => (
            <span
              key={n.label}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2",
                n.active
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              <Icon name={n.icon} size={16} />
              {n.label}
            </span>
          ))}
        </div>
        {/* main: tabs + a dense two-column body that fills the height */}
        <div className="flex min-w-0 flex-1 flex-col gap-5 p-6">
          <div className="flex items-center gap-1.5">
            {["Overview", "Metrics", "Deployments", "Domains", "Settings"].map(
              (t, i) => (
                <span
                  key={t}
                  className={cn(
                    "rounded-lg px-3 py-1.5",
                    i === 0
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {t}
                </span>
              )
            )}
            <span className="bg-primary text-primary-foreground ms-auto hidden rounded-lg px-3 py-1.5 font-medium sm:inline">
              New deployment
            </span>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="border-border flex min-h-0 flex-col overflow-hidden rounded-lg border lg:col-span-2">
            <p className="border-border border-b px-4 py-3 font-medium">
              Versions
            </p>

            {VERSIONS.map((v) => (
              <div
                key={v.id}
                className="border-border flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
              >
                <span className="text-muted-foreground font-mono text-xs">{v.id}</span>
                <span className="min-w-0 truncate">{v.msg}</span>
                {v.failed && (
                  <span className="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-xs font-medium">
                    failed
                  </span>
                )}
                <span className="text-muted-foreground ms-auto shrink-0">
                  {v.when}
                </span>
              </div>
            ))}
          </div>
          {/* the right rail — fills the column so nothing reads empty */}
          <div className="flex min-h-0 flex-col gap-4">
            <div className="border-border rounded-lg border">
              <p className="border-border border-b px-4 py-3 font-medium">
                Domains &amp; routes
              </p>
              <div className="flex flex-col gap-2.5 p-4">
                <span>{`${APP.service}.${APP.org}.dev`}</span>
                <span className="text-muted-foreground">Custom domains —</span>
                <span className="text-muted-foreground">Routes —</span>
              </div>
            </div>
            <div className="border-border rounded-lg border">
              <p className="border-border border-b px-4 py-3 font-medium">
                Metrics{" "}
                <span className="text-muted-foreground ms-1 font-normal">
                  Last 24 hours
                </span>
              </p>
              <div className="text-muted-foreground flex flex-col gap-2.5 p-4">
                <span>Requests · 412k</span>
                <span>p95 latency · 84 ms</span>
                <span>Errors · 0.02%</span>
              </div>
            </div>
            <div className="border-border flex-1 rounded-lg border">
              <p className="border-border border-b px-4 py-3 font-medium">
                Next steps
              </p>
              <div className="text-muted-foreground flex flex-col gap-2.5 p-4">
                <span>Connect a custom domain</span>
                <span>Bind a queue to retries</span>
                <span>Enable trace sampling</span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------- the embedded layer --------------------------- */

/**
 * Inside the nested provider: declare the product's context to ITS layer
 * (the same setPageChip/setPageIntel contract every page uses), and open
 * the spotlight when the frame is being watched.
 */
function EmbeddedLayer({ active }: { active: boolean }) {
  const { setMode, setPageChip, setPageIntel, seedPrompt } = useAssistant()

  React.useEffect(() => {
    setPageChip({
      id: "nb-overview",
      kind: "page",
      label: `${APP.service} · Overview`,
      icon: "code",
    })
    setPageIntel({
      suggestions: DEMO_SUGGESTIONS,
      askPlaceholder: `Search ${APP.service}, or ask anything…`,
    })
    return () => {
      setPageChip(null)
      setPageIntel(null)
    }
  }, [setPageChip, setPageIntel])

  // THE FILM, through the surface's own APIs: the spotlight opens when
  // the frame is watched, the question writes itself through seedPrompt
  // (each seed lands in the real input), and the final seed autoSends —
  // the real pipeline takes it from there: thinking beat, composed
  // answer, the surface flipping to the AI overview in place. After the
  // answer has been read, the layer goes back to rest and the film
  // replays. Cadences are demo choreography; every behavior underneath
  // is the component's.
  const [cycle, setCycle] = React.useState(0)
  React.useEffect(() => {
    if (!active) return
    const timers: number[] = []
    const at = (ms: number, fn: () => void) =>
      timers.push(window.setTimeout(fn, ms))
    at(900, () => setMode("spotlight"))
    const q = DEMO_SUGGESTIONS[0]!
    q.split("").forEach((_, i) =>
      at(2200 + i * 38, () => seedPrompt(q.slice(0, i + 1)))
    )
    const sent = 2200 + q.length * 38 + 800
    at(sent, () => seedPrompt(q, true))
    // the pipeline needs its thinking beat plus the staged answer; hold
    // the settled overview long enough to read, then rest and replay
    at(sent + 16000, () => setMode("line"))
    at(sent + 17500, () => setCycle((c) => c + 1))
    return () => timers.forEach(clearTimeout)
  }, [active, cycle, setMode, seedPrompt])

  return <Assistant hotkeys={false} />
}

function ShellDemo({ widthPct }: { widthPct: number | null }) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => setInView(e!.isIntersecting),
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="mx-auto flex w-full flex-col"
      // measured from the wordmark's own glyphs, never guessed — the
      // window's edges line up with the A and the I in whatever font the
      // Foundation has configured
      style={widthPct ? { width: `${widthPct}%` } : undefined}
    >
      {/* the presentation shell: a desktop window floating on the ambient
          ground. transform-gpu makes it the containing block for the
          layer's fixed surfaces, and the rounded overflow clip keeps
          every surface — spotlight, panel, resting orb — inside the
          window, exactly where a product's own layer lives. */}
      {/* aspect-video: the window keeps its width and sizes itself 16:9,
          the way a presentation frame is cut. The shell REVEALS as the
          reader scrolls to it; the film starts once it is properly in
          view (the observer's 40%), so the entrance leads and the demo
          follows */}
      <Reveal>
      <div className="border-border bg-card relative z-10 flex aspect-video w-full transform-gpu flex-col overflow-hidden rounded-2xl border shadow-2xl">
        <div className="border-border bg-muted/50 relative flex h-9 shrink-0 items-center justify-center border-b">
          <span className="absolute start-4 flex gap-1.5">
            <span className="bg-muted-foreground/30 size-3 rounded-full" />
            <span className="bg-muted-foreground/30 size-3 rounded-full" />
            <span className="bg-muted-foreground/30 size-3 rounded-full" />
          </span>
          <span className="text-muted-foreground text-xs">
            {APP.org} — {APP.service}
          </span>
        </div>
        <div className="relative min-h-0 flex-1">
          <DemoDashboard />
          {/* the layer renders at the Foundation's own scaling — the same
              rem base as everything else — because its size is a THEME
              decision, not a demo knob. Only the shell outside carries
              the presentation sizing. */}
          <AssistantProvider navItems={DEMO_NAV}>
            <EmbeddedLayer active={inView} />
          </AssistantProvider>
        </div>
      </div>
      </Reveal>
    </div>
  )
}

/* ------------------------------- the page ------------------------------- */

export function OverviewView() {
  const { setPageIntel, orbState } = useAssistant()

  // THE WORDMARK SETS THE PAGE'S MEASURE. The glyphs' real extent inside
  // the 640-unit viewBox depends on the Foundation's configured font, so
  // it is measured from the drawn text (getBBox, re-run once fonts load)
  // rather than hardcoded — the demo window below aligns its edges to
  // the A and the I, whatever face they are set in.
  const wordmarkRef = React.useRef<SVGTextElement | null>(null)
  const [glyphPct, setGlyphPct] = React.useState<number | null>(null)
  React.useLayoutEffect(() => {
    const measure = () => {
      const b = wordmarkRef.current?.getBBox()
      if (b && b.width > 0) setGlyphPct((b.width / 640) * 100)
    }
    measure()
    document.fonts?.ready.then(measure)
  }, [])

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
      {/* the field mounts OVERSIZED (-inset-1/4): the heat shape pads
          inside its frame, and at exact size that pad reads as seams just
          shy of the viewport edge — pushed out, the glow runs end to end
          and the root's overflow clip takes the excess */}
      <div aria-hidden className="absolute -inset-1/4">
        <OrbField state={orbState} strength="stage" />
      </div>
      <div
        aria-hidden
        className="bg-background/75 pointer-events-none absolute inset-0"
      />

      {/* the wordmark — and the UI starts right beneath it */}
      <section className="relative flex items-center justify-center pt-40 pb-16 sm:pt-48">
        <Reveal className="relative w-full px-6">
          <h1>
          <span className="sr-only">Ambient UI</span>
          <svg
            viewBox="0 0 640 150"
            aria-hidden
            className="mx-auto block w-full select-none"
          >
            <defs>
              <clipPath id="wordmark-clip">
                <text
                  ref={wordmarkRef}
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
          </h1>
        </Reveal>
      </section>

      {/* the demo, starting under the word — a desktop window on the
          presentation ground, Ambient UI in action inside it */}
      {/* px-6 matches the wordmark's own gutters — one width, one family */}
      <section className="relative px-6 pt-4 pb-10">
        <ShellDemo widthPct={glyphPct} />
      </section>

      {/* the statement: what Ambient UI is, and the four principles */}
      <section className="relative mx-auto w-full max-w-5xl px-6 pt-32 pb-24">
        <Reveal>
          <p className="text-muted-foreground mx-auto max-w-4xl text-center text-3xl leading-snug font-medium text-balance sm:text-4xl">
            Ambient UI is a decluttering of enterprise software — the system
            of record keeps every pixel of its screen, and the AI works
            above the data, alongside your SaaS, not inside it.
          </p>
        </Reveal>
        <div className="mt-28 grid gap-x-16 gap-y-16 sm:grid-cols-2">
          {PRINCIPLES.map((pr) => (
            <Reveal key={pr.word}>
              <div className="border-border border-t pt-8">
                <h3 className="text-2xl font-semibold tracking-tight">
                  {pr.word}.
                </h3>
                <p className="text-muted-foreground mt-6 leading-relaxed">
                  {pr.body}
                </p>
                {pr.link && (
                  <button
                    type="button"
                    onClick={() => {
                      window.history.pushState(null, "", "/?view=architecture")
                      window.dispatchEvent(new PopStateEvent("popstate"))
                    }}
                    className="hover:text-muted-foreground mt-6 flex items-center gap-1.5 font-medium"
                  >
                    Read the architecture
                    <Icon name="chevron-right" size={15} />
                  </button>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* the resting orb owns the viewport's bottom-center */}
      <div className="pb-24" />
    </div>
  )
}
