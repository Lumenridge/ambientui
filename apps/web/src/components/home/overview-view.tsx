import * as React from "react"

import { animate, motion, useMotionValue } from "framer-motion"

import { useMotionSpring, useMotionTransition } from "@ambientui/foundation"
import { Icon, type IconName } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"
import { Assistant } from "ambientui/assistant"
import {
  AssistantProvider,
  useAssistant,
  type AssistantMode,
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
/** the statement section: the philosophy in plain words — direct heads,
    simply explainable lines, no abstractions to decode */
const PRINCIPLES: { word: string; body: string; link?: boolean }[] = [
  {
    word: "Takes no space",
    body: "Enterprise screens are full. The AI is a layer above the app — no chat tab, no side panel, nothing carved out of the record. It opens when you call it and leaves when it is done.",
    link: true,
  },
  {
    word: "Knows your context",
    body: "Every page tells the layer what you are looking at. Ask about \u201cthis invoice\u201d and it knows which one — you never paste, describe, or re-explain your screen.",
  },
  {
    word: "Answers with real UI",
    body: "Not a wall of chat. A diff you can apply, a command with its result, references into your own data — real components from your product, shown in place.",
  },
  {
    word: "Wears your design system",
    body: "The layer has no colors, fonts, or motion of its own. It uses yours. Change your theme once and the AI changes with it.",
  },
]

/** the layer's forms, described in the paper's own words (§2) */
const FORMS: { mode: AssistantMode; name: string; desc: string }[] = [
  { mode: "line", name: "Orb", desc: "The resting state. Present, watching nothing, costing nothing — a small character docked to the edge of the page." },
  { mode: "spotlight", name: "Spotlight", desc: "One input that searches the product and asks the model — the command palette, rebuilt for an AI-native product." },
  { mode: "panel", name: "Panel", desc: "A floating conversation that persists while you work. Answers accumulate; the transcript is the point." },
  { mode: "dock", name: "Dock", desc: "The panel anchored full-height to an edge. The page reflows around it instead of being covered." },
  { mode: "history", name: "History", desc: "The record of everything asked here — full screen but translucent, because the work underneath is the reason you opened it." },
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

/** The presentation shell both demos share: a desktop window, 16:9,
    transform-contained so an embedded layer's surfaces live inside it. */
function DemoWindow({ children }: { children: React.ReactNode }) {
  return (
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
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  )
}

/* ----------------------------- the demo cursor ---------------------------- */

/**
 * THE FILM'S HAND (Figma: Cursor, 163:230) — a glass puck that glides to
 * the layer's REAL controls and presses them, so every form change in the
 * film reads as "this is the click that gets you this". Presentation
 * choreography only: it draws the gesture, and the film fires the same
 * public API the control itself would. It never intercepts input
 * (pointer-events-none throughout) — the moment the visitor's own cursor
 * arrives, the film and this hand both stand down.
 *
 * Sizing per the token rule: the design's 22px disc rides size-5 (20px,
 * nearest legal step); the 14px core is size-3.5 exactly.
 */
type DemoCursorHandle = {
  /** glide to the element and press it; false if the control isn't there.
      `fire` also dispatches the real click — for controls whose action
      has no public-context equivalent (Back to search). A dispatched
      click never counts as visitor interaction: the stop listens for
      pointerdown, which only a real pointer produces. */
  clickOn: (selector: string, fire?: boolean) => Promise<boolean>
  /** press the element and pull it to a point (fractions of the frame) —
      the drag-as-mode-switch gesture, drawn */
  dragTo: (selector: string, fx: number, fy: number) => Promise<boolean>
  /** drift aside and wait — the "user" is typing, not pointing */
  rest: () => Promise<void>
  hide: () => void
}

function DemoCursorLayer({
  handleRef,
}: {
  handleRef: React.MutableRefObject<DemoCursorHandle | null>
}) {
  const spring = useMotionSpring()
  const micro = useMotionTransition("micro")
  const hostRef = React.useRef<HTMLDivElement | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const [visible, setVisible] = React.useState(false)
  const [pressed, setPressed] = React.useState(false)
  const [pulse, setPulse] = React.useState(0)
  const visibleRef = React.useRef(false)

  React.useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
    const glide = async (px: number, py: number) => {
      await Promise.all([animate(x, px, spring), animate(y, py, spring)])
    }
    const centerOf = (el: Element) => {
      const hr = host.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      return { x: r.left - hr.left + r.width / 2, y: r.top - hr.top + r.height / 2 }
    }
    const appearNear = (px: number, py: number) => {
      // a hand that fades in beside its first target, not one that flies
      // across the whole frame from a stale corner
      if (!visibleRef.current) {
        x.jump(px + 60)
        y.jump(py + 40)
      }
      setVisible(true)
      visibleRef.current = true
    }
    const press = async () => {
      setPressed(true)
      setPulse((p) => p + 1)
      await sleep(180)
      setPressed(false)
    }
    handleRef.current = {
      async clickOn(selector, fire = false) {
        const el = host.parentElement?.querySelector(selector)
        if (!el) return false
        const c = centerOf(el)
        appearNear(c.x, c.y)
        await glide(c.x, c.y)
        await press()
        if (fire) (el as HTMLElement).click()
        await sleep(220)
        return true
      },
      async dragTo(selector, fx, fy) {
        const el = host.parentElement?.querySelector(selector)
        if (!el) return false
        const c = centerOf(el)
        appearNear(c.x, c.y)
        await glide(c.x, c.y)
        setPressed(true)
        await sleep(160)
        const hr = host.getBoundingClientRect()
        await glide(hr.width * fx, hr.height * fy)
        setPressed(false)
        setPulse((p) => p + 1)
        await sleep(220)
        return true
      },
      async rest() {
        const hr = host.getBoundingClientRect()
        await glide(hr.width * 0.82, hr.height * 0.72)
      },
      hide() {
        setVisible(false)
        visibleRef.current = false
      },
    }
    return () => {
      handleRef.current = null
    }
    // spring/micro are stable per Foundation config; x/y are motion values
  }, [handleRef, spring, x, y])

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
    >
      <motion.div style={{ x, y }} className="absolute top-0 left-0">
        {pulse > 0 && (
          <motion.span
            key={pulse}
            initial={{ scale: 0.5, opacity: 0.45 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="border-foreground/50 absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          />
        )}
        <motion.div
          animate={{ scale: pressed ? 0.78 : 1, opacity: visible ? 1 : 0 }}
          transition={{ ...spring, opacity: micro }}
          className="border-border/60 bg-background/60 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-md backdrop-blur-md"
        >
          <span className="bg-foreground/70 size-3.5 rounded-full shadow-sm" />
        </motion.div>
      </motion.div>
    </div>
  )
}

/* --------------------------- the embedded layer --------------------------- */

/**
 * Inside the nested provider: declare the product's context to ITS layer
 * (the same setPageChip/setPageIntel contract every page uses), and open
 * the spotlight when the frame is being watched.
 */
function EmbeddedLayer({
  active,
  interacted,
  cursor,
}: {
  active: boolean
  /** the visitor touched the window — the film stops, the layer is theirs */
  interacted: boolean
  /** the film's hand — draws the click that causes each step */
  cursor: React.MutableRefObject<DemoCursorHandle | null>
}) {
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

  // THE FILM, through the surface's own APIs: the spotlight opens, the
  // question writes itself through seedPrompt, the final seed autoSends
  // and the real pipeline answers — then the TOUR: the same exchange
  // carried through every form (panel, dock, history), back to rest,
  // and the film starts from the beginning. The moment the visitor
  // interacts with the window, the script stops and the layer is theirs
  // to explore, form by form. Cadences are demo choreography; every
  // behavior underneath is the component's.
  const [cycle, setCycle] = React.useState(0)
  React.useEffect(() => {
    if (!active || interacted) return
    let alive = true
    const timers: number[] = []
    const sleep = (ms: number) =>
      new Promise<void>((r) => timers.push(window.setTimeout(r, ms)))
    // EVERY STEP IS A DRAWN GESTURE ON A REAL CONTROL: the hand presses
    // the orb to open the spotlight, the header buttons to change form,
    // and pulls the panel's drag handle to dock it — then the film fires
    // the exact API that control fires. The visitor sees WHICH click gets
    // them each shape.
    const run = async () => {
      await sleep(900)
      if (!alive) return
      await cursor.current?.clickOn('[aria-label="Open ambientui"]')
      if (!alive) return
      setMode("spotlight")
      await sleep(600)
      if (cycle > 0) {
        // a repeat cycle finds last round's transcript — press the real
        // "Back to search" so the loop starts from the clean palette
        await cursor.current?.clickOn('[aria-label="Back to search"]', true)
        if (!alive) return
        await sleep(500)
      }
      cursor.current?.rest()
      const q = DEMO_SUGGESTIONS[0]!
      for (let i = 0; i < q.length; i++) {
        await sleep(38)
        if (!alive) return
        seedPrompt(q.slice(0, i + 1))
      }
      await sleep(800)
      if (!alive) return
      seedPrompt(q, true)
      // hold the settled answer, then tour the forms with the transcript
      await sleep(11000)
      if (!alive) return
      await cursor.current?.clickOn('[aria-label="Open in chat window"]')
      if (!alive) return
      setMode("panel")
      await sleep(4200)
      if (!alive) return
      // dock is a DRAG, not a button — draw the gesture the layer teaches
      await cursor.current?.dragTo(".group\\/header", 0.94, 0.4)
      if (!alive) return
      setMode("dock")
      await sleep(4200)
      if (!alive) return
      await cursor.current?.clickOn('[aria-label="History"]')
      if (!alive) return
      setMode("history")
      await sleep(4200)
      if (!alive) return
      await cursor.current?.clickOn('[aria-label="Close history"]')
      if (!alive) return
      setMode("line")
      cursor.current?.hide()
      await sleep(2600)
      if (alive) setCycle((c) => c + 1)
    }
    void run()
    // no hide on cleanup: the hand either glides on into the next cycle,
    // or its whole layer unmounts (interaction, scroll-away)
    return () => {
      alive = false
      timers.forEach(clearTimeout)
    }
  }, [active, interacted, cycle, setMode, seedPrompt, cursor])

  return <Assistant hotkeys={false} />
}

function ShellDemo({ widthPct }: { widthPct: number | null }) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = React.useState(false)
  const [near, setNear] = React.useState(false)
  const [interacted, setInteracted] = React.useState(false)
  const cursorRef = React.useRef<DemoCursorHandle | null>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => setInView(e!.isIntersecting),
      { threshold: 0.4 }
    )
    // A MOUNT GATE, wider than the film's trigger: each embedded layer
    // holds real WebGL contexts (its orb, its surface fields), and a page
    // of demo windows all alive at once trips the browser's context cap —
    // which evicts the oldest context, the wordmark. Off-screen windows
    // give their layer back; leaving also resets `interacted`, so the
    // film re-arms for the next visit.
    const mount = new IntersectionObserver(
      ([e]) => {
        const v = e!.isIntersecting
        setNear(v)
        if (!v) setInteracted(false)
      },
      { rootMargin: "300px 0px" }
    )
    io.observe(el)
    mount.observe(el)
    return () => {
      io.disconnect()
      mount.disconnect()
    }
  }, [])

  return (
    <div
      ref={ref}
      className="mx-auto flex w-full flex-col"
      style={widthPct ? { width: `${widthPct}%` } : undefined}
    >
      {/* the shell REVEALS as the reader scrolls to it; the film starts
          once it is properly in view, so the entrance leads and the demo
          follows. The layer inside renders at the Foundation's own
          scaling — its size is a THEME decision, not a demo knob. */}
      <Reveal>
        {/* a real pointer or key inside the window ends the film — from
            then on the layer belongs to the visitor */}
        <div
          onPointerDownCapture={() => setInteracted(true)}
          onKeyDownCapture={() => setInteracted(true)}
        >
          <DemoWindow>
            {/* the product recedes (opacity), the layer does not — the
                Ambient UI component is the subject of every window */}
            <div className="h-full opacity-60">
              <DemoDashboard />
            </div>
            {near && (
              <AssistantProvider navItems={DEMO_NAV}>
                <EmbeddedLayer
                  active={inView}
                  interacted={interacted}
                  cursor={cursorRef}
                />
              </AssistantProvider>
            )}
            {/* the hand paints last, above every surface of the layer */}
            {near && !interacted && <DemoCursorLayer handleRef={cursorRef} />}
          </DemoWindow>
        </div>
      </Reveal>
    </div>
  )
}

