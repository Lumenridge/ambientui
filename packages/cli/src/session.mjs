/**
 * WHAT CHANGED SINCE `begin` — the one computation end, verify and install
 * all need, done once.
 *
 * WHY GIT AND NOT A FILE WATCHER. The install touches files through three
 * hands — the shadcn CLI, the package manager, and the agent wiring things
 * up afterwards — and only git sees all three. `begin` records HEAD and the
 * paths that were already dirty; everything git reports as different from
 * that HEAD, minus those paths, is the install. That list is what `end`
 * commits (by name, never `git add -A`) and what `uninstall` reverses.
 */
import { createHash } from "node:crypto"
import { join } from "node:path"

import { CliError, git, gitRoot, porcelainPaths, readState, readText, rel } from "./util.mjs"

export const sha = (text) => createHash("sha256").update(text ?? "").digest("hex")

/** The session, or a clear instruction to start one. */
export function requireSession(root) {
  const s = readState(root, "session.json")
  if (!s) throw new CliError("No install session: .ambientui/session.json is missing.", { next: "ambientui begin" })
  return s
}

/** Paths in the CLI's own state that never belong to the install. */
const OWN_STATE = /(^|\/)\.ambientui\/(verify\.json|install\.log|session\.json|baseline\/)/

/**
 * Added and modified paths since the session base, relative to the git
 * root, excluding what was dirty at `begin` and the CLI's own run files.
 */
export function changesSince(root, session) {
  const top = gitRoot(root)
  if (!top) throw new CliError("Not a git repository.")
  const r = git(["diff", "--name-status", "--no-renames", session.base], top)
  if (r.code !== 0) throw new CliError(`git diff against ${session.base} failed: ${r.stderr.trim()}`)
  const skip = new Set(session.dirty ?? [])
  const skipDirs = [...skip].filter((p) => p.endsWith("/"))
  const excluded = (p) => skip.has(p) || skipDirs.some((d) => p.startsWith(d)) || OWN_STATE.test(p)
  const added = []
  const modified = []
  const deleted = []
  for (const line of r.stdout.split("\n").filter(Boolean)) {
    const [status, ...rest] = line.split("\t")
    const p = rest.join("\t")
    if (excluded(p)) continue
    if (status.startsWith("A")) added.push(p)
    else if (status.startsWith("D")) deleted.push(p)
    else modified.push(p)
  }
  const u = git(["ls-files", "--others", "--exclude-standard", "--full-name"], top)
  for (const p of u.stdout.split("\n").filter(Boolean)) if (!excluded(p) && !added.includes(p)) added.push(p)
  return { top, added: added.sort(), modified: modified.sort(), deleted: deleted.sort() }
}

/** Dependencies added/removed/changed in a package.json between base and now. */
export function depsDiff(top, base, pkgPath) {
  const before = git(["show", `${base}:${pkgPath}`], top)
  let b = {}
  try {
    b = before.code === 0 ? JSON.parse(before.stdout) : {}
  } catch {
    b = {}
  }
  let a = {}
  try {
    a = JSON.parse(readText(join(top, pkgPath)) ?? "{}")
  } catch {
    a = {}
  }
  const out = { added: {}, removed: {}, changed: {} }
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const x = b[field] ?? {}
    const y = a[field] ?? {}
    for (const [k, v] of Object.entries(y)) {
      if (!(k in x)) out.added[k] = v
      else if (x[k] !== v) out.changed[k] = `${x[k]} → ${v}`
    }
    for (const [k, v] of Object.entries(x)) if (!(k in y)) out.removed[k] = v
  }
  return out
}

export { porcelainPaths, rel }
