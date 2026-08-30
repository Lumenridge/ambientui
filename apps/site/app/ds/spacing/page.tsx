import type { Metadata } from "next"

import { FoundationTool } from "@/components/ds/foundation-tools"

export const metadata: Metadata = {
  title: "Spacing — ambientui design system",
  description:
    "One spacing unit that every padding, gap and height is built from, taken from Tailwind's scale. Change the unit and the whole product gets tighter or roomier at once.",
  alternates: { canonical: "/ds/spacing" },
}

export default function Page() {
  return <FoundationTool id="spacing" />
}
