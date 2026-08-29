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
import {
  SBar,
  SDot,
  SLead,
  SLink,
  SNode,
  SScreen,
  SText,
  Schematic,
} from "@/components/home/schematic-kit"
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

/** /ds with no selection IS the Foundation — the setup this paper argues for. */
const openFoundation = () => {
  window.history.pushState(null, "", withBase("/ds"))
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
    let title = "The playbook"
    const subtitleLines: string[] = []
    if (lines[0]?.startsWith("# ")) {
      title = lines[0].slice(2)
      start = 1
      while (lines[start] === "") start++
      if (lines[start]?.startsWith("**")) {
        // the bold subtitle block, possibly wrapped over lines
        while (lines[start] && lines[start] !== "") {
          subtitleLines.push(lines[start])
          start++
        }
        while (lines[start] === "") start++
      }
    }
    const subtitle = subtitleLines.join(" ").replace(/\*\*/g, "")
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
    return { chunks, title, subtitle, minutes: Math.max(1, Math.round(words / 220)) }
  }, [])
}

/* --------------------------- the shell demos --------------------------- */

/** A wireframe placeholder bar — the diagram's stand-in for content. */
function Bar({ className }: { className?: string }) {
  return <span className={cn("bg-muted block rounded-sm", className)} />
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
        {/* the common way: three AI features, fragmented, each annotated */}
        <figure className="min-w-0">
          <Schematic viewBox="0 0 360 210" label="Embedded AI: three disconnected features">
            <SScreen x={14} y={26} w={250} h={170} />
            <SLink x1={78} y1={32} x2={78} y2={190} bend={0} />
            {/* sidebar with the chat tab */}
            <SBar x={26} y={44} w={40} />
            <SBar x={26} y={58} w={32} />
            <SDot x={32} y={82} accent />
            <SBar x={40} y={79} w={26} />
            <SBar x={26} y={96} w={36} />
            {/* two features, each wearing its own sparkle */}
            <SScreen x={92} y={44} w={150} h={38} rx={4} />
            <SBar x={102} y={56} w={50} />
            <SBar x={102} y={66} w={90} />
            <SDot x={228} y={56} accent />
            <SScreen x={92} y={94} w={150} h={38} rx={4} />
            <SBar x={102} y={106} w={60} />
            <SBar x={102} y={116} w={80} />
            <SDot x={228} y={106} accent />
            {/* the assistant panel that is really another page */}
            <SScreen x={92} y={146} w={150} h={36} rx={4} dashed accent />
            <SDot x={104} y={164} accent />
            {/* leader annotations, reference-style */}
            <SLead x1={32} y1={82} x2={296} y2={36} label="chat tab" accent />
            <SLead x1={228} y1={56} x2={296} y2={66} label="sparkle" accent />
            <SLead x1={228} y1={106} x2={296} y2={106} label="sparkle" accent />
            <SLead x1={168} y1={164} x2={296} y2={152} label="panel" accent />
          </Schematic>
          <figcaption className="text-muted-foreground mt-2 text-xs leading-relaxed">
            Embedded: the AI three times over — a chat tab, sparkle buttons,
            a panel — none of them knowing what the others did.
          </figcaption>
        </figure>

        {/* the ambient claim: the product untouched, one layer above */}
        <figure className="min-w-0">
          <Schematic viewBox="0 0 360 210" label="Ambient: one presence above an untouched product">
            {/* the product, with no AI inside it at all */}
            <SScreen x={14} y={54} w={250} h={142} />
            <SLink x1={78} y1={60} x2={78} y2={190} bend={0} />
            <SBar x={26} y={72} w={40} />
            <SBar x={26} y={86} w={32} />
            <SBar x={26} y={100} w={36} />
            <SScreen x={92} y={72} w={150} h={38} rx={4} />
            <SBar x={102} y={84} w={50} />
            <SBar x={102} y={94} w={90} />
            <SScreen x={92} y={122} w={150} h={38} rx={4} />
            <SBar x={102} y={134} w={60} />
            <SBar x={102} y={144} w={80} />
            {/* the one presence, floating above the screen's edge */}
            <SScreen x={120} y={14} w={180} h={30} rx={15} accent />
            <SDot x={138} y={29} r={4.5} accent />
            <SBar x={150} y={26} w={100} />
            <SText x={288} y={32} anchor="end" size={7} muted>
              ⌘K
            </SText>
            <SLead x1={118} y1={29} x2={100} y2={29} label="one presence" anchor="end" accent />
            {/* the page's context flowing up into it */}
            <SDot x={242} y={91} accent />
            <SLink x1={242} y1={91} x2={252} y2={44} bend={0.7} dashed accent />
          </Schematic>
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
 * After §9: the bounded configuration space, live and drawn with the kit.
 * The knob values on the left are not an illustration — they read the
 * ACTUAL saved Foundation via useFoundation(), so the schematic can never
 * drift from the theme it explains. Save flows the knobs through the
 * Foundation into every component.
 */
function ConfigDiagram() {
  const { config } = useFoundation()
  const knobs: [string, string][] = [
    ["accent", config.accent],
    ["gray", config.gray],
    ["radius", `${config.radius}px`],
    ["spacing", config.spacingGrid],
    ["scaling", `${config.scaling}%`],
    ["motion", config.motion.character],
  ]
  const ysIn = [35, 70, 105, 140, 175, 210]
  const ysOut = [47, 87, 127, 167, 207]
  const out = ["button", "input", "card", "toggle", "orb"]
  return (
    <WireframeShell tag="live · the configuration this page is wearing" className="my-10">
      <Schematic
        viewBox="0 0 720 250"
        label="The saved Foundation configuration flowing through save into every component"
        className="w-full"
      >
        {/* the six knobs, values read live from the saved theme */}
        {knobs.map(([label, value], i) => (
          <g key={label}>
            <SText x={64} y={ysIn[i] + 2.5} anchor="end" muted>
              {label}
            </SText>
            <SText x={72} y={ysIn[i] + 2.5}>{value}</SText>
            <SDot x={175} y={ysIn[i]} />
            <SLink x1={175} y1={ysIn[i]} x2={261} y2={127} bend={0.6} />
          </g>
        ))}
        <SNode x={300} y={127} r={40} lines={["foundation"]} />
        <SText x={300} y={184} anchor="middle" size={7} muted>
          one place, one save
        </SText>

        {/* the commit point */}
        <SLink x1={340} y1={127} x2={450} y2={127} bend={0} />
        <SDot x={395} y={127} accent />
        <SLead x1={395} y1={120} x2={395} y2={86} label="save" accent />

        <SNode x={490} y={127} r={40} lines={["every", "component"]} />
        <SText x={490} y={184} anchor="middle" size={7} muted>
          nothing opts out
        </SText>

        {/* everything downstream */}
        {out.map((k, i) => (
          <g key={k}>
            <SLink x1={530} y1={127} x2={640} y2={ysOut[i]} bend={0.6} />
            <SDot x={640} y={ysOut[i]} />
            <SText x={650} y={ysOut[i] + 2.5} muted>
              {k}
            </SText>
          </g>
        ))}
      </Schematic>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
          The values on the left are not an example — they are read live
          from the theme this page is rendered with. Save a different set
          and everything you are reading, this diagram included, restyles.
        </p>
        <Button variant="outline" size="sm" onClick={openFoundation}>
          <Icon name="sliders" size={13} />
          Set up your Foundation
        </Button>
      </div>
    </WireframeShell>
  )
}

/**
 * After §12: one master, two projections — drawn with the schematic kit.
 * The token file's keys fan into the master station; the flow splits at a
 * waypoint into the two projections, compile (to the running product) and
 * sync (to the Figma variables), each drawn as a small wireframe.
 */
function PipelineDiagram() {
  const keys = ["palette", "roles", "radius", "type", "motion"]
  const ys = [55, 85, 115, 145, 175]
  return (
    <WireframeShell tag="diagram · one master, two projections" className="my-10">
      <Schematic
        viewBox="0 0 720 240"
        label="One master, two projections: tokens.json compiled to the product and synced to Figma"
        className="w-full"
      >
        {/* the master's keys, fanning in */}
        {keys.map((k, i) => (
          <g key={k}>
            <SText x={70} y={ys[i] + 2.5} anchor="end" muted>
              {k}
            </SText>
            <SDot x={80} y={ys[i]} />
            <SLink x1={80} y1={ys[i]} x2={138} y2={115} bend={0.6} />
          </g>
        ))}
        <SNode x={177} y={115} r={39} lines={["tokens/", "tokens.json"]} />
        <SText x={177} y={170} anchor="middle" size={7} muted>
          the one master
        </SText>

        {/* the split */}
        <SLink x1={216} y1={115} x2={300} y2={115} bend={0} />
        <SDot x={300} y={115} ring />

        {/* projection one: compiled into the running product */}
        <SLink x1={300} y1={115} x2={416} y2={65} bend={0.6} />
        <SText x={352} y={72} size={7} accent>
          compile · on save
        </SText>
        <SScreen x={420} y={30} w={116} h={70} />
        <SLink x1={452} y1={36} x2={452} y2={94} bend={0} />
        <SBar x={428} y={44} w={16} h={3} />
        <SBar x={428} y={54} w={12} h={3} />
        <SScreen x={460} y={42} w={64} h={20} rx={3} />
        <SBar x={466} y={49} w={30} h={3} />
        <SScreen x={460} y={68} w={64} h={20} rx={3} />
        <SBar x={466} y={75} w={38} h={3} />
        <SText x={552} y={60}>the running product</SText>
        <SText x={552} y={73} size={7} muted>
          css variables, per save
        </SText>

        {/* projection two: synced into the Figma variables */}
        <SLink x1={300} y1={115} x2={416} y2={165} bend={0.6} />
        <SText x={352} y={162} size={7} accent>
          sync
        </SText>
        <SScreen x={420} y={130} w={116} h={70} />
        {[146, 160, 174].map((y) => (
          <g key={y}>
            <SDot x={434} y={y} r={2} accent />
            <SBar x={442} y={y - 1.5} w={60} h={3} />
          </g>
        ))}
        <SText x={552} y={160}>the figma variables</SText>
        <SText x={552} y={173} size={7} muted>
          variables only, never components
        </SText>
      </Schematic>
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

/**
 * §12's three-layer pipeline, drawn as a flow schematic instead of the
 * paper's ascii block: the scales fan into primitives, roles alias the
 * primitives with the save as the commit point, and components fan out
 * binding roles only. Same statement as the ascii, drawn in line-work.
 */
const PIPE_IN = ["palette", "spacing", "type", "radius", "motion"]
const PIPE_OUT = ["button", "input", "card", "panel", "orb"]

function PipelineSchematic() {
  const ys = [45, 85, 125, 165, 205]
  return (
    <Schematic
      viewBox="0 0 720 250"
      label="The token pipeline: scales into primitives, roles alias primitives, components bind roles"
      className="my-6 w-full"
    >
      {/* the scales of record, fanning in */}
      {PIPE_IN.map((k, i) => (
        <g key={k}>
          <SText x={70} y={ys[i] + 2.5} anchor="end" muted>
            {k}
          </SText>
          <SDot x={80} y={ys[i]} />
          <SLink x1={80} y1={ys[i]} x2={169} y2={125} bend={0.6} />
        </g>
      ))}
      <SNode x={205} y={125} lines={["primitives"]} />
      <SText x={205} y={176} anchor="middle" size={7} muted>
        the scales of record
      </SText>
      <SText x={205} y={186} anchor="middle" size={7} muted>
        verbatim, never bent
      </SText>

      <SLink x1={241} y1={125} x2={349} y2={125} bend={0} />
      <SDot x={295} y={125} ring />

      <SNode x={385} y={125} lines={["semantic", "roles"]} />
      <SText x={385} y={176} anchor="middle" size={7} muted>
        aliases into the primitives
      </SText>
      <SText x={385} y={186} anchor="middle" size={7} muted>
        chosen by the saved config
      </SText>

      {/* the commit point */}
      <SLink x1={421} y1={125} x2={529} y2={125} bend={0} />
      <SDot x={475} y={125} accent />
      <SLead x1={475} y1={118} x2={475} y2={82} label="save" anchor="start" accent />

      <SNode x={565} y={125} lines={["components"]} />
      <SText x={565} y={176} anchor="middle" size={7} muted>
        bind roles only
      </SText>
      <SText x={565} y={186} anchor="middle" size={7} muted>
        never primitives
      </SText>

      {/* everything downstream, fanning out */}
      {PIPE_OUT.map((k, i) => (
        <g key={k}>
          <SLink x1={601} y1={125} x2={660} y2={ys[i]} bend={0.6} />
          <SDot x={660} y={ys[i]} />
          <SText x={670} y={ys[i] + 2.5} muted>
            {k}
          </SText>
        </g>
      ))}
    </Schematic>
  )
}

/**
 * §12 renders with the ascii pipeline block swapped for the schematic.
 * Everything else in the section is the paper's bytes, untouched.
 */
function TokenPipelineSection({ md }: { md: string }) {
  const parts = md.split("```")
  return (
    <>
      <Markdown source={parts[0].trim()} />
      <PipelineSchematic />
      <Markdown source={parts.slice(2).join("```").trim()} />
    </>
  )
}

/* ------------------------ the anatomy as cards ------------------------ */

const GITHUB = "https://github.com/Lumenridge/ambientui"

/**
 * Resolve a File cell from the anatomy table to a GitHub URL. Directories
 * get tree links, files get blob links; the two rows whose cells are not a
 * clean path (the elided ds-docs path, the gate) carry explicit targets.
 */
function anatomyHref(cell: string): string | null {
  if (cell.includes("…")) return `${GITHUB}/blob/main/apps/web/src/components/ds/ds-docs.tsx`
  if (cell.startsWith("The gate")) return `${GITHUB}/blob/main/package.json`
  const path = cell.match(/`([^`]+)`/)?.[1]
  if (!path) return null
  const clean = path.replace(/\/$/, "")
  const isDir = path.endsWith("/") || !clean.split("/").pop()?.includes(".")
  return `${GITHUB}/${isDir ? "tree" : "blob"}/main/${clean}`
}

/**
 * §10's File/Job table, rendered as cards instead of rows — but DERIVED
 * from the table's own bytes in the paper, never written here. Each card:
 * the job's first sentence as its name, the path in mono, the rest of the
 * job as the description, and the file on GitHub one click away. Edit the
 * table in PAPER.md and the cards follow; there is no second copy.
 */
function AnatomySection({ md }: { md: string }) {
  const lines = md.split("\n")
  const first = lines.findIndex((l) => l.startsWith("|"))
  let last = first
  while (last < lines.length && lines[last].startsWith("|")) last++
  const before = lines.slice(0, first).join("\n").trim()
  const after = lines.slice(last).join("\n").trim()
  const rows = lines
    .slice(first + 2, last) // skip header + divider
    .map((l) => l.split("|").map((c) => c.trim()))
    .filter((c) => c.length >= 3)
    .map(([, file, job]) => {
      // the job's lead — up to the first ". " or ": " — names the card
      const cut = [job.indexOf(". "), job.indexOf(": ")]
        .filter((i) => i > 0)
        .sort((a, b) => a - b)[0]
      const rest = cut ? job.slice(cut + 2) : ""
      return {
        file,
        title: cut ? job.slice(0, cut) : job,
        desc: rest ? rest[0].toUpperCase() + rest.slice(1) : "",
        href: anatomyHref(file),
        path: file.match(/`([^`]+)`/)?.[1] ?? file,
      }
    })
  return (
    <>
      <Markdown source={before} />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div
            key={r.path}
            className="border-border bg-card flex flex-col gap-1.5 rounded-xl border p-4"
          >
            <p className="text-sm font-medium">{r.title}</p>
            <p className="text-muted-foreground truncate font-mono text-xs">
              {r.path}
            </p>
            {r.desc && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {r.desc}
              </p>
            )}
            {r.href && (
              <a
                href={r.href}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground mt-auto flex items-center gap-1 pt-2 text-xs font-medium"
              >
                View on GitHub
                <Icon name="arrow-up-right" size={12} />
              </a>
            )}
          </div>
        ))}
      </div>
      {after && <Markdown source={after} className="mt-8" />}
    </>
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
 * The paper's two parts, each holding its groups of sections — the page's
 * top-level division: the philosophy (Ambient UI), then the structure
 * (Design Architecture). Groups name section NUMBERS, and the nav resolves
 * them against the live chunk split — so a renumbered paper drops a section
 * from the nav loudly instead of pointing it at the wrong prose.
 */
