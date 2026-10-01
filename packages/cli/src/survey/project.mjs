/**
 * WHAT KIND OF PROJECT THIS IS — framework, React, TypeScript, tests, lint,
 * scripts, the product's name and the agent rules it already carries. Each
 * changes a later instruction, so each records its evidence.
 */
import { join } from "node:path"

import { exists, findLine, installedVersion, isDir, parseVersion, readJson, readText, walk } from "../util.mjs"

/** A version fact: installed wins, the declared range's floor otherwise. */
export function versionOf(ctx, name) {
  const declaredIn = ctx.depFile(name)
  const declared = declaredIn ? ctx.deps[name] : null
  const installed = installedVersion(name, ctx.app.abs, ctx.root)
  const v = parseVersion(installed ?? declared)
  if (!v) return null
  return { ...v, installed, declared, source: installed ? "installed" : "declared", declaredIn }
}

/* -------------------------------- framework ------------------------------- */

export function detectFramework(ctx, repo) {
  const cand = repo.appCandidates[0]
  const kind = cand?.framework ?? "unknown"
  const configFile = cand ? join(repo.appDirFromRoot, cand.configFile).replace(/^\.\//, "") : null
  const out = { name: kind, configFile, router: null, rsc: false }
  if (configFile) ctx.ev("framework", { file: configFile })
  if (kind === "next") {
    const a = ctx.app.abs
    const appRouter = ["app", "src/app"].find((d) =>
      ["tsx", "jsx", "js", "ts"].some((x) => exists(join(a, d, `layout.${x}`)) || hasNestedLayout(join(a, d), x))
    )
    const pagesRouter = ["pages", "src/pages"].find((d) => isDir(join(a, d)))
    out.router = appRouter ? "app" : pagesRouter ? "pages" : null
    out.routerDir = appRouter ?? pagesRouter ?? null
    out.rsc = Boolean(appRouter)
    if (out.routerDir) ctx.ev("framework.router", { file: `${repo.appDirFromRoot}/${out.routerDir}`.replace(/^\.\//, "") })
  }
  const comp = readJson(join(ctx.app.abs, "components.json"))
  if (comp && typeof comp.rsc === "boolean") out.rsc = out.rsc || comp.rsc
  return out
}

/** Next's app router may keep layout.tsx one level down (`app/[locale]/`). */
function hasNestedLayout(dir, ext) {
  if (!isDir(dir)) return false
  const { files } = walk(dir, { exts: [`layout.${ext}`], maxFiles: 20 })
  return files.length > 0
}

/* --------------------------------- react/ts -------------------------------- */

export function detectReact(ctx) {
  const react = versionOf(ctx, "react")
  const types = versionOf(ctx, "@types/react")
  if (react) ctx.ev("react", { pkg: `react@${react.installed ?? react.declared}`, file: react.declaredIn })
  return react
    ? { version: react.text, major: react.major, source: react.source, typesMajor: types?.major ?? null }
    : null
}

/** Follow one `extends` hop so a strict base config counts. */
function tsOptions(file, depth = 0) {
  const j = readJson(file)
  if (!j) return {}
  let base = {}
  if (depth < 3 && typeof j.extends === "string" && j.extends.startsWith(".")) {
    const next = join(file, "..", j.extends.endsWith(".json") ? j.extends : `${j.extends}.json`)
    base = tsOptions(next, depth + 1)
  }
  return { ...base, ...(j.compilerOptions ?? {}) }
}

export function detectTypeScript(ctx) {
  const ts = versionOf(ctx, "typescript")
  const tsconfig = ["tsconfig.app.json", "tsconfig.json"]
    .flatMap((f) => [join(ctx.app.abs, f), join(ctx.root, f)])
    .find(exists)
  const present = Boolean(ts || tsconfig)
  if (!present) return { present: false }
  const opts = tsconfig ? tsOptions(tsconfig) : {}
  if (tsconfig) ctx.ev("typescript", { file: tsconfig, note: `strict: ${Boolean(opts.strict)}` })
  else ctx.ev("typescript", { pkg: `typescript@${ts.installed ?? ts.declared}`, file: ts.declaredIn })
  return {
    present,
    version: ts?.text ?? null,
    tsconfig: tsconfig ? ctx.rel(tsconfig) : null,
    strict: Boolean(opts.strict),
  }
}

export function detectModuleType(ctx) {
  const t = ctx.app.pkg.type === "module" ? "esm" : "cjs"
  ctx.ev("moduleType", { file: ctx.app.pkgFile, note: `"type": ${JSON.stringify(ctx.app.pkg.type ?? "(unset)")}` })
  return t
}

/**
 * THE DEPENDENCY CONVENTION. Some products keep everything in
 * devDependencies (they ship a bundle, not a package). shadcn always adds to
 * `dependencies`, so the agent should move what it adds to match.
 */
export function detectDepConvention(ctx) {
  const deps = Object.keys(ctx.app.pkg.dependencies ?? {}).length
  const dev = Object.keys(ctx.app.pkg.devDependencies ?? {}).length
  const convention = deps === 0 && dev > 0 ? "devDependencies-only" : "dependencies"
  ctx.ev("deps.convention", { file: ctx.app.pkgFile, note: `${deps} dependencies, ${dev} devDependencies` })
  return { convention, dependencies: deps, devDependencies: dev }
}

/* ---------------------------------- jest ---------------------------------- */

/**
 * A COMMONJS JEST CANNOT LOAD THE ORB's ESM-only shader package; the plan
 * then gives a mapper or a mock.
 */
export function detectJest(ctx) {
  const a = ctx.app.abs
  const names = ["jest.config.js", "jest.config.cjs", "jest.config.mjs", "jest.config.ts", "jest.config.json"]
  const file = names.map((n) => join(a, n)).find(exists) ?? names.map((n) => join(ctx.root, n)).find(exists)
  const inPkg = ctx.app.pkg.jest
  const hasDep = Boolean(ctx.deps.jest)
  if (!file && !inPkg && !hasDep) return { present: false }
  const text = file ? readText(file) ?? "" : JSON.stringify(inPkg ?? {})
  if (file) ctx.ev("jest", { file })
  const tsJest = /ts-jest/.test(text) || Boolean(ctx.deps["ts-jest"])
  const esm = /extensionsToTreatAsEsm|useESM\s*:\s*true/.test(text)
  const mapper = /moduleNameMapper/.test(text)
  return {
    present: true,
    config: file ? ctx.rel(file) : inPkg ? "package.json#jest" : null,
    tsJest,
    cjs: !esm,
    hasModuleNameMapper: mapper,
    atMapped: /['"]\^@\/\(\.\*\)\$['"]|['"]\^@\//.test(text),
  }
}

/* --------------------------------- scripts -------------------------------- */

const SCRIPT_PREFS = {
  typecheck: ["typecheck", "type-check", "check-types", "types", "tsc", "frontend:typecheck", "test:typecheck"],
  lint: ["lint", "frontend:lint", "eslint", "lint:js", "test:code"],
  test: ["test", "test:unit", "frontend:test", "unit", "test:app"],
  build: ["build", "frontend:build", "build:app"],
  dev: ["dev", "start", "frontend:dev", "serve", "start:dev", "dev:local"],
}

export function detectScripts(ctx, framework) {
  const scripts = ctx.app.pkg.scripts ?? {}
  const out = { all: Object.keys(scripts) }
  // In a monorepo whose app lacks a check, the root's script is the one the
  // project runs; it runs from the root.
  const rootScripts = ctx.app.abs !== ctx.root ? ctx.rootPkg?.scripts ?? {} : {}
  for (const [k, prefs] of Object.entries(SCRIPT_PREFS)) {
    for (const [where, set, file] of [["app", scripts, ctx.app.pkgFile], ["root", rootScripts, "package.json"]]) {
      // A script that runs the BACKEND says nothing about the UI; prefer one
      // that does not.
      const avail = prefs.filter((p) => set[p])
      const name = avail.find((p) => !/\bbackend\b|\bserver\b/.test(set[p])) ?? avail[0]
      if (!name) continue
      out[k] = { name, command: set[name], where }
      ctx.ev(`scripts.${k}`, { file, note: `"${name}": ${set[name]}` })
      break
    }
    out[k] ??= null
  }
  // THE DEV PORT: a flag in the script, the bundler config, else the
  // framework default.
  let port = null
  const dev = out.dev?.command ?? ""
  const m = /(?:--port[ =]|-p\s+|PORT=)(\d{2,5})/.exec(dev)
  if (m) port = Number(m[1])
  if (!port && framework.configFile) {
    const text = ctx.read(join(ctx.root, framework.configFile)) ?? ""
    const pm =
      /server\s*:\s*\{[^}]*?port\s*:\s*(\d{2,5})/s.exec(text) ??
      /devServer\s*:\s*\{[^}]*?port\s*:\s*(\d{2,5})/s.exec(text) ??
      /PORT\s*\|\|\s*['"]?(\d{2,5})/.exec(text)
    if (pm) {
      port = Number(pm[1])
      ctx.ev("scripts.port", { file: framework.configFile, note: `port ${port}` })
    }
  }
  port ??= { vite: 5173, next: 3000, cra: 3000, webpack: 8080, remix: 3000, "react-router": 5173 }[framework.name] ?? null
  out.port = port
  return out
}

/* ------------------------------ tests & lint ------------------------------ */

export function detectTests(ctx) {
  const d = ctx.deps
  const runners = []
  if (d.vitest) runners.push("vitest")
  if (d.jest || d["react-scripts"]) runners.push("jest")
  if (d["@playwright/test"] || d.playwright) runners.push("playwright")
  if (d.cypress) runners.push("cypress")
  for (const r of runners) ctx.ev("tests", { pkg: r === "playwright" ? "@playwright/test" : r })
  const scripts = Object.entries(ctx.app.pkg.scripts ?? {})
    .filter(([k]) => /test|e2e|vrt|spec/i.test(k))
    .map(([k]) => k)
  const rootScripts = Object.entries(ctx.rootPkg?.scripts ?? {})
  const vrt =
    scripts.find((s) => /vrt|visual/i.test(s)) ??
    rootScripts.find(([k]) => /vrt|visual/i.test(k))?.[0] ??
    null
  if (vrt) ctx.ev("tests.vrt", { note: `script "${vrt}"` })
  return { runners, scripts, vrt }
}

export function detectLint(ctx) {
  const d = ctx.deps
  const at = (names) =>
    names
      .flatMap((n) => [join(ctx.app.abs, n), join(ctx.root, n)])
      .find(exists)
  const eslintConfig = at([
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.cjs",
    "eslint.config.ts",
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.cjs",
    ".eslintrc.json",
    ".eslintrc.yml",
  ])
  const oxlintConfig = at([".oxlintrc.json", "oxlint.json", ".oxlintrc"])
  const biomeConfig = at(["biome.json", "biome.jsonc"])
  const prettierConfig = at([
    ".prettierrc",
    ".prettierrc.json",
    ".prettierrc.js",
    ".prettierrc.cjs",
    ".prettierrc.mjs",
    "prettier.config.js",
    "prettier.config.mjs",
  ])
  const oxfmt = at([".oxfmtrc.json", ".oxfmtrc"])
  const out = {
    eslint: eslintConfig || d.eslint ? { config: eslintConfig ? ctx.rel(eslintConfig) : null } : null,
    reactHooks: Boolean(
      d["eslint-plugin-react-hooks"] || d["eslint-config-react-app"] || (eslintConfig && /react-hooks/.test(ctx.read(eslintConfig) ?? ""))
    ),
    oxlint: oxlintConfig || d.oxlint ? { config: oxlintConfig ? ctx.rel(oxlintConfig) : null } : null,
    biome: biomeConfig || d["@biomejs/biome"] ? { config: biomeConfig ? ctx.rel(biomeConfig) : null } : null,
    prettier:
      prettierConfig || d.prettier || ctx.rootPkg?.prettier || ctx.app.pkg.prettier
        ? { config: prettierConfig ? ctx.rel(prettierConfig) : ctx.app.pkg.prettier ? "package.json#prettier" : null }
        : null,
    oxfmt: oxfmt ? { config: ctx.rel(oxfmt) } : null,
    checkerOverlay: Boolean(d["vite-plugin-checker"]),
    agentHooks: [],
  }
  for (const [k, v] of Object.entries(out)) if (v && typeof v === "object" && v.config) ctx.ev(`lint.${k}`, { file: v.config })
  // AGENT HOOKS THAT FIX ON EDIT rewrite the vendored layer as the agent
  // writes it; the plan tells the agent to exclude those paths.
  for (const f of [".claude/settings.json", ".claude/settings.local.json"]) {
    const p = join(ctx.root, f)
    const text = readText(p)
    if (!text) continue
    const re = /"command"\s*:\s*"([^"]*(?:eslint|prettier|oxlint|oxfmt|biome)[^"]*)"/g
    let m
    while ((m = re.exec(text))) {
      if (/--fix|--write|format/.test(m[1])) {
        const l = findLine(text, new RegExp(m[1].slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
        out.agentHooks.push({ file: f, line: l?.line ?? null, command: m[1] })
        ctx.ev("lint.agentHooks", { file: f, line: l?.line, note: m[1] })
      }
    }
  }
  return out
}

/* ------------------------------ agent config ------------------------------ */

export function detectAgentConfig(ctx) {
  const at = (f) => exists(join(ctx.root, f)) || (ctx.app.abs !== ctx.root && exists(join(ctx.app.abs, f)))
  const out = {
    claudeMd: at("CLAUDE.md"),
    agentsMd: at("AGENTS.md"),
    designMd: at("DESIGN.md"),
    claudeSkills: isDir(join(ctx.root, ".claude/skills")),
    agentsSkills: isDir(join(ctx.root, ".agents/skills")),
  }
  for (const [k, f] of [
    ["claudeMd", "CLAUDE.md"],
    ["agentsMd", "AGENTS.md"],
    ["designMd", "DESIGN.md"],
  ])
    if (out[k]) ctx.ev(`agent.${k}`, { file: f })
  return out
}

/* ------------------------------ product name ------------------------------ */

const GENERIC = /^(vite|react|app|my-app|web|client|frontend|consumer|vite \+ react.*|react app|create next app|next\.?js)$/i

/** `@acme-app/web` → "Acme"; `my-product` → "My Product". */
export function humanize(name) {
  if (!name) return null
  let base = name
  const m = /^@([^/]+)\/(.+)$/.exec(name)
  // A scoped name whose package part is generic is named by its scope.
  if (m) base = /^(web|app|client|frontend|ui|desktop-client)$/.test(m[2]) ? m[1].replace(/-app$/, "") : m[2]
  return base
    .split(/[-_\s/]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
}

export function detectProductName(ctx, framework) {
  const a = ctx.app.abs
  const cands = []
  for (const f of ["index.html", "public/index.html", "src/index.html"]) {
    const p = join(a, f)
    const hit = findLine(ctx.read(p), /<title>\s*([^<]+?)\s*<\/title>/i)
    if (hit && !/<%|\{\{/.test(hit.groups[1])) cands.push({ value: hit.groups[1], file: p, line: hit.line, kind: "title" })
  }
  for (const f of ["public/manifest.json", "public/site.webmanifest", "public/manifest.webmanifest", "manifest.json"]) {
    const j = readJson(join(a, f))
    if (j?.name) cands.push({ value: j.name, file: join(a, f), kind: "manifest" })
  }
  // Next's metadata and a PWA plugin manifest live in code, not files.
  const codeFiles = []
  if (framework.name === "next" && framework.routerDir) {
    const { files } = walk(join(a, framework.routerDir), { exts: ["layout.tsx", "layout.ts", "layout.jsx", "layout.js"], maxFiles: 10 })
    codeFiles.push(...files)
  }
  if (framework.configFile) codeFiles.push(join(ctx.root, framework.configFile))
  for (const f of codeFiles) {
    const text = ctx.read(f) ?? ""
    // `title: "X"`, `title: { default: "X" }`, `const title = meta.title ?? "X"`
    const t = findLine(text, /\btitle\s*[:=]\s*(?:\{\s*default\s*:\s*)?(?:[\w.?]+\s*\?\?\s*)?["'`]([^"'`$]{2,60})["'`]/)
    if (t) cands.push({ value: t.groups[1], file: f, line: t.line, kind: "title" })
    const n = findLine(text, /manifest\s*:\s*\{[^}]*?\bname\s*:\s*["'`]([^"'`]{2,60})["'`]/s)
    if (n) cands.push({ value: n.groups[1], file: f, line: n.line, kind: "manifest" })
  }
  if (ctx.app.pkg.productName) cands.push({ value: ctx.app.pkg.productName, file: ctx.app.pkgFile, kind: "productName" })
  for (const p of [ctx.app.pkg, ctx.app.abs !== ctx.root ? ctx.rootPkg : null]) {
    if (p?.name) cands.push({ value: humanize(p.name), file: "package.json", kind: "package" })
  }
  // The most human candidate: a real title or manifest name, then the rest.
  // A title that is only the lower-case package name is title-cased.
  const clean = (v) => v.split(/\s+[|–—-]\s+/)[0].trim()
  const pick =
    cands.find((c) => c.kind !== "package" && !GENERIC.test(clean(c.value))) ??
    cands.find((c) => !GENERIC.test(clean(c.value))) ??
    cands[0]
  const value = pick ? clean(pick.value) : null
  const name = value && value === value.toLowerCase() ? humanize(value) : value
  if (pick) ctx.ev("product.name", { file: pick.file, line: pick.line, note: `${pick.kind}: ${pick.value}` })
  return { name, candidates: cands.map((c) => ({ value: c.value, kind: c.kind, file: ctx.rel(c.file) })) }
}
