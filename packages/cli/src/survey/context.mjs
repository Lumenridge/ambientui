/**
 * WHERE ARE WE, AND WHICH PACKAGE IS THE APP — the first three facts, which
 * every other detector depends on.
 *
 * In a monorepo the shadcn CLI, Tailwind version, aliases and entry file
 * belong to one workspace package, not the root; installing at the root
 * fails silently. So the app is identified explicitly, the losing candidates
 * are recorded, and every later path is relative to it.
 */
import { readdirSync } from "node:fs"
import { join, resolve, dirname, basename } from "node:path"

import {
  exists,
  git,
  gitRoot as findGitRoot,
  isDir,
  onPath,
  porcelainPaths,
  readJson,
  readText,
  rel,
  run,
  upwards,
  walk,
} from "../util.mjs"

/** Evidence recorder: every fact the profile states says where it came from. */
export function createContext(cwd) {
  const root = resolve(cwd)
  const evidence = {}
  const cache = new Map()
  const ctx = {
    root,
    evidence,
    /** Record evidence for a fact key. `file` may be absolute or relative. */
    ev(key, entry) {
      const e = { ...entry }
      if (e.file && e.file.startsWith("/")) e.file = rel(root, e.file)
      ;(evidence[key] ??= []).push(e)
    },
    read(p) {
      if (!cache.has(p)) cache.set(p, readText(p))
      return cache.get(p)
    },
    rel: (p) => rel(root, p),
  }
  return ctx
}

const WORKSPACE_FILES = ["pnpm-workspace.yaml", "turbo.json", "nx.json", "lerna.json", "rush.json"]

/** The `workspaces` globs of a package.json (array or { packages }). */
function workspaceGlobs(pkg) {
  const w = pkg?.workspaces
  if (Array.isArray(w)) return w
  if (Array.isArray(w?.packages)) return w.packages
  return []
}

function pnpmGlobs(dir) {
  const text = readText(join(dir, "pnpm-workspace.yaml"))
  if (!text) return []
  const out = []
  let inPackages = false
  for (const line of text.split("\n")) {
    if (/^packages\s*:/.test(line)) inPackages = true
    else if (/^\S/.test(line)) inPackages = false
    else if (inPackages) {
      const m = /^\s*-\s*['"]?([^'"#]+?)['"]?\s*$/.exec(line)
      if (m) out.push(m[1])
    }
  }
  return out
}

/** Expand `packages/*`, `apps/**`, `web-app` into package dirs. */
export function expandGlobs(base, globs) {
  const dirs = new Set()
  for (const g of globs) {
    if (g.startsWith("!")) continue
    const clean = g.replace(/\/+$/, "")
    if (!clean.includes("*")) {
      if (exists(join(base, clean, "package.json"))) dirs.add(join(base, clean))
      continue
    }
    const [prefix] = clean.split("*")
    const start = join(base, prefix)
    const deep = clean.includes("**")
    const scan = (d, depth) => {
      if (!isDir(d)) return
      for (const name of safeList(d)) {
        if (name === "node_modules" || name.startsWith(".")) continue
        const p = join(d, name)
        if (!isDir(p)) continue
        if (exists(join(p, "package.json"))) dirs.add(p)
        if (deep && depth < 3) scan(p, depth + 1)
      }
    }
    scan(start, 0)
  }
  return [...dirs].sort()
}

function safeList(d) {
  try {
    return readdirSync(d)
  } catch {
    return []
  }
}

const BUNDLER_CONFIGS = [
  ["next", /^next\.config\.(js|cjs|mjs|ts|mts)$/],
  ["remix", /^remix\.config\.(js|cjs|mjs|ts)$/],
  ["react-router", /^react-router\.config\.(js|mjs|ts)$/],
  ["vite", /^vite\.config\.(js|cjs|mjs|ts|mts|cts)$/],
  ["webpack", /^webpack\.config\.(js|cjs|mjs|ts)$/],
]

export const allDeps = (pkg) => ({
  ...(pkg?.peerDependencies ?? {}),
  ...(pkg?.devDependencies ?? {}),
  ...(pkg?.dependencies ?? {}),
})

/** Why this directory could be the app: react + a bundler we can read. */
function appSignal(dir) {
  const pkg = readJson(join(dir, "package.json"))
  if (!pkg) return null
  const runtime = { ...(pkg.devDependencies ?? {}), ...(pkg.dependencies ?? {}) }
  if (!runtime.react) return null
  const names = safeList(dir)
  for (const [kind, re] of BUNDLER_CONFIGS) {
    const f = names.find((n) => re.test(n))
    if (f) return { kind, file: f, pkg }
  }
  if (runtime["react-scripts"]) return { kind: "cra", file: "package.json", pkg }
  if (runtime["@craco/craco"]) return { kind: "cra", file: "package.json", pkg }
  if (Object.keys(runtime).some((d) => d.startsWith("@remix-run/"))) return { kind: "remix", file: "package.json", pkg }
  return null
}

