import type { Metadata } from "next"

import { CanvasDemo } from "@/components/demos/canvas-demo"

export const metadata: Metadata = {
  title: "Canvas — ambientui",
  description: "An empty page with nothing on it but the assistant, so you can try the shapes without a product in the way.",
}

export default function CanvasPage() {
  return <CanvasDemo />
}
