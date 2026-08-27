import * as React from "react"

import { motion } from "framer-motion"

import { Button } from "@ambientui/ui/components/button"
import { Icon, type IconName } from "@ambientui/ui/components/icon"
import { SectionRail } from "@ambientui/ui/components/section-rail"
import { useMotionSpring, useMotionTransition } from "@ambientui/foundation"
import { useAssistant } from "ambientui/assistant-context"

import { CommandLine } from "@/components/command-line"
import { SYSTEM_DOCS } from "@/components/ds/system-docs"
import { DS_PARAM } from "@/ds-route"
import { withBase } from "@/base"

/**
 * THE PLAYBOOK — the front door, structured like a guide someone reads top
 * to bottom: a hero, a framing paragraph, numbered parts, and a porting kit.
 *
 * IT IS BUILT FROM THE SYSTEM IT EXPLAINS, deliberately. The reference this
 * page answers (a playbook-style guide site) was translated per the primary
 * rule, never cloned: its left TOC became our SectionRail (the system's own
 * in-page nav), its serif display became our configured type at the top of
 * the Tailwind scale, its ground became the ambient engineering grid, and
 * its per-entry pages became the real documents at /ds, rendered from their
 * actual bytes. Every control is vocabulary: Button, CommandLine, Icon,
 * SectionRail.
 *
 * IT IS INTERACTIVE THROUGH THE REAL LAYER, not through mockups: the try
 * buttons call setMode on the live assistant, and the page declares its
 * intel so the quick-ask suggestion is about the playbook.
 *
 * Two local compositions, kept local on purpose (watchlist, DESIGN.md §13):
 * - `Reveal` — a whileInView wrapper on the surface role, so sections land
 *   as the reader arrives. Not promoted: this page is its only consumer.
 * - `DocDownload` — a Button that hands the visitor the governing file
 *   itself, built from the same ?raw bytes /ds renders. No copy to rot.
 */

/* One entry in a part: number · title · description · where it lives. */
type Entry = {
  n: string
  title: string
  desc: string
  /** The paper section (or doc) this entry opens at /ds. */
  ref: string
  docId: string
  try_?: { label: string; icon?: IconName; run: (a: TryApi) => void }[]
}
type TryApi = { setMode: (m: "spotlight" | "panel" | "history") => void }

type Part = {
  id: string
  part: string
  title: string
  lede: string
  entries: Entry[]
}

const PARTS: Part[] = [
  {
    id: "part-1",
    part: "PART 1",
    title: "The layer",
    lede: "An AI assistant that lives above the product instead of inside it. It is running on this page right now.",
    entries: [
      {
        n: "00",
        title: "AI does not belong inside your interface",
        desc: "A chat tab, a sparkle button, an assistant page: each treats AI as a feature among features, and each fragments it. The claim that starts everything: the AI is a layer above the product, a presence rather than a destination.",
        ref: "§1",
        docId: "doc-paper",
      },
      {
        n: "01",
        title: "One presence, six shapes",
        desc: "Orb, quick ask, panel, dock, spotlight, history. Not six features: one thing changing geometry to match how much of your attention the moment deserves. Try them on this page.",
        ref: "§2",
        docId: "doc-paper",
        try_: [
          { label: "Spotlight", icon: "search", run: (a) => a.setMode("spotlight") },
          { label: "Panel", run: (a) => a.setMode("panel") },
          { label: "History", icon: "history", run: (a) => a.setMode("history") },
        ],
      },
      {
        n: "02",
        title: "It already knows where you are",
        desc: "Pages declare their context; you never re-explain it. The chip in the assistant's composer names this page because this page told it to. Ask the orb what the playbook is.",
        ref: "§3",
        docId: "doc-paper",
      },
      {
        n: "03",
        title: "Every answer is built from components",
        desc: "Diffs you review hunk by hunk, terminals with exit codes, reports whose outlines fill in. A model fills the structure; it never invents it.",
        ref: "§4",
        docId: "doc-paper",
      },
      {
        n: "04",
        title: "A layer with no look of its own",
        desc: "No palette, no type scale, no motion of its own. Change this product's accent and the assistant follows, because it was never carrying one.",
        ref: "§5–6",
        docId: "doc-paper",
      },
    ],
  },
  {
    id: "part-2",
    part: "PART 2",
    title: "The architecture",
    lede: "Why generated interfaces become slop, and the structure that makes drift impossible to express.",
    entries: [
      {
        n: "05",
        title: "Drift, or how interfaces become slop",
        desc: "Values invented at the moment of generation, connected to nothing. A hundred small design systems that happen to sit next to each other. Documentation is advice, and advice cannot constrain a generator.",
        ref: "§7–8",
        docId: "doc-paper",
      },
      {
        n: "06",
        title: "The bounded configuration space",
        desc: "Scales of record, roles over values, references answered by configuration, propagation as a guarantee, and the docs as the control surface. Six moves, each one earned by failing first in a softer form.",
        ref: "§9",
        docId: "doc-paper",
      },
      {
        n: "07",
        title: "The anatomy",
        desc: "The architecture as actual files: one value store, one compiler, two vocabularies, a registry the distribution is generated from, and a gate that turns drift into a red build.",
        ref: "§10",
        docId: "doc-paper",
      },
      {
        n: "08",
        title: "Building without drift",
        desc: "Every opening an unattached value could enter through, closed one at a time — including the generator itself, which works here as a governed contributor with a constitution, not a free hand with a catalog.",
        ref: "§11",
        docId: "doc-paper",
      },
    ],
  },
  {
    id: "part-3",
    part: "PART 3",
    title: "One source of truth",
    lede: "The token pipeline that makes the codebase and the Figma file two projections of the same data.",
    entries: [
      {
        n: "09",
        title: "The data layer",
        desc: "Primitives, semantic roles, components: the same three layers in code and in Figma, synced by rule. Changing this system's accent was six alias edits; both environments re-themed and zero components were touched.",
        ref: "§12",
        docId: "doc-paper",
      },
      {
        n: "10",
        title: "What it buys design, engineering, and speed",
        desc: "Designers experiment against the variables the product runs on. Handoff becomes a diff, not a meeting. A new product starts from a fork, and fifty interfaces are one system with fifty configurations.",
        ref: "§13",
        docId: "doc-paper",
      },
      {
        n: "11",
        title: "Where it breaks anyway",
        desc: "Cascade layers beating specificity, tokens that are not strings, state in stale closures. The failures live in the seams, and they are recorded because they were the most informative part.",
        ref: "§14",
        docId: "doc-paper",
      },
    ],
  },
]

