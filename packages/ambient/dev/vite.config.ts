import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

/** Dev-only: the bare-mount harness. Never built, never published. */
export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  publicDir: "../assets",
})
