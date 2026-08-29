import * as React from "react"

import { Tabs, TabsContent } from "@ambientui/ui/components/tabs"

import { cn } from "@ambientui/ui/lib/utils"

import { useAssistant } from "ambientui/assistant-context"

import { withBase } from "@/base"
import { CanvasBackdrop } from "@/components/canvas-backdrop"
import { DevToolView } from "@/components/home/devtool-view"
import { OverviewView } from "@/components/home/overview-view"
import { PlaybookView } from "@/components/home/playbook-view"
import { ViewMenu } from "@/components/view-menu"

/**
 * THE HOME SURFACE — four views of the same argument.
 *
 * `overview` is the front door: one landing screen naming the thing and
 * opening the doors. `architecture` is the paper as a follow-along article
 * (Stop AI drift), built from the system it explains. `devtool` shows an
 * ambient layer docked beside real work; `canvas` is the presentation
 * ground, a page that is nothing but the layer.
 *
 * The tab lives in the URL (`?view=`) rather than in component state, because
 * a view someone can't link to or reload into is a demo, not a page.
 */

const VIEWS = [
  // `icon` is what each view IS, for the context chip and the menu segment.
  //
  // ORDER IS THE VISIT: the overview greets, the architecture argues, the
  // dev tool shows the layer doing something, and the canvas is the
  // quieter claim.
  { id: "overview", label: "Overview", chip: "Home · Overview", icon: "home" },
  { id: "architecture", label: "Architecture", chip: "Home · The architecture", icon: "ruler" },
  { id: "devtool", label: "Dev tool", chip: "Home · Dev tool", icon: "code" },
  { id: "canvas", label: "Canvas", chip: "Home · Canvas", icon: "image" },
] as const

type ViewId = (typeof VIEWS)[number]["id"]

const readView = (): ViewId => {
  const v = new URLSearchParams(window.location.search).get("view")
  // the playbook grew up and became the architecture; old links still land
  if (v === "playbook") return "architecture"
  return VIEWS.some((x) => x.id === v) ? (v as ViewId) : "overview"
}

export function HomePage() {
  const [view, setView] = React.useState<ViewId>(readView)
  const { setPageChip } = useAssistant()

  React.useEffect(() => {
    const onPop = () => setView(readView())
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  // The assistant rides along: whichever view is open is the page context.
  // THE MORE SPECIFIC PAGE WINS — the dev tool declares the open FILE, which
  // is what a question there is actually about, so this shell stays out of
  // its way rather than overwriting it with the tab's name.
  const declaresOwnChip = view === "devtool"
  React.useEffect(() => {
    if (declaresOwnChip) return
    const active = VIEWS.find((v) => v.id === view)
    setPageChip({
      id: `home-${view}`,
      kind: "page",
      label: active!.chip,
      icon: active!.icon,
    })
    return () => setPageChip(null)
  }, [view, declaresOwnChip, setPageChip])

  const select = (next: string) => {
    const id = next as ViewId
    setView(id)
    const url = withBase(id === "overview" ? "/" : `/?view=${id}`)
    if (window.location.pathname + window.location.search !== url) {
      window.history.pushState(null, "", url)
    }
  }

  return (
    <Tabs
      value={view}
      onValueChange={select}
      className="relative min-h-0 flex-1 gap-0 overflow-hidden"
    >
      {/* The canvas is full-bleed, so the switcher floats over it on the
          layer's own glass rather than sitting in a chrome strip that would
          cut the presentation surface in half. A tab strip would spend that
          room permanently; the menu spends it only while you are choosing
          (see ViewMenu). Over the canvas it floats centred on the photo; over
          the editor it docks top-right, sharing the file-tab strip instead of
          covering it. Same object, placed by what is beneath it. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 z-20 flex items-start",
          view === "devtool" ? "top-1.5 justify-end pe-3" : "top-4 justify-center"
        )}
      >
        {/* Home IS the overview, and the overview is the first segment —
            a separate home control would be the same destination twice. */}
        <ViewMenu items={VIEWS} value={view} onSelect={select} />
      </div>

      <TabsContent
        value="canvas"
        className="relative m-0 flex min-h-0 flex-1 items-center justify-center overflow-hidden"
      >
        {/* The canvas wears the ambient identity as a still backdrop.
            Presentation surface: the page IS the ambient layer's ground. */}
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
      </TabsContent>

      <TabsContent
        value="overview"
        className="m-0 min-h-0 flex-1 overflow-y-auto pt-16"
      >
        <OverviewView onNavigate={select} />
      </TabsContent>

      <TabsContent
        value="architecture"
        className="m-0 min-h-0 flex-1 overflow-y-auto pt-16"
      >
        <PlaybookView />
      </TabsContent>

      {/* the editor is a full-bleed app, not a document: it owns the whole
          panel and scrolls its own panes. No top padding — the tab pill sits
          over the editor chrome, not above it */}
      <TabsContent
        value="devtool"
        className="m-0 min-h-0 flex-1 overflow-hidden"
      >
        <DevToolView />
      </TabsContent>
    </Tabs>
  )
}
