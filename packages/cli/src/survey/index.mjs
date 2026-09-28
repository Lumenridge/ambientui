/**
 * THE SURVEY — every detector, in dependency order, into one profile.
 *
 * The order is not cosmetic. The app package decides which package.json is
 * read; the framework decides where the alias and the entry live; the alias
 * decides the source root; the source root decides which files the code
 * detectors read. A detector that ran before its inputs would guess, and the
 * whole point of `doctor` is that nothing downstream guesses.
 *
 * READ-ONLY. The survey reads files and runs `git status`/`check-ignore`
 * and `<pm> --version`. It writes nothing; the doctor command writes the
 * result under `.ambientui/`.
 */
import { join, relative, resolve } from "node:path"

import { isDir, readJson, readdirSafe, walk } from "../util.mjs"
import { annotate } from "./confidence.mjs"
import { allDeps, createContext, detectGit, detectPackageManager, detectRepo, expandGlobs } from "./context.mjs"
import {
  detectAgentConfig,
  detectDepConvention,
  detectFramework,
  detectJest,
  detectLint,
  detectModuleType,
  detectProductName,
  detectReact,
  detectScripts,
  detectTests,
  detectTypeScript,
} from "./project.mjs"
import { detectAliases, detectBundle, detectEnv, detectStaticDir } from "./config.mjs"
import {
  detectComponentLibrary,
  detectCss,
  detectDarkMode,
  detectEntry,
  detectIcons,
  detectNaming,
  detectShadcn,
  detectTailwind,
  detectTokens,
} from "./styling.mjs"
import {
  detectAi,
  detectExistingInstall,
  detectFixedBottom,
  detectHotkeys,
  detectI18n,
  detectNetwork,
  detectZIndex,
} from "./code.mjs"

const CODE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts"]
const CSS_EXTS = [".css", ".scss", ".sass"]

/**
 * WORKSPACE PACKAGES THE APP IS BUILT FROM. Excalidraw's canvas UI (and its
 * Cmd-K binding) lives in `packages/excalidraw`, aliased in by the vite
 * config; Actual's shared components in `@actual-app/components`. A survey
 * of the app dir alone would miss both.
 */
