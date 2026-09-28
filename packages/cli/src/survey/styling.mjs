/**
 * HOW THE PRODUCT IS STYLED — the facts that choose the door.
 *
 * WHY THIS IS THE CENTRE OF THE SURVEY. The layer ships in four dialects
 * (Tailwind v4 colour tokens, v4 with HSL triplets, Tailwind v3, and no
 * Tailwind at all) and every one of them fails QUIETLY when chosen wrong:
 * the wrong token format renders transparent glass with no error, an
 * `@import` after `@tailwind` is dropped with only a warning, a global
 * preflight restyles every screen of a product that never had one. So the
 * Tailwind version is read from what is installed (the declared range only
 * when node_modules is absent), the token format from the actual values, and
 * the CSS entry from the file that really loads Tailwind.
 */
import { dirname, join, resolve } from "node:path"

import { exists, findLine, isDir, readJson, walk } from "../util.mjs"
import { versionOf } from "./project.mjs"

/** The layer's own files: never evidence about the HOST. */
export const OURS = /(^|\/)components\/ambient\/|(^|\/)(lib|services|api)\/ambient\/|(^|\/)styles\/ambient[^/]*\.css$|(^|\/)\.ambientui\//

/* --------------------------------- entry ---------------------------------- */

/**
 * THE ENTRY FILE — where the v3 material import goes, and where the root
 * component is found. Read from what actually boots the app: index.html's
 * module script for Vite, `entry` for webpack, the root layout for Next.
 */
