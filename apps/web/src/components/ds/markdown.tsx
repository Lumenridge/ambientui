import * as React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

/**
 * THE GOVERNING DOCUMENTS, RENDERED — not a copy of them.
 *
 * These files ARE the system's rules, so /ds imports them raw (Vite `?raw`)
 * and renders the real bytes. A hand-maintained summary of DESIGN.md at /ds
 * would be a second source of truth, and the second one is always the one
 * that goes stale.
 *
 * The renderer is deliberately small and covers only what these files
 * actually use: headings, paragraphs, lists, tables, fenced code, block
 * quotes, rules, and inline bold / code / links. A markdown library would be
 * a new dependency for one page, which is a governance event; this is ~150
 * lines that composes the sanctioned Table for tables and Tailwind's scales
 * for everything else.
 *
 * It is a READER, not an editor: nothing here writes back to the files.
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

const splitRow = (line: string) =>
  line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim())

export function Markdown({
  source,
  className,
}: {
  source: string
  className?: string
}) {
  const blocks = React.useMemo(() => {
    const lines = source.split("\n")
    const nodes: React.ReactNode[] = []
    let i = 0
    let key = 0
    const k = () => `b${key++}`

    while (i < lines.length) {
      const line = lines[i] ?? ""

      // fenced code
      if (line.startsWith("```")) {
        const lang = line.slice(3).trim()
        const body: string[] = []
        i++
        while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
          body.push(lines[i] ?? "")
          i++
        }
        i++
        nodes.push(
          <pre
            key={k()}
            className="border-border bg-card my-4 overflow-x-auto rounded-xl border p-4 font-mono text-xs leading-relaxed"
          >
            {lang && (
              <span className="text-muted-foreground mb-2 block">{lang}</span>
            )}
            {body.join("\n")}
          </pre>
        )
        continue
      }

      // table: a header row followed by a separator row
      if (line.startsWith("|") && (lines[i + 1] ?? "").includes("---")) {
        const head = splitRow(line)
        i += 2
        const rows: string[][] = []
        while (i < lines.length && (lines[i] ?? "").startsWith("|")) {
          rows.push(splitRow(lines[i] ?? ""))
          i++
        }
        nodes.push(
          <div key={k()} className="my-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {head.map((c, ci) => (
                    <TableHead key={ci}>{inline(c, `h${ci}`)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, ri) => (
                  <TableRow key={ri}>
                    {r.map((c, ci) => (
                      <TableCell
                        key={ci}
                        className="align-top text-sm leading-relaxed"
                      >
                        {inline(c, `r${ri}-${ci}`)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
        continue
      }

      // headings
      const heading = /^(#{1,6})\s+(.*)$/.exec(line)
      if (heading) {
        const level = heading[1]!.length
        const text = heading[2]!
        const size =
          level === 1
            ? "mt-2 mb-4 text-2xl"
            : level === 2
              ? "mt-10 mb-3 text-xl"
              : level === 3
                ? "mt-8 mb-2 text-base"
                : "mt-6 mb-2 text-sm"
        nodes.push(
          <h2
            key={k()}
            className={cn("font-semibold tracking-tight text-balance", size)}
          >
            {inline(text, k())}
          </h2>
        )
        i++
        continue
      }

      // horizontal rule
      if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
        nodes.push(<hr key={k()} className="border-border my-8" />)
        i++
        continue
      }

      // block quote
      if (line.startsWith("> ")) {
        const body: string[] = []
        while (i < lines.length && (lines[i] ?? "").startsWith("> ")) {
          body.push((lines[i] ?? "").slice(2))
          i++
        }
        nodes.push(
          <blockquote
            key={k()}
            className="border-border text-muted-foreground my-4 border-s-2 ps-4 text-sm leading-relaxed"
          >
            {inline(body.join(" "), k())}
          </blockquote>
        )
        continue
      }

      // lists (either marker; nesting is flattened — these documents do not
      // rely on depth to carry meaning)
      if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
        const items: string[] = []
        const ordered = /^\s*\d+\./.test(line)
        while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i] ?? "")) {
          let item = (lines[i] ?? "").replace(/^\s*([-*]|\d+\.)\s+/, "")
          i++
          // continuation lines belong to the item above them
          while (
            i < lines.length &&
            (lines[i] ?? "").trim() !== "" &&
            !/^\s*([-*]|\d+\.)\s+/.test(lines[i] ?? "") &&
            !/^#{1,6}\s/.test(lines[i] ?? "") &&
            !(lines[i] ?? "").startsWith("```")
          ) {
            item += " " + (lines[i] ?? "").trim()
            i++
          }
          items.push(item)
        }
        const List = ordered ? "ol" : "ul"
        nodes.push(
          <List
            key={k()}
            className={cn(
              "text-muted-foreground my-3 flex flex-col gap-1.5 ps-5 text-sm leading-relaxed",
              ordered ? "list-decimal" : "list-disc"
            )}
          >
            {items.map((it, ii) => (
              <li key={ii}>{inline(it, `li${ii}`)}</li>
            ))}
          </List>
        )
        continue
      }

      // blank
      if (line.trim() === "") {
        i++
        continue
      }

      // paragraph: consume until a blank line or the next block marker.
      // THE FIRST LINE IS ALWAYS TAKEN. Without that, a line the block
      // branches decline but this one also refuses — a stray "|" outside a
      // table, say — would leave `i` where it was and spin forever.
      const para: string[] = [line]
      i++
      while (
        i < lines.length &&
        (lines[i] ?? "").trim() !== "" &&
        !/^#{1,6}\s/.test(lines[i] ?? "") &&
        !(lines[i] ?? "").startsWith("```") &&
        !(lines[i] ?? "").startsWith("|") &&
        !(lines[i] ?? "").startsWith("> ") &&
        !/^\s*([-*]|\d+\.)\s+/.test(lines[i] ?? "")
      ) {
        para.push(lines[i] ?? "")
        i++
      }
      nodes.push(
        <p
          key={k()}
          className="text-muted-foreground my-3 text-sm leading-relaxed"
        >
          {inline(para.join(" "), k())}
        </p>
      )
    }
    return nodes
  }, [source])

  return <div className={cn("max-w-3xl", className)}>{blocks}</div>
}
