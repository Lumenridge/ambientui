#!/usr/bin/env node
/**
 * READS the component catalog out of ds-docs.tsx. Writes nothing.
 *
 * ds-docs.tsx stays the single source of truth: the prose lives beside the
 * live JSX stories it describes, which is the right place to author it. This
 * derives a data-only view for the registry to consume, IN MEMORY — so there
 * is no second copy on disk that could go stale, and no hand-maintained
 * mapping between what is documented and what is installable.
 *
 * It uses the TypeScript parser rather than regular expressions. The entries
 * interleave prose with JSX; a regex that looked right on the first ten would
 * quietly mangle the eleventh.
 *
 * CLAUDE.md rule 10 says undocumented components do not exist. This is that
 * rule made mechanical: a component reaches the registry BECAUSE it is
 * documented, through the documentation itself.
 */
import ts from "typescript"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const TARGET = resolve(ROOT, "apps/web/src/components/ds/catalog.ts")

const DATA_KEYS = ["id", "name", "group", "description", "behavior", "whenToUse", "whenNotToUse"]
const ARRAY_KEYS = new Set(["behavior", "whenToUse", "whenNotToUse"])

const literal = (n) =>
  ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ? n.text : null

export function readCatalog() {
  const text = readFileSync(TARGET, "utf8")
  const sf = ts.createSourceFile(TARGET, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

  const arrays = {}
  ;(function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      /^(SHADCN_DEFAULT_COMPONENTS|AMBIENT_COMPONENTS)$/.test(node.name.getText()) &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      arrays[node.name.getText()] = node.initializer
    }
    ts.forEachChild(node, visit)
  })(sf)

  const missing = ["SHADCN_DEFAULT_COMPONENTS", "AMBIENT_COMPONENTS"].filter((k) => !arrays[k])
  if (missing.length) throw new Error(`ds-docs.tsx: could not find ${missing.join(", ")}`)

  const entries = []
  for (const [arrayName, arr] of Object.entries(arrays)) {
    const vocabulary = arrayName.startsWith("AMBIENT") ? "ambient" : "product"
    for (const el of arr.elements) {
      if (!ts.isObjectLiteralExpression(el)) throw new Error(`${arrayName}: non-object entry`)
      const entry = { vocabulary }
      for (const prop of el.properties) {
        if (!ts.isPropertyAssignment(prop)) continue
        const key = prop.name.getText()
        if (!DATA_KEYS.includes(key)) continue
        if (ARRAY_KEYS.has(key)) {
          if (!ts.isArrayLiteralExpression(prop.initializer))
            throw new Error(`${entry.id ?? "?"}.${key} is not an array literal`)
          const vals = prop.initializer.elements.map(literal)
          if (vals.some((v) => v === null))
            throw new Error(`${entry.id ?? "?"}.${key} has a non-literal element`)
          entry[key] = vals
        } else {
          const v = literal(prop.initializer)
          if (v === null) throw new Error(`${entry.id ?? "?"}.${key} is not a string literal`)
          entry[key] = v
        }
      }
      if (!entry.id || !entry.name) throw new Error(`${arrayName}: entry missing id or name`)
      entries.push(entry)
    }
  }
  return entries
}

// pathToFileURL, not string concatenation — this repo lives under a path with
// spaces, and `file://${argv[1]}` never matches an encoded URL
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const c = readCatalog()
  const by = (v) => c.filter((e) => e.vocabulary === v).length
  console.log(`✔ catalog: ${c.length} documented components (${by("ambient")} ambient, ${by("product")} product)`)
}
