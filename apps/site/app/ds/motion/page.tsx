import type { Metadata } from "next"

import { pageMetadata } from "@/lib/site"

import { FoundationTool } from "@/components/ds/foundation-tools"

export const metadata: Metadata = pageMetadata({
  title: "Motion — ambientui design system",
  description:
    "Components name a motion role instead of typing a duration. Pick a character and a pace, and every transition in the product re-times together.",
  canonical: "/ds/motion",
})

export default function Page() {
  return <FoundationTool id="motion" />
}
