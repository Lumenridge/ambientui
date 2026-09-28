/**
 * TAILWIND'S PREFLIGHT, SCOPED TO THE LAYER — for a product not built on
 * Tailwind.
 *
 * The layer's components assume preflight: shadcn's buttons show the
 * browser's default border and background without it. But preflight is a
 * GLOBAL reset, and adding it to a product styled another way restyled that
 * product: Excalidraw's menu items grew from 42px to 47px (line-height on
 * <html>), headings and lists lost their margins, and only the properties
 * the product never set moved, so the change was patchy and easy to miss in
 * review (2026-09-28). "Layer only" promises the product's screens stay
 * exactly as they are.
 *
 * So the build generates a copy of Tailwind v4's own preflight.css with
 * every selector confined to `.ambient-scope`, the class on the layer's root
 * (assistant.tsx). The product gets no reset; the layer gets the one it was
 * written against. Excalidraw's hand-made version of this measured zero
 * computed-style differences across 737 of the product's elements.
 */
import postcss from "postcss"

const SCOPE = ".ambient-scope"

/** Selectors that meant "the document" now mean "the layer's root". */
const ROOT_SELECTORS = new Set(["html", ":host", "body", ":root"])

function scopeSelector(sel) {
  const s = sel.trim()
  if (ROOT_SELECTORS.has(s)) return `:where(${SCOPE})`
  // universal and pseudo-element resets apply to the root AND inside it
  if (s === "*") return `:where(${SCOPE}, ${SCOPE} *)`
  if (s.startsWith("::")) return `:where(${SCOPE}, ${SCOPE} *)${s}`
  if (s.startsWith("*")) return `:where(${SCOPE}, ${SCOPE} *)${s.slice(1)}`
  // `html` or `:host` leading a longer selector keeps its tail
  for (const root of ROOT_SELECTORS) {
    if (s.startsWith(`${root} `) || s.startsWith(`${root}:`)) {
      return `:where(${SCOPE})${s.slice(root.length)}`
    }
  }
  return `:where(${SCOPE}) ${s}`
}

export async function scopedPreflight(css) {
  const root = postcss.parse(css)
  root.walkRules((rule) => {
    // keyframe steps are not selectors
    if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)) return
    rule.selectors = rule.selectors.map(scopeSelector)
  })
  return (
    "/* ambientui — Tailwind's preflight, confined to the ambient layer\n" +
    "   (.ambient-scope). Generated from tailwindcss/preflight.css by\n" +
    "   scripts/variants/scoped-preflight.mjs; do not edit by hand. */\n\n" +
    root.toString()
  )
}