const NAV_PARTS: {
  id: string
  part: string
  title: string
  groups: { label: string; nums: number[] }[]
}[] = [
  {
    id: "part-1",
    part: "Part I",
    title: "Ambient UI",
    groups: [
      { label: "A presence above the product", nums: [1, 2, 3] },
      { label: "Answers made of your UI", nums: [4, 5, 6] },
    ],
  },
  {
    id: "part-2",
    part: "Part II",
    title: "Design Architecture",
    groups: [
      { label: "Name the enemy: drift", nums: [7, 8] },
      { label: "Bound the design space", nums: [9, 10, 11] },
      { label: "One source of truth", nums: [12, 13] },
      { label: "Make it yours", nums: [14, 15, 16] },
    ],
  },
]

/** What each part gets you — the one-line frame under its divider. */
const PART_INTRO: Record<string, string> = {
  "part-1":
    "What you ship: an assistant that lives above your product, wears your design system, and answers with real components.",
  "part-2":
    "How you get there: four steps that turn a design system into something a generator can build inside without drifting.",
}

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

type NavPart = {
  id: string
  part: string
  title: string
  groups: { label: string; entries: { id: string; num: number; title: string }[] }[]
}

/**
 * The contents: the two parts as headers, their groups as collapsibles.
 * The group being read opens itself; everything else stays folded, the way
 * the reference's contents rail works. Rendered twice — as the fixed column
 * from lg up, and in flow above the article on smaller screens.
 */
