import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Tailwind v3 runs through PostCSS (postcss.config.js), not a Vite plugin.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
})
