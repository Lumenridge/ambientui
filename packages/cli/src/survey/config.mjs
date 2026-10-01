/**
 * HOW THE PROJECT RESOLVES THINGS — import aliases, env flags, the static
 * directory and the bundle's limits.
 *
 * THE `@/` ALIAS must resolve in tsconfig `paths` (the shadcn CLI), the
 * bundler and the test runner; missing from any one fails silently. Every
 * place is read, and the plan lists each that lacks it.
 */
import { readdirSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"

import { exists, findLine, isDir, readJson, rel } from "../util.mjs"

/* --------------------------------- aliases -------------------------------- */

function listTsconfigs(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => /^tsconfig.*\.json$/.test(f))
      .map((f) => join(dir, f))
  } catch {
    return []
  }
}

/** compilerOptions merged across `extends` hops (relative ones only). */
function mergedOptions(file, depth = 0) {
  const j = readJson(file)
  if (!j) return { opts: {}, json: null }
  let base = {}
  if (depth < 3 && typeof j.extends === "string" && j.extends.startsWith(".")) {
    const next = resolve(dirname(file), j.extends.endsWith(".json") ? j.extends : `${j.extends}.json`)
    const b = mergedOptions(next, depth + 1).opts
    // paths/baseUrl in a base config resolve relative to THAT file.
    if (b.paths && !b.__pathsBase) b.__pathsBase = dirname(next)
    base = b
  }
  const own = j.compilerOptions ?? {}
  const opts = { ...base, ...own }
  if (own.paths) opts.__pathsBase = dirname(file)
  return { opts, json: j }
}

