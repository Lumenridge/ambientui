import type { Metadata } from "next"

import { FoundationTool } from "@/components/ds/foundation-tools"

export const metadata: Metadata = {
  title: "Translucency — ambientui design system",
  description:
    "Glass, washes and scrims as named tokens instead of opacity modifiers scattered through components. A look with a name can be changed; a look made of stray utilities can only be re-learned.",
  alternates: { canonical: "/ds/translucency" },
}

export default function Page() {
  return <FoundationTool id="translucency" />
}