/* ------------------------------ the forms ------------------------------ */

/**
 * Inside its own nested provider: declare the product, seed one real
 * exchange so every form has a transcript to show, and hold the layer in
 * whatever form the section currently presents. All public seam — the
 * same setMode/seedPrompt the product itself uses.
 */
function FormsDriver({ active, mode }: { active: boolean; mode: AssistantMode }) {
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

  const seeded = React.useRef(false)
  React.useEffect(() => {
    if (!active) return
    if (!seeded.current) {
      // one real exchange, so every form has a transcript to show. The
      // seed drains when an ASKING surface opens, so it runs through the
      // spotlight first and the section's own form takes over after.
      seeded.current = true
      setMode("spotlight")
      seedPrompt(DEMO_SUGGESTIONS[0]!, true, true)
      const t = window.setTimeout(() => setMode(mode), 2600)
      return () => window.clearTimeout(t)
    }
    setMode(mode)
  }, [active, mode, setMode, seedPrompt])

  return <Assistant hotkeys={false} />
}

/**
 * One form, one section: the form's name and its line from the paper,
 * then the same presentation window with a real layer HELD in that form.
 * Each section activates as it scrolls into view and seeds one exchange
 * so the conversational forms have a transcript; from there the layer is
 * the visitor's to use.
 */
