import type { Metadata } from "next"

import { ArchitectureView } from "@/components/home/architecture-view"
import { ArticleJsonLd } from "@/components/json-ld"
import { cardTitle, OG_IMAGE } from "@/lib/site"

/**
 * THE ARCHITECTURE, AS AN ARTICLE.
 *
 * This route used to read PAPER.md at build time and derive its title and
 * description from the file, so the two could not drift. The paper is gone
 * and the argument is written directly in `architecture-content.ts`, so the
 * headline lives here — one place, still not restated anywhere else on the
 * page, since the hero renders these same two strings.
 *
 * The prose is a client tree only because the diagrams and live demos are
 * interleaved with it. `output: export` prerenders client components to
 * HTML too, so every word is still in the file a crawler receives.
 */
const TITLE = "Stop AI drift"
const LEDE =
  "AI can build screens faster than anyone can check them. Here is how to keep your design from falling apart while it does, and what you get once it cannot."

export const metadata: Metadata = {
  title: `${TITLE} — ambientui`,
  description: LEDE,
  alternates: { canonical: "/architecture" },
  openGraph: {
    type: "article",
    title: cardTitle(TITLE),
    description: LEDE,
    // repeated, not inherited: Next replaces openGraph rather than
    // merging it, so omitting this drops the card image (see OG_IMAGE)
    images: [OG_IMAGE],
  },
  // AND THE TWITTER BLOCK IS NOT OPTIONAL EITHER. Without it this page
  // inherited the ROOT layout's twitter.title, so /architecture shared on
  // X as the home page while its og:title was correct — the same
  // replace-don't-merge trap, one object over. Every hand-rolled metadata
  // block on this site has to state both; `pageMetadata` is how the rest
  // of the pages avoid having to remember.
  twitter: {
    card: "summary_large_image",
    title: cardTitle(TITLE),
    description: LEDE,
    images: [OG_IMAGE.url],
  },
}

export default function ArchitecturePage() {
  return (
    <>
      <ArticleJsonLd
        headline={TITLE}
        description={LEDE}
        path="/architecture"
      />
      <ArchitectureView />
    </>
  )
}
