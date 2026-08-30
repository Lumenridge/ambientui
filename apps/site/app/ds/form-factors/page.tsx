import type { Metadata } from "next"

import { FoundationTool } from "@/components/ds/foundation-tools"

export const metadata: Metadata = {
  title: "Form Factors — ambientui design system",
  description:
    "One assistant that changes shape rather than five separate features: how each surface behaves, from a small pill at the edge to a full-height dock.",
  alternates: { canonical: "/ds/form-factors" },
}

export default function Page() {
  return <FoundationTool id="form-factors" />
}
