#!/usr/bin/env node
/**
 * THE THIRD BIJECTION: described ↔ loaded ↔ on disk.
 *
 * The governing documents are split in two — system-docs.meta.ts describes
 * them, system-docs.source.ts loads their bytes — so a page can list them
 * without importing ~9,000 lines of markdown. That split can drift in three
 * directions, and only one of them is caught by a compiler:
 *
 *   · described but not loaded  → the page renders an empty document
 *   · loaded but not described  → bytes in the bundle nothing can reach
 *   · described but not on disk → today a Vite build error, and after the
 *     move to build-time file reads, a silently empty page
 *
 * The third is the one worth the most: `?raw` currently makes a missing file
 * fail the build for free, and that guarantee disappears the moment the
 * imports become `readFileSync`. Checking it here means the guarantee
 * outlives the mechanism that used to provide it.
 *
 * Slugs are checked too: they become public URLs, and two documents sharing
 * one would silently shadow each other.
 */
import ts from "typescript"
import { readFileSync, existsSync } from "node:fs"
import { resolve, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
// the metadata lives in the site app (its final home); the ?raw sources
// remain with the SPA until it is retired
const META = resolve(ROOT, "apps/site/src/lib/system-docs.meta.ts")
const SOURCE = resolve(ROOT, "apps/web/src/components/ds/system-docs.source.ts")

const parse = (file) =>
  ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  )

/** [{ id, slug, path }] from the metadata array */
function readMeta() {
  const sf = parse(META)
  let arr = null
  ;(function visit(n) {
    if (
      ts.isVariableDeclaration(n) &&
      n.name.getText() === "SYSTEM_DOC_META" &&
      n.initializer &&
      ts.isArrayLiteralExpression(n.initializer)
    ) arr = n.initializer
    ts.forEachChild(n, visit)
  })(sf)
  if (!arr) throw new Error("system-docs.meta.ts: SYSTEM_DOC_META not found")

  return arr.elements.map((el) => {
    const out = {}
    for (const p of el.properties) {
      if (!ts.isPropertyAssignment(p)) continue
      const key = p.name.getText()
      if (["id", "slug", "path"].includes(key)) {
        if (!ts.isStringLiteral(p.initializer))
          throw new Error(`system-docs.meta.ts: ${key} is not a string literal`)
        out[key] = p.initializer.text
      }
    }
    for (const k of ["id", "slug", "path"]) {
      if (!out[k]) throw new Error(`system-docs.meta.ts: an entry is missing ${k}`)
    }
    return out
  })
}

/** the keys of the SYSTEM_DOC_SOURCE record */
function readSourceKeys() {
  const sf = parse(SOURCE)
  let rec = null
  ;(function visit(n) {
    if (
      ts.isVariableDeclaration(n) &&
      n.name.getText() === "SYSTEM_DOC_SOURCE" &&
      n.initializer &&
      ts.isObjectLiteralExpression(n.initializer)
    ) rec = n.initializer
    ts.forEachChild(n, visit)
  })(sf)
  if (!rec) throw new Error("system-docs.source.ts: SYSTEM_DOC_SOURCE not found")
  return rec.properties.map((p) => {
    const name = p.name
    if (ts.isStringLiteral(name) || ts.isIdentifier(name)) return name.text
    throw new Error("system-docs.source.ts: a computed key")
  })
}

const meta = readMeta()
const keys = readSourceKeys()
const ids = new Set(meta.map((m) => m.id))

const problems = []
for (const m of meta) {
  if (!keys.includes(m.id)) problems.push(`described but not loaded: ${m.id}`)
  if (!existsSync(join(ROOT, m.path)))
    problems.push(`described but not on disk: ${m.id} → ${m.path}`)
}
for (const k of keys) {
  if (!ids.has(k)) problems.push(`loaded but not described: ${k}`)
}
const slugs = new Map()
for (const m of meta) {
  if (slugs.has(m.slug))
    problems.push(`duplicate slug "${m.slug}": ${slugs.get(m.slug)} and ${m.id}`)
  slugs.set(m.slug, m.id)
}

if (problems.length) {
  console.error("✗ the governing-document halves disagree:")
  for (const p of problems) console.error(`    ${p}`)
  process.exit(1)
}
console.log(`✔ governing documents: ${meta.length} described, loaded and present`)
