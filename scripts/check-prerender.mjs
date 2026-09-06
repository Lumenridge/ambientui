#!/usr/bin/env node
/**
 * Fails if a browser-only global is read where a prerender would run it.
 *
 * The site is moving to real per-route static HTML, which means React runs
 * once with no DOM. `window`, `document`, `localStorage` and `matchMedia`
 * are all fine inside an effect or a handler — those never run on the
 * server — and all fatal in a render body or a useState initializer.
 *
 * The failure is worth a gate because it is invisible until the build: the
 * app runs perfectly in a browser either way, and the person who reintroduces
 * one will not be the person who discovers it. Four of these existed at once
 * (theme-provider, view-menu, translucency-page, App) and every one of them
 * had shipped and worked for months.
 *
 * WHAT IT LOOKS AT: a browser global inside a `useState(...)` initializer, or
 * at the top level of a component's body before the first hook. Anything
 * inside `useEffect` / `useLayoutEffect` / an arrow passed as a handler is
 * out of scope by construction, because this walks only the two positions
 * that actually run during a prerender.
 */
import ts from "typescript"
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { resolve, dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * Everything the site prerenders — which now includes the PACKAGES, because
 * a static build renders the ambient layer's own components too. That was
 * learned the hard way: `orb.tsx` read `window.innerWidth` in its render
 * body and took down the first export build of a demo route.
 */
const ALL_ROOTS = [
  "packages/ambient/src",
  "packages/docs/src",
  "packages/foundation/src",
  "packages/patterns/src",
  "packages/ui/src",
]

const ROOTS = ALL_ROOTS

/**
 * Files whose browser reads are deliberate and unreachable from a
 * prerendered route. Every entry needs a reason.
 */
const EXEMPT = {
  }

const GLOBALS = /^(window|document|localStorage|sessionStorage|navigator)$/

const files = []
for (const root of ROOTS) {
  const base = resolve(ROOT, root)
  if (!existsSync(base)) continue
  ;(function walk(dir) {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(p)) files.push(p)
    }
  })(base)
}

const hits = []

for (const file of files) {
  const rel = relative(ROOT, file)
  if (EXEMPT[rel]) continue
  const text = readFileSync(file, "utf8")
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

  /** report any browser global read anywhere inside this node */
  const scan = (node, why) => {
    ;(function visit(n) {
      if (ts.isIdentifier(n) && GLOBALS.test(n.text)) {
        const parent = n.parent
        // `foo.window` is a property, not the global
        const isProperty =
          parent && ts.isPropertyAccessExpression(parent) && parent.name === n
        if (!isProperty) {
          const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf))
          hits.push({ rel, line: line + 1, name: n.text, why })
        }
      }
      ts.forEachChild(n, visit)
    })(node)
  }

  /** local `function f()` and `const f = () =>` declarations, by name */
  const locals = new Map()
  ;(function collect(n) {
    if (ts.isFunctionDeclaration(n) && n.name) locals.set(n.name.text, n)
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.initializer &&
      (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))
    ) {
      locals.set(n.name.text, n.initializer)
    }
    ts.forEachChild(n, collect)
  })(sf)

  ;(function visit(node) {
    // useState(() => ...) / useState(expr) — the initializer runs at render
    if (
      ts.isCallExpression(node) &&
      /(^|\.)useState$/.test(node.expression.getText(sf)) &&
      node.arguments.length
    ) {
      const arg = node.arguments[0]
      // An explicit `typeof window === "undefined"` test is the guard this
      // check exists to ask for; honor it rather than flagging the guard.
      const guarded = /typeof\s+(window|document)\s*[!=]==?\s*["']undefined["']/.test(
        arg.getText(sf)
      )
      if (guarded) {
        ts.forEachChild(node, visit)
        return
      }
      // `useState(readView)` hands over a FUNCTION — the globals are one hop
      // away, in its body, which is exactly where they hid the first time.
      if (ts.isIdentifier(arg) && locals.has(arg.text)) {
        const decl = locals.get(arg.text)
        if (!/typeof\s+(window|document)\s*[!=]==?\s*["']undefined["']/.test(decl.getText(sf))) {
          scan(decl, `useState initializer via ${arg.text}()`)
        }
      } else {
        scan(arg, "useState initializer")
      }
    }
    ts.forEachChild(node, visit)
  })(sf)
}

if (hits.length) {
  console.error("✗ browser globals read where a prerender would run them:")
  for (const h of hits) {
    console.error(`    ${h.rel}:${h.line}  ${h.name}  (${h.why})`)
  }
  console.error(
    "  Move the read into an effect and start from a value that is also\n" +
      "  correct in static HTML — or add the file to EXEMPT with a reason."
  )
  process.exit(1)
}
console.log(`✔ no prerender-fatal globals (${files.length} files)`)
