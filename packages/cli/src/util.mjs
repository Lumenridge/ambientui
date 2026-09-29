/**
 * THE PLUMBING EVERY COMMAND SHARES — reading unfamiliar projects, running
 * processes without hanging on a prompt, and keeping state in one folder.
 *
 * WHY SO DEFENSIVE. Readers return null on any trouble (commented JSON,
 * non-UTF-8 files, huge trees) and detectors treat null as "not found", so
 * `doctor` reports instead of crashing.
 */
import { spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"

export const SCHEMA = 1
export const STATE_DIR = ".ambientui"

/* --------------------------------- files --------------------------------- */

export const exists = (p) => {
  try {
    return existsSync(p)
  } catch {
    return false
  }
}

export const isDir = (p) => {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

export function readdirSafe(dir) {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}

export function readText(p, maxBytes = 2_000_000) {
  try {
    const st = statSync(p)
    if (!st.isFile() || st.size > maxBytes) return null
    return readFileSync(p, "utf8")
  } catch {
    return null
  }
}

/**
 * JSON AS PEOPLE ACTUALLY WRITE IT. Comments and trailing commas are
 * stripped (outside strings) before parsing; a file that still fails is null.
 */
export function readJson(p) {
  const text = readText(p)
  if (text == null) return null
  return parseJsonLoose(text)
}

export function parseJsonLoose(text) {
  try {
    return JSON.parse(text)
  } catch {
    /* fall through to the forgiving parse */
  }
  let out = ""
  let inStr = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const n = text[i + 1]
    if (inStr) {
      out += c
      if (c === "\\") {
        out += n ?? ""
        i++
      } else if (c === '"') inStr = false
      continue
    }
    if (c === '"') {
      inStr = true
      out += c
    } else if (c === "/" && n === "/") {
      while (i < text.length && text[i] !== "\n") i++
      out += "\n"
    } else if (c === "/" && n === "*") {
      i += 2
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++
      i++
    } else out += c
  }
  out = out.replace(/,(\s*[}\]])/g, "$1")
  try {
    return JSON.parse(out)
  } catch {
    return null
  }
}

/** 1-based line number of a character offset. */
export function lineAt(text, index) {
  let line = 1
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) line++
  return line
}

/** First match of a regex in a text, as { line, match }. */
export function findLine(text, re) {
  if (!text) return null
  const m = re.exec(text)
  if (!m) return null
  return { line: lineAt(text, m.index), match: m[0], groups: m }
}

/** Posix-style relative path, so evidence reads the same on every OS. */
export const rel = (from, to) => relative(from, to).split(sep).join("/") || "."

/**
 * THE DIRECTORIES NO DETECTOR SHOULD READ: build output, dependencies, and
 * the CLI's own `.ambientui`.
 */
export const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo",
  ".cache",
  "coverage",
  ".ambientui",
  ".yarn",
  ".vercel",
  ".output",
  "storybook-static",
  "vendor",
  "__snapshots__",
  "build-stats",
  "playwright-report",
  "test-results",
])

/**
 * Walk a directory for files. Capped to keep doctor fast; the caller reports
 * truncation rather than silently shrinking the survey.
 */
export function walk(root, { exts = null, maxFiles = 25000, ignore = IGNORE_DIRS } = {}) {
  const files = []
  let truncated = false
  const stack = [root]
  while (stack.length) {
    const dir = stack.pop()
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        if (ignore.has(e.name) || (e.name.startsWith(".") && e.name !== ".claude" && e.name !== ".agents")) continue
        stack.push(p)
      } else if (e.isFile()) {
        if (exts && !exts.some((x) => e.name.endsWith(x))) continue
        if (files.length >= maxFiles) {
          truncated = true
          break
        }
        files.push(p)
      }
    }
    if (truncated) break
  }
  files.sort()
  return { files, truncated }
}

/** Walk UP from a directory to a stop directory (inclusive), yielding each. */
export function* upwards(from, stop) {
  let d = resolve(from)
  const end = resolve(stop ?? "/")
  for (;;) {
    yield d
    if (d === end) return
    const parent = dirname(d)
    if (parent === d) return
    d = parent
  }
}

/* -------------------------------- versions -------------------------------- */

/**
 * A VERSION FROM WHAT THE PROJECT SAYS. Without node_modules a declared
 * range (`^3.4.19`, `~6`, `npm:tailwindcss@^3.4`) is read as its floor.
 * `workspace:*`, `latest` and git URLs have no floor and return null.
 */
