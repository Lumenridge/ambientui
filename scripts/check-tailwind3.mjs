#!/usr/bin/env node
/**
 * PROVES THE TAILWIND v3 DOOR IS COMPLETE — every class the layer uses still
 * styles something after the v3 rewrite.
 *
 * On Tailwind v3 a v4-only class silently generates nothing, so:
 *
 *   1. every class in the layer's string literals that v4 generates,
 *   2. rewritten by scripts/variants/tailwind-v3.mjs,
 *   3. must generate in v3 against a stock shadcn v3 config,
 *   4. and must set the same CSS properties it set in v4 (catches renames).
 *
 * It also proves the HSL-triplet stylesheet wraps every standard role.
 */
import { compile } from "@tailwindcss/node"
import postcss from "postcss"
import tw3 from "tailwindcss-v3"
import animate from "tailwindcss-animate"
import ts from "typescript"
import { readdirSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { classToTailwind3 } from "./variants/tailwind-v3.mjs"
import { cssToHslTokens, SHADCN_ROLES } from "./variants/hsl-tokens.mjs"
import { variant } from "./variants/index.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SRC = resolve(ROOT, "packages/ambient/src")

/**
 * String literals that Tailwind v4 would ALSO read as a class, but that are
 * data, not styling. Each needs a reason, the same rule as NOT_DISTRIBUTABLE.
 */
const NOT_A_CLASS = {
  running: "a tool-call status value (knowledge-kit.tsx), not animation-play-state",
  outline: 'a Button variant prop (variant="outline"), not the outline utility',
}

/** Classes the layer's own stylesheet declares; they need no Tailwind. */
const MATERIAL = new Set(
  [...readFileSync(resolve(SRC, "styles/ambient.css"), "utf8").matchAll(/^\.([a-z][\w-]*)\s*[{,:]/gm)].map((m) => m[1])
)

/**
 * Same effect, different property name. v4 writes logical shorthands and
 * the individual transform properties; v3 writes the physical pair and
 * `transform`. A v4 property is satisfied by itself or by any of these.
 */
const EQUIVALENT = {
  "padding-inline": ["padding-left", "padding-right"],
  "padding-block": ["padding-top", "padding-bottom"],
  "margin-inline": ["margin-left", "margin-right"],
  "margin-block": ["margin-top", "margin-bottom"],
  "inset-inline": ["left", "right"],
  "inset-block": ["top", "bottom"],
  translate: ["transform"],
  scale: ["transform"],
  rotate: ["transform"],
  "outline-style": ["outline"],
  "outline-width": ["outline"],
}

/**
 * v4 utilities set border and divide STYLE explicitly; v3 leaves it to its
 * preflight (`* { border-style: solid }`), which every v3 project has.
 */
const covered = (p) => /^border(-[a-z]+)*-style$/.test(p)

/* ------------------------------ the classes ------------------------------ */

/** The layer's sources, plus the primitives the v3 door bundles. */
const SOURCES = [
  ...readdirSync(SRC)
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => resolve(SRC, f)),
  ...variant("styling", "tailwind-v3").bundles.map((b) =>
    resolve(ROOT, `packages/ui/src/components/${b}.tsx`)
  ),
]

/** Every whitespace token of every string literal in those sources. */
function literalTokens() {
  const tokens = new Set()
  for (const path of SOURCES) {
    const f = path.slice(path.lastIndexOf("/") + 1)
    const text = readFileSync(path, "utf8")
    const kind = f.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, kind)
    const visit = (node) => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
        for (const t of node.text.split(/\s+/)) if (t) tokens.add(t)
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return [...tokens].sort()
}

/* ------------------------------ the compilers ----------------------------- */

const V4_BASE = resolve(ROOT, "packages/ui/src/styles")
const V4_CSS = readFileSync(resolve(V4_BASE, "globals.css"), "utf8").replace(
  /@import "tailwindcss"[^;]*;/,
  '@import "tailwindcss/theme.css" layer(theme) theme(static); @import "tailwindcss/utilities.css" layer(utilities);'
)

/** The body of the `@layer utilities { … }` block, braces balanced. */
function utilitiesLayer(css) {
  const at = css.search(/@layer utilities\s*\{/)
  if (at === -1) return ""
  const open = css.indexOf("{", at)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++
    else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i)
  }
  return ""
}

/** The utilities v4 emits for one class, or "" if it is not a class. */
async function v4(cls) {
  const c = await compile(V4_CSS, { base: V4_BASE, onDependency() {} })
  return utilitiesLayer(c.build([cls])).trim()
}

