import type { Metadata } from "next"

import { FoundationTool } from "@/components/ds/foundation-tools"

export const metadata: Metadata = {
  title: "Shadows — ambientui design system",
  description:
    "The seven elevation steps, taken from Tailwind and used as they are. Documented rather than configurable, because depth is chosen per surface by what it means, not set globally.",
  alternates: { canonical: "/ds/shadows" },
}

export default function Page() {
  return <FoundationTool id="shadows" />
}