function PlaybookContents({
  parts,
  scrollTo,
  active,
  className,
}: {
  parts: NavPart[]
  scrollTo: (id: string) => void
  active?: string
  className?: string
}) {
  const groups = parts.flatMap((p) => p.groups)
  // open = the group being read, unless the reader has toggled it herself —
  // derived, so the accordion follows the scroll without any state syncing
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>({})
  const activeGroup =
    groups.find((g) => g.entries.some((e) => e.id === active))?.label ??
    groups[0]?.label
  const isOpen = (label: string) => overrides[label] ?? label === activeGroup
  const activePart = parts.find((p) =>
    p.groups.some((g) => g.entries.some((e) => e.id === active))
  )?.id

  return (
    <div className={className}>
      {parts.map((p) => (
        <div key={p.id} className="mb-5">
          <button
            type="button"
            onClick={() => scrollTo(p.id)}
            className={cn(
              "hover:text-foreground w-full py-1.5 text-start",
              activePart === p.id ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <span className="font-mono text-[10px] tracking-widest uppercase">
              {p.part}
            </span>
            <span className="mt-0.5 block text-sm font-semibold">{p.title}</span>
          </button>
          <div className="border-border mt-1 border-s ps-3">
        {p.groups.map((g) => (
          <Collapsible
            key={g.label}
            open={isOpen(g.label)}
            onOpenChange={(v) => setOverrides((o) => ({ ...o, [g.label]: v }))}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-2 py-2 text-sm font-medium"
              >
                <span className="truncate">{g.label}</span>
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
          </div>
        </div>
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
  parts: NavPart[]
  scrollTo: (id: string) => void
  active?: string
}) {
  return (
    <nav
      aria-label="Playbook contents"
      className="fixed top-0 bottom-0 left-0 hidden w-72 overflow-y-auto px-6 pt-24 pb-10 lg:block"
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
  const { chunks, title, subtitle, minutes } = usePaper()

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
  const navParts = React.useMemo(
    () =>
      NAV_PARTS.map((p) => ({
        ...p,
        groups: p.groups.map((g) => ({
          label: g.label,
          entries: g.nums.flatMap((num) => {
            const chunk = chunks.find((c) =>
              c.heading?.level === 2
                ? c.heading.label.startsWith(`${num}. `)
                : false
            )
            return chunk
              ? [
                  {
                    id: chunk.id,
                    num,
                    title: chunk.heading!.label.slice(`${num}. `.length),
                  },
                ]
              : []
          }),
        })),
      })),
    [chunks]
  )
  const sectionIds = React.useMemo(
    () =>
      navParts.flatMap((p) =>
        p.groups.flatMap((g) => g.entries.map((e) => e.id))
      ),
    [navParts]
  )
  const active = useActiveSection(sectionIds)

  return (
    <div className="ambient-grid relative min-h-full">
      <PlaybookNav parts={navParts} scrollTo={scrollTo} active={active} />

      <div className="lg:pl-72">
        <div className="mx-auto w-full max-w-3xl px-6 pb-40">
        {/* hero — the paper's title block at display scale */}
        <header id="overview" className="scroll-mt-24 pt-10 sm:pt-16">
          <Reveal>
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              ambientui / the playbook · {minutes} min read
            </p>
            <h1 className="mt-6 text-6xl font-semibold tracking-tight text-balance sm:text-7xl">
              {title}
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
              {subtitle}
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
            parts={navParts}
            scrollTo={scrollTo}
            active={active}
          />
        </nav>

        <article className="mt-2">
          {chunks.map((chunk) => {
            // a part boundary renders as a designed chapter break; any prose
            // in the part chunk (the philosophy under Part I) follows it
            if (chunk.heading?.level === 1) {
              const m = chunk.heading.label.match(/^(Part [IVX]+):\s*(.*)$/)
              const prose = chunk.md.split("\n").slice(1).join("\n").trim()
              return (
                <Reveal key={chunk.id} id={chunk.id} className="scroll-mt-24">
                  <div className="border-border mt-20 border-t pt-12">
                    <p className="text-primary font-mono text-xs tracking-widest uppercase">
                      {m?.[1] ?? chunk.heading.label}
                    </p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                      {m?.[2] ?? ""}
                    </h2>
                    {PART_INTRO[chunk.id] && (
                      <p className="text-muted-foreground mt-4 max-w-xl text-base leading-relaxed">
                        {PART_INTRO[chunk.id]}
                      </p>
                    )}
                    {/* Part II is the framework — show its steps up front */}
                    {chunk.id === "part-2" && (
                      <ol className="mt-6 flex flex-col gap-1.5">
                        {navParts
                          .find((p) => p.id === "part-2")
                          ?.groups.map((g, i) => (
                            <li key={g.label}>
                              <button
                                type="button"
                                onClick={() =>
                                  g.entries[0] && scrollTo(g.entries[0].id)
                                }
                                className="text-muted-foreground hover:text-foreground flex items-baseline gap-2.5 text-sm"
                              >
                                <span className="text-primary font-mono text-xs tabular-nums">
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                {g.label}
                              </button>
                            </li>
                          ))}
                      </ol>
                    )}
                    {prose && <Markdown source={prose} className="mt-6" />}
                  </div>
                </Reveal>
              )
            }
            const demo = DEMOS.find((d) => d.match.test(chunk.md))
            // two sections carry richer presentations of their own bytes:
            // §10's table as cards, §12's ascii pipeline as a schematic
            const isAnatomy = /^## 10\. /.test(chunk.md)
            const isPipeline = /^## 12\. /.test(chunk.md)
            return (
              <React.Fragment key={chunk.id}>
                <Reveal id={chunk.id} className="scroll-mt-24">
                  {isAnatomy ? (
                    <AnatomySection md={chunk.md} />
                  ) : isPipeline ? (
                    <TokenPipelineSection md={chunk.md} />
                  ) : (
                    <Markdown source={chunk.md} />
                  )}
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