function countUiFiles(dir) {
  const { files } = walk(dir, { exts: [".tsx", ".jsx"], maxFiles: 20000 })
  return files.length
}

/**
 * EXAMPLES AND DOCS ARE NOT THE PRODUCT, though they can outnumber it in .tsx
 * files. They stay candidates but lose to anything else.
 */
const SECONDARY = /(^|\/)(examples?|docs?|website|storybook|playground|demo|e2e|fixtures?)(\/|$)/

/* -------------------------------- repo shape ------------------------------ */

export function detectRepo(ctx) {
  const { root } = ctx
  const gitTop = findGitRoot(root)
  const rootPkg = readJson(join(root, "package.json"))

  // MONOREPO MARKERS, each with its own evidence.
  const monorepo = []
  const globs = [...workspaceGlobs(rootPkg), ...pnpmGlobs(root)]
  if (workspaceGlobs(rootPkg).length) {
    monorepo.push("workspaces")
    ctx.ev("repo.monorepo", { file: "package.json", note: `workspaces: ${workspaceGlobs(rootPkg).join(", ")}` })
  }
  for (const f of WORKSPACE_FILES) {
    if (exists(join(root, f))) {
      monorepo.push(f.replace(/\..*$/, ""))
      ctx.ev("repo.monorepo", { file: f })
    }
  }

  // THE CWD MIGHT ITSELF BE ONE WORKSPACE of a bigger monorepo. Walk up to
  // the git root; if an ancestor's workspaces include this dir, say so, but
  // keep the cwd as the app (the person pointed us at it).
  let parentMonorepo = null
  if (gitTop && gitTop !== root) {
    for (const d of upwards(dirname(root), gitTop)) {
      const p = readJson(join(d, "package.json"))
      const g = [...workspaceGlobs(p), ...pnpmGlobs(d)]
      if (g.length && expandGlobs(d, g).includes(root)) {
        parentMonorepo = rel(root, d)
        break
      }
    }
  }

  const packageDirs = globs.length ? expandGlobs(root, globs) : []
  const candidates = []
  for (const dir of [root, ...packageDirs]) {
    const sig = appSignal(dir)
    if (!sig) continue
    candidates.push({
      dir: rel(root, dir),
      abs: dir,
      framework: sig.kind,
      configFile: sig.file,
      name: sig.pkg.name ?? null,
      uiFiles: countUiFiles(dir),
    })
  }
  // Most UI files wins; examples/docs lose to anything real.
  candidates.sort((a, b) => {
    const sa = SECONDARY.test(a.dir) ? 1 : 0
    const sb = SECONDARY.test(b.dir) ? 1 : 0
    return sa - sb || b.uiFiles - a.uiFiles
  })

  const app = candidates[0] ?? null
  const appAbs = app?.abs ?? root
  if (app) {
    ctx.ev("repo.appDir", {
      file: app.dir === "." ? "package.json" : `${app.dir}/package.json`,
      note: `react + ${app.framework} (${app.configFile}), ${app.uiFiles} .tsx/.jsx files`,
    })
  }

  return {
    gitRoot: gitTop ? rel(root, gitTop) : null,
    isGit: Boolean(gitTop),
    monorepo: monorepo.length ? monorepo : null,
    parentMonorepo,
    workspaces: packageDirs.map((d) => rel(root, d)),
    // appDir relative to the git root (what the plan's commands cd into),
    // and relative to the surveyed root (what the detectors use).
    appDir: gitTop ? rel(gitTop, appAbs) : rel(root, appAbs),
    appDirFromRoot: rel(root, appAbs),
    appAbs,
    appCandidates: candidates.map(({ abs, ...c }) => c),
    alternatives: candidates.slice(1).map((c) => c.dir),
  }
}

/* ----------------------------- package manager ---------------------------- */

/**
 * THE PACKAGE MANAGER AND HOW TO REACH IT. The shadcn CLI installs through
 * the detected manager, so one not on PATH makes `shadcn add` fail after it
 * has written files. We say how to invoke it (pinned version, repo-bundled
 * release) and warn when it is unreachable.
 */
