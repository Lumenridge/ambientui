/**
 * THE TAILWIND v3 DIALECT — the layer's source, rewritten for a project that
 * cannot move to Tailwind v4.
 *
 * The layer is written in v4 only; this module is the ONE place that maps v4
 * class syntax onto v3, applied at registry build time. v3 silently drops
 * classes it does not know, so `scripts/check-tailwind3.mjs` compiles every
 * class with both versions and fails if v3 would drop one.
 *
 * WHAT IS REWRITTEN: whole class tokens inside string literals, found through
 * the TypeScript AST, so a rule can never reach into code or prose.
 */
import ts from "typescript"

/* ------------------------------ the class map ----------------------------- */

/** Utilities whose bare `(--var)` form means a COLOR in v4. */
const COLOR_PREFIXES = new Set([
  "bg", "text", "fill", "stroke", "caret", "accent", "decoration",
  "outline", "ring", "ring-offset", "divide", "placeholder",
  "from", "via", "to",
  "border", "border-x", "border-y", "border-t", "border-r", "border-b",
  "border-l", "border-s", "border-e",
])

/**
 * v4 transition utilities that take a variable. The arbitrary PROPERTY form,
 * because with `tailwindcss-animate` installed v3 reads `duration-[var(--x)]`
 * as ambiguous and emits nothing.
 */
const PROPERTY_FOR = {
  duration: "transition-duration",
  delay: "transition-delay",
  ease: "transition-timing-function",
}

/**
 * v4 renamed the bottom of several scales (v4 `shadow-xs` is v3 `shadow-sm`),
 * so the same name renders one step apart. Radius is left out: in a shadcn
 * project `rounded-sm/md/lg` are the theme's radius roles in both versions.
 */
const RENAMED = {
  "shadow-2xs": "shadow-[0_1px_rgb(0_0_0/0.05)]",
  "shadow-xs": "shadow-sm",
  "shadow-sm": "shadow",
  "drop-shadow-xs": "drop-shadow-sm",
  "drop-shadow-sm": "drop-shadow",
  "blur-xs": "blur-sm",
  "blur-sm": "blur",
  "backdrop-blur-xs": "backdrop-blur-sm",
  "backdrop-blur-sm": "backdrop-blur",
  "rounded-xs": "rounded-sm",
  "outline-hidden": "outline-none",
  // NOT here: bare `ring` (1px in v4, 3px in v3). Its correct rewrite is
  // `ring-1`, but a bare English word inside a string literal could be copy,
  // and this map must never touch copy. The check flags it if it appears.
}

/** Utilities where `N/M` is a length, so it can become a percentage. */
const FRACTION_PREFIXES = new Set([
  "w", "h", "size", "min-w", "min-h", "max-w", "max-h", "basis",
  "inset", "inset-x", "inset-y", "top", "right", "bottom", "left",
  "start", "end", "translate-x", "translate-y",
])

/**
 * v4 accepts any multiple of 0.25 on the spacing scale (`p-13`, `size-4.5`);
 * v3 only has these steps. Anything else becomes an explicit rem value, which
 * is what v4 would have computed at the default 4px unit.
 */
const V3_SPACING = new Set([
  "0", "px", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "5", "6", "7",
  "8", "9", "10", "11", "12", "14", "16", "20", "24", "28", "32", "36", "40",
  "44", "48", "52", "56", "60", "64", "72", "80", "96",
])
const SPACING_PREFIXES = new Set([
  "p", "px", "py", "pt", "pr", "pb", "pl", "ps", "pe",
  "m", "mx", "my", "mt", "mr", "mb", "ml", "ms", "me",
  "gap", "gap-x", "gap-y", "space-x", "space-y",
  "w", "h", "size", "min-w", "min-h", "max-w", "max-h",
  "inset", "inset-x", "inset-y", "top", "right", "bottom", "left",
  "start", "end", "translate-x", "translate-y", "basis", "indent",
  "scroll-m", "scroll-p",
])
const V3_Z = new Set(["0", "10", "20", "30", "40", "50", "auto"])
const WIDTH_STEPS = {
  ring: new Set(["0", "1", "2", "4", "8"]),
  outline: new Set(["0", "1", "2", "4", "8"]),
  border: new Set(["0", "2", "4", "8"]),
  divide: new Set(["0", "2", "4", "8"]),
}

