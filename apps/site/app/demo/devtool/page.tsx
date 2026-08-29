import type { Metadata } from "next"

import { DevToolDemo } from "@/components/demos/devtool-demo"

export const metadata: Metadata = {
  title: "Dev tool demo — ambientui",
  description: "The ambient layer docked beside real work.",
}

export default function DevToolPage() {
  return <DevToolDemo />
}