export function detectPackageManager(ctx, repo) {
  const { root } = ctx
  const pkg = readJson(join(root, "package.json")) ?? {}
  let name = null
  let version = null
  let lockfile = null
  const locks = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
    ["bun.lockb", "bun"],
    ["bun.lock", "bun"],
    ["npm-shrinkwrap.json", "npm"],
  ]
  // Lockfiles live at the workspace root, which may be above the cwd.
  const lockDirs = [root]
  if (repo.parentMonorepo) lockDirs.push(resolve(root, repo.parentMonorepo))
  outer: for (const d of lockDirs) {
    for (const [f, n] of locks) {
      if (exists(join(d, f))) {
        name = n
        lockfile = rel(root, join(d, f))
        ctx.ev("packageManager", { file: lockfile })
        break outer
      }
    }
  }
  if (typeof pkg.packageManager === "string") {
    const m = /^(npm|yarn|pnpm|bun)@([^+\s]+)/.exec(pkg.packageManager)
    if (m) {
      name = m[1]
      version = m[2]
      ctx.ev("packageManager", { file: "package.json", note: `packageManager: ${pkg.packageManager}` })
    }
  }
  if (!name && pkg.devEngines?.packageManager?.name) name = pkg.devEngines.packageManager.name
  name ??= "npm"

  // Yarn berry vs classic: lockfile metadata, or a yarnPath release.
  let yarnPath = null
  if (name === "yarn") {
    const yrc = readText(join(root, ".yarnrc.yml"))
    const m = yrc && /^yarnPath:\s*(.+)$/m.exec(yrc)
    if (m) {
      yarnPath = m[1].trim()
      ctx.ev("packageManager", { file: ".yarnrc.yml", note: `yarnPath: ${yarnPath}` })
      const v = /yarn-(\d+\.\d+\.\d+)/.exec(yarnPath)
      version ??= v?.[1] ?? null
    }
    if (!version) {
      const lock = readText(join(root, "yarn.lock"), 200_000)
      if (lock && /__metadata:/.test(lock)) version = "berry"
      else if (lock) version = "1"
    }
  }

  const present = onPath(name)
  let installedVersion = null
  if (present) {
    const r = run(name, ["--version"], { cwd: root, timeout: 15000 })
    if (r.code === 0) installedVersion = r.stdout.trim().split("\n").pop()
  }
  version ??= installedVersion

  const major = Number(String(version ?? "").split(".")[0]) || null
  const berry = name === "yarn" && (version === "berry" || (major && major >= 2))

  // HOW TO INVOKE IT when it is not on PATH. A pinned yarn 1 is one npx
  // away; berry is not on npm as `yarn`, but the repo carries its release.
  let invoke = name
  if (!present) {
    if (name === "yarn" && yarnPath) invoke = `node ${yarnPath}`
    else if (name === "yarn") invoke = `npx yarn@${version && !berry ? version : "1"}`
    else if (name === "pnpm") invoke = `npx pnpm@${version ?? "latest"}`
    else if (name === "bun") invoke = "bunx"
  }

  // THE RUNNER for one-off CLIs (shadcn). npx always exists with node; the
  // native runner is preferred when the manager is reachable.
  let runner = "npx"
  if (name === "pnpm" && present) runner = "pnpm dlx"
  else if (name === "yarn" && berry && present) runner = "yarn dlx"
  else if (name === "bun") runner = "bunx"

  const installCmd = name === "npm" ? "npm install" : `${invoke} install`
  return {
    name,
    version,
    berry: Boolean(berry),
    lockfile,
    yarnPath,
    onPath: present,
    installedVersion,
    invoke,
    runner,
    installCmd,
    runPrefix: name === "npm" ? "npm run" : `${invoke} run`,
  }
}

/* ----------------------------------- git ---------------------------------- */

export function detectGit(ctx, repo) {
  if (!repo.isGit) return { isRepo: false, clean: null, dirty: [], ignored: {} }
  const { root } = ctx
  const status = git(["status", "--porcelain"], root)
  const dirty = porcelainPaths(status.stdout)
  const head = git(["rev-parse", "HEAD"], root)
  const branch = git(["branch", "--show-current"], root)
  // check-ignore needs a path; a file inside the folder answers for it.
  const ignored = {}
  for (const [k, probe] of [
    [".claude", ".claude/settings.json"],
    [".ambientui", ".ambientui/profile.json"],
  ]) {
    const r = git(["check-ignore", "-q", "--no-index", "--", probe], root)
    ignored[k] = r.code === 0
    if (r.code === 0) {
      const v = git(["check-ignore", "-v", "--no-index", "--", probe], root)
      ctx.ev(`git.ignored.${k}`, { note: v.stdout.trim() })
    }
  }
  return {
    isRepo: true,
    head: head.code === 0 ? head.stdout.trim() : null,
    branch: branch.stdout.trim() || null,
    clean: dirty.length === 0,
    dirty: dirty.slice(0, 200),
    dirtyCount: dirty.length,
    ignored,
  }
}

export { basename }
