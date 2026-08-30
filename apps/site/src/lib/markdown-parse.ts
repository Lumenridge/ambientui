/**
 * MARKDOWN → BLOCKS. A pure function: strings in, plain data out. No React,
 * no hooks, no DOM.
 *
 * It used to be a `useMemo` inside the renderer that emitted JSX as it
 * walked, which meant parsing could only happen where React was running —
 * on the client, after hydration. Separating them is what lets the governing
 * documents and the paper render on the SERVER: the prose ships as HTML with
 * no markdown JavaScript in the bundle at all, which is both the SEO win and
 * the LCP win.
 *
 * The walk itself is unchanged, deliberately — same block set, same
 * precedence, same edge cases — because the documents it reads are the real
 * governing files and a "tidier" parser would render them differently.
 *
 * No markdown library, on purpose: the corpus is known, the feature set is
 * small, and the renderer maps blocks onto the sanctioned vocabulary
 * (Table, and the type scale) rather than onto generic HTML.
 */

export type Block =
  | { kind: "code"; lang: string; body: string }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "heading"; level: number; text: string }
  | { kind: "rule" }
  | { kind: "quote"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "paragraph"; text: string }

// splits on the pipes that DELIMIT cells, leaving \| alone. A cell may hold
// a union type in code (`light \| deep`), and splitting that pipe too would
// silently invent a column and shift every cell after it out of its heading
const splitRow = (line: string) =>
  line
    .replace(/^\||(?<!\\)\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|"))

export function parseMarkdown(source: string): Block[] {
  const lines = source.split("\n")
  const blocks: Block[] = []
  let i = 0

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
      blocks.push({ kind: "code", lang, body: body.join("\n") })
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
      blocks.push({ kind: "table", head, rows })
      continue
    }

    // headings
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1]!.length,
        text: heading[2]!,
      })
      i++
      continue
    }

    // horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push({ kind: "rule" })
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
      blocks.push({ kind: "quote", text: body.join(" ") })
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
      blocks.push({ kind: "list", ordered, items })
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
    blocks.push({ kind: "paragraph", text: para.join(" ") })
  }

  return blocks
}
