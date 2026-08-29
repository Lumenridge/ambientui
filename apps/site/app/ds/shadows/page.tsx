import type { Metadata } from "next"

import { FoundationTool } from "@/components/ds/foundation-tools"

export const metadata: Metadata = {
  title: "Shadows — ambientui design system",
  description:
    "A Foundation dimension of the ambientui design system: what it decides, and every value it can take. Change it once and every component follows.",
}

export default function Page() {
  return <FoundationTool id="shadows" />
}
