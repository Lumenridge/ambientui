import type { Metadata } from "next"

import { CanvasDemo } from "@/components/demos/canvas-demo"

export const metadata: Metadata = {
  title: "Canvas — ambientui",
  description: "A page that is nothing but the ambient layer.",
}

export default function CanvasPage() {
  return <CanvasDemo />
}
