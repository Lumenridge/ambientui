/**
 * ADAPT — the doors stay generic; the files they land are fitted to this
 * product afterwards, from what the doctor found. Small per-product
 * differences are applied to the installed files rather than multiplied into
 * registry variants:
 *
 *   strip-use-client  removed outside React Server Components apps, where it
 *                     only produces a bundler warning per file.
 *   accent            follows the product's --primary when it is chromatic;
 *                     a neutral primary keeps the default blue.
 *   orb-assets        moved to the product's static dir when it is not
 *                     public/, or the orb renders blank.
 *
 * Decisions are pure (`adaptationsFor`, shown in the plan); changes are
 * applied by `applyAdaptations`. Every adaptation is idempotent.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { isDir, rel, walk } from "./util.mjs"

/* ------------------------------- decisions ------------------------------- */

const NEUTRAL_PALETTES = new Set(["gray", "slate", "zinc", "neutral", "stone", "white", "black"])

/** Is a colour value chromatic? true / false, or null when it cannot tell. */
export function isChromatic(value) {
  if (!value) return null
  const v = value.trim()
  let m = v.match(/oklch\(\s*([\d.]+%?)\s+([\d.]+)/i)
  if (m) return parseFloat(m[2]) >= 0.05
  m = v.match(/^(?:hsla?\(\s*)?([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i)
  if (m) {
    const s = parseFloat(m[2])
    const l = parseFloat(m[3])
    return s >= 25 && l > 12 && l < 90
  }
  m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1]
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min)
    return s >= 0.25 && l > 0.12 && l < 0.9
  }
  m = v.match(/--color-([a-z]+)-\d{2,3}/)
  if (m) return !NEUTRAL_PALETTES.has(m[1])
  return null
}

/**
 * What to adapt for this product. Pure: profile (+ the plan fields already
 * decided) in, a list of adaptations out, each with the reason and the
 * evidence the owner can check.
 */
export function adaptationsFor(profile, { srcRoot = ".", staticDir = "public", path } = {}) {
  const out = []

  if (!profile.framework?.rsc) {
    out.push({
      id: "strip-use-client",
      dir: join(srcRoot, "components/ambient"),
      // shadcn primitives the install added carry it too; never the product's own
      newIn: join(srcRoot, profile.shadcn?.uiDirFromSrc ?? "components/ui"),
      why: `${profile.framework?.name ?? "this app"} is not a React Server Components app, so the layer's "use client" directives only print a bundler warning per file`,
    })
  }

  // the Foundation owns the accent on the full path (the bridge sets it)
  const primary = profile.tokens?.primary
  if (path !== "full" && primary) {
    const chromatic = isChromatic(primary.value)
    const triplet = profile.tokens?.format === "hsl-triplet"
    const value = triplet ? "hsl(var(--primary))" : "var(--primary)"
    if (chromatic) {
      out.push({
        id: "accent",
        value,
        wash: `color-mix(in oklab, ${value} 10%, transparent)`,
        washDark: `color-mix(in oklab, ${value} 16%, transparent)`,
        evidence: `${primary.file}:${primary.line} --primary: ${primary.value}`,
        why: "the product's primary is a real colour, so the assistant's accent follows it instead of a blue unrelated to the product",
      })
    } else {
      out.push({
        id: "accent",
        skip: true,
        evidence: `${primary.file}:${primary.line} --primary: ${primary.value}`,
        why:
          chromatic === false
            ? "the product's primary is a neutral, so the layer keeps its blue accent (a gray glow would read as disabled)"
            : "the product's primary could not be read as a colour, so the layer keeps its blue accent",
      })
    }
  }

  if ((staticDir ?? "public") !== "public") {
    out.push({
      id: "orb-assets",
      to: staticDir,
      why: `the product serves static files from ${staticDir}/, and the orb's artwork lands in public/`,
    })
  }
  return out
}

/* -------------------------------- changes -------------------------------- */

const DIRECTIVE = /^(\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*)["']use client["'];?\n\n?/

function stripUseClient(appAbs, a, isNew) {
  const dir = join(appAbs, a.dir)
  if (!isDir(dir)) return { changed: [], note: `${a.dir} not found` }
  const files = walk(dir, { maxFiles: 2000 }).files
  // without isNew the product's ui dir is left alone: its files cannot be
  // told from the install's
  if (a.newIn && isNew && isDir(join(appAbs, a.newIn))) {
    files.push(...walk(join(appAbs, a.newIn), { maxFiles: 2000 }).files.filter(isNew))
  }
  const changed = []
  for (const f of files) {
    if (!/\.(tsx?|jsx?)$/.test(f)) continue
    const text = readFileSync(f, "utf8")
    const next = text.replace(DIRECTIVE, "$1")
    if (next !== text) {
      writeFileSync(f, next)
      changed.push(f)
    }
  }
  return { changed }
}

/** Replace the accent values the registry's cssVars wrote, or append them. */
function applyAccent(root, appAbs, plan, profile, a) {
  const candidates = [
    plan.css?.entry,
    profile.styling?.cssEntry,
    ...(profile.tokens?.files ?? []),
  ]
    .filter(Boolean)
    .map((f) => join(root, f))
    .filter((f, i, all) => existsSync(f) && all.indexOf(f) === i)
  const lines = [
    [/(--ambient-accent\s*:\s*)[^;]+;/, `$1${a.value};`],
    [/(--ambient-accent-wash\s*:\s*)[^;]+;/, null],
  ]
  const changed = []
  for (const f of candidates) {
    const text = readFileSync(f, "utf8")
    if (!/--ambient-accent\s*:/.test(text)) continue
    // light block first, dark block second: the wash differs between them
    let n = 0
    const next = text
      .replace(new RegExp(lines[0][0], "g"), (_m, p) => `${p}${a.value};`)
      .replace(new RegExp(lines[1][0], "g"), (_m, p) => `${p}${n++ === 0 ? a.wash : a.washDark};`)
    if (next !== text) {
      writeFileSync(f, next)
      changed.push(f)
    }
    return { changed }
  }
  // nothing declared it: append it to the CSS entry, where it wins over
  // ambient.css's zero-specificity default
  const entry = candidates[0]
  if (!entry) return { changed, note: "no CSS entry to write the accent into" }
  const text = readFileSync(entry, "utf8")
  if (text.includes("ambientui: the accent follows")) return { changed }
  writeFileSync(
    entry,
    `${text.trimEnd()}\n\n/* ambientui: the accent follows the product's primary */\n:root {\n  --ambient-accent: ${a.value};\n  --ambient-accent-wash: ${a.wash};\n}\n.dark {\n  --ambient-accent-wash: ${a.washDark};\n}\n`
  )
  return { changed: [entry] }
}

function moveOrbAssets(root, appAbs, a, isNew) {
  const from = join(appAbs, "public")
  const to = resolve(appAbs, a.to)
  if (from === to || !isDir(from)) return { changed: [] }
  const changed = []
  const conflicts = []
  for (const f of walk(from, { maxFiles: 5000 }).files) {
    if (!/\/orb-[\w-]+\.svg$/.test(f) || (isNew && !isNew(f))) continue
    const dest = join(to, rel(from, f))
    if (existsSync(dest)) {
      conflicts.push(`${rel(root, f)} (exists at ${rel(root, dest)})`)
      continue
    }
    mkdirSync(dirname(dest), { recursive: true })
    renameSync(f, dest)
    changed.push(`${rel(root, f)} → ${rel(root, dest)}`)
  }
  return { changed, conflicts }
}

/**
 * Apply the plan's adaptations. `isNew(file)` limits moves to files the
 * install created (install passes it; `ambientui adapt` on its own moves
 * only orb artwork, which the product never had).
 */
export function applyAdaptations({ root, plan, profile, isNew }) {
  const appAbs = join(root, plan.appDirFromRoot ?? ".")
  const results = []
  for (const a of plan.adapt ?? []) {
    if (a.skip) {
      results.push({ id: a.id, skipped: true, why: a.why })
      continue
    }
    let r = { changed: [] }
    if (a.id === "strip-use-client") r = stripUseClient(appAbs, a, isNew)
    else if (a.id === "accent") r = applyAccent(root, appAbs, plan, profile, a)
    else if (a.id === "orb-assets") r = moveOrbAssets(root, appAbs, a, isNew)
    results.push({
      id: a.id,
      why: a.why,
      changed: r.changed.map((f) => (f.includes(" → ") ? f : rel(root, f))),
      conflicts: r.conflicts ?? [],
      note: r.note ?? null,
    })
  }
  return results
}
