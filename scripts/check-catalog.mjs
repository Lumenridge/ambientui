#!/usr/bin/env node
/**
 * THE SECOND BIJECTION: documented ↔ demonstrated.
 *
 * The registry build already enforces documented ↔ installable — a
 * documented component that resolves to no export fails the build. Splitting
 * the catalog from its stories opened a new way to drift, in the other
 * direction: prose with no demo, or a demo for a component nobody documented.
 * Neither breaks a type or a build; both are invisible until someone opens
 * the page and finds an empty panel.
 *
 * So the same rule the registry uses applies here. Anything documented must
 * have stories or a NAMED REASON not to, and no story may exist for an id
 * the catalog has never heard of.
 *
 * Reads the STORIES keys with the TypeScript parser rather than importing
 * the module — stories.tsx pulls the entire demo kit, and a gate that has to
 * boot React to check a list of strings is a gate people turn off.
 */
import ts from "typescript"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { readCatalog } from "./extract-catalog.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const STORIES_FILE = resolve(ROOT, "apps/site/src/components/ds/stories.tsx")

/**
 * Documented, deliberately WITHOUT a demo. Every entry needs a reason — the
 * same contract as NOT_DISTRIBUTABLE in build-registry.mjs.
 */
const NO_STORIES = {}

function storyKeys() {
  const text = readFileSync(STORIES_FILE, "utf8")
  const sf = ts.createSourceFile(
    STORIES_FILE,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  let record = null
  ;(function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText() === "STORIES" &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      record = node.initializer
    }
    ts.forEachChild(node, visit)
  })(sf)
  if (!record) throw new Error("stories.tsx: could not find the STORIES record")
  return record.properties.map((p) => {
    const name = p.name
    if (ts.isStringLiteral(name) || ts.isIdentifier(name)) return name.text
    throw new Error("stories.tsx: STORIES has a computed key")
  })
}

const catalog = readCatalog()
const ids = new Set(catalog.map((e) => e.id))
const keys = storyKeys()

const ghosts = keys.filter((k) => !ids.has(k))
const undemoed = catalog.filter((e) => !keys.includes(e.id) && !NO_STORIES[e.id])

if (ghosts.length) {
  console.error("✗ stories for components that are not documented:")
  for (const g of ghosts) console.error(`  · ${g}`)
}
if (undemoed.length) {
  console.error("✗ documented with no stories and no reason in NO_STORIES:")
  for (const e of undemoed) console.error(`  · ${e.id}`)
}
if (ghosts.length || undemoed.length) process.exit(1)

const excused = Object.keys(NO_STORIES).length
console.log(
  `✔ catalog ↔ stories: ${keys.length} demonstrated${excused ? `, ${excused} excused` : ""}`
)
