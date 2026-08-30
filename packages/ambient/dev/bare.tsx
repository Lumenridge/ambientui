import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { Assistant } from "../src/assistant"
import { AssistantProvider } from "../src/assistant-context"
import "../src/styles/ambient.css"

/**
 * THE NO-PROVIDER PROOF.
 *
 * The layer's central claim is that it renders and animates with no design
 * system attached — no FoundationProvider, no IconLibraryProvider, no
 * TooltipProvider — falling back to DEFAULT_AMBIENT_RUNTIME. This harness
 * is that claim, executable.
 *
 * IT LIVES IN THE PACKAGE, NOT THE SITE, and that is not a filing decision:
 * a route in the site would inherit the root layout, which mounts exactly
 * the providers this exists to do without. It would keep passing while
 * testing nothing.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div style={{ padding: 32, fontFamily: "system-ui" }}>
      <h1>ambient layer, bare</h1>
      <p>No FoundationProvider. No IconLibraryProvider. No TooltipProvider.</p>
      <p>Press ⌘K, or drag the orb.</p>
    </div>
    <AssistantProvider>
      <Assistant />
    </AssistantProvider>
  </StrictMode>
)
