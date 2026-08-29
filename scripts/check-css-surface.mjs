#!/usr/bin/env node
/**
 * THE FAILURE MODE THIS EXISTS FOR IS SILENCE.
 *
 * Tailwind v4 finds classes by scanning the paths in `@source`. Those globs
 * are PATH-SHAPED (`apps/*​/src/**`), so moving code — into a new app, into a
 * framework's `app/` directory, out of `src/` — can stop the scanner seeing
 * it. Nothing errors. The build succeeds, the bundle is smaller, and the
 * site renders unstyled.
 *
 * Two modes:
 *
 *   --snapshot   write the emitted class list to a file (the baseline)
 *   (default)    fail if any SENTINEL class is missing from the built CSS
 *
 * Sentinels are deliberately RARE classes that are actually used. Common
 * ones (flex, p-4) survive partial detection and would hide the regression;
 * an arbitrary value like `text-[11px]` only exists if the file declaring it
 * was scanned. A handful of rare classes is a better alarm than thousands of
 * common ones.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs"
import { resolve, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/** Where a build puts its CSS. First one that exists wins. */
const CSS_DIRS = [
  "apps/web/dist/assets",
  // Next emits stylesheets into chunks/, not css/ — a wrong guess here
  // makes the check silently find nothing, which is the same failure it
  // exists to catch
  "apps/site/out/_next/static/chunks",
  "apps/site/out/_next/static/css",
]

function builtCss() {
  for (const dir of CSS_DIRS) {
    const full = join(ROOT, dir)
    if (!existsSync(full)) continue
    const files = readdirSync(full).filter((f) => f.endsWith(".css"))
    if (files.length) {
      return files.map((f) => readFileSync(join(full, f), "utf8")).join("\n")
    }
  }
  return null
}

/**
 * Class selectors in the emitted CSS. Tailwind escapes the interesting
 * characters (`.text-\[11px\]`), so the unescaped form is what a source
 * file would contain — that is what we compare against.
 */
function classesIn(css) {
  const found = new Set()
  for (const m of css.matchAll(/\.(-?[A-Za-z_][^\s{},:>+~()"'[\]]*)/g)) {
    found.add(m[1].replace(/\\/g, ""))
  }
  // arbitrary-value utilities carry brackets, which the pattern above stops at
  for (const m of css.matchAll(/\.((?:[-\w]|\\.)+\\\[[^\]]*\\\])/g)) {
    found.add(m[1].replace(/\\/g, ""))
  }
  return found
}

/**
 * RARE CLASSES THAT MUST SURVIVE. Each names a file whose scanning it
 * proves — pick a new one from a file, never a class you would find
 * everywhere.
 */
const SENTINELS = [
  // apps/web/src/components/home/playbook-view.tsx — the wireframe device
  "rounded-tl",
  "border-l-2",
  "text-[11px]",
  // apps/web/src/components/home/overview-view.tsx — the wordmark + demos
  "fill-foreground",
  "aspect-video",
  "max-w-5xl",
  // apps/web/src/components/ds/* — the reference pages
  "min-h-32",
  "tracking-widest",
  // packages/ambient/src — the layer's own surfaces
  "ambient-glass",
  "ambient-shimmer",
  // packages/ui/src/components — the product vocabulary
  "peer/menu-button",
]

const css = builtCss()
if (!css) {
  console.error(
    `✗ no built CSS found. Build first, then run this:\n    ${CSS_DIRS.map((d) => `    ${d}`).join("\n")}`
  )
  process.exit(1)
}

const classes = classesIn(css)

if (process.argv.includes("--snapshot")) {
  const out = [...classes].sort().join("\n") + "\n"
  const target = resolve(ROOT, "scripts/css-surface.snapshot.txt")
  writeFileSync(target, out)
  console.log(`✔ snapshot: ${classes.size} classes → scripts/css-surface.snapshot.txt`)
  process.exit(0)
}

const missing = SENTINELS.filter((s) => !classes.has(s))
if (missing.length) {
  console.error("✗ classes vanished from the built CSS:")
  for (const m of missing) console.error(`    .${m}`)
  console.error(
    "  Tailwind's @source globs are path-shaped — check packages/ui/src/styles/globals.css\n" +
      "  still covers where the code lives. This failure is otherwise silent."
  )
  process.exit(1)
}

/**
 * A COARSE FLOOR AS WELL, taken from the committed snapshot rather than a
 * number someone guessed: a build can lose a whole directory and still keep
 * every sentinel by luck. 10% headroom, because utilities legitimately come
 * and go as code changes — this is an alarm for a cliff, not a ratchet.
 *
 * Re-snapshot deliberately (`--snapshot`) when the drop is explained.
 */
const snapshotPath = resolve(ROOT, "scripts/css-surface.snapshot.txt")
if (existsSync(snapshotPath)) {
  const baseline = readFileSync(snapshotPath, "utf8").trim().split("\n").length
  const floor = Math.floor(baseline * 0.9)
  if (classes.size < floor) {
    console.error(
      `✗ the built CSS has ${classes.size} classes; the snapshot had ${baseline} (floor ${floor}).`
    )
    console.error("  Something stopped being scanned, or the drop needs a new snapshot.")
    process.exit(1)
  }
}

console.log(`✔ css surface: ${classes.size} classes, ${SENTINELS.length} sentinels present`)
