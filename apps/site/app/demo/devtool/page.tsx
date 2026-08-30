import type { Metadata } from "next"

import { DevToolDemo } from "@/components/demos/devtool-demo"

export const metadata: Metadata = {
  title: "Dev tool demo — ambientui",
  description: "The assistant inside a working editor, answering about the file on screen.",
}

export default function DevToolPage() {
  return <DevToolDemo />
}
