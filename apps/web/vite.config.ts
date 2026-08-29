import { cpSync } from "node:fs"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

/**
 * THE ORB'S SHAPES BELONG TO THE LAYER, NOT TO THIS SITE. They live in
 * packages/ambient/assets so the registry can ship them to a consumer's
 * public/ — without them an installed layer renders a cold, empty canvas
 * and reports nothing. This copies them into the site's public dir at
 * startup and build, so there is exactly ONE copy under version control
 * and the site cannot drift from what it publishes.
 */
function orbShapes(): Plugin {
  const from = path.resolve(__dirname, "../../packages/ambient/assets")
  const to = path.resolve(__dirname, "public")
  const copy = () => cpSync(from, to, { recursive: true })
  return {
    name: "ambientui:orb-shapes",
    buildStart: copy,
    configureServer: copy,
  }
}

/**
 * BASE PATH IS A VARIABLE. GitHub Pages serves a project site from
 * /<repo>/, so every asset URL carries that prefix — and the day a custom
 * domain arrives it must not. One env var, set in the deploy workflow,
 * rather than a value baked into the build.
 */
const base = process.env.AMBIENTUI_BASE ?? "/"

export default defineConfig({
  base,
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  plugins: [orbShapes(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Files whose FINAL home is the Next app already live there; this app
      // borrows them until it is retired. One copy, in its destination.
      "@site": path.resolve(__dirname, "../site/src"),
      // the layer is a package now; resolve it by name, not by path
      "ambientui": path.resolve(__dirname, "../../packages/ambient/src"),
      "@ambientui/foundation": path.resolve(
        __dirname,
        "../../packages/foundation/src/foundation-context.tsx"
      ),
    },
  },
})
