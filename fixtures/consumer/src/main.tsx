import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"

/** Imports nothing from ambientui: what the doors add is what gets tested. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <p>consumer fixture</p>
  </StrictMode>
)