/** The porting kit: the governing files themselves, downloadable. */
const KIT: { docId: string; blurb: string }[] = [
  { docId: "doc-paper", blurb: "The whole argument, both parts." },
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
}: {
  children: React.ReactNode
  className?: string
}) {
  const spring = useMotionSpring()
  const micro = useMotionTransition("micro")
  return (
    <motion.div
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

function EntryRow({ entry }: { entry: Entry }) {
  const { setMode } = useAssistant()
  return (
    <div className="border-border group border-t py-6 first:border-t-0">
      <button
        type="button"
        onClick={() => openDoc(entry.docId)}
        className="flex w-full items-start gap-5 text-start"
      >
        <span className="text-muted-foreground pt-0.5 font-mono text-sm tabular-nums">
          {entry.n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-3">
            <span className="text-base font-medium group-hover:underline">
              {entry.title}
            </span>
            <span className="text-muted-foreground ms-auto shrink-0 font-mono text-xs">
              {entry.ref}
            </span>
          </span>
          <span className="text-muted-foreground mt-1 block max-w-2xl text-sm leading-relaxed">
            {entry.desc}
          </span>
        </span>
      </button>
      {entry.try_ && (
        <div className="mt-3 flex items-center gap-1.5 ps-10">
          <span className="text-muted-foreground me-1 font-mono text-xs">
            try
          </span>
          {entry.try_.map((t) => (
            <Button
              key={t.label}
              variant="outline"
              size="sm"
              onClick={() => t.run({ setMode })}
            >
              {t.icon && <Icon name={t.icon} size={13} />}
              {t.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- */

export function PlaybookView() {
  const { setPageIntel } = useAssistant()

  // what this page invites the assistant to be asked
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

  return (
    <div className="ambient-grid relative min-h-full">
      <SectionRail
        sections={[
          { id: "overview", label: "Overview" },
          { id: "part-1", label: "The layer" },
          { id: "part-2", label: "Architecture" },
          { id: "part-3", label: "One truth" },
          { id: "kit", label: "The kit" },
        ]}
      />

      <div className="mx-auto w-full max-w-3xl px-6 pb-40">
        {/* hero */}
        <header id="overview" className="scroll-mt-24 pt-10 sm:pt-16">
          <Reveal>
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              ambientui / the playbook
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
              <Button onClick={() => scrollTo("part-1")}>Get started</Button>
              <Button variant="ghost" onClick={() => scrollTo("kit")}>
                Take the kit
                <Icon name="chevron-down" size={14} />
              </Button>
            </div>
            <CommandLine
              className="mt-6 max-w-xl"
              command="npx shadcn add https://lumenridge.github.io/ambientui/r/ambient-layer.json"
            />
          </Reveal>

          <Reveal className="mt-14">
            <p className="border-border max-w-2xl border-t pt-8 text-base leading-relaxed">
              AI can produce interfaces faster than anyone can audit them,
              and what it produces is unattached: every value an invention,
              answerable to nothing. This playbook is the structure that
              fixes that, in the order it has to be built — and the page you
              are reading is made of it. The grid behind this text is the
              system&apos;s engineering ground, the type is its configured
              scale, and the assistant is already here.{" "}
              <span className="text-muted-foreground">
                Press{" "}
                <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                  ⌘K
                </kbd>{" "}
                — or drag the orb.
              </span>
            </p>
          </Reveal>
        </header>

        {/* parts */}
        {PARTS.map((part) => (
          <section
            key={part.id}
            id={part.id}
            className="mt-24 scroll-mt-24"
          >
            <Reveal>
              <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                {part.part}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                {part.title}
              </h2>
              <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
                {part.lede}
              </p>
            </Reveal>
            <Reveal className="mt-8">
              <div>
                {part.entries.map((e) => (
                  <EntryRow key={e.n} entry={e} />
                ))}
              </div>
            </Reveal>
          </section>
        ))}

        {/* the porting kit */}
        <section id="kit" className="mt-24 scroll-mt-24">
          <Reveal>
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              PART 4
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              The porting kit
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
              The governing documents, downloadable as the exact bytes this
              site renders. Hand them to an agent in another repository and
              it can rebuild what this page describes.
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
            <div className="border-border rounded-2xl border p-6">
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
                <Button variant="outline" size="sm" onClick={() => openDoc("doc-readme")}>
                  Read the README
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDoc("doc-paper")}
                >
                  Open the paper at /ds
                  <Icon name="arrow-up-right" size={13} />
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  )
}
