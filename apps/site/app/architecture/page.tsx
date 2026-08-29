import type { Metadata } from "next"

import { ArchitectureView } from "@/components/home/architecture-view"
import { ArticleJsonLd } from "@/components/json-ld"
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
    alternates: { canonical: "/architecture" },
    openGraph: { type: "article", title, description: lede.slice(0, 200) },
  }
}

export default function ArchitecturePage() {
  // read on the SERVER, rendered by a client tree that adds the diagrams
  // and the live demos — the export still prerenders the prose to HTML
  const { title, lede } = paperTitleAndLede()
  return (
    <>
      <ArticleJsonLd
        headline={title}
        description={lede.slice(0, 200)}
        path="/architecture"
      />
      <ArchitectureView source={readDocById("doc-paper")} />
    </>
  )
}
