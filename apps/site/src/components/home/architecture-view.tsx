"use client"

import { PlaybookView } from "@/components/home/playbook-view"
import { DemoProviders } from "@/components/providers/demo-providers"

/**
 * The paper as a followable article: the file's prose, with the schematic
 * diagrams and the live ambient components interleaved where the argument
 * reaches them.
 *
 * A client tree — the demos are the real components — but the export still
 * prerenders it, so the full text lands in the HTML. That is asserted by
 * scripts/check-static-html.mjs rather than assumed.
 */
export function ArchitectureView() {
  return (
    <DemoProviders>
      <PlaybookView />
    </DemoProviders>
  )
}
