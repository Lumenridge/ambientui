import type { Metadata } from "next"

import { pageMetadata } from "@/lib/site"

import { FoundationTool } from "@/components/ds/foundation-tools"

export const metadata: Metadata = pageMetadata({
  title: "Form Factors — ambientui design system",
  name: "Form Factors",
  description:
    "One assistant that changes shape rather than five separate features: how each surface behaves, from a small pill at the edge to a full-height dock.",
  canonical: "/ds/form-factors",
})

export default function Page() {
  return <FoundationTool id="form-factors" />
}
