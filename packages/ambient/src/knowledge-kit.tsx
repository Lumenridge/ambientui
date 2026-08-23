import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { Icon } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"

import { useMotionTransition } from "./ambient-runtime"

import { StageSkeleton, StagedItem } from "./staging"
import { StreamingText } from "./streaming-text"
import { useElapsedSeconds, useStagedReveal } from "./use-staged-reveal"

/**
 * THE KNOWLEDGE KIT — where an answer came from.
 *
 * ReferenceChips already answers "what grounded this reply" at the end. These
 * three go further in: what was searched and read as it happened, which
 * SENTENCE rests on which source, and how a long report accumulates.
 *
 * The rule they share: PROVENANCE IS SHOWN, NEVER IMPLIED. A source appears
 * because it was actually read, a citation marks the specific claim it
 * supports, and a section that has not been written yet says so rather than
 * rendering an empty confident heading.
 */

/* ------------------------------ web search ------------------------------ */

export interface SearchSource {
  title: string
  /** The domain, shown as the source's identity: "react.dev". */
  domain: string
  href?: string
  /** A logo the caller supplies; falls back to the domain's initial. */
  logo?: string
}

// keyed by logo at the call site — see RefMark; a different logo is a
// different mark, not the same one in a new state
function SourceMark({ source }: { source: SearchSource }) {
  const [failed, setFailed] = React.useState(false)
  if (source.logo && !failed) {
    return (
      <img
        src={source.logo}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="size-4 shrink-0 rounded-sm object-contain"
      />
    )
  }
  return (
    <span
      aria-hidden
      className="bg-muted text-muted-foreground flex size-4 shrink-0 items-center justify-center rounded-sm text-[0.625rem] font-medium uppercase"
    >
      {source.domain.trim().charAt(0)}
    </span>
  )
}

/**
 * WEB SEARCH — the query, then the sources landing one by one as they are
 * read.
 *
 * Showing the QUERY is the point most search UIs skip: it is the assistant's
 * interpretation of the question, and it is the first place an answer goes
 * wrong. Results arrive staggered because they genuinely arrive that way —
 * the animation is reporting, not decoration.
 */
