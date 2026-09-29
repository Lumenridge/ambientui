import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import "./app.css"

/**
 * A product NOT built on Tailwind or shadcn: its own
 * stylesheet, browser defaults everywhere else, no lib/utils, no token block.
 * Tailwind v4 is installed the way the install plan does it for such a
 * product: theme and utilities only, with the preflight confined to the
 * layer. Imports nothing from ambientui: what the doors add is what's tested.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <h1 className="product-title">consumer fixture</h1>
    <button className="product-button">A product button</button>
  </StrictMode>
)
