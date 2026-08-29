"use client"

import dynamic from "next/dynamic"

import { Assistant } from "ambientui/assistant"

import { DemoProviders } from "@/components/providers/demo-providers"

/**
 * THE PATTERN EVERY LATER SURFACE REUSES: a client boundary, and anything
 * that cannot exist on the server behind `dynamic({ ssr: false })`.
 *
 * The backdrop seeds itself with Math.random and paints images — it has no
 * meaningful server rendering, and prerendering it would only produce a
 * markup mismatch to reconcile. `ssr: false` is the honest statement that
 * this content begins at mount. It may only be called from a client module,
 * which is why this file carries the directive rather than the route.
 */
const CanvasBackdrop = dynamic(
  () => import("@/components/canvas-backdrop").then((m) => m.CanvasBackdrop),
  { ssr: false }
)

export function CanvasDemo() {
  return (
    <DemoProviders>
      <main className="relative flex h-full items-center justify-center overflow-hidden">
        <CanvasBackdrop />
        <div className="text-muted-foreground relative flex flex-col items-center gap-2 text-sm select-none">
          <p className="text-foreground/80 text-base font-medium">ambientui</p>
          <p>
            Press{" "}
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              ⌘K
            </kbd>{" "}
            — or drag the orb.
          </p>
        </div>
        <Assistant />
      </main>
    </DemoProviders>
  )
}
