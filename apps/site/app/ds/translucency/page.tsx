import type { Metadata } from "next"

import { pageMetadata } from "@/lib/site"

import { FoundationTool } from "@/components/ds/foundation-tools"

export const metadata: Metadata = pageMetadata({
  title: "Translucency — ambientui design system",
  name: "Translucency",
  description:
    "Glass, washes and scrims as named tokens instead of opacity modifiers scattered through components. A look with a name can be changed; a look made of stray utilities can only be re-learned.",
  canonical: "/ds/translucency",
})

export default function Page() {
  return <FoundationTool id="translucency" />
}