/** Does a root tsconfig cover the app dir? (no include = everything.) */
function covers(json, tsDir, appAbs) {
  const inc = json?.include
  if (!Array.isArray(inc)) return !json?.files
  const r = relative(tsDir, appAbs).split("\\").join("/")
  if (!r) return true
  return inc.some((g) => {
    // A single named file ("src/sw.ts") compiles that file, not the tree.
    if (!g.includes("*") && /\.[cm]?[jt]sx?$/.test(g)) return false
    const head = g.replace(/^\.\//, "").split("/")[0]
    return head === "**" || head.startsWith("*") || r === head || r.startsWith(head + "/")
  })
}

export function detectAliases(ctx, framework) {
  const appAbs = ctx.app.abs
  const tsconfigs = []
  const seen = new Set()
  const srcGuess = isDir(join(appAbs, "src")) ? join(appAbs, "src") : appAbs
  const dirs = [appAbs]
  if (ctx.root !== appAbs) dirs.push(ctx.root)
  for (const d of dirs) {
    for (const f of listTsconfigs(d)) {
      if (seen.has(f)) continue
      seen.add(f)
      const { opts, json } = mergedOptions(f)
      if (!json) continue
      // In the app dir, a tsconfig counts when it compiles the source root
      // (a service-worker config that includes one file does not); at the
      // root, when it covers the app or declares paths.
      const relevant =
        d === appAbs
          ? covers(json, d, srcGuess) || (Array.isArray(json.files) && json.files.length === 0)
          : covers(json, d, appAbs) || Boolean(opts.paths)
      if (!relevant) continue
      const paths = opts.paths ?? null
      const atKey = paths && Object.keys(paths).find((k) => k === "@/*" || k.startsWith("@/"))
      let target = null
      if (atKey) {
        const base = resolve(opts.__pathsBase ?? d, opts.baseUrl ?? ".")
        const first = String(paths[atKey][0] ?? "").replace(/\/?\*$/, "")
        target = resolve(base, first)
        const text = ctx.read(f)
        const hit = findLine(text, /["']@\/\*?["']\s*:/)
        ctx.ev("aliases.tsconfig", { file: f, line: hit?.line, note: `@/* → ${paths[atKey][0]}` })
      }
      // A "solution" tsconfig (files: [], references) is not compiled itself
      // but the shadcn CLI still reads it.
      tsconfigs.push({
        file: ctx.rel(f),
        hasAt: Boolean(atKey),
        target: target ? ctx.rel(target) : null,
        targetAbs: target,
        solution: Array.isArray(json.files) && json.files.length === 0 && Boolean(json.references),
        node: /tsconfig\.node\.json$/.test(f),
      })
    }
  }

  // THE BUNDLER ALIAS.
  const bundler = { kind: framework.name, file: framework.configFile, hasAt: false, via: null }
  if (framework.name === "next") {
    bundler.hasAt = tsconfigs.some((t) => t.hasAt)
    bundler.via = "tsconfig (Next reads paths)"
  } else if (framework.configFile) {
    const text = ctx.read(join(ctx.root, framework.configFile)) ?? ""
    const hit =
      findLine(text, /["']@["']\s*:/) ??
      findLine(text, /find\s*:\s*["']@["']/) ??
      findLine(text, /find\s*:\s*\/\^@\\\//) ??
      findLine(text, /["']@\/["']\s*:/)
    // vite-tsconfig-paths, webpack's TsconfigPathsPlugin, or Vite 8's native
    // `resolve: { tsconfigPaths: true }`.
    const tsPaths = findLine(text, /tsconfigPaths\s*\(|TsconfigPathsPlugin|tsconfigPaths\s*:\s*true/)
    if (hit) {
      bundler.hasAt = true
      bundler.via = "alias"
      ctx.ev("aliases.bundler", { file: framework.configFile, line: hit.line, note: hit.match })
    } else if (tsPaths) {
      bundler.hasAt = tsconfigs.some((t) => t.hasAt)
      bundler.via = "tsconfig paths plugin"
      ctx.ev("aliases.bundler", { file: framework.configFile, line: tsPaths.line, note: tsPaths.match })
    }
  } else if (framework.name === "cra") {
    bundler.via = "none (CRA has no alias support without craco)"
  }

  // THE TEST RUNNER ALIAS.
  // The app's own vitest config first; else a vite config with a `test`
  // block (vitest reads it); only then a root config, which in a monorepo is
  // usually a `projects` list that aliases nothing itself.
  let test = null
  const vitestNames = ["vitest.config.ts", "vitest.config.mts", "vitest.config.js", "vitest.config.mjs"]
  const appVitest = vitestNames.map((f) => join(appAbs, f)).find(exists)
  const viteText = framework.name === "vite" && framework.configFile ? ctx.read(join(ctx.root, framework.configFile)) ?? "" : ""
  const viteHasTest = /\btest\s*:\s*\{/.test(viteText)
  const rootVitest = !appVitest && !viteHasTest ? vitestNames.map((f) => join(ctx.root, f)).find(exists) : null
  const vitestCfg = appVitest ?? rootVitest
  if (!vitestCfg && viteHasTest && ctx.deps.vitest) {
    test = { kind: "vitest", file: framework.configFile, hasAt: bundler.hasAt, note: "the vite config's test block" }
  } else if (vitestCfg) {
    const text = ctx.read(vitestCfg) ?? ""
    const hit =
      findLine(text, /["']@["']\s*:/) ??
      findLine(text, /find\s*:\s*\/\^@\\\//) ??
      findLine(text, /find\s*:\s*["']@["']/) ??
      findLine(text, /tsconfigPaths\s*\(/)
    // A vitest config that merges the vite config inherits its alias.
    const merges = /mergeConfig\s*\(|viteConfig/.test(text)
    test = { kind: "vitest", file: ctx.rel(vitestCfg), hasAt: Boolean(hit) || (merges && bundler.hasAt) }
    if (hit) ctx.ev("aliases.test", { file: vitestCfg, line: hit.line, note: hit.match })
  } else if (!test && ctx.deps.vitest && framework.name === "vite") {
    test = { kind: "vitest", file: framework.configFile, hasAt: bundler.hasAt, note: "inherits the vite config" }
  }
  if (ctx.jest?.present) {
    test = {
      kind: "jest",
      file: ctx.jest.config,
      hasAt: ctx.jest.atMapped,
    }
  }

  // PACKAGE.JSON SUBPATH IMPORTS (#components/…).
  const imports = ctx.app.pkg.imports ? Object.keys(ctx.app.pkg.imports) : []
  if (imports.length) ctx.ev("aliases.subpathImports", { file: ctx.app.pkgFile, note: `${imports.length} "#" imports, e.g. ${imports[0]}` })

  // LINT RULES FORBIDDING `@/` in app code.
  const forbidsAt = []
  for (const f of [
    ".oxlintrc.json",
    "eslint.config.mjs",
    "eslint.config.js",
    "eslint.config.ts",
    "eslint.config.cjs",
    ".eslintrc.json",
    ".eslintrc.js",
    ".eslintrc.cjs",
  ]) {
    for (const d of new Set([appAbs, ctx.root])) {
      const p = join(d, f)
      const text = ctx.read(p)
      if (!text) continue
      const lines = text.split("\n")
      lines.forEach((l, i) => {
        if (/["'`]@\/[^"'`]*["'`]/.test(l) || /["'`]\^?@\/\*?["'`]/.test(l)) {
          const ctxText = lines.slice(Math.max(0, i - 12), i + 1).join("\n")
          if (/no-restricted-imports|restricted|patterns|paths/.test(ctxText)) {
            forbidsAt.push({ file: ctx.rel(p), line: i + 1, text: l.trim() })
            ctx.ev("aliases.forbidsAt", { file: p, line: i + 1, note: l.trim() })
          }
        }
      })
    }
  }

  // THE SOURCE ROOT: where `@/*` points, else src/, else the app dir.
  const appTs = tsconfigs.find((t) => t.hasAt && t.targetAbs && t.file.startsWith(ctx.rel(appAbs) === "." ? "" : ctx.rel(appAbs)))
  const anyTs = appTs ?? tsconfigs.find((t) => t.hasAt && t.targetAbs)
  let srcRootAbs
  if (anyTs) srcRootAbs = anyTs.targetAbs
  else if (isDir(join(appAbs, "src"))) srcRootAbs = join(appAbs, "src")
  else srcRootAbs = appAbs
  const srcRoot = rel(appAbs, srcRootAbs)

  return {
    tsconfigs: tsconfigs.map(({ targetAbs, ...t }) => t),
    bundler,
    test,
    subpathImports: imports.length > 0,
    subpathImportCount: imports.length,
    forbidsAt,
    srcRoot,
    srcRootAbs,
    atResolves: tsconfigs.some((t) => t.hasAt),
  }
}

/* ----------------------------------- env ---------------------------------- */

/**
 * THE STUB FLAG. It must use the prefix the bundler exposes to the browser,
 * or it reads as `undefined`; within that, it follows the house style
 * (e.g. `VITE_APP_…`).
 */
function housePrefix(names, allowed) {
  const pool = names.filter((n) => n.startsWith(allowed))
  if (pool.length < 3) return allowed
  const counts = {}
  for (const n of pool) {
    const rest = n.slice(allowed.length)
    const seg = rest.split("_")[0]
    if (seg && rest.includes("_")) counts[seg] = (counts[seg] ?? 0) + 1
  }
  const [best, c] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? []
  return best && c / pool.length >= 0.6 ? `${allowed}${best}_` : allowed
}

export function detectEnv(ctx, framework) {
  const cfgText = framework.configFile ? ctx.read(join(ctx.root, framework.configFile)) ?? "" : ""
  const used = new Set()
  for (const f of ctx.codeFiles) {
    const t = ctx.read(f)
    if (!t) continue
    for (const m of t.matchAll(/(?:import\.meta\.env|process\.env)\.([A-Z][A-Z0-9_]+)/g)) used.add(m[1])
  }
  const names = [...used]
  let prefix = ""
  let read = null
  let envDir = null
  let style = null
  let defined = null
  let allowed = ""

  if (framework.name === "vite" || framework.name === "react-router" || framework.name === "remix") {
    allowed = "VITE_"
    const pm = findLine(cfgText, /envPrefix\s*:\s*(\[[^\]]*\]|["'`][^"'`]+["'`])/)
    if (pm) {
      const list = [...pm.groups[1].matchAll(/["'`]([^"'`]+)["'`]/g)].map((m) => m[1])
      // With several allowed prefixes, prefer the one the code uses most.
      allowed =
        list.sort(
          (a, b) => names.filter((n) => n.startsWith(b)).length - names.filter((n) => n.startsWith(a)).length
        )[0] ?? "VITE_"
      ctx.ev("env.prefix", { file: framework.configFile, line: pm.line, note: pm.match })
    }
    const dm = findLine(cfgText, /envDir\s*:\s*["'`]([^"'`]+)["'`]/)
    if (dm) {
      envDir = dm.groups[1]
      ctx.ev("env.envDir", { file: framework.configFile, line: dm.line, note: dm.match })
    }
    style = "import.meta.env"
    prefix = housePrefix(names, allowed)
  } else if (framework.name === "next") {
    allowed = prefix = "NEXT_PUBLIC_"
    style = "process.env"
  } else if (framework.name === "cra") {
    allowed = prefix = "REACT_APP_"
    style = "process.env"
  } else if (framework.name === "webpack") {
    style = "process.env"
    // DefinePlugin keys: literal `process.env.X` keys, or UPPER_CASE keys of
    // an object mapped onto `process.env.${key}`.
    const dp = findLine(cfgText, /DefinePlugin\s*\(/)
    if (dp) {
      // Exactly the plugin's argument list: balanced parentheses from its `(`.
      const open = cfgText.indexOf(dp.match) + dp.match.length - 1
      let depth = 0
      let close = open
      for (; close < cfgText.length; close++) {
        if (cfgText[close] === "(") depth++
        else if (cfgText[close] === ")" && --depth === 0) break
      }
      const block = cfgText.slice(open, close + 1)
      const keys = new Set()
      for (const m of block.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) keys.add(m[1])
      for (const m of block.matchAll(/^\s*['"]?([A-Z][A-Z0-9_]+)['"]?\s*:/gm)) keys.add(m[1])
      defined = [...keys]
      ctx.ev("env.definePlugin", { file: framework.configFile, line: dp.line, note: defined.join(", ") })
      prefix = housePrefix(defined, "")
    }
  }
  const name = `${prefix}AMBIENT_STUBS`
  read = style === "import.meta.env" ? `import.meta.env.${name}` : `process.env.${name}`
  return {
    allowedPrefix: allowed || null,
    prefix,
    style,
    envDir,
    definePluginKeys: defined,
    stubFlag: name,
    read,
    alreadyDefined: defined ? defined.includes(name) : used.has(name),
    usedNames: names.slice(0, 40),
  }
}

/* ------------------------------- static dir ------------------------------- */

export function detectStaticDir(ctx, framework) {
  if (framework.name === "vite") {
    const text = ctx.read(join(ctx.root, framework.configFile)) ?? ""
    const m = findLine(text, /publicDir\s*:\s*["'`]([^"'`]+)["'`]/)
    const rootM = /\broot\s*:\s*["'`]([^"'`]+)["'`]/.exec(text)
    const cfgDir = dirname(join(ctx.root, framework.configFile))
    const viteRoot = rootM ? resolve(cfgDir, rootM[1]) : cfgDir
    if (m) {
      ctx.ev("staticDir", { file: framework.configFile, line: m.line, note: m.match })
      return rel(ctx.app.abs, resolve(viteRoot, m.groups[1]))
    }
    return rel(ctx.app.abs, join(viteRoot, "public"))
  }
  return "public"
}

/* --------------------------------- bundle --------------------------------- */

/** Evaluate `2.3 * 1024 ** 2` — digits and arithmetic only, never code. */
function arith(expr) {
  const e = expr.replace(/_/g, "").trim()
  if (!/^[\d.\s*+\-/()]+$/.test(e)) return null
  try {
    const v = Function(`"use strict"; return (${e})`)()
    return Number.isFinite(v) ? Math.round(v) : null
  } catch {
    return null
  }
}

export function detectBundle(ctx, framework) {
  const d = ctx.deps
  const pwaDep = ["vite-plugin-pwa", "next-pwa", "@ducanh2912/next-pwa", "workbox-webpack-plugin", "@serwist/next"].find((p) => d[p])
  const out = { pwa: null, precacheLimit: null, coep: null, coop: null }
  const files = [framework.configFile && join(ctx.root, framework.configFile), join(ctx.app.abs, "vercel.json"), join(ctx.root, "vercel.json"), join(ctx.app.abs, "public/_headers"), join(ctx.root, "netlify.toml")].filter(Boolean)
  if (pwaDep) {
    out.pwa = { plugin: pwaDep }
    ctx.ev("bundle.pwa", { pkg: pwaDep })
  }
  for (const f of files) {
    const text = ctx.read(f)
    if (!text) continue
    const lim = findLine(text, /maximumFileSizeToCacheInBytes\s*:\s*([^,\n}]+)/)
    if (lim) {
      out.precacheLimit = { bytes: arith(lim.groups[1].replace(/\/\/.*$/, "")), expr: lim.groups[1].replace(/\/\/.*$/, "").trim(), file: ctx.rel(f), line: lim.line }
      ctx.ev("bundle.precacheLimit", { file: f, line: lim.line, note: lim.match.trim() })
    }
    const coep = findLine(text, /Cross-Origin-Embedder-Policy['"]?\s*[:,]?\s*['"]?([a-z-]+)/i)
    if (coep) {
      out.coep = { value: coep.groups[1], file: ctx.rel(f), line: coep.line }
      ctx.ev("bundle.coep", { file: f, line: coep.line, note: coep.match })
    }
    const coop = findLine(text, /Cross-Origin-Opener-Policy['"]?\s*[:,]?\s*['"]?([a-z-]+)/i)
    if (coop) out.coop = { value: coop.groups[1], file: ctx.rel(f), line: coop.line }
  }
  return out
}

