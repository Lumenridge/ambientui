import * as React from "react"

import { motion } from "framer-motion"

import { Button } from "@ambientui/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ambientui/ui/components/collapsible"
import { Icon } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"
import {
  useFoundation,
  useMotionSpring,
  useMotionTransition,
} from "@ambientui/foundation"
import { useAssistant } from "ambientui/assistant-context"
import { ReasoningPanel } from "ambientui/message-kit"
import { ReferenceChips } from "ambientui/response-kit"
import { CodeDiff, ToolCall } from "ambientui/tool-kit"

import { CommandLine } from "@/components/command-line"
import { Markdown } from "@/components/ds/markdown"
import { SYSTEM_DOCS } from "@/components/ds/system-docs"
import { DS_PARAM } from "@/ds-route"
import { withBase } from "@/base"

/**
 * THE PLAYBOOK — the front door: the paper itself, read as an article.
 *
 * THE ARTICLE IS THE PAPER'S REAL BYTES. The body is PAPER.md rendered
 * through the same Markdown reader /ds uses — not a rewrite, not entries
 * that link away. Edit the paper and this page changes, because there is no
 * copy to fall out of step. One presentation transform: the file's title
 * block (H1 + bold subtitle) is sliced off, because the hero renders those
 * two lines at display scale — showing them twice would be the page
 * stuttering.
 *
 * THE DEMOS ARE THE REAL COMPONENTS IN A SHELL FRAME: after the section on
 * the six shapes, buttons that open the live layer's actual surfaces; after
 * the section on composed answers, the ambient vocabulary itself —
 * ReasoningPanel, ToolCall, CodeDiff, ReferenceChips — rendered settled
 * inside a wireframe shell, so the article shows the thing it just argued.
 *
 * THE CONTENTS COLUMN (wide screens): the paper's sixteen sections divided
 * into six labeled groups, each a Collapsible — the group being read opens
 * itself as the reader scrolls, entries jump the article, and everything is
 * DERIVED from the same chunk split, never hand-written.
 *
 * Kept-local compositions (watchlist, DESIGN.md §13): `Reveal`,
 * `DocDownload`, `WireframeShell` (a dashed, corner-ticked frame with a
 * mono tag — the page's blueprint device, drawn entirely from the border
 * role and the type scale), and `PlaybookNav`.
 */

const KIT: { docId: string; blurb: string }[] = [
  { docId: "doc-paper", blurb: "This article, as the file it is." },
  { docId: "doc-motion-spec", blurb: "Roles, characters, and the arrival choreography. Read first when porting." },
  { docId: "doc-shell-spec", blurb: "The layer's complete behavior contract, shape by shape." },
  { docId: "doc-design", blurb: "The constitution: rules, contracts, and the decision log." },
  { docId: "doc-claude", blurb: "The standing orders an AI works under in this repo." },
]

/* ---------------------------------------------------------------- */

