import { useCallback, useEffect, useState } from "react"

import { Toaster } from "@ambientui/ui/components/sonner"
import { TooltipProvider } from "@ambientui/ui/components/tooltip"

import { Assistant } from "ambientui/assistant"
import { useTheme } from "@/components/theme-provider"
import { AssistantProvider } from "ambientui/assistant-context"
import { CommandRegistry } from "@/components/command-registry"
import { DsPage } from "@/components/ds/ds-page"
import { HomePage } from "@/components/home/home-page"
import { FoundationProvider } from "@ambientui/foundation"
import { sections, type SectionId } from "@/nav"
import { BASE, stripBase, withBase } from "@/base"

import "ambientui/ambient.css"
import "@/theme.css"
import "@/viz.css"

// Sections map to URL paths ("/" is the canvas) so pages are addressable
// and survive a reload.
const sectionFromPath = (path: string): SectionId => {
  const id = path.replace(/^\/+|\/+$/g, "")
  return sections.some((s) => s.id === id) ? (id as SectionId) : "canvas"
}

const pathFromSection = (id: SectionId) =>
  withBase(id === "canvas" ? "/" : `/${id}`)

/** The one toast outlet — follows the app's appearance. */
function AppToaster() {
  const { theme } = useTheme()
  return <Toaster theme={theme === "dark" ? "dark" : "light"} />
}

export function App() {
  const [active, setActive] = useState<SectionId>(() =>
    sectionFromPath(stripBase(window.location.pathname))
  )

  // STABLE IDENTITY MATTERS HERE: this reaches the assistant context, and
  // anything registering against it (the command registry) re-runs whenever
  // it changes. A fresh closure per render made that registration churn.
  const navigateTo = useCallback((id: SectionId) => {
    setActive(id)
    if (window.location.pathname !== pathFromSection(id)) {
      window.history.pushState(null, "", pathFromSection(id))
    }
  }, [])
  const onNavigate = useCallback(
    (id: string) => navigateTo(id as SectionId),
    [navigateTo]
  )

  useEffect(() => {
    const onPopState = () =>
      setActive(sectionFromPath(stripBase(window.location.pathname)))
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  return (
    <TooltipProvider>
      {/* this site is served from /ambientui/ on Pages — the layer's shader
          assets have to be told, or they resolve against the domain root */}
      <FoundationProvider assetBase={BASE}>
      {/* the APP names its destinations; the layer only offers them, so the
          assistant no longer imports this product's route table */}
      <AssistantProvider
        onNavigate={onNavigate}
        navItems={sections.map((s) => ({
          id: s.id,
          label: s.label,
          desc: s.description,
          icon: s.icon,
        }))}
      >
        <div className="bg-background flex h-svh flex-col overflow-hidden">
          {active === "ds" ? (
            <DsPage />
          ) : (
            <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <HomePage />
            </main>
          )}
          <CommandRegistry />
          <Assistant />
          <AppToaster />
        </div>
      </AssistantProvider>
      </FoundationProvider>
    </TooltipProvider>
  )
}
