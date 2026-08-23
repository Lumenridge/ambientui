/**
 * THE BARE MOUNT — the executable proof that the ambient layer stands alone.
 *
 * Served at /bare.html in dev only (Vite builds index.html; this entry is not
 * in rollup's input, so it never ships). It renders <Assistant /> with NO
 * FoundationProvider, NO IconLibraryProvider and NO TooltipProvider — which is
 * the entire claim behind distributing the layer on its own.
 *
 * If this page ever throws, or the orb stops rendering, the seam in
 * ambient-runtime.tsx has regressed and the layer has quietly re-acquired a
 * dependency on this app. That is a release blocker, not a dev annoyance.
 *
 * Run it after any change to the layer's imports, and again after the move
 * into packages/ambient.
 */
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@workspace/ui/globals.css"
import "@/theme.css"

import { Assistant } from "@/components/assistant/assistant"
import { AssistantProvider } from "@/components/assistant/assistant-context"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AssistantProvider>
      <div style={{ padding: 40, fontFamily: "system-ui" }}>
        <h1>Bare mount</h1>
        <p>No FoundationProvider. No IconLibraryProvider. No TooltipProvider.</p>
      </div>
      <Assistant />
    </AssistantProvider>
  </StrictMode>
)
