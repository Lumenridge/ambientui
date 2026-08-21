import { useEffect, useState } from "react"

import { TooltipProvider } from "@workspace/ui/components/tooltip"

import { Assistant } from "@/components/assistant/assistant"
import { AssistantProvider } from "@/components/assistant/assistant-context"
import { DsPage } from "@/components/ds/ds-page"
import { FoundationProvider } from "@/foundation/foundation-context"
import { sections, type SectionId } from "@/nav"

import "@/theme.css"
import "@/viz.css"

// Sections map to URL paths ("/" is the canvas) so pages are addressable
// and survive a reload.
const sectionFromPath = (path: string): SectionId => {
  const id = path.replace(/^\/+|\/+$/g, "")
  return sections.some((s) => s.id === id) ? (id as SectionId) : "canvas"
}

const pathFromSection = (id: SectionId) => (id === "canvas" ? "/" : `/${id}`)

export function App() {
  const [active, setActive] = useState<SectionId>(() =>
    sectionFromPath(window.location.pathname)
  )

  const navigateTo = (id: SectionId) => {
    setActive(id)
    if (window.location.pathname !== pathFromSection(id)) {
      window.history.pushState(null, "", pathFromSection(id))
    }
  }

  useEffect(() => {
    const onPopState = () =>
      setActive(sectionFromPath(window.location.pathname))
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  return (
    <TooltipProvider>
      <FoundationProvider>
      <AssistantProvider onNavigate={(id) => navigateTo(id as SectionId)}>
        <div className="bg-background flex h-svh flex-col overflow-hidden">
          {active === "ds" ? (
            <DsPage />
          ) : (
            <main className="flex flex-1 items-center justify-center">
              <div className="text-muted-foreground flex flex-col items-center gap-2 text-sm select-none">
                <p className="text-foreground/80 text-base font-medium">
                  ambientui
                </p>
                <p>
                  Press <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">⌘K</kbd> — or drag the orb.
                </p>
              </div>
            </main>
          )}
          <Assistant />
        </div>
      </AssistantProvider>
      </FoundationProvider>
    </TooltipProvider>
  )
}
