import * as React from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

import { useAssistant } from "@/components/assistant/assistant-context"
import {
  AMBIENT_COMPONENTS,
  ControlsHostContext,
  SHADCN_DEFAULT_COMPONENTS,
} from "@/components/ds/ds-docs"
import { ColorsPage } from "@/components/ds/colors-page"
import { ShadowsPage } from "@/components/ds/shadows-page"
import { SpacingPage } from "@/components/ds/spacing-page"
import { FoundationPage } from "@/foundation/foundation-page"

/**
 * The design-system browser: component list, interactive controls
 * playground, stories, and behavior documentation — built strictly from
 * the installed shadcn preset.
 */

function DocList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="text-muted-foreground flex flex-col gap-1.5 text-sm leading-relaxed">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-foreground/70 select-none">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function DsPage() {
  const [selectedId, setSelectedId] = React.useState<string>("foundation")
  const { setPageChip } = useAssistant()
  const entry =
    selectedId === "foundation" ||
    selectedId === "spacing" ||
    selectedId === "colors" ||
    selectedId === "shadows"
      ? null
      : [...AMBIENT_COMPONENTS, ...SHADCN_DEFAULT_COMPONENTS].find(
          (c) => c.id === selectedId
        )!
  const PlaygroundComponent = entry?.playground
  const [controlsHost, setControlsHost] = React.useState<HTMLElement | null>(
    null
  )

  // Declare this page (and the selected item) to the ambient layer.
  const chipLabel = entry
    ? entry.name
    : selectedId === "spacing"
      ? "Spacing"
      : selectedId === "colors"
        ? "Colors"
        : selectedId === "shadows"
          ? "Shadows"
          : "Foundation"
  React.useEffect(() => {
    setPageChip({
      id: `ds-${selectedId}`,
      kind: "page",
      label: `Design system · ${chipLabel}`,
    })
    return () => setPageChip(null)
  }, [selectedId, chipLabel, setPageChip])

  return (
    <div className="flex min-h-0 flex-1">
      {/* component list */}
      <aside className="bg-sidebar text-sidebar-foreground flex w-60 shrink-0 flex-col overflow-y-auto px-3 py-4">
        <div className="px-2 pb-1 text-sm font-semibold">Design system</div>
        <div className="px-2 pt-3 pb-1.5 text-xs font-medium">
          Project
        </div>
        <nav className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => setSelectedId("foundation")}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-start text-sm transition-colors",
              selectedId === "foundation"
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            Foundation
          </button>
        </nav>
        <div className="px-2 pt-5 pb-1.5 text-xs font-medium">
          Foundations
        </div>
        <nav className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => setSelectedId("colors")}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-start text-sm transition-colors",
              selectedId === "colors"
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            Colors
          </button>
          <button
            type="button"
            onClick={() => setSelectedId("spacing")}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-start text-sm transition-colors",
              selectedId === "spacing"
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            Spacing
          </button>
          <button
            type="button"
            onClick={() => setSelectedId("shadows")}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-start text-sm transition-colors",
              selectedId === "shadows"
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            Shadows
          </button>
        </nav>
        <div className="px-2 pt-5 pb-1.5 text-xs font-medium">
          Ambient vocabulary
        </div>
        <nav className="flex flex-col gap-0.5">
          {AMBIENT_COMPONENTS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-start text-sm transition-colors",
                c.id === selectedId
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {c.name}
            </button>
          ))}
        </nav>
        <div className="px-2 pt-5 pb-1.5 text-xs font-medium">
          Shadcn components
        </div>
        <nav className="flex flex-col gap-0.5">
          {SHADCN_DEFAULT_COMPONENTS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-start text-sm transition-colors",
                c.id === selectedId
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {c.name}
            </button>
          ))}
        </nav>
      </aside>

      {/* canvas — the inset content card on the sidebar-tinted ground */}
      <main className="bg-sidebar min-w-0 flex-1 p-2">
        <div className="bg-background border-border h-full min-h-0 overflow-y-auto rounded-lg border px-8 py-6">
        {!entry ? (
          selectedId === "spacing" ? (
            <SpacingPage />
          ) : selectedId === "colors" ? (
            <ColorsPage />
          ) : selectedId === "shadows" ? (
            <ShadowsPage />
          ) : (
            <FoundationPage />
          )
        ) : (
        <div className="mx-auto max-w-3xl pb-12">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{entry.name}</h1>
            <Badge variant="outline">
              {AMBIENT_COMPONENTS.some((c) => c.id === entry.id)
                ? "ambient"
                : "shadcn"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {entry.description}
          </p>

          <div className="mt-6 flex flex-col gap-6">
            {PlaygroundComponent && (
              <section>
                <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                  Playground
                </div>
                <ControlsHostContext.Provider value={controlsHost}>
                  <PlaygroundComponent key={entry.id} />
                </ControlsHostContext.Provider>
              </section>
            )}

            {entry.stories.map((story) => (
              <section key={story.label}>
                <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                  {story.label}
                </div>
                <div className="border-border flex min-h-32 items-center justify-center rounded-xl border p-8">
                  {story.render}
                </div>
              </section>
            ))}
          </div>

          <Separator className="my-8" />

          <div className="text-muted-foreground mb-4 text-xs font-medium tracking-wide uppercase">
            Documentation
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <DocList title="When to use" items={entry.whenToUse} />
              <DocList title="When not to" items={entry.whenNotToUse} />
            </div>
            <DocList title="Behavior" items={entry.behavior} />
          </div>

          <p className="text-muted-foreground mt-8 text-xs">
            This documentation doubles as the component vocabulary — the same
            descriptions the AI layer reasons over when composing interfaces.
          </p>
        </div>
        )}
        </div>
      </main>

      {/* inspect rail — the selected component's configuration */}
      {entry && (
        <aside className="border-border bg-sidebar text-sidebar-foreground flex w-72 shrink-0 flex-col overflow-y-auto border-l">
          <div className="border-border flex items-baseline justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Inspect</span>
            <span className="text-muted-foreground text-xs">
              {entry.name}
            </span>
          </div>
          <div className="text-muted-foreground border-border border-b px-4 py-2 text-xs font-medium tracking-wide uppercase">
            Controls
          </div>
          <div ref={setControlsHost} />
          {!PlaygroundComponent && (
            <p className="text-muted-foreground px-4 py-3 text-sm">
              No configurable props for this component — see its stories and
              documentation.
            </p>
          )}
        </aside>
      )}
    </div>
  )
}
