#!/usr/bin/env node
/**
 * Proves every single-library icon variant can still be cut from icon.tsx.
 * The cut is structural, so a reshaped icon.tsx must fail here, not publish.
 */
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { ICON_LIBRARIES, iconSourceFor } from "./variants/icons.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const source = readFileSync(resolve(ROOT, "packages/ui/src/components/icon.tsx"), "utf8")
const libs = Object.keys(ICON_LIBRARIES)
for (const lib of libs) {
  try {
    const out = iconSourceFor(lib, source)
    for (const other of libs.filter((l) => l !== lib)) {
      for (const pkg of ICON_LIBRARIES[other].packages) {
        if (out.includes(`from "${pkg}"`)) throw new Error(`still imports ${pkg}`)
      }
    }
  } catch (e) {
    console.error(`✗ icon-${lib}: ${e.message}`)
    process.exit(1)
  }
}
console.log(`✔ icon variants: ${libs.length} single-library cuts`)