export function detectEntry(ctx, framework) {
  const a = ctx.app.abs
  const pick = (cands) => cands.map((c) => join(a, c)).find(exists) ?? null
  let entry = null
  if (framework.name === "next") {
    const dir = framework.routerDir ? join(a, framework.routerDir) : null
    if (framework.router === "app" && dir) {
      const { files } = walk(dir, { exts: ["layout.tsx", "layout.jsx", "layout.ts", "layout.js"], maxFiles: 50 })
      // The shallowest layout is the root one (`app/[locale]/layout.tsx`
      // when the root has none).
      entry = files.sort((x, y) => x.split("/").length - y.split("/").length)[0] ?? null
    } else if (dir) entry = pick(["_app.tsx", "_app.jsx", "_app.js"].map((f) => join(framework.routerDir, f)))
  } else if (framework.name === "vite" || framework.name === "react-router") {
    const cfgDir = framework.configFile ? dirname(join(ctx.root, framework.configFile)) : a
    const cfg = framework.configFile ? ctx.read(join(ctx.root, framework.configFile)) ?? "" : ""
    const rootM = /\broot\s*:\s*["'`]([^"'`]+)["'`]/.exec(cfg)
    const viteRoot = rootM ? resolve(cfgDir, rootM[1]) : cfgDir
    const html = ctx.read(join(viteRoot, "index.html"))
    const m = html && /<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i.exec(html)
    if (m) {
      const p = m[1].startsWith("/") ? join(viteRoot, m[1]) : resolve(viteRoot, m[1])
      if (exists(p)) {
        entry = p
        ctx.ev("entry", { file: join(viteRoot, "index.html"), note: m[0] })
      }
    }
    entry ??= pick(["src/main.tsx", "src/main.jsx", "src/index.tsx", "src/main.ts", "app/root.tsx"])
  } else if (framework.name === "webpack") {
    const cfg = ctx.read(join(ctx.root, framework.configFile)) ?? ""
    const m = /entry\s*:\s*(?:\{[^}]*?:\s*)?\[?\s*["'`]([^"'`]+)["'`]/s.exec(cfg)
    if (m) {
      const p = resolve(dirname(join(ctx.root, framework.configFile)), m[1])
      if (exists(p)) {
        entry = p
        ctx.ev("entry", { file: framework.configFile, note: m[0].replace(/\s+/g, " ") })
      }
    }
    entry ??= pick(["src/index.tsx", "src/index.jsx", "src/index.js"])
  } else if (framework.name === "remix") {
    entry = pick(["app/root.tsx", "app/root.jsx"])
  } else {
    entry = pick(["src/index.tsx", "src/index.jsx", "src/index.js", "src/main.tsx"])
  }
  if (!entry) return { file: null, rootComponent: null }

  // THE ROOT COMPONENT: what the entry renders (`import App from "./App"`),
  // which is where providers usually live. Next's layout IS the root.
  let rootComponent = entry
  if (framework.name === "next" && framework.router === "app" && framework.routerDir) {
    // THE CLIENT PROVIDERS a layout renders: the layer mounts there, since a
    // layout is a server component. Any layout may hold it (`[locale]/`).
    const { files } = walk(join(a, framework.routerDir), { exts: ["layout.tsx", "layout.jsx"], maxFiles: 50 })
    outer: for (const lf of files) {
      const text = ctx.read(lf) ?? ""
      for (const [, comp, spec] of text.matchAll(/import\s+(?:\{\s*)?(\w*Providers?)\b[^;]*?from\s+["']([^"']+)["']/g)) {
        if (!new RegExp(`<${comp}[\\s>]`).test(text)) continue
        const base = spec.startsWith("@/") ? join(ctx.srcRootAbs, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(lf), spec) : null
        if (!base) continue
        const f = ["", ".tsx", ".jsx", "/index.tsx"].map((x) => base + x).find((p) => exists(p) && !isDir(p))
        if (f && /["']use client["']/.test(ctx.read(f) ?? "")) {
          rootComponent = f
          ctx.ev("entry.providers", { file: lf, note: `renders <${comp}> from ${spec}` })
          break outer
        }
      }
    }
  } else if (framework.name !== "next") {
    const text = ctx.read(entry) ?? ""
    const at = text.search(/\.render\(|\brender\(/)
    const slice = at >= 0 ? text.slice(at, at + 1200) : ""
    // The first rendered component imported from a relative file is the
    // app's root (wrappers like StrictMode or a store Provider are not).
    const found = []
    for (const [, comp] of slice.matchAll(/<([A-Z][\w]*)/g)) {
      const imp = new RegExp(`import\\s+(?:\\{[^}]*\\b${comp}\\b[^}]*\\}|${comp})\\s+from\\s+["']([^"']+)["']`).exec(text)
      if (!imp || !imp[1].startsWith(".")) continue
      const base = resolve(dirname(entry), imp[1])
      const f = ["", ".tsx", ".jsx", ".ts", ".js", "/index.tsx", "/index.jsx"].map((x) => base + x).find((p) => exists(p) && !isDir(p))
      if (f) found.push({ comp, f })
    }
    // `App`/`Root` by name; else the innermost (last) one, since wrappers
    // (ToastProvider, ErrorBoundary) open before the app they wrap.
    const pick = found.find((x) => /^(App|Root|\w+App)$/.test(x.comp)) ?? found[found.length - 1]
    if (pick) rootComponent = pick.f
  }
  ctx.ev("entry", { file: entry })
  return { file: ctx.rel(entry), rootComponent: ctx.rel(rootComponent) }
}

/* -------------------------------- tailwind -------------------------------- */

export function detectTailwind(ctx) {
  const v = versionOf(ctx, "tailwindcss")
  if (!v) return null
  ctx.ev("styling.tailwind", { pkg: `tailwindcss@${v.installed ?? v.declared}`, file: v.declaredIn, note: v.source })
  const configFile = ["tailwind.config.js", "tailwind.config.cjs", "tailwind.config.mjs", "tailwind.config.ts"]
    .flatMap((f) => [join(ctx.app.abs, f), join(ctx.root, f)])
    .find(exists)
  return {
    version: v.text,
    major: v.major,
    minor: v.minor,
    source: v.source,
    declared: v.declared,
    config: configFile ? ctx.rel(configFile) : null,
    plugin: ctx.deps["@tailwindcss/vite"] ? "@tailwindcss/vite" : ctx.deps["@tailwindcss/postcss"] ? "@tailwindcss/postcss" : null,
  }
}

/**
 * Comments out, newlines kept — so a directive QUOTED in a comment (Excalidraw
 * explains its scoped setup in one) is not mistaken for the real one, and
 * line numbers still point at the right line.
 */
export const stripCssComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))

const TW4_IMPORT = /@import\s+["']tailwindcss["'][^;]*;/
const TW3_BASE = /@tailwind\s+base\s*;/
const TW_ANY = /@import\s+["']tailwindcss(?:\/[\w.-]+)?["']|@tailwind\s+(?:base|components|utilities)/

export function detectCss(ctx, entry, tailwind) {
  const cssFiles = ctx.cssFiles.filter((f) => !OURS.test(ctx.rel(f)))
  const withTw = cssFiles.filter((f) => TW_ANY.test(stripCssComments(ctx.read(f) ?? "")))
  const comp = readJson(join(ctx.app.abs, "components.json"))
  const hinted = comp?.tailwind?.css ? resolve(ctx.app.abs, comp.tailwind.css) : null
  // CSS imported by the entry file (and the root component), in order.
  const imported = []
  for (const f of [entry.file, entry.rootComponent].filter(Boolean)) {
    const abs = join(ctx.root, f)
    const text = ctx.read(abs) ?? ""
    for (const m of text.matchAll(/import\s+["']([^"']+\.(?:s?css|sass))["']/g)) {
      if (!m[1].startsWith(".") && !m[1].startsWith("@/")) continue
      const p = m[1].startsWith("@/") ? join(ctx.srcRootAbs, m[1].slice(2)) : resolve(dirname(abs), m[1])
      if (exists(p) && !OURS.test(ctx.rel(p)) && !imported.includes(p)) imported.push(p)
    }
  }
  let file =
    withTw.find((f) => f === hinted) ?? withTw.find((f) => imported.includes(f)) ?? withTw[0] ?? imported[0] ?? null
  if (!file && hinted && exists(hinted)) file = hinted
  const text = stripCssComments(file ? ctx.read(file) ?? "" : "")
  let preflight = false
  let directive = null
  const v4 = findLine(text, TW4_IMPORT)
  const v3 = findLine(text, TW3_BASE)
  if (v4) {
    preflight = true
    directive = { kind: "v4-import", line: v4.line, text: v4.match }
  } else if (v3) {
    preflight = true
    directive = { kind: "v3-base", line: v3.line, text: v3.match }
  } else {
    const partial = findLine(text, TW_ANY)
    if (partial) directive = { kind: "partial", line: partial.line, text: partial.match }
  }
  if (file) ctx.ev("styling.cssEntry", { file, line: directive?.line, note: directive?.text ?? "imported by the entry file" })

  // CSS-in-JS, SCSS, CSS modules.
  const d = ctx.deps
  const cssInJs = Object.keys(d).filter((k) => /^@emotion\/|^styled-components$|^@stitches\/|^@vanilla-extract\/|^goober$|^linaria$|^@linaria\//.test(k))
  for (const k of cssInJs) ctx.ev("styling.cssInJs", { pkg: k })
  const scssFiles = ctx.cssFiles.filter((f) => /\.s[ac]ss$/.test(f))
  const moduleFiles = ctx.cssFiles.filter((f) => /\.module\.(s?css|sass)$/.test(f))

  // OTHER TAILWIND CONSUMERS: scripts that run Tailwind's JS API (Invoify
  // compiles a PDF stylesheet with it). A config change reaches them too.
  const consumers = []
  for (const f of ctx.scriptFiles) {
    const t = ctx.read(f)
    if (!t) continue
    const hit = findLine(t, /(?:require\(|from\s+|import\()\s*["']tailwindcss(?:\/[\w./-]*)?["']|["']@tailwindcss\/(?:node|postcss|oxide)["']/)
    if (hit) {
      consumers.push({ file: ctx.rel(f), line: hit.line, text: hit.match })
      ctx.ev("styling.otherTailwindConsumers", { file: f, line: hit.line, note: hit.match })
    }
  }

  return {
    entry: file ? ctx.rel(file) : null,
    directive,
    preflight: tailwind ? preflight : false,
    importedByEntry: imported.map((p) => ctx.rel(p)),
    tailwindCssFiles: withTw.map((p) => ctx.rel(p)),
    cssInJs,
    scss: { files: scssFiles.length, dep: Boolean(d.sass || d["node-sass"] || d["sass-embedded"]) },
    cssModules: moduleFiles.length,
    otherTailwindConsumers: consumers,
  }
}

/* --------------------------------- tokens --------------------------------- */

export const ROLES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
]

const HSL_TRIPLET = /^-?\d+(\.\d+)?(deg)?\s+-?\d+(\.\d+)?%\s+-?\d+(\.\d+)?%(\s*\/\s*[\d.]+%?)?$/
const COLOR_FN = /^(oklch|oklab|hsla?|rgba?|lab|lch|color|color-mix|hwb|var)\(|^#[0-9a-f]{3,8}$|^(white|black|transparent|currentcolor)$/i

/** One value's format: a full colour, bare HSL channels, or unknown. */
export function classifyValue(v) {
  const s = v.trim().replace(/\s*!important$/, "")
  if (HSL_TRIPLET.test(s)) return "hsl-triplet"
  if (COLOR_FN.test(s)) return "color"
  return null
}

/**
 * Read the role declarations from the global CSS and the files it imports
 * (one level — the token block is almost always there or one hop away).
 */
export function detectTokens(ctx, css) {
  if (!css.entry) return { format: "none", present: [], missing: ROLES, files: [] }
  const entryAbs = join(ctx.root, css.entry)
  const files = [entryAbs]
  const text = ctx.read(entryAbs) ?? ""
  for (const m of text.matchAll(/@import\s+(?:url\()?["']([^"']+)["']/g)) {
    if (!m[1].startsWith(".")) continue
    const p = resolve(dirname(entryAbs), m[1])
    if (exists(p) && !OURS.test(ctx.rel(p))) files.push(p)
  }
  const found = {}
  const formats = { color: 0, "hsl-triplet": 0 }
  for (const f of files) {
    const t = ctx.read(f) ?? ""
    for (const role of ROLES) {
      const re = new RegExp(`(^|[\\s;{])--${role}\\s*:\\s*([^;]+);`, "m")
      const hit = findLine(t, re)
      if (!hit || found[role]) continue
      const kind = classifyValue(hit.groups[2])
      found[role] = { file: ctx.rel(f), line: hit.line, value: hit.groups[2].trim(), kind }
      if (kind) formats[kind]++
    }
  }
  const present = Object.keys(found)
  const format =
    present.length === 0 ? "none" : formats["hsl-triplet"] > formats.color ? "hsl-triplet" : formats.color > 0 ? "color" : "none"
  if (found.popover) ctx.ev("tokens", { file: found.popover.file, line: found.popover.line, note: `--popover: ${found.popover.value}` })
  else if (present[0]) ctx.ev("tokens", { file: found[present[0]].file, line: found[present[0]].line, note: `--${present[0]}` })
  return {
    format,
    present,
    missing: ROLES.filter((r) => !found[r]),
    sample: found.popover ?? found[present[0]] ?? null,
    files: files.map((f) => ctx.rel(f)),
  }
}

/* --------------------------------- shadcn --------------------------------- */

const PRIMITIVES = ["button", "input", "skeleton", "sidebar", "sheet", "tooltip", "separator"]

/** Resolve an alias like `@/components/ui` to a directory. */
export function resolveAlias(ctx, alias) {
  if (!alias) return null
  if (alias.startsWith("@/")) return join(ctx.srcRootAbs, alias.slice(2))
  if (alias.startsWith("~/")) return join(ctx.srcRootAbs, alias.slice(2))
  if (alias.startsWith("#")) {
    const imp = ctx.app.pkg.imports?.[alias] ?? ctx.app.pkg.imports?.[`${alias}/*`]
    if (typeof imp === "string") return resolve(ctx.app.abs, imp.replace(/\/?\*.*$/, ""))
  }
  return resolve(ctx.app.abs, alias)
}

export function detectShadcn(ctx) {
  const file = [join(ctx.app.abs, "components.json"), join(ctx.root, "components.json")].find(exists)
  const comp = file ? readJson(file) : null
  if (file) ctx.ev("shadcn.componentsJson", { file })
  const aliases = comp?.aliases ?? {}
  const uiAbs = resolveAlias(ctx, aliases.ui ?? "@/components/ui")
  const utilsAbs = resolveAlias(ctx, aliases.utils ?? "@/lib/utils")
  const primitives = {}
  for (const name of PRIMITIVES) {
    const f = ["tsx", "jsx", "ts"].map((x) => join(uiAbs, `${name}.${x}`)).find(exists)
    const pascal = ["tsx", "jsx"].map((x) => join(uiAbs, `${name[0].toUpperCase()}${name.slice(1)}.${x}`)).find(exists)
    const hit = f ?? pascal
    primitives[name] = hit ? { file: ctx.rel(hit) } : null
    if (hit && name === "button") {
      const t = ctx.read(hit) ?? ""
      primitives.button.iconSm = /["']?icon-sm["']?\s*:/.test(t)
      primitives.button.iconXs = /["']?icon-xs["']?\s*:/.test(t)
      ctx.ev("shadcn.button", { file: hit, note: `icon-sm: ${primitives.button.iconSm}, icon-xs: ${primitives.button.iconXs}` })
    }
  }
  const utilsFile = ["ts", "tsx", "js"].map((x) => `${utilsAbs}.${x}`).find(exists)
  const cnDefined = utilsFile ? /(?:function|const)\s+cn\b|export\s*\{[^}]*\bcn\b[^}]*\}/.test(ctx.read(utilsFile) ?? "") : false
  if (utilsFile) ctx.ev("shadcn.cn", { file: utilsFile, note: cnDefined ? "defines cn" : "no cn export" })
  return {
    componentsJson: file ? ctx.rel(file) : null,
    style: comp?.style ?? null,
    // the library shadcn's own primitives import (sheet, sidebar…); lucide
    // unless components.json says otherwise
    iconLibrary: comp?.iconLibrary ?? "lucide",
    tailwindConfig: comp?.tailwind?.config ?? null,
    tailwindCss: comp?.tailwind?.css ?? null,
    aliases,
    registries: comp?.registries ?? null,
    uiDir: ctx.rel(uiAbs),
    uiDirExists: isDir(uiAbs),
    uiFiles: isDir(uiAbs) ? walk(uiAbs, { maxFiles: 500 }).files.map((f) => ctx.rel(f)) : [],
    primitives,
    utils: { file: utilsFile ? ctx.rel(utilsFile) : null, alias: aliases.utils ?? "@/lib/utils", definesCn: cnDefined },
    cnPackage: Boolean(ctx.deps.cn),
  }
}

/* ------------------------------- dark mode -------------------------------- */

/**
 * HOW THE PRODUCT GOES DARK. The layer follows `.dark` on <html> by itself;
 * anything else (a container class like Excalidraw's `theme--dark`, a
 * data-theme attribute, a theme held in JS) has to be mirrored through the
 * provider's `dark` prop, or the glass stays light on a dark canvas.
 */
export function detectDarkMode(ctx, tailwind) {
  const signals = []
  const push = (kind, file, line, note) => {
    signals.push({ kind, file: ctx.rel(file), line, note })
    ctx.ev("darkMode", { file, line, note: `${kind}: ${note}` })
  }
  if (tailwind?.config) {
    const t = ctx.read(join(ctx.root, tailwind.config)) ?? ""
    const h = findLine(t, /darkMode\s*:\s*([^,\n]+)/)
    if (h) push("tailwind-config", join(ctx.root, tailwind.config), h.line, h.match.trim())
  }
  if (ctx.deps["next-themes"]) signals.push({ kind: "next-themes", note: "next-themes (class on <html> by default)" })
  const pats = [
    ["html-class", /documentElement\.classList\.(?:add|toggle|remove)\(\s*["'`]dark["'`]/],
    ["html-class", /classList\.(?:add|toggle)\(\s*["'`]dark["'`]/],
    ["html-class", /@custom-variant\s+dark\s*\(&:(?:is|where)\(\.dark/],
    ["data-theme", /setAttribute\(\s*["'`]data-theme["'`]|dataset\.theme\s*=|\[data-theme=["']?dark/],
    ["container-class", /["'`.]theme--dark\b/],
    ["js-state", /export\s+(?:function|const)\s+use(?:App|Color)?Theme\b/],
    ["media", /prefers-color-scheme:\s*dark/],
  ]
  for (const f of [...ctx.codeFiles, ...ctx.cssFiles]) {
    const t = ctx.read(f)
    if (!t) continue
    for (const [kind, re] of pats) {
      if (signals.filter((s) => s.kind === kind).length >= 3) continue
      const h = findLine(t, re)
      if (h) push(kind, f, h.line, h.match.replace(/^["'`.]+/, "").trim())
    }
  }
  const has = (k) => signals.some((s) => s.kind === k)
  // Precedence: a JS-toggled html class is what the layer reads natively.
  // Precedence: what the layer reads natively first, then the signals it
  // must be told about, most specific first.
  const order = ["html-class", "container-class", "data-theme", "js-state", "media"]
  const mechanism =
    has("next-themes") ? "html-class" : order.find(has) ?? (has("tailwind-config") ? "html-class" : "none")
  const signal = signals.find((s) => s.kind === mechanism) ?? null
  return { mechanism, signal, signals }
}

/* ------------------------------ naming, libs ------------------------------ */

export function detectNaming(ctx) {
  let kebab = 0
  let pascal = 0
  for (const f of ctx.codeFiles) {
    if (!/\/components\//.test(f) || OURS.test(ctx.rel(f))) continue
    const base = f.split("/").pop().replace(/\.(tsx|jsx)$/, "")
    if (base === f.split("/").pop() || base === "index") continue
    if (/^[A-Z]/.test(base)) pascal++
    else if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(base)) kebab++
  }
  const convention = kebab + pascal === 0 ? "unknown" : pascal > kebab * 1.5 ? "PascalCase" : kebab > pascal * 1.5 ? "kebab-case" : "mixed"
  ctx.ev("naming", { note: `${pascal} PascalCase, ${kebab} kebab-case component files` })
  return { convention, pascal, kebab }
}

export function detectComponentLibrary(ctx) {
  const d = Object.keys(ctx.deps)
  const libs = []
  const add = (name, test) => {
    const hit = d.filter(test)
    if (hit.length) {
      libs.push(name)
      ctx.ev("componentLibrary", { pkg: hit.slice(0, 3).join(", ") })
    }
  }
  add("radix", (k) => k.startsWith("@radix-ui/") || k === "radix-ui")
  add("base-ui", (k) => k === "@base-ui/react" || k === "@base-ui-components/react")
  add("mui", (k) => k.startsWith("@mui/"))
  add("chakra", (k) => k.startsWith("@chakra-ui/"))
  add("mantine", (k) => k.startsWith("@mantine/"))
  add("antd", (k) => k === "antd")
  add("headlessui", (k) => k.startsWith("@headlessui/"))
  add("react-aria", (k) => k === "react-aria-components" || k === "react-aria")
  return libs.length ? libs : ["none"]
}

const ICON_LIBS = [
  ["lucide-react", "lucide"],
  ["@tabler/icons-react", "tabler"],
  ["@phosphor-icons/react", "phosphor"],
  ["@remixicon/react", "remixicon"],
  ["@hugeicons/react", "hugeicons"],
  ["@heroicons/react", "heroicons"],
  ["react-icons", "react-icons"],
]

export function detectIcons(ctx) {
  const out = []
  for (const [pkg, id] of ICON_LIBS) {
    const v = versionOf(ctx, pkg)
    if (!v) continue
    const entry = { id, pkg, version: v.text }
    // lucide before 0.300 names AlertCircle/Home; later CircleAlert/House.
    if (id === "lucide") entry.legacyNames = v.major === 0 && v.minor < 300
    out.push(entry)
    ctx.ev("icons", { pkg: `${pkg}@${v.installed ?? v.declared}` })
  }
  return out
}
