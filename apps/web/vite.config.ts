import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // the layer is a package now; resolve it by name, not by path
      "@ambientui/ambient": path.resolve(__dirname, "../../packages/ambient/src"),
    },
  },
})