export function parseVersion(spec) {
  if (!spec || typeof spec !== "string") return null
  let s = spec.trim()
  if (s.startsWith("npm:")) s = s.slice(s.lastIndexOf("@") + 1)
  const m = /(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?/.exec(s)
  if (!m || /^(workspace|file|link|git|github|http)/.test(s)) return null
  const major = Number(m[1])
  const minor = m[2] && /\d/.test(m[2]) ? Number(m[2]) : 0
  const patch = m[3] && /\d/.test(m[3]) ? Number(m[3]) : 0
  return { major, minor, patch, raw: spec, text: `${major}.${minor}.${patch}` }
}

/** The installed version of a package, looking up from `from` to `stop`. */
export function installedVersion(pkg, from, stop) {
  for (const d of upwards(from, stop)) {
    const j = readJson(join(d, "node_modules", pkg, "package.json"))
    if (j?.version) return j.version
  }
  return null
}

/* -------------------------------- processes ------------------------------- */

/**
 * RUN A PROCESS WITH STDIN CLOSED, so a prompt from the shadcn CLI or a
 * package manager fails fast with its question in the output instead of
 * hanging.
 */
export function run(cmd, args, { cwd, timeout = 120_000, env, shell = false } = {}) {
  const started = Date.now()
  const r = spawnSync(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    timeout,
    shell,
    maxBuffer: 64 * 1024 * 1024,
  })
  return {
    code: r.status ?? (r.error ? 127 : 1),
    signal: r.signal,
    timedOut: r.error?.code === "ETIMEDOUT",
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    error: r.error?.message ?? null,
    ms: Date.now() - started,
  }
}

/** Is a binary on PATH? (`command -v`, so shell builtins and shims count.) */
export function onPath(bin) {
  const r = run("sh", ["-c", `command -v ${JSON.stringify(bin)}`], { timeout: 5000 })
  return r.code === 0 && r.stdout.trim().length > 0
}

export const tail = (text, n = 40) => text.split("\n").slice(-n).join("\n")

/* ---------------------------------- git ---------------------------------- */

export function git(args, cwd, opts = {}) {
  return run("git", args, { cwd, timeout: 60_000, ...opts })
}

/**
 * The git root, spelled the way the caller spells its path. `--show-toplevel`
 * returns the realpath, which breaks relative paths across symlinked
 * spellings (/var vs /private/var); `--show-cdup` resolved against the cwd
 * does not.
 */
export function gitRoot(cwd) {
  const r = git(["rev-parse", "--show-cdup"], cwd)
  return r.code === 0 ? resolve(cwd, r.stdout.trim() || ".") : null
}

/** Paths in `git status --porcelain`, without the status letters. */
export function porcelainPaths(text) {
  return text
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const p = l.slice(3)
      const arrow = p.indexOf(" -> ")
      return (arrow >= 0 ? p.slice(arrow + 4) : p).replace(/^"|"$/g, "")
    })
}

/* --------------------------------- state --------------------------------- */

/**
 * ALL STATE IN ONE FOLDER: `<project>/.ambientui/`, as JSON stamped with a
 * schema so a CLI refuses a shape it does not understand.
 */
export const statePath = (cwd, name) => join(cwd, STATE_DIR, name)

/**
 * Manifest, plan and profile are committed with the install; the rest is
 * one machine's scratch and ignored, so `git status` after `end --commit`
 * is clean.
 */
const STATE_GITIGNORE = "# ambientui: this machine's scratch; the manifest, plan and profile are committed\nsession.json\ninstall.log\nverify.json\nbaseline/\n"

export function writeState(cwd, name, obj) {
  const p = statePath(cwd, name)
  mkdirSync(dirname(p), { recursive: true })
  const ignore = join(dirname(p), ".gitignore")
  if (!existsSync(ignore)) writeFileSync(ignore, STATE_GITIGNORE)
  const body = { schema: SCHEMA, ...obj }
  writeFileSync(p, JSON.stringify(body, null, 2) + "\n")
  return p
}

export function readState(cwd, name) {
  const j = readJson(statePath(cwd, name))
  if (!j) return null
  if (j.schema !== SCHEMA) {
    throw new CliError(
      `${STATE_DIR}/${name} has schema ${j.schema}; this CLI reads schema ${SCHEMA}. Re-run \`ambientui doctor\`.`
    )
  }
  return j
}

export class CliError extends Error {
  constructor(message, { code = 1, next = null } = {}) {
    super(message)
    this.exitCode = code
    this.next = next
  }
}
