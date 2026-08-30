import type { Metadata } from "next"

import { pageMetadata } from "@/lib/site"

import { FoundationTool } from "@/components/ds/foundation-tools"

export const metadata: Metadata = pageMetadata({
  title: "Spacing — ambientui design system",
  name: "Spacing",
  description:
    "One spacing unit that every padding, gap and height is built from, taken from Tailwind's scale. Change the unit and the whole product gets tighter or roomier at once.",
  canonical: "/ds/spacing",
})

export default function Page() {
  return <FoundationTool id="spacing" />
}
