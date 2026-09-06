import { defineConfig } from "tsup"
import { preserveDirectivesPlugin } from "esbuild-plugin-preserve-directives"

/**
 * ONE OUTPUT FILE PER SOURCE FILE — `bundle: false`.
 *
 * The exports map is per-module (`./*`), so bundling would collapse the very
 * structure consumers import through.
 *
 * `preserveDirectives` is not optional. esbuild strips top-level directives as
 * dead code, which silently removes every `"use client"` — the build succeeds,
 * publishes cleanly, and then fails in every Next.js App Router app that
 * installs it.
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
