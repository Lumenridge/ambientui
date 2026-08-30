import * as React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ambientui/ui/components/table"
import { cn } from "@ambientui/ui/lib/utils"

import { parseMarkdown, type Block } from "@/lib/markdown-parse"

/**
 * THE MARKDOWN RENDERER — blocks in, vocabulary out.
 *
 * It is a SERVER COMPONENT by construction: no hooks, no state, no browser
 * API. Parsing happens in markdown-parse.ts (pure), so a page can render a
 * governing document entirely at build time — the prose reaches a crawler
 * as HTML and costs the client no markdown JavaScript at all.
 *
 * Tables render through the sanctioned Table components rather than raw
 * <table>, so the documents inherit the design system like everything else.
 */

/* ----------------------------- inline spans ----------------------------- */

/** `code`, **bold**, *italic*, [text](href) — applied in that precedence. */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(\*[^*\s][^*]*\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const token = m[0]
    const key = `${keyPrefix}-${i++}`
    if (token.startsWith("`")) {
      out.push(
        <code
          key={key}
          className="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith("**")) {
      out.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("[")) {
      const split = token.indexOf("](")
      const label = token.slice(1, split)
      const href = token.slice(split + 2, -1)
      const external = href.startsWith("http")
      out.push(
        <a
          key={key}
          href={href}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          className="text-primary underline underline-offset-2"
        >
          {label}
        </a>
      )
    } else {
      out.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>
      )
    }
    last = m.index + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/* -------------------------------- blocks -------------------------------- */

function renderBlock(block: Block, key: string): React.ReactNode {
  switch (block.kind) {
    case "code":
      return (
        <pre
          key={key}
          className="border-border bg-card my-4 overflow-x-auto rounded-xl border p-4 font-mono text-xs leading-relaxed"
        >
          {block.lang && (
            <span className="text-muted-foreground mb-2 block">
              {block.lang}
            </span>
          )}
          {block.body}
        </pre>
      )

    case "table":
      return (
        <div key={key} className="my-5 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {block.head.map((c, ci) => (
                  <TableHead key={ci}>{inline(c, `${key}h${ci}`)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {block.rows.map((r, ri) => (
                <TableRow key={ri}>
                  {r.map((c, ci) => (
                    <TableCell
                      key={ci}
                      className="align-top text-sm leading-relaxed"
                    >
                      {inline(c, `${key}r${ri}-${ci}`)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )

    case "heading": {
      // REAL HEADING LEVELS, unlike the SPA renderer which emitted every
      // heading as an h2: a document's outline is what a crawler reads to
      // understand its structure, and one flat level throws that away.
      const Tag = (`h${Math.min(block.level + 1, 6)}`) as "h2"
      const size =
        block.level === 1
          ? "mt-2 mb-4 text-2xl"
          : block.level === 2
            ? "mt-10 mb-3 text-xl"
            : block.level === 3
              ? "mt-8 mb-2 text-base"
              : "mt-6 mb-2 text-sm"
      return (
        <Tag
          key={key}
          className={cn("font-semibold tracking-tight text-balance", size)}
        >
          {inline(block.text, key)}
        </Tag>
      )
    }

    case "rule":
      return <hr key={key} className="border-border my-8" />

    case "quote":
      return (
        <blockquote
          key={key}
          className="border-border text-muted-foreground my-4 border-s-2 ps-4 text-sm leading-relaxed"
        >
          {inline(block.text, key)}
        </blockquote>
      )

    case "list": {
      const List = block.ordered ? "ol" : "ul"
      return (
        <List
          key={key}
          className={cn(
            "text-muted-foreground my-3 flex flex-col gap-1.5 ps-5 text-sm leading-relaxed",
            block.ordered ? "list-decimal" : "list-disc"
          )}
        >
          {block.items.map((it, ii) => (
            <li key={ii}>{inline(it, `${key}li${ii}`)}</li>
          ))}
        </List>
      )
    }

    case "paragraph":
      return (
        <p
          key={key}
          className="text-muted-foreground my-3 text-sm leading-relaxed"
        >
          {inline(block.text, key)}
        </p>
      )
  }
}

export function Markdown({
  source,
  className,
}: {
  source: string
  className?: string
}) {
  const blocks = parseMarkdown(source)
  return (
    <div className={cn("max-w-3xl", className)}>
      {blocks.map((b, i) => renderBlock(b, `b${i}`))}
    </div>
  )
}