/** Split `hover:group-data-[x]:bg-red` into variants and the utility. */
function splitVariants(token) {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < token.length; i++) {
    const ch = token[i]
    if (ch === "[" || ch === "(") depth++
    else if (ch === "]" || ch === ")") depth--
    else if (ch === ":" && depth === 0) {
      parts.push(token.slice(start, i))
      start = i + 1
    }
  }
  parts.push(token.slice(start))
  return { variants: parts.slice(0, -1), utility: parts[parts.length - 1] }
}

/** The aria variants v3 ships; v4 accepts any `aria-<state>:`. */
const V3_ARIA = new Set([
  "busy", "checked", "disabled", "expanded", "hidden", "pressed",
  "readonly", "required", "selected",
])

/** Plain pseudo-class variants, for `not-<x>:`. */
const PSEUDO = new Set([
  "hover", "focus", "focus-visible", "focus-within", "active", "visited",
  "disabled", "enabled", "checked", "first", "last", "only", "odd", "even",
  "empty", "open",
])

/** The attribute selector a v4 `aria-*` / `data-*` variant matches. */
function attributeSelector(v) {
  let m = v.match(/^aria-\[(.+)\]$/)
  if (m) return `[aria-${m[1]}]`
  m = v.match(/^aria-([a-z]+)$/)
  if (m) return `[aria-${m[1]}="true"]`
  m = v.match(/^data-\[(.+)\]$/)
  if (m) return `[data-${m[1]}]`
  m = v.match(/^data-([a-z][a-z0-9-]*)$/)
  if (m) return `[data-${m[1]}]`
  return null
}

function variantToV3(v) {
  // v4 bare data variants (`data-open:`) are `data-[open]:` in v3
  let m = v.match(/^(group-|peer-)?data-([a-z][a-z0-9-]*)(\/[\w-]+)?$/)
  if (m) return `${m[1] ?? ""}data-[${m[2]}]${m[3] ?? ""}`

  // v4 takes any aria state; v3 only its fixed set, the rest as [x=true]
  m = v.match(/^(group-|peer-)?aria-([a-z]+)(\/[\w-]+)?$/)
  if (m && !V3_ARIA.has(m[2])) return `${m[1] ?? ""}aria-[${m[2]}=true]${m[3] ?? ""}`

  // `has-data-[x]:` / `has-aria-[x]:` are `has-[[data-x]]:` in v3.4
  m = v.match(/^has-((?:data|aria)-.+)$/)
  if (m) {
    const sel = attributeSelector(m[1])
    if (sel) return `has-[${sel}]`
  }

  // `not-<x>:` does not exist in v3; it is an arbitrary :not() variant
  m = v.match(/^not-(.+)$/)
  if (m) {
    const sel = attributeSelector(m[1]) ?? (PSEUDO.has(m[1]) ? `:${m[1]}` : null)
    if (sel) return `[&:not(${sel})]`
  }
  return v
}

/** `(--x)` or `(length:--x)` → `var(--x)` plus the type hint, if any. */
function parseVarArg(arg) {
  const m = arg.match(/^\((?:([a-z-]+):)?(--[\w-]+)\)$/)
  return m ? { hint: m[1], name: m[2] } : null
}