export function WebSearch({
  query,
  sources,
  label,
  staged = true,
  className,
}: {
  query: string
  sources: SearchSource[]
  /** Defaults to "Read N sources". */
  label?: string
  /** Stage the arrival — see staging.tsx. False renders settled. */
  staged?: boolean
  className?: string
}) {
  // sources are read one at a time; the count says how far it has got
  const { shown, pending, working: counting } = useStagedReveal(sources.length, {
    enabled: staged,
    delay: 1800,
    interval: 700,
  })
  const elapsed = useElapsedSeconds(counting)
  const reading = staged && shown < sources.length
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="bg-muted text-foreground inline-flex max-w-full items-center gap-2 self-start rounded-full px-3 py-1.5 text-sm">
        <Icon name="search" size={13} />
        <span className={cn("min-w-0 truncate", reading && "ambient-shimmer")}>
          {query}
        </span>
      </span>
      {sources.length > 0 && (
        <>
          <div
            className={cn(
              "text-muted-foreground text-sm",
              reading && "ambient-shimmer"
            )}
          >
            {reading
              ? `Reading sources… ${elapsed}s`
              : (label ??
                `Read ${shown} source${shown === 1 ? "" : "s"}`)}
          </div>
          {pending && <StageSkeleton rows={2} />}
          <ul className="flex flex-col gap-1">
            {sources.slice(0, shown).map((s, i) => {
              const inner = (
                <>
                  <SourceMark key={s.logo ?? "none"} source={s} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {s.title}
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono text-xs">
                    {s.domain}
                  </span>
                </>
              )
              return (
                <li key={`${s.domain}-${i}`}>
                  <StagedItem index={i}>
                  {s.href ? (
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:bg-muted flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors"
                    >
                      {inner}
                    </a>
                  ) : (
                    <span className="flex items-center gap-2 px-1.5 py-1">
                      {inner}
                    </span>
                  )}
                  </StagedItem>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

/* --------------------------- inline citation ---------------------------- */

export interface Citation {
  n: number
  title: string
  domain: string
  excerpt?: string
  href?: string
}

/**
 * INLINE CITATION — a numbered reference attached to the CLAIM it supports.
 *
 * Reference chips at the end of an answer say the reply used these sources.
 * A citation says THIS sentence rests on THIS one, which is the difference
 * between provenance and a bibliography. It costs a superscript inline and
 * shows the excerpt on hover, so verification never leaves the sentence.
 */
export function InlineCitation({
  citation,
  className,
}: {
  citation: Citation
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const transition = useMotionTransition("control")
  const Tag = citation.href ? "a" : "button"
  return (
    <span className={cn("relative inline-block align-baseline", className)}>
      <Tag
        {...(citation.href
          ? { href: citation.href, target: "_blank", rel: "noreferrer" }
          : { type: "button" as const })}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={`Source ${citation.n}: ${citation.title}`}
        className={cn(
          // NOT align-super: superscript alignment stretches the line box and
          // pads every paragraph that contains a citation. A baseline-aligned
          // marker nudged up costs the prose nothing.
          "relative -top-[0.35em] mx-0.5 inline-flex min-w-4 items-center justify-center rounded px-1 py-0.5 align-baseline font-mono text-[0.625rem] leading-none transition-colors",
          open
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground"
        )}
      >
        {citation.n}
      </Tag>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={transition}
            role="tooltip"
            // the preview sits ABOVE the line: a citation is read mid-sentence,
            // and a card below would cover the text still being read
            className="border-border bg-card absolute bottom-full left-0 z-10 mb-1.5 flex w-64 flex-col gap-1 rounded-xl border p-3 shadow-xs"
          >
            <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
              <span className="bg-muted text-muted-foreground flex size-4 shrink-0 items-center justify-center rounded-sm text-[0.625rem] font-medium uppercase">
                {citation.domain.charAt(0)}
              </span>
              {citation.domain}
            </span>
            <span className="text-sm font-medium">{citation.title}</span>
            {citation.excerpt && (
              <span className="text-muted-foreground text-sm">
                {citation.excerpt}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

/* --------------------------- research report ---------------------------- */

export interface ReportSection {
  title: string
  body?: string
  status?: "done" | "running" | "pending"
  /** How many sources this section rests on. */
  sources?: number
}

/**
 * RESEARCH REPORT — an outline that fills in section by section.
 *
 * A long report streamed as one block gives no sense of progress or shape.
 * Declaring the outline first turns waiting into reading: you can see what
 * is coming, what is being written now, and what has landed — and each
 * finished section carries the number of sources behind it, so depth is
 * legible per claim rather than as one total at the end.
 */
export function ResearchReport({
  title,
  sections,
  sourcesRead,
  staged = true,
  className,
}: {
  title: string
  sections: ReportSection[]
  /** Total sources read so far, shown in the header. */
  sourcesRead?: number
  /** Stage the arrival — see staging.tsx. False renders settled. */
  staged?: boolean
  className?: string
}) {
  // the outline is declared first and fills in; that IS the component's claim
  const { shown, pending, working: counting } = useStagedReveal(sections.length, {
    enabled: staged,
    delay: 2000,
    interval: 1400,
  })
  const writing = staged && shown < sections.length
  const elapsed = useElapsedSeconds(counting)
  const landed = sections.slice(0, shown)
  const done = landed.filter((s) => (s.status ?? "pending") === "done").length
  return (
    <div
      className={cn(
        "border-border bg-card overflow-hidden rounded-xl border",
        className
      )}
    >
      <div className="px-3 pt-3 pb-2">
        <div className="text-sm font-medium">{title}</div>
        <div
          className={cn(
            "text-muted-foreground mt-0.5 font-mono text-xs tabular-nums",
            writing && "ambient-shimmer"
          )}
        >
          {writing
            ? `Researching… ${elapsed}s · ${done}/${sections.length} sections`
            : `${done}/${sections.length} sections${
                sourcesRead !== undefined ? ` · ${sourcesRead} sources read` : ""
              }`}
        </div>
      </div>
      {pending && <StageSkeleton rows={2} className="px-3 pb-3" />}
      <ol className="divide-border divide-y">
        {landed.map((s, si) => {
          const status = s.status ?? "pending"
          return (
            <StagedItem
              key={s.title}
              index={si}
              className="flex gap-2.5 px-3 py-2.5"
            >
              <span className="mt-0.5 shrink-0">
                {status === "done" ? (
                  <span className="text-(--positive)">
                    <Icon name="check" size={14} />
                  </span>
                ) : status === "running" ? (
                  <span className="border-muted-foreground/30 border-t-primary block size-3.5 animate-spin rounded-full border-2" />
                ) : (
                  <span
                    aria-hidden
                    className="bg-muted-foreground/40 mt-1 block size-1.5 rounded-full"
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      status === "pending" && "text-muted-foreground"
                    )}
                  >
                    {s.title}
                  </span>
                  {s.sources !== undefined && (
                    <span className="text-muted-foreground shrink-0 font-mono text-xs">
                      {s.sources} src
                    </span>
                  )}
                </div>
                {s.body && (
                  // a section is written, so it arrives written
                  <StreamingText
                    text={s.body}
                    live={staged}
                    className="text-muted-foreground mt-0.5 block text-sm"
                  />
                )}
              </div>
            </StagedItem>
          )
        })}
      </ol>
    </div>
  )
}
