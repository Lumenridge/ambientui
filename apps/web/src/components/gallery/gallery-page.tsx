import * as React from "react"

import { Button } from "@ambientui/ui/components/button"
import { cn } from "@ambientui/ui/lib/utils"

import { CommandLine } from "@/components/command-line"
import { Icon } from "@/components/icon"
import { AMBIENT_COMPONENTS } from "@/components/ds/ds-docs"
import { dsHref, DS_PARAM } from "@/ds-route"

/**
 * THE GALLERY — every ambient component, running, in one scroll.
 *
 * /ds answers "how does this work" for someone already committed. This
 * answers "what IS this" for someone who is not: numbered, one line each,
 * live, and scannable in the time it takes to scroll. A rail with fifty
 * entries asks you to pick before you know what any of them are.
 *
 * IT IS GENERATED FROM THE SAME CATALOG as the registry and the reference —
 * name, description and the demo all come from AMBIENT_COMPONENTS. There is
 * no gallery copy to write and therefore none to go stale, and a component
 * cannot appear here without being documented, or be documented without
 * appearing here.
 *
 * EVERY ENTRY CARRIES ITS COMMAND. That is the whole difference between this
 * and a showcase: what you are looking at is a thing you can have, and the
 * way to have it is on the same screen as the thing.
 *
 * The demo is each component's FIRST story — the one its author chose to lead
 * with in the reference, which is already the "show me this working" case.
 */

/** Documented, but not separately installable — see NOT_DISTRIBUTABLE. */
const SHIPS_WITH_THE_LAYER = new Set(["command-palette"])

const installFor = (id: string) =>
  SHIPS_WITH_THE_LAYER.has(id)
    ? "npx shadcn add @ambientui/ambient-layer"
    : `npx shadcn add @ambientui/${id}`

function Entry({
  index,
  entry,
  onOpen,
}: {
  index: number
  entry: (typeof AMBIENT_COMPONENTS)[number]
  onOpen: (id: string) => void
}) {
  // Eleven entries carry a playground instead of a story — the interactive
  // prop surface IS their demonstration. Its controls portal into the Inspect
  // rail, which does not exist here, and ControlsHostContext defaults to null
  // with the portal guarded — so the preview renders and the controls simply
  // do not. Without this fallback those eleven showed a heading and nothing.
  const demo = entry.stories[0]?.render
  const Playground = entry.playground
  return (
    <section
      id={entry.id}
      className="scroll-mt-24 border-border flex flex-col gap-6 border-t pt-10"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline gap-4">
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {String(index).padStart(2, "0")}
          </span>
          <h2 className="text-xl font-semibold tracking-tight">{entry.name}</h2>
          {entry.group && (
            <span className="text-muted-foreground ms-auto font-mono text-[11px] tracking-wide uppercase">
              {entry.group}
            </span>
          )}
        </div>
        <p className="text-muted-foreground max-w-xl pl-10 text-sm leading-relaxed">
          {entry.description}
        </p>
      </div>

      {/* the component itself, running — never a picture of one */}
      {(demo || Playground) && (
        <div className="border-border bg-card rounded-2xl border p-6 sm:p-8">
          {demo ?? (Playground ? <Playground /> : null)}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <CommandLine className="min-w-0 flex-1" command={installFor(entry.id)} />
        <Button
          variant="ghost"
          className="shrink-0 justify-start sm:justify-center"
          onClick={() => onOpen(entry.id)}
        >
          Behavior and boundaries
          <Icon name="arrow-up-right" size={14} />
        </Button>
      </div>
    </section>
  )
}

export function GalleryPage({
  onOpenDocs,
  onHome,
}: {
  onOpenDocs?: () => void
  onHome?: () => void
}) {
  const open = React.useCallback(
    (id: string) => {
      window.history.pushState(null, "", dsHref(id))
      window.dispatchEvent(new PopStateEvent("popstate"))
      onOpenDocs?.()
    },
    [onOpenDocs]
  )

  // deep links land on a component; honour them after the page mounts
  React.useEffect(() => {
    const target = new URLSearchParams(window.location.search).get(DS_PARAM)
    if (!target) return
    document.getElementById(target)?.scrollIntoView({ block: "start" })
  }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-14 px-6 pt-24 pb-32">
        <header className="flex flex-col gap-5">
          {/* A long scroll with no way out is a trap. ⌘K reaches everything,
              but a page should not require knowing that to be escapable. */}
          <nav className="flex items-center gap-1 -ms-3">
            <Button variant="ghost" size="sm" onClick={onHome}>
              <Icon name="home" size={14} />
              Home
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenDocs?.()}>
              Design system
              <Icon name="arrow-up-right" size={13} />
            </Button>
          </nav>
          <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            The ambient vocabulary
          </span>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
            {AMBIENT_COMPONENTS.length} components for an interface that thinks
          </h1>
          <p className="text-muted-foreground max-w-xl text-base leading-relaxed">
            Everything below is the real component, running — not a screenshot.
            Each one installs on its own, carries its own behavior and
            boundaries, and inherits whatever design system you point it at.
          </p>
        </header>

        {AMBIENT_COMPONENTS.map((entry, i) => (
          <Entry key={entry.id} index={i + 1} entry={entry} onOpen={open} />
        ))}

        <footer
          className={cn(
            "border-border flex flex-col items-center gap-5 border-t pt-14 text-center"
          )}
        >
          <h2 className="max-w-md text-2xl font-semibold tracking-tight text-balance">
            Or take the whole layer at once
          </h2>
          <CommandLine
            size="lead"
            className="w-full max-w-xl"
            command="npx shadcn add @ambientui/ambient-layer"
          />
        </footer>
      </div>
    </div>
  )
}
