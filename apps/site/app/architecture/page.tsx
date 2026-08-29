import type { Metadata } from "next"

import { Markdown } from "@/components/markdown"
import { readDocById } from "@/lib/read-doc"

/**
 * THE PAPER, AS AN ARTICLE — and the page with the most to gain from being
 * real HTML: ~1,400 lines of argument that was previously invisible to any
 * crawler, behind a `?view=` query param on a single-document SPA.
 *
 * Title and description are DERIVED FROM THE FILE, never restated, so they
 * cannot drift from the document they describe.
 */
function paperTitleAndLede() {
  const source = readDocById("doc-paper")
  const lines = source.split("\n")
  const title = lines[0]?.startsWith("# ") ? lines[0].slice(2) : "The architecture"
  // the bold subtitle block under the H1, unwrapped
  const subtitle: string[] = []
  let i = 1
  while (lines[i] === "") i++
  if (lines[i]?.startsWith("**")) {
    while (lines[i] && lines[i] !== "") {
      subtitle.push(lines[i]!)
      i++
    }
  }
  return {
    title,
    lede: subtitle.join(" ").replace(/\*\*/g, ""),
    source,
    body: lines.slice(i).join("\n"),
  }
}

export function generateMetadata(): Metadata {
  const { title, lede } = paperTitleAndLede()
  return {
    title: `${title} — ambientui`,
    description: lede.slice(0, 200),
    openGraph: { type: "article", title, description: lede.slice(0, 200) },
  }
}

export default function ArchitecturePage() {
  const { title, lede, body } = paperTitleAndLede()
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-20">
      <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
        ambientui / the architecture
      </p>
      {/* the hero renders the title block, so the body below has it sliced
          off — showing both would be the page stuttering */}
      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        {title}
      </h1>
      <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-relaxed">
        {lede}
      </p>
      <Markdown source={body} className="mt-16 max-w-none" />
    </main>
  )
}
