import type { Metadata } from "next"

import { pageMetadata } from "@/lib/site"

import { FoundationTool } from "@/components/ds/foundation-tools"

export const metadata: Metadata = pageMetadata({
  title: "Colors — ambientui design system",
  name: "Colors",
  description:
    "Every colour in ambientui comes from one accent and one grey family, used through names like primary and muted rather than hex codes. Change the family and the whole product re-themes.",
  canonical: "/ds/colors",
})

export default function Page() {
  return <FoundationTool id="colors" />
}
