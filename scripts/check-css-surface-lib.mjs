#!/usr/bin/env node
/**
 * THE LIBRARY'S CSS SURFACE, MEASURED WITHOUT THE SITE.
 *
 * check-css-surface.mjs reads the site's build output — a library invariant
 * measured through an app that is moving to its own repo. This one compiles
 * scripts/css-probe.css with @tailwindcss/cli, so the packages prove their
 * classes survive a Tailwind scan with no app anywhere: the same alarm, from
 * inside the library's own walls.
 *
 * Two modes, same contract as the site check:
 *
 *   --snapshot   write the class list baseline
 *   (default)    fail if a sentinel is missing, or the count falls off a cliff
 */
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const scratch = mkdtempSync(join(tmpdir(), "ambientui-css-probe-"))
const out = join(scratch, "probe.css")
execFileSync(
  "npx",
  ["@tailwindcss/cli", "-i", resolve(ROOT, "scripts/css-probe.css"), "-o", out],
  { cwd: ROOT, stdio: "pipe" }
)
const css = readFileSync(out, "utf8")

/** Same extraction as the site check — the escaped selector, unescaped. */
function classesIn(text) {
  const found = new Set()
  for (const m of text.matchAll(/\.(-?[A-Za-z_][^\s{},:>+~()"'[\]]*)/g)) {
    found.add(m[1].replace(/\\/g, ""))
  }
  for (const m of text.matchAll(/\.((?:[-\w]|\\.)+\\\[[^\]]*\\\])/g)) {
    found.add(m[1].replace(/\\/g, ""))
  }
  return found
}

/**
 * RARE CLASSES THAT MUST SURVIVE — each proves one package is scanned.
 * Pick from a file, never a class you would find everywhere.
 */
const SENTINELS = [
  // packages/ui/src/components/sidebar.tsx
  "peer/menu-button",
  // packages/ambient/src — the layer's material (declared in ambient.css)
  "ambient-glass",
  "ambient-shimmer",
  // packages/ambient/src/assistant.tsx — an arbitrary-width utility only a
  // scan of the layer's sources can produce
  "w-[640px]",
  // packages/patterns/src/view-menu.tsx — the shortcut kbd
  "text-[11px]",
]

const classes = classesIn(css)

if (process.argv.includes("--snapshot")) {
  const target = resolve(ROOT, "scripts/css-surface-lib.snapshot.txt")
  writeFileSync(target, [...classes].sort().join("\n") + "\n")
  console.log(`✔ snapshot: ${classes.size} classes → scripts/css-surface-lib.snapshot.txt`)
  process.exit(0)
}

const missing = SENTINELS.filter((s) => !classes.has(s))
if (missing.length) {
  console.error("✗ classes vanished from the library's compiled CSS:")
  for (const m of missing) console.error(`    .${m}`)
  console.error(
    "  The probe's @source globs (scripts/css-probe.css) no longer cover\n" +
      "  where the code lives. This failure is otherwise silent."
  )
  process.exit(1)
}

const snapshotPath = resolve(ROOT, "scripts/css-surface-lib.snapshot.txt")
if (existsSync(snapshotPath)) {
  const baseline = readFileSync(snapshotPath, "utf8").trim().split("\n").length
  const floor = Math.floor(baseline * 0.9)
  if (classes.size < floor) {
    console.error(
      `✗ the compiled probe has ${classes.size} classes; the snapshot had ${baseline} (floor ${floor}).`
    )
    console.error("  Something stopped being scanned, or the drop needs a new snapshot.")
    process.exit(1)
  }
}

console.log(`✔ library css surface: ${classes.size} classes, ${SENTINELS.length} sentinels present`)
