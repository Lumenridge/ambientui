"use client"

import * as React from "react"

import {
  AMBIENT_COMPONENTS,
  SHADCN_DEFAULT_COMPONENTS,
} from "@/components/ds/entries"
import { ControlsHostContext } from "@/components/ds/stories"
import { DemoProviders } from "@/components/providers/demo-providers"

/**
 * THE LIVE HALF OF A COMPONENT PAGE — stories and, where the prop surface
 * warrants it, the playground.
 *
 * It is a separate island on purpose. The page's PROSE is server-rendered
 * and is what a crawler reads; this mounts beneath it and imports the whole
 * demo kit. If a playground regresses, the demo is lost and the page is not.
 */
export function ComponentDemos({ id }: { id: string }) {
  const entry = React.useMemo(
    () =>
      [...AMBIENT_COMPONENTS, ...SHADCN_DEFAULT_COMPONENTS].find(
        (c) => c.id === id
      ),
    [id]
  )
  const [controlsHost, setControlsHost] = React.useState<HTMLElement | null>(
    null
  )
  if (!entry) return null
  const Playground = entry.playground
  const hasDemos = entry.stories.length > 0 || Playground

  if (!hasDemos) return null

  return (
    <DemoProviders>
      <section className="mt-16">
        <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          Live
        </h2>

        {Playground && (
          <ControlsHostContext.Provider value={controlsHost}>
            <div className="border-border mt-5 rounded-xl border p-6">
              <Playground />
            </div>
            {/* the playground's controls portal here rather than into the
                /ds Inspect rail, which this page does not have */}
            <div ref={setControlsHost} className="mt-4 empty:hidden" />
          </ControlsHostContext.Provider>
        )}

        {entry.stories.map((story) => (
          <div key={story.label} className="mt-8">
            <p className="text-muted-foreground mb-3 text-sm font-medium">
              {story.label}
            </p>
            <div className="border-border bg-card flex min-h-32 items-center justify-center rounded-xl border p-8">
              {story.render}
            </div>
          </div>
        ))}
      </section>
    </DemoProviders>
  )
}