function FormSection({
  form,
  widthPct,
}: {
  form: (typeof FORMS)[number]
  widthPct: number | null
}) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = React.useState(false)
  const [near, setNear] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => setInView(e!.isIntersecting),
      { threshold: 0.3 }
    )
    // same mount gate as the top demo: an off-screen window holds no
    // WebGL contexts, so five form sections never crowd out the wordmark
    const mount = new IntersectionObserver(
      ([e]) => setNear(e!.isIntersecting),
      { rootMargin: "300px 0px" }
    )
    io.observe(el)
    mount.observe(el)
    return () => {
      io.disconnect()
      mount.disconnect()
    }
  }, [])

  return (
    <section className="relative px-6 pt-24">
      <div ref={ref}>
        {/* written content reads at the page's text measure */}
        <div className="mx-auto w-full max-w-5xl">
          <Reveal>
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {form.name}
            </h3>
            <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              {form.desc}
            </p>
          </Reveal>
        </div>
        {/* the window spans the wordmark's measure */}
        <Reveal className="mt-8">
          <div
            className="mx-auto w-full"
            style={widthPct ? { width: `${widthPct}%` } : undefined}
          >
          <DemoWindow>
            {/* the product recedes (opacity), the layer does not — the
                Ambient UI component is the subject of every window */}
            <div className="h-full opacity-60">
              <DemoDashboard />
            </div>
            {near && (
              <AssistantProvider navItems={DEMO_NAV}>
                <FormsDriver active={inView} mode={form.mode} />
              </AssistantProvider>
            )}
          </DemoWindow>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------- the page ------------------------------- *//* ------------------------------- the page ------------------------------- */

export function OverviewView() {
  const { setPageIntel, orbState } = useAssistant()

  // THE WINDOWS TAKE THE WORDMARK'S MEASURE; the written content reads at
  // max-w-5xl. The glyphs' extent depends on the configured font, so it
  // is measured from the drawn text (re-run once fonts land), never
  // hardcoded.
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
      {/* THE GROUND IS THE VIEWPORT, NOT THE DOCUMENT. Fixed, so the field
          stays a steady backdrop while the page scrolls over it — sized to
          the screen instead of stretching with a four-viewport document
          (which smeared the glow ramp across the whole lower half). The
          horizontal oversize (-inset-x-1/4) pushes the heat shape's side
          pads past the edges so the glow runs end to end; the fixed layer
          unmounts with the view. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* the field anchors at the screen top and stretches one viewport
            past the bottom (-bottom-full): its top rim reads as the
            horizon and its glow gradient spans the whole visible screen,
            instead of pinching into a thin stripe at each edge */}
        <div className="absolute -inset-x-1/4 top-0 -bottom-full">
          <OrbField state={orbState} strength="stage" />
        </div>
        <div className="bg-background/75 absolute inset-0" />
      </div>

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

      {/* the forms: one presence, many shapes — one section per form,
          each window at the wordmark's width, each layer real */}
      <section className="relative px-6 pt-8">
        <div className="mx-auto w-full max-w-5xl">
          <Reveal className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              One presence, many forms
            </h2>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl leading-relaxed">
              A presence that is always available cannot have one fixed
              size. The layer changes shape instead of changing identity —
              the same assistant, the same context, a different geometry
              for how much of your attention the moment deserves.
            </p>
          </Reveal>
        </div>
      </section>
      {FORMS.map((f) => (
        <FormSection key={f.name} form={f} widthPct={glyphPct} />
      ))}
      <div className="pb-8" />

      {/* the resting orb owns the viewport's bottom-center */}
      <div className="pb-24" />
    </div>
  )
}
