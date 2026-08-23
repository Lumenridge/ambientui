#!/usr/bin/env node
/** Fails if the vendored shadcn stylesheet has drifted from the installed one. */
import { readFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const vendored = resolve(ROOT, "packages/ui/src/styles/shadcn-base.css")
const upstream = resolve(ROOT, "node_modules/shadcn/dist/tailwind.css")

if (!existsSync(upstream)) {
  console.log("· shadcn not installed; skipping vendored-CSS drift check")
  process.exit(0)
}
const ours = readFileSync(vendored, "utf8")
const theirs = readFileSync(upstream, "utf8")
const body = ours.slice(ours.indexOf("*/") + 2).trimStart()

if (body !== theirs.trimStart()) {
  console.error(
    "✗ packages/ui/src/styles/shadcn-base.css has drifted from node_modules/shadcn/dist/tailwind.css.\n" +
      "  Re-vendor it (keep the header) rather than hand-editing."
  )
  process.exit(1)
}
console.log("✔ vendored shadcn stylesheet matches upstream")
