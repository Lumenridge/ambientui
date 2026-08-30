import type { Metadata } from "next"

import { pageMetadata } from "@/lib/site"

import { FoundationTool } from "@/components/ds/foundation-tools"

export const metadata: Metadata = pageMetadata({
  title: "Foundation — ambientui design system",
  name: "Foundation",
  description:
    "Set the handful of values everything else reads from: colour, grey, corner radius, spacing, type size, icons and how motion feels. Change one, save, and every component in the product follows.",
  canonical: "/ds",
})

/**
 * /ds IS THE FOUNDATION.
 *
 * It used to be an index: fifty component links, the seven tools, the
 * governing documents. That page existed for one reason, which was that
 * nothing else in static HTML linked to a component — on the SPA every
 * one of them lived behind a `?c=` parameter and no crawler could reach
 * any of them.
 *
 * The rail made the index redundant. It prerenders into every /ds page
 * with real hrefs, so each of those pages already carries all fifty
 * inbound links (checked in the emitted HTML, not assumed). An index page
 * whose only job is duplicating the navigation beside it is a page the
 * reader has to click through on their way to the thing they came for.
 *
 * So arriving at the design system means arriving at the Foundation, which
 * is what the paper says it should mean: the configuration space is where
 * the system is set up, and half the game is played there before a single
 * screen is designed. `/ds/foundation` is gone rather than duplicated —
 * two URLs for one page is the duplicate content this migration exists to
 * remove.
 */
export default function Page() {
  return <FoundationTool id="foundation" />
}
