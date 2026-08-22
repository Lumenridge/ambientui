import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"

import { Icon } from "@workspace/ui/components/icon"
import { cn } from "@workspace/ui/lib/utils"

import { useMotionTransition } from "@/foundation/foundation-context"

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

function SourceMark({ source }: { source: SearchSource }) {
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => setFailed(false), [source.logo])
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
      className="bg-muted text-muted-foreground flex size-4 shrink-0 items-center justify-center rounded-sm text-[9px] font-medium uppercase"
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
  className,
}: {
  query: string
  sources: SearchSource[]
  /** Defaults to "Read N sources". */
  label?: string
  className?: string
}) {
  const transition = useMotionTransition("control")
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="bg-muted text-foreground inline-flex max-w-full items-center gap-2 self-start rounded-full px-3 py-1.5 text-[13px]">
        <Icon name="search" size={13} />
        <span className="min-w-0 truncate">{query}</span>
      </span>
      {sources.length > 0 && (
        <>
          <div className="text-muted-foreground text-[13px]">
            {label ?? `Read ${sources.length} source${sources.length === 1 ? "" : "s"}`}
          </div>
          <ul className="flex flex-col gap-1">
            {sources.map((s, i) => {
              const inner = (
                <>
                  <SourceMark source={s} />
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    {s.title}
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                    {s.domain}
                  </span>
                </>
              )
              return (
                <motion.li
                  key={`${s.domain}-${i}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...transition, delay: i * 0.06 }}
                >
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
                </motion.li>
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
          "mx-0.5 inline-flex min-w-4 items-center justify-center rounded px-1 align-super font-mono text-[10px] transition-colors",
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
            <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-[11px]">
              <span className="bg-muted text-muted-foreground flex size-4 shrink-0 items-center justify-center rounded-sm text-[9px] font-medium uppercase">
                {citation.domain.charAt(0)}
              </span>
              {citation.domain}
            </span>
            <span className="text-[13px] font-medium">{citation.title}</span>
            {citation.excerpt && (
              <span className="text-muted-foreground text-[13px]">
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
  className,
}: {
  title: string
  sections: ReportSection[]
  /** Total sources read so far, shown in the header. */
  sourcesRead?: number
  className?: string
}) {
  const done = sections.filter((s) => (s.status ?? "pending") === "done").length
  return (
    <div
      className={cn(
        "border-border bg-card overflow-hidden rounded-xl border",
        className
      )}
    >
      <div className="px-3 pt-3 pb-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-muted-foreground mt-0.5 font-mono text-[11px]">
          {done}/{sections.length} sections
          {sourcesRead !== undefined && ` · ${sourcesRead} sources read`}
        </div>
      </div>
      <ol className="divide-border divide-y">
        {sections.map((s) => {
          const status = s.status ?? "pending"
          return (
            <li key={s.title} className="flex gap-2.5 px-3 py-2.5">
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
                      "text-[13px] font-medium",
                      status === "pending" && "text-muted-foreground"
                    )}
                  >
                    {s.title}
                  </span>
                  {s.sources !== undefined && (
                    <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                      {s.sources} src
                    </span>
                  )}
                </div>
                {s.body && (
                  <p className="text-muted-foreground mt-0.5 text-[13px]">
                    {s.body}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
