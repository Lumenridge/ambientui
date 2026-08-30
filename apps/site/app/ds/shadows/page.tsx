import type { Metadata } from "next"

import { pageMetadata } from "@/lib/site"

import { FoundationTool } from "@/components/ds/foundation-tools"

export const metadata: Metadata = pageMetadata({
  title: "Shadows — ambientui design system",
  name: "Shadows",
  description:
    "The seven elevation steps, taken from Tailwind and used as they are. Documented rather than configurable, because depth is chosen per surface by what it means, not set globally.",
  canonical: "/ds/shadows",
})

export default function Page() {
  return <FoundationTool id="shadows" />
}
