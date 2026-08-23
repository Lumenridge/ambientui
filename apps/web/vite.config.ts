import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

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
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // the layer is a package now; resolve it by name, not by path
      "ambientui": path.resolve(__dirname, "../../packages/ambient/src"),
      "@ambientui/foundation": path.resolve(
        __dirname,
        "../../packages/foundation/src/foundation-context.tsx"
      ),
    },
  },
})