function relatedPackages(ctx, repo, framework) {
  if (!repo.workspaces.length) return []
  const byName = new Map()
  for (const w of repo.workspaces) {
    const abs = resolve(ctx.root, w)
    const pkg = readJson(join(abs, "package.json"))
    if (pkg?.name) byName.set(pkg.name, abs)
  }
  const out = new Set()
  for (const dep of Object.keys(allDeps(ctx.app.pkg))) if (byName.has(dep)) out.add(byName.get(dep))
  const cfg = framework.configFile ? ctx.read(join(ctx.root, framework.configFile)) ?? "" : ""
  for (const m of cfg.matchAll(/["'`](\.\.\/[^"'`\s]+)["'`]/g)) {
    const p = resolve(ctx.app.abs, m[1])
    for (const w of repo.workspaces) {
      const abs = resolve(ctx.root, w)
      if (p === abs || p.startsWith(abs + "/")) out.add(abs)
    }
  }
  out.delete(ctx.app.abs)
  // Only packages that render React are UI the layer can collide with.
  return [...out].filter((d) => {
    const pkg = readJson(join(d, "package.json"))
    return Boolean(allDeps(pkg).react)
  })
}

export function survey(cwd) {
  const ctx = createContext(cwd)
  const started = Date.now()

  // 1–4: where, which app, which package manager, git.
  const repo = detectRepo(ctx)
  const rootPkg = readJson(join(ctx.root, "package.json")) ?? {}
  const appPkg = readJson(join(repo.appAbs, "package.json")) ?? rootPkg
  ctx.rootPkg = rootPkg
  ctx.app = {
    abs: repo.appAbs,
    dir: repo.appDirFromRoot,
    pkg: appPkg,
    pkgFile: repo.appDirFromRoot === "." ? "package.json" : `${repo.appDirFromRoot}/package.json`,
  }
  // App deps win; the root's hoisted devDependencies fill the gaps.
  const rootDeps = allDeps(rootPkg)
  const appDeps = allDeps(appPkg)
  ctx.deps = { ...rootDeps, ...appDeps }
  ctx.depFile = (name) => (appDeps[name] ? ctx.app.pkgFile : rootDeps[name] ? "package.json" : null)

  const packageManager = detectPackageManager(ctx, repo)
  const gitState = detectGit(ctx, repo)

  // 5–6, 24–28: the project's kind.
  const framework = detectFramework(ctx, repo)
  const react = detectReact(ctx)
  const typescript = detectTypeScript(ctx)
  const moduleType = detectModuleType(ctx)
  const deps = detectDepConvention(ctx)
  const jest = detectJest(ctx)
  ctx.jest = jest

  // 10: aliases, which fix the source root every later detector reads.
  const aliases = detectAliases(ctx, framework)
  ctx.srcRootAbs = aliases.srcRootAbs
  delete aliases.srcRootAbs

  // The file sets. Code: the source root (not a backend beside it) plus the
  // workspace packages the app is built from. CSS and locales: the app dir.
  const related = relatedPackages(ctx, repo, framework)
  const skipNested = new Set(repo.workspaces.map((w) => resolve(ctx.root, w)).filter((w) => w !== ctx.app.abs))
  const inNested = (f) => [...skipNested].some((w) => f.startsWith(w + "/"))
  const appAll = walk(ctx.app.abs, { maxFiles: 60000 })
  ctx.allFiles = appAll.files.filter((f) => !inNested(f))
  const codeRoots = [ctx.srcRootAbs, ...related.map((r) => (isDir(join(r, "src")) ? join(r, "src") : r))]
  ctx.codeFiles = codeRoots
    .flatMap((r) => (r === ctx.app.abs ? ctx.allFiles : walk(r, { maxFiles: 30000 }).files))
    .filter((f) => CODE_EXTS.some((x) => f.endsWith(x)) && !f.endsWith(".d.ts") && !inNestedUnlessRelated(f))
  function inNestedUnlessRelated(f) {
    return inNested(f) && !related.some((r) => f.startsWith(r + "/"))
  }
  ctx.relatedFiles = related.flatMap((r) => walk(r, { maxFiles: 30000 }).files)
  ctx.cssFiles = [...ctx.allFiles, ...related.flatMap((r) => walk(r, { exts: CSS_EXTS, maxFiles: 5000 }).files)].filter((f) =>
    CSS_EXTS.some((x) => f.endsWith(x))
  )
  const scriptDirs = [join(ctx.app.abs, "scripts"), join(ctx.root, "scripts")]
  ctx.scriptFiles = [...new Set([
    ...scriptDirs.flatMap((d) => (isDir(d) ? walk(d, { exts: CODE_EXTS, maxFiles: 500 }).files : [])),
    ...[ctx.app.abs, ctx.root].flatMap((d) =>
      readdirSafe(d)
        .filter((f) => CODE_EXTS.some((x) => f.endsWith(x)) && !/^(tailwind|postcss)\.config\./.test(f))
        .map((f) => join(d, f))
    ),
  ])]

  // 5, 7–9, 11–17: styling and configuration.
  const entry = detectEntry(ctx, framework)
  // NO `@/` YET: the source root is where the app boots from — tududi's
  // `frontend/`, not the repo root beside its backend.
  if (!aliases.atResolves && aliases.srcRoot === "." && entry.file) {
    const top = relative(ctx.app.abs, join(ctx.root, entry.file)).split("/")
    if (top.length > 1 && !top[0].startsWith(".")) {
      aliases.srcRoot = top[0]
      ctx.srcRootAbs = join(ctx.app.abs, top[0])
      ctx.ev("srcRoot", { file: entry.file, note: "no @/ alias; the entry file's top-level directory" })
    }
  }
  const tailwind = detectTailwind(ctx)
  const css = detectCss(ctx, entry, tailwind)
  const tokens = detectTokens(ctx, css)
  const shadcn = detectShadcn(ctx)
  const env = detectEnv(ctx, framework)
  const staticDir = detectStaticDir(ctx, framework)
  const bundle = detectBundle(ctx, framework)
  const componentLibrary = detectComponentLibrary(ctx)
  const icons = detectIcons(ctx)
  const naming = detectNaming(ctx)
  const darkMode = detectDarkMode(ctx, tailwind)

  // 18–23: collisions and seams.
  const hotkeys = detectHotkeys(ctx)
  const zIndex = detectZIndex(ctx)
  const fixedBottom = detectFixedBottom(ctx)
  const i18n = detectI18n(ctx)
  const network = detectNetwork(ctx)
  const ai = detectAi(ctx)

  const tests = detectTests(ctx)
  const lint = detectLint(ctx)
  const agent = detectAgentConfig(ctx)
  const product = detectProductName(ctx, framework)
  const scripts = detectScripts(ctx, framework)
  const existingInstall = detectExistingInstall(ctx)

  const { appAbs, appDirFromRoot, ...repoOut } = repo
  const profile = {
    surveyedAt: new Date().toISOString(),
    surveyMs: Date.now() - started,
    repo: { ...repoOut, appDirFromRoot, related: related.map((r) => ctx.rel(r)), filesScanned: { code: ctx.codeFiles.length, css: ctx.cssFiles.length, truncated: appAll.truncated } },
    packageManager,
    deps,
    git: gitState,
    framework,
    entry,
    react,
    typescript,
    moduleType,
    jest,
    styling: { tailwind, ...css },
    tokens,
    shadcn,
    aliases,
    env,
    staticDir,
    bundle,
    componentLibrary,
    icons,
    naming,
    darkMode,
    hotkeys,
    zIndex,
    fixedBottom,
    i18n,
    network,
    ai,
    tests,
    lint,
    agent,
    product,
    scripts,
    existingInstall,
    srcRoot: aliases.srcRoot,
    evidence: ctx.evidence,
  }
  return annotate(profile, ctx)
}

export { expandGlobs }
