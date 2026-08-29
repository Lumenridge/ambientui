"use client"

import { Assistant } from "ambientui/assistant"

import { DevToolView } from "@/components/devtool-view"
import { DemoProviders } from "@/components/providers/demo-providers"

/**
 * The editor demo. Unlike the canvas it prerenders fine — its one browser
 * read is already guarded — so it needs no dynamic import, only the client
 * boundary its interactivity requires.
 */
export function DevToolDemo() {
  return (
    <DemoProviders>
      <main className="relative flex h-full min-h-0 flex-col overflow-hidden">
        <DevToolView />
        <Assistant />
      </main>
    </DemoProviders>
  )
}