/**
 * A stock shadcn v3 project: what `shadcn init` writes to tailwind.config
 * for v3 (with tailwindcss-animate), plus the sidebar colours
 * `shadcn add sidebar` appends.
 */
const hsl = (n) => `hsl(var(--${n}))`
const withFg = (n) => ({ DEFAULT: hsl(n), foreground: hsl(`${n}-foreground`) })
const V3_THEME = {
  colors: {
    border: hsl("border"),
    input: hsl("input"),
    ring: hsl("ring"),
    background: hsl("background"),
    foreground: hsl("foreground"),
    primary: withFg("primary"),
    secondary: withFg("secondary"),
    destructive: withFg("destructive"),
    muted: withFg("muted"),
    accent: withFg("accent"),
    popover: withFg("popover"),
    card: withFg("card"),
    sidebar: {
      DEFAULT: hsl("sidebar-background"),
      foreground: hsl("sidebar-foreground"),
      primary: hsl("sidebar-primary"),
      "primary-foreground": hsl("sidebar-primary-foreground"),
      accent: hsl("sidebar-accent"),
      "accent-foreground": hsl("sidebar-accent-foreground"),
      border: hsl("sidebar-border"),
      ring: hsl("sidebar-ring"),
    },
  },
  borderRadius: {
    lg: "var(--radius)",
    md: "calc(var(--radius) - 2px)",
    sm: "calc(var(--radius) - 4px)",
  },
}

async function v3(cls) {
  // raw text, not HTML: v3's extractor reads it verbatim, so an entity
  // (`&amp;`) would hide an arbitrary variant like `[&_svg]:` from it
  const out = await postcss([
    tw3({
      darkMode: ["class"],
      content: [{ raw: ` ${cls} `, extension: "html" }],
      corePlugins: { preflight: false },
      theme: { extend: V3_THEME },
      // makes `duration-[var(--x)]` ambiguous: compile against the hard case
      plugins: [animate],
    }),
  ]).process("@tailwind utilities;", { from: undefined })
  return out.css.includes("{") ? out.css : ""
}

/** The CSS properties a rule sets — the meaning, not the spelling. */
function properties(css) {
  const props = new Set()
  // declarations only, not selectors like `svg:not(…) {`; the last
  // declaration of a block may omit its semicolon
  for (const m of css.matchAll(/(?:^|[;{\s])(-?[a-z][a-z-]*)\s*:\s*[^;{}]+(?:;|(?=\s*\}))/g)) {
    const p = m[1]
    if (p.startsWith("-webkit-") || p.startsWith("-moz-")) continue
    props.add(p)
  }
  return props
}

/* -------------------------------- the check ------------------------------- */

// v3 warns on every compile that sees no classes; it is noise here
const warn = console.warn
console.warn = () => {}

const problems = []
let checked = 0
let rewritten = 0

for (const cls of literalTokens()) {
  if (cls in NOT_A_CLASS || MATERIAL.has(cls)) continue
  const four = await v4(cls)
  if (!four) continue // copy, keys, ids: not something Tailwind styles
  checked++
  const next = classToTailwind3(cls)
  if (next !== cls) rewritten++
  const three = await v3(next)
  if (!three) {
    problems.push(`${cls} → ${next}: generates nothing in Tailwind v3`)
    continue
  }
  const want = properties(four)
  const got = properties(three)
  const missing = [...want].filter(
    (p) =>
      !p.startsWith("--") &&
      !covered(p) &&
      !got.has(p) &&
      !(EQUIVALENT[p] ?? []).some((q) => got.has(q))
  )
  if (missing.length) {
    problems.push(`${cls} → ${next}: v3 does not set ${missing.join(", ")}`)
  }
}
console.warn = warn

// the triplet stylesheet: no standard role may be read bare
const hslCss = cssToHslTokens(
  readFileSync(resolve(SRC, "styles/ambient.css"), "utf8")
)
const bare = new RegExp(`(?<!hsl\\()var\\(--(${SHADCN_ROLES.join("|")})\\)`)
const leak = hslCss.match(bare)
if (leak) problems.push(`ambient-styles-hsl still reads ${leak[0]} without hsl()`)

if (problems.length) {
  console.error("✗ the Tailwind v3 door would drop styling:")
  for (const p of problems) console.error(`    ${p}`)
  console.error(
    "  Add a rule to scripts/variants/tailwind-v3.mjs, or list a non-class literal in NOT_A_CLASS."
  )
  process.exit(1)
}
console.log(
  `✔ Tailwind v3 door complete — ${checked} classes compile in v3 (${rewritten} rewritten)`
)
