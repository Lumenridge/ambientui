import type { Metadata } from "next"

/**
 * THE DEMOS ARE NOT THE PRODUCT, and they say so here.
 *
 * Canvas and the dev tool exist to show the layer in situ; they are not
 * documentation and nothing on them should compete in search with the pages
 * that are. `robots` on this layout covers every route beneath it, so a new
 * demo is excluded by being a demo rather than by someone remembering.
 *
 * NOTE this is the ONLY exclusion that works here. A GitHub project Pages
 * site cannot serve an effective robots.txt — crawlers read
 * lumenridge.github.io/robots.txt, which is not ours — so the meta tag is
 * not belt-and-braces, it is the belt. Verify it in the emitted HTML.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // The demo shells are full-bleed apps, not documents: they own the
  // viewport and scroll their own panes. Scoped to a wrapper — never to
  // html/body, which is what made the docs site unscrollable before.
  return <div className="h-svh overflow-hidden">{children}</div>
}
