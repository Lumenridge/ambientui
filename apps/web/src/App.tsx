import * as React from "react"
import { useEffect, useState } from "react"

import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"

import { Assistant } from "@/components/assistant/assistant"
import { OrbField } from "@/components/assistant/orb-character"
import { useTheme } from "@/components/theme-provider"
import { AssistantProvider } from "@/components/assistant/assistant-context"
import { DsPage } from "@/components/ds/ds-page"
import { FoundationProvider, useFoundation } from "@/foundation/foundation-context"
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

/**
 * The canvas ground: the heat field at stage strength behind a thin veil,
 * wearing the saved orb palette — the page IS the ambient layer's ground
 * (presentation surface). Near-frozen, so it reads as a still shader.
 */
function CanvasBackdrop() {
  const { config } = useFoundation()
  // A BRIGHT ground: the vivid end of the Foundation's accent family
  // (steps 300→500 into white). Still token-driven — change the accent and
  // the stage re-tints — but tuned light, so it carries a projected room.
  // Resolved to concrete values because the shader's loader can't read
  // var() references.
  const [colors, setColors] = React.useState<string[] | undefined>(undefined)
  React.useEffect(() => {
    const family =
      config.accent === "neutral-accent" ? "neutral" : config.accent
    const cs = getComputedStyle(document.documentElement)
    const step = (n: string) =>
      cs.getPropertyValue(`--color-${family}-${n}`).trim()
    const ramp = [step("200"), step("400"), step("500"), "#ffffff"].filter(
      Boolean
    )
    setColors(ramp.length === 4 ? ramp : undefined)
  }, [config.accent])

  return (
    <>
      <OrbField
        state="thinking"
        /* speed 0 freezes the shader — the ground is a still image, not a
           moving backdrop; the ambient layer's motion belongs to the AI
           surfaces, not the page behind them */
        speed={0}
        strength="stage"
        colors={colors}
      />
      <div className="ambient-stage-frost pointer-events-none absolute inset-0" />
    </>
  )
}

/** The one toast outlet — follows the app's appearance. */
function AppToaster() {
  const { theme } = useTheme()
  return <Toaster theme={theme === "dark" ? "dark" : "light"} />
}

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
            <main className="relative flex flex-1 items-center justify-center overflow-hidden">
              {/* The canvas wears the ambient identity as a still backdrop
                  — the heat field at rest behind a frost veil. Presentation
                  surface: the page IS the ambient layer's ground. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden"
              >
                <CanvasBackdrop />
              </div>
              <div className="text-muted-foreground relative flex flex-col items-center gap-2 text-sm select-none">
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
          <AppToaster />
        </div>
      </AssistantProvider>
      </FoundationProvider>
    </TooltipProvider>
  )
}