function utilityToV3(utility) {
  if (RENAMED[utility]) return RENAMED[utility]

  // prefix-(--var) / prefix-(hint:--var)
  const call = utility.match(/^(-?)([a-z][a-z0-9-]*?)-(\(.*\))$/)
  if (call) {
    const [, neg, prefix, arg] = call
    const v = parseVarArg(arg)
    if (v) {
      if (PROPERTY_FOR[prefix] && !v.hint) {
        return `[${PROPERTY_FOR[prefix]}:var(${v.name})]`
      }
      // v4 exposes its palette as --color-<hue>-<step>; v3 has the same
      // palette as utilities and no such variables
      const palette = v.name.match(/^--color-([a-z]+-\d{2,3}|black|white)$/)
      if (palette && COLOR_PREFIXES.has(prefix)) return `${prefix}-${palette[1]}`
      const hint = v.hint ?? (COLOR_PREFIXES.has(prefix) ? "color" : null)
      return `${neg}${prefix}-[${hint ? `${hint}:` : ""}var(${v.name})]`
    }
  }

  // prefix-N/M → prefix-[P%]
  const frac = utility.match(/^(-?)([a-z][a-z-]*?)-(\d+)\/(\d+)$/)
  if (frac && FRACTION_PREFIXES.has(frac[2])) {
    const pct = +((+frac[3] / +frac[4]) * 100).toFixed(6)
    return `${frac[1]}${frac[2]}-[${pct}%]`
  }

  // off-scale spacing → rem
  const sp = utility.match(/^(-?)([a-z][a-z-]*?)-(\d+(?:\.\d+)?)$/)
  if (sp && SPACING_PREFIXES.has(sp[2]) && !V3_SPACING.has(sp[3])) {
    const n = +sp[3]
    if (Number.isInteger(n * 4)) return `${sp[1]}${sp[2]}-[${n / 4}rem]`
  }

  // widths v3 has no step for: v4 takes any integer as px
  const width = utility.match(/^(ring|ring-offset|outline|outline-offset|border|border-[xytrblse]|divide-[xy])-(\d+)$/)
  if (width && !WIDTH_STEPS[width[1].split("-")[0]]?.has(width[2])) {
    return `${width[1]}-[${width[2]}px]`
  }

  // any integer z-index / opacity
  const z = utility.match(/^(-?)z-(\d+)$/)
  if (z && !V3_Z.has(z[2])) return `${z[1]}z-[${z[2]}]`
  const op = utility.match(/^opacity-(\d+)$/)
  if (op && +op[1] % 5 !== 0) return `opacity-[${+op[1] / 100}]`

  const grad = utility.match(/^bg-linear-to-([a-z]{1,2})$/)
  if (grad) return `bg-gradient-to-${grad[1]}`

  return utility
}

/**
 * One class token, v4 → v3. Returns the token unchanged when nothing applies,
 * which is the common case: most of v4's syntax is v3's.
 */
export function classToTailwind3(token) {
  if (!token || /\s/.test(token)) return token
  const { variants, utility: raw } = splitVariants(token)
  let utility = raw
  let important = false
  // v4 puts `!` last; v3 (and v4's legacy form) put it first
  if (utility.endsWith("!") && utility.length > 1) {
    important = true
    utility = utility.slice(0, -1)
  } else if (utility.startsWith("!")) {
    important = true
    utility = utility.slice(1)
  }
  const next = utilityToV3(utility)
  const out = [...variants.map(variantToV3), `${important ? "!" : ""}${next}`].join(":")
  return out
}

/** Rewrite every whitespace-separated token of a string's contents. */
function rewriteText(text) {
  return text.replace(/[^\s]+/g, (t) => classToTailwind3(t))
}

/* ---------------------------- the source rewrite --------------------------- */

/**
 * Apply the class map to one .ts/.tsx file. Only string-literal contents are
 * candidates: JSX attribute strings, `cn("…")` arguments, template literal
 * chunks, and constants holding class lists.
 */
export function sourceToTailwind3(text, fileName) {
  const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind)
  const edits = []

  const visit = (node) => {
    let open = 0
    let close = 0
    switch (node.kind) {
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        open = 1
        close = 1
        break
      case ts.SyntaxKind.TemplateHead:
        open = 1
        close = 2
        break
      case ts.SyntaxKind.TemplateMiddle:
        open = 1
        close = 2
        break
      case ts.SyntaxKind.TemplateTail:
        open = 1
        close = 1
        break
    }
    if (open) {
      const start = node.getStart(sf) + open
      const end = node.getEnd() - close
      const inner = text.slice(start, end)
      // module specifiers are strings too; skip them
      const parent = node.parent
      const isSpecifier =
        parent &&
        (ts.isImportDeclaration(parent) ||
          ts.isExportDeclaration(parent) ||
          ts.isExternalModuleReference(parent))
      if (!isSpecifier) {
        const next = rewriteText(inner)
        if (next !== inner) edits.push([start, end, next])
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)

  let out = text
  for (const [start, end, next] of edits.sort((a, b) => b[0] - a[0])) {
    out = out.slice(0, start) + next + out.slice(end)
  }
  return out
}
