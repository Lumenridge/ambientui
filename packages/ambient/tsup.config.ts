import { defineConfig } from "tsup"
import { preserveDirectivesPlugin } from "esbuild-plugin-preserve-directives"

/**
 * ONE OUTPUT FILE PER SOURCE FILE — `bundle: false`.
 *
 * The exports map is per-module (`./components/*`), so bundling would collapse
 * the very structure consumers import through. It also keeps a consumer's own
 * tree-shaking honest: they take the button, not the package.
 *
 * `preserveDirectives` is not optional. esbuild strips top-level directives as
 * dead code, which silently removes every `"use client"` — the build succeeds,
 * publishes cleanly, and then fails in every Next.js App Router app that
 * installs it. That failure is far from its cause, so it is guarded here.
 */
export default defineConfig({
  entry: ["src/**/*.ts", "src/**/*.tsx"],
  format: ["esm"],
  dts: true,
  bundle: false,
  clean: true,
  sourcemap: true,
  outDir: "dist",
  esbuildPlugins: [
    preserveDirectivesPlugin({
      directives: ["use client", "use server"],
      include: /\.(js|ts|jsx|tsx)$/,
      exclude: /node_modules/,
    }),
  ],
})