/** Sections land as the reader arrives — the surface role, once. */
function Reveal({
  children,
  className,
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const spring = useMotionSpring()
  const micro = useMotionTransition("micro")
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ ...spring, opacity: micro }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * The blueprint device: a dashed frame with corner ticks and a mono tag.
 * Everything is the border role and the type scale — a wireframe drawn
 * from tokens, not an image of one.
 */
function WireframeShell({
  tag,
  children,
  className,
}: {
  tag: string
  children: React.ReactNode
  className?: string
}) {
  const tick = "border-border absolute size-2"
  return (
    <div
      className={cn(
        "border-border relative rounded-xl border border-dashed p-5 sm:p-6",
        className
      )}
    >
      <span className={cn(tick, "-top-px -left-px rounded-tl border-t-2 border-l-2")} />
      <span className={cn(tick, "-top-px -right-px rounded-tr border-t-2 border-r-2")} />
      <span className={cn(tick, "-bottom-px -left-px rounded-bl border-b-2 border-l-2")} />
      <span className={cn(tick, "-bottom-px -right-px rounded-br border-b-2 border-r-2")} />
      <span className="bg-background text-muted-foreground absolute -top-2.5 left-4 px-2 font-mono text-[11px] tracking-wide uppercase">
        {tag}
      </span>
      {children}
    </div>
  )
}

/** Hand the visitor the file itself — the same bytes /ds renders. */
function DocDownload({ docId, blurb }: { docId: string; blurb: string }) {
  const doc = SYSTEM_DOCS.find((d) => d.id === docId)
  if (!doc) return null
  const download = () => {
    const blob = new Blob([doc.source], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = doc.path.split("/").pop() ?? "document.md"
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="border-border flex items-center gap-4 border-t py-4 first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-medium">{doc.name}</span>
          <span className="text-muted-foreground font-mono text-xs">
            {doc.path}
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 text-sm">{blurb}</p>
      </div>
      <Button variant="outline" size="sm" onClick={download}>
        Download
      </Button>
    </div>
  )
}

/** Jump to a document on /ds without the layer knowing routes exist. */
const openDoc = (docId: string) => {
  window.history.pushState(
    null,
    "",
    withBase(`/ds?${DS_PARAM}=${encodeURIComponent(docId)}`)
  )
  window.dispatchEvent(new PopStateEvent("popstate"))
}

/* ------------------------- the article chunks ------------------------- */

type Chunk = {
  id: string
  md: string
  /** parsed for the contents nav; absent on non-section chunks */
  heading?: { level: 1 | 2; label: string }
}

/**
 * The paper, sliced for staged reading and for the contents column: the
 * title block the hero renders is dropped, the body splits at part and
 * section headings, and each chunk's heading feeds the nav. The bytes
 * inside each chunk are untouched, and the nav cannot drift from the
 * article because both come from the same split.
 */
function usePaper() {
  return React.useMemo(() => {
    const source = SYSTEM_DOCS.find((d) => d.id === "doc-paper")?.source ?? ""
    const lines = source.split("\n")
    let start = 0
    if (lines[0]?.startsWith("# ")) {
      start = 1
      while (lines[start] === "") start++
      if (lines[start]?.startsWith("**")) {
        start++
        while (lines[start] === "") start++
      }
    }
    const body = lines.slice(start)
    const chunks: Chunk[] = []
    let current: string[] = []
    const flush = () => {
      const md = current.join("\n").trim()
      if (!md) return (current = [])
      const first = md.split("\n")[0] ?? ""
      let heading: Chunk["heading"]
      if (first.startsWith("# Part ")) heading = { level: 1, label: first.slice(2) }
      else if (first.startsWith("## ")) heading = { level: 2, label: first.slice(3) }
      chunks.push({ id: `s-${chunks.length}`, md, heading })
      current = []
    }
    for (const line of body) {
      if (/^## /.test(line) || /^# Part /.test(line)) flush()
      current.push(line)
    }
    flush()
    for (const c of chunks) {
      if (c.md.startsWith("# Part I:")) c.id = "part-1"
      if (c.md.startsWith("# Part II:")) c.id = "part-2"
    }
    const words = source.split(/\s+/).length
    return { chunks, minutes: Math.max(1, Math.round(words / 220)) }
  }, [])
}

/* --------------------------- the shell demos --------------------------- */

/** A wireframe placeholder bar — the diagram's stand-in for content. */
function Bar({ className }: { className?: string }) {
  return <span className={cn("bg-muted block rounded-sm", className)} />
}

/** A small accent dot marking where AI got bolted on. */
function AiMark({ label }: { label?: string }) {
  return (
    <span className="text-primary flex items-center gap-1 font-mono text-[9px] tracking-wide uppercase">
      <span className="bg-primary size-1.5 rounded-full" />
      {label}
    </span>
  )
}

/**
 * After §1: the argument as a wireframe. Left, the common way — AI embedded
 * three separate times, each blind to the others. Right, the ambient claim —
 * the same product untouched, one presence floating above it. Every stroke
 * is a token: borders are the border role, fills are muted, the AI is the
 * primary role. No literal colors, because the diagram obeys the paper.
 */
function EmbeddedVsAmbientDiagram() {
  return (
    <WireframeShell tag="diagram · embedded vs ambient" className="my-10">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* the common way: three AI features, fragmented */}
        <figure className="min-w-0">
          <div className="border-border bg-background flex h-44 overflow-hidden rounded-lg border">
            {/* sidebar with the chat tab */}
            <div className="border-border flex w-1/4 flex-col gap-2 border-r p-2.5">
              <Bar className="h-2 w-3/4" />
              <Bar className="h-2 w-2/3" />
              <AiMark label="chat" />
              <Bar className="h-2 w-3/4" />
            </div>
            {/* features, each with its own sparkle button */}
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-2.5">
              <div className="border-border rounded-md border p-2">
                <div className="flex items-center justify-between gap-2">
                  <Bar className="h-2 w-1/3" />
                  <AiMark />
                </div>
                <Bar className="mt-2 h-2 w-5/6" />
              </div>
              <div className="border-border rounded-md border p-2">
                <div className="flex items-center justify-between gap-2">
                  <Bar className="h-2 w-1/2" />
                  <AiMark />
                </div>
                <Bar className="mt-2 h-2 w-2/3" />
              </div>
              {/* the assistant panel that is really another page */}
              <div className="border-primary/40 mt-auto rounded-md border border-dashed p-2">
                <AiMark label="assistant panel" />
              </div>
            </div>
          </div>
          <figcaption className="text-muted-foreground mt-2 text-xs leading-relaxed">
            Embedded: the AI three times over — a chat tab, sparkle buttons,
            a panel — none of them knowing what the others did.
          </figcaption>
        </figure>

        {/* the ambient claim: the product untouched, one layer above */}
        <figure className="min-w-0">
          <div className="relative h-44">
            {/* the product, with no AI inside it at all */}
            <div className="border-border bg-background absolute inset-x-0 bottom-0 top-3 flex overflow-hidden rounded-lg border">
              <div className="border-border flex w-1/4 flex-col gap-2 border-r p-2.5">
                <Bar className="h-2 w-3/4" />
                <Bar className="h-2 w-2/3" />
                <Bar className="h-2 w-3/4" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-2.5">
                <div className="border-border rounded-md border p-2">
                  <Bar className="h-2 w-1/3" />
                  <Bar className="mt-2 h-2 w-5/6" />
                </div>
                <div className="border-border rounded-md border p-2">
                  <Bar className="h-2 w-1/2" />
                  <Bar className="mt-2 h-2 w-2/3" />
                </div>
              </div>
            </div>
            {/* the one presence, floating above everything */}
            <div className="border-primary/50 bg-background absolute right-3 -top-0.5 flex w-1/2 items-center gap-2 rounded-lg border px-2.5 py-2 shadow-sm">
              <span className="bg-primary size-2 shrink-0 rounded-full" />
              <Bar className="h-2 flex-1" />
              <span className="text-muted-foreground font-mono text-[9px]">⌘K</span>
            </div>
          </div>
          <figcaption className="text-muted-foreground mt-2 text-xs leading-relaxed">
            Ambient: the product carries no AI at all. One presence sits
            above it, sees where you are, and answers from anywhere.
          </figcaption>
        </figure>
      </div>
    </WireframeShell>
  )
}

/**
 * After §3: the context contract as a wireframe. The page declares what is
 * selected; the chip appears in the presence before you ask. Same token
 * palette as every diagram: border for strokes, muted for content, primary
 * for the layer and what it can see.
 */
function ContextDiagram() {
  return (
    <WireframeShell tag="diagram · the page declares, the layer knows" className="my-10">
      <div className="relative mx-auto h-48 max-w-md">
        {/* the product screen */}
        <div className="border-border bg-background absolute inset-x-0 top-6 bottom-0 flex flex-col gap-2.5 overflow-hidden rounded-lg border p-2.5">
          <Bar className="h-2 w-1/3" />
          <div className="border-border rounded-md border p-2">
            <Bar className="h-2 w-1/2" />
            <Bar className="mt-2 h-2 w-5/6" />
          </div>
          {/* the thing the user clicked — the page tells the layer */}
          <div className="border-primary/50 relative rounded-md border p-2">
            <span className="bg-background text-primary absolute -top-2 left-2 px-1 font-mono text-[9px] tracking-wide uppercase">
              selected
            </span>
            <Bar className="h-2 w-2/3" />
            <Bar className="mt-2 h-2 w-1/2" />
          </div>
        </div>
        {/* the presence, already carrying the page's chip */}
        <div className="border-primary/50 bg-background absolute right-2 top-0 flex w-2/3 items-center gap-2 rounded-lg border px-2.5 py-2 shadow-sm">
          <span className="bg-primary size-2 shrink-0 rounded-full" />
          <span className="border-border flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5">
            <span className="bg-primary/60 size-1.5 rounded-[2px]" />
            <span className="text-muted-foreground font-mono text-[9px] tracking-wide uppercase">
              selected
            </span>
          </span>
          <Bar className="h-2 flex-1" />
        </div>
      </div>
      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        The page declares what you are looking at; the layer wears it as a
        chip before you type a word. You can see exactly what the assistant
        sees — and you never re-explain where you are.
      </p>
    </WireframeShell>
  )
}

/**
 * After §9: the bounded configuration space, live. The left panel is not an
 * illustration of a config — it reads the ACTUAL saved Foundation values
 * this page is wearing right now, so the diagram can never drift from the
 * theme it explains.
 */
function ConfigDiagram() {
  const { config } = useFoundation()
  const knobs: [string, string][] = [
    ["Accent", config.accent],
    ["Gray", config.gray],
    ["Radius", `${config.radius}px`],
    ["Spacing", config.spacingGrid],
    ["Scaling", `${config.scaling}%`],
    ["Motion", config.motion.character],
  ]
  return (
    <WireframeShell tag="live · the configuration this page is wearing" className="my-10">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {/* the knobs — read from the saved Foundation, not written here */}
        <div className="border-border bg-background rounded-lg border p-3 sm:w-2/5">
          <p className="text-muted-foreground mb-2 font-mono text-[9px] tracking-widest uppercase">
            Foundation
          </p>
          <ul className="flex flex-col gap-1.5">
            {knobs.map(([label, value]) => (
              <li key={label} className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground text-xs">{label}</span>
                <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px] capitalize">
                  {value}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <span className="text-muted-foreground shrink-0 self-center font-mono text-xs">
          → save →
        </span>
        {/* everything downstream of one save */}
        <div className="border-border bg-background flex flex-1 flex-col gap-2.5 rounded-lg border p-3">
          <p className="text-muted-foreground font-mono text-[9px] tracking-widest uppercase">
            Every component
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium">
              Button
            </span>
            <span className="border-border text-muted-foreground rounded-md border px-3 py-1 text-xs">
              Input
            </span>
            <span className="border-border rounded-md border px-2 py-1">
              <Bar className="h-2 w-10" />
            </span>
            <span className="bg-muted flex h-5 w-9 items-center rounded-full p-0.5">
              <span className="bg-background size-4 rounded-full shadow-sm" />
            </span>
          </div>
          <Bar className="h-2 w-3/4" />
          <Bar className="h-2 w-1/2" />
        </div>
      </div>
      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        The values on the left are not an example — they are read live from
        the theme this page is rendered with. Save a different set and
        everything you are reading, this diagram included, restyles.
      </p>
    </WireframeShell>
  )
}

/**
 * After §12: the token pipeline. One master file, two projections — the
 * running product and the Figma variables — and no hand-copying anywhere.
 */
function PipelineDiagram() {
  return (
    <WireframeShell tag="diagram · one master, two projections" className="my-10">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {/* the master */}
        <div className="border-border bg-background rounded-lg border p-3 sm:w-1/3">
          <p className="mb-2 font-mono text-[10px]">tokens/tokens.json</p>
          <ul className="flex flex-col gap-1.5">
            {["palette", "roles", "radius", "type", "motion"].map((k) => (
              <li key={k} className="flex items-center gap-2">
                <span className="bg-primary/60 size-1.5 shrink-0 rounded-[2px]" />
                <span className="text-muted-foreground font-mono text-[10px]">{k}</span>
                <Bar className="h-1.5 flex-1" />
              </li>
            ))}
          </ul>
        </div>
        <span className="text-muted-foreground shrink-0 self-center font-mono text-xs">
          →
        </span>
        {/* the two projections */}
        <div className="flex flex-1 flex-col gap-3">
          <div className="border-border bg-background flex items-center gap-3 rounded-lg border p-2.5">
            <div className="border-border flex h-12 w-16 shrink-0 gap-1 rounded border p-1">
              <div className="border-border w-1/3 border-r pr-1">
                <Bar className="h-1 w-full" />
                <Bar className="mt-1 h-1 w-2/3" />
              </div>
              <div className="flex-1">
                <Bar className="h-1 w-full" />
                <Bar className="mt-1 h-1 w-3/4" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium">The running product</p>
              <p className="text-muted-foreground text-[10px] leading-relaxed">
                compiled to CSS variables on Save
              </p>
            </div>
          </div>
          <div className="border-border bg-background flex items-center gap-3 rounded-lg border p-2.5">
            <div className="border-border flex h-12 w-16 shrink-0 flex-col justify-center gap-1 rounded border p-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="bg-primary/60 size-1.5 shrink-0 rounded-[2px]" />
                  <Bar className="h-1 flex-1" />
                </span>
              ))}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium">The Figma variables</p>
              <p className="text-muted-foreground text-[10px] leading-relaxed">
                written by the sync — variables only, never components
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        Code is master. Designers and the running product read the same
        values, so a divergence is a bug with a location — not a meeting.
      </p>
    </WireframeShell>
  )
}

/** After §2: the shapes, opened for real on this page. */
function ShapesDemo() {
  const { setMode } = useAssistant()
  return (
    <WireframeShell tag="live · this page is the shell" className="my-10">
      <p className="text-muted-foreground text-sm leading-relaxed">
        The presence this section describes is running here. Press{" "}
        <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
          ⌘K
        </kbd>
        , drag the orb at the edge of this page, or open a shape:
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={() => setMode("spotlight")}>
          <Icon name="search" size={13} />
          Spotlight
        </Button>
        <Button variant="outline" size="sm" onClick={() => setMode("panel")}>
          Panel
        </Button>
        <Button variant="outline" size="sm" onClick={() => setMode("history")}>
          <Icon name="history" size={13} />
          History
        </Button>
      </div>
    </WireframeShell>
  )
}

/** After §4: an answer, composed from the real vocabulary, settled. */
function AnswerDemo() {
  return (
    <WireframeShell tag="demo · the answer vocabulary, settled" className="my-10">
      <div className="flex flex-col gap-4">
        <ReasoningPanel
          steps={[
            {
              title: "Reading the request",
              detail:
                "Drafts should survive a thread switch, so the state has to move out of the component.",
            },
            {
              title: "Locating the seam",
              detail:
                "The composer already receives its thread id; the draft store can key on it.",
            },
          ]}
          seconds={4}
          running={false}
          staged={false}
          defaultOpen
        />
        <ToolCall
          verb="Searched the docs"
          request={'{"query": "draft persistence"}'}
          result="3 matches, best hit /docs/runtime/drafts"
          staged={false}
          defaultOpen
        />
        <CodeDiff
          path="composer.tsx"
          staged={false}
          lines={[
            { sign: " ", text: "export function Composer() {" },
            { sign: " ", text: "  const threadId = useThreadId();" },
            { sign: "-", text: '  const [draft, setDraft] = useState("");' },
            { sign: "+", text: "  const draft = useDraft(threadId);" },
            { sign: " ", text: "  return (" },
          ]}
        />
        <ReferenceChips
          refs={[
            { label: "DESIGN.md · §8 The contract", icon: "document" },
            { label: "Response kit v0" },
          ]}
        />
      </div>
      <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
        Every block above is the real component from the ambient vocabulary,
        rendered settled. In the live layer they arrive staged: thinking,
        then evidence, then prose.
      </p>
    </WireframeShell>
  )
}

/** Which demo follows which section, matched on the section heading. */
const DEMOS: { match: RegExp; node: React.ReactNode }[] = [
  { match: /^## 1\. /, node: <EmbeddedVsAmbientDiagram /> },
  { match: /^## 2\. /, node: <ShapesDemo /> },
  { match: /^## 3\. /, node: <ContextDiagram /> },
  { match: /^## 4\. /, node: <AnswerDemo /> },
  { match: /^## 9\. /, node: <ConfigDiagram /> },
  { match: /^## 12\. /, node: <PipelineDiagram /> },
]

/* ---------------------------- the contents nav ---------------------------- */

/**
 * The paper's sixteen sections, divided by what each stretch is doing.
 * Groups name section NUMBERS, and the nav resolves them against the live
 * chunk split — so a renumbered paper drops a section from the nav loudly
 * instead of pointing it at the wrong prose.
 */
const NAV_GROUPS: { label: string; nums: number[] }[] = [
  { label: "The layer", nums: [1, 2, 3] },
  { label: "The answer", nums: [4, 5, 6] },
  { label: "The problem", nums: [7, 8] },
  { label: "The architecture", nums: [9, 10, 11] },
  { label: "The data layer", nums: [12, 13] },
  { label: "Take it", nums: [14, 15, 16] },
]

/** Which section heading is currently at the top of the reading line. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = React.useState<string | undefined>()
  React.useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      let current: string | undefined
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 140) current = id
      }
      setActive(current)
    }
    // the page scrolls inside a container, and scroll does not bubble —
    // capture catches it wherever it happens
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    document.addEventListener("scroll", onScroll, true)
    measure()
    return () => {
      document.removeEventListener("scroll", onScroll, true)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [ids])
  return active
}

type NavGroups = {
  label: string
  entries: { id: string; num: number; title: string }[]
}[]

/**
 * The contents: six groups as collapsibles. The group being read opens
 * itself; everything else stays folded, the way the reference's contents
 * rail works. Rendered twice — as the fixed column from lg up, and in flow
 * above the article on smaller screens.
 */
function PlaybookContents({
  groups,
  scrollTo,
  active,
  className,
}: {
  groups: NavGroups
  scrollTo: (id: string) => void
  active?: string
  className?: string
}) {
  // open = the group being read, unless the reader has toggled it herself —
  // derived, so the accordion follows the scroll without any state syncing
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>({})
  const activeGroup =
    groups.find((g) => g.entries.some((e) => e.id === active))?.label ??
    groups[0]?.label
  const isOpen = (label: string) => overrides[label] ?? label === activeGroup

  return (
    <div className={className}>
        {groups.map((g) => (
          <Collapsible
            key={g.label}
            open={isOpen(g.label)}
            onOpenChange={(v) => setOverrides((o) => ({ ...o, [g.label]: v }))}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between py-2.5 font-mono text-xs tracking-widest uppercase"
              >
                {g.label}
                <span
                  className={cn(
                    "transition-transform",
                    isOpen(g.label) && "rotate-180"
                  )}
                >
                  <Icon name="chevron-down" size={12} />
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mb-2">
                {g.entries.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(e.id)}
                      aria-current={active === e.id ? "true" : undefined}
                      className={cn(
                        "flex w-full items-baseline gap-2.5 py-1.5 text-start text-sm",
                        active === e.id
                          ? "text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="font-mono text-xs tabular-nums">
                        {String(e.num).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">{e.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ))}
      <button
        type="button"
        onClick={() => scrollTo("kit")}
        className="text-muted-foreground hover:text-foreground mt-2 flex w-full items-center justify-between py-2.5 font-mono text-xs tracking-widest uppercase"
      >
        The kit
        <Icon name="chevron-right" size={12} />
      </button>
    </div>
  )
}

/** The fixed contents column, lg and up. */
function PlaybookNav(props: {
  groups: NavGroups
  scrollTo: (id: string) => void
  active?: string
}) {
  return (
    <nav
      aria-label="Playbook contents"
      className="fixed top-0 bottom-0 left-0 hidden w-64 overflow-y-auto px-6 pt-24 pb-10 lg:block"
    >
      <button
        type="button"
        onClick={() => props.scrollTo("overview")}
        className="text-muted-foreground hover:text-foreground font-mono text-xs tracking-widest uppercase"
      >
        The playbook
      </button>
      <PlaybookContents {...props} className="mt-6" />
    </nav>
  )
}

/* ---------------------------------------------------------------- */

export function PlaybookView() {
  const { setPageIntel } = useAssistant()
  const { chunks, minutes } = usePaper()

  React.useEffect(() => {
    setPageIntel({
      suggestions: [
        "What is design architecture?",
        "How do the six shapes of the assistant work?",
        "How does the Figma sync keep one source of truth?",
      ],
      askPlaceholder: "Ask about the playbook…",
    })
    return () => setPageIntel(null)
  }, [setPageIntel])

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

  // resolve the nav's section numbers against the live chunk split
  const navGroups = React.useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        label: g.label,
        entries: g.nums.flatMap((num) => {
          const chunk = chunks.find((c) =>
            c.heading?.level === 2 ? c.heading.label.startsWith(`${num}. `) : false
          )
          return chunk
            ? [{ id: chunk.id, num, title: chunk.heading!.label.slice(`${num}. `.length) }]
            : []
        }),
      })),
    [chunks]
  )
  const sectionIds = React.useMemo(
    () => navGroups.flatMap((g) => g.entries.map((e) => e.id)),
    [navGroups]
  )
  const active = useActiveSection(sectionIds)

  return (
    <div className="ambient-grid relative min-h-full">
      <PlaybookNav groups={navGroups} scrollTo={scrollTo} active={active} />

      <div className="lg:pl-64">
        <div className="mx-auto w-full max-w-3xl px-6 pb-40">
        {/* hero — the paper's title block at display scale */}
        <header id="overview" className="scroll-mt-24 pt-10 sm:pt-16">
          <Reveal>
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              ambientui / the playbook · {minutes} min read
            </p>
            <h1 className="mt-6 text-6xl font-semibold tracking-tight text-balance sm:text-7xl">
              Design
              <br />
              Architecture
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
              What a design system has to become before an AI can build
              inside it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button onClick={() => scrollTo("part-1")}>Start reading</Button>
              <Button variant="ghost" onClick={() => scrollTo("kit")}>
                Take the kit
                <Icon name="chevron-down" size={14} />
              </Button>
            </div>
            <CommandLine
              className="mt-6"
              command="npx shadcn add https://lumenridge.github.io/ambientui/r/ambient-layer.json"
            />
          </Reveal>
        </header>

        {/* the contents, in flow, for screens without the fixed column */}
        <nav aria-label="Playbook contents" className="mt-12 lg:hidden">
          <PlaybookContents
            groups={navGroups}
            scrollTo={scrollTo}
            active={active}
          />
        </nav>

        <article className="mt-2">
          {chunks.map((chunk) => {
            const demo = DEMOS.find((d) => d.match.test(chunk.md))
            return (
              <React.Fragment key={chunk.id}>
                <Reveal id={chunk.id} className="scroll-mt-24">
                  <Markdown source={chunk.md} />
                </Reveal>
                {demo && <Reveal>{demo.node}</Reveal>}
              </React.Fragment>
            )
          })}
        </article>

        {/* the porting kit */}
        <section id="kit" className="mt-24 scroll-mt-24">
          <Reveal>
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              THE PORTING KIT
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Take it with you
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
              The governing documents, downloadable as the exact bytes this
              page renders. Hand them to an agent in another repository and
              it can rebuild what this article describes.
            </p>
          </Reveal>
          <Reveal className="mt-8">
            <div>
              {KIT.map((k) => (
                <DocDownload key={k.docId} {...k} />
              ))}
            </div>
          </Reveal>
          <Reveal className="mt-14">
            <WireframeShell tag="install">
              <h3 className="text-lg font-medium">Or take the whole thing</h3>
              <p className="text-muted-foreground mt-1 max-w-xl text-sm leading-relaxed">
                One component, the entire ambient layer, or the full design
                infrastructure — every path starts with one command, and
                everything it installs is source you own.
              </p>
              <CommandLine
                className="mt-4"
                command="npx shadcn add https://lumenridge.github.io/ambientui/r/ambient-layer.json"
              />
              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDoc("doc-readme")}
                >
                  Read the README
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDoc("doc-paper")}
                >
                  View this article at /ds
                  <Icon name="arrow-up-right" size={13} />
                </Button>
              </div>
            </WireframeShell>
          </Reveal>
        </section>
        </div>
      </div>
    </div>
  )
}
