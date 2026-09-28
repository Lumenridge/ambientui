import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

// The layer's contract tests (test/): the palette behaviours real hosts
// broke, held in place. jsdom, and the package's own path to @ambient-ui/ui.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@ambient-ui\/ui\/(.*)$/, replacement: resolve(__dirname, "../ui/src/$1") }],
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.tsx"],
  },
})
