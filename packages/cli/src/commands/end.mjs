/**
 * `ambientui end` — WRITE DOWN WHAT THE INSTALL CHANGED, AND COMMIT IT BY NAME.
 *
 * The manifest records the base commit, the doors, and every file and
 * dependency added or modified. The commit adds exactly those paths (never
 * `git add -A`) and carries the `Ambientui-Install: 1` trailer `uninstall`
 * finds it by. `--commit` runs it; the owner approves that first.
 */
import { writeFileSync } from "node:fs"
import { join } from "node:path"

import { notesMarkdown } from "../notes.mjs"

import { changesSince, depsDiff, requireSession } from "../session.mjs"
import { CliError, git, readState, rel, writeState } from "../util.mjs"

export const TRAILER = "Ambientui-Install: 1"

const q = (p) => (/^[\w./@+-]+$/.test(p) ? p : `'${p.replace(/'/g, `'\\''`)}'`)

export async function end(opts, out) {
  const root = opts.cwd
  const session = requireSession(root)
  const plan = readState(root, "plan.json")
  if (!plan) throw new CliError("No .ambientui/plan.json.", { next: "ambientui doctor" })
  // Notes are written first so they commit with the install and leave with the revert.
  const notesFile = join(root, plan.appDirFromRoot ?? ".", "AMBIENTUI-NOTES.md")
  let verifyResult = null
  try {
    verifyResult = readState(root, "verify.json")
  } catch {
    verifyResult = null
  }
  writeFileSync(
    notesFile,
    notesMarkdown({
      plan,
      notes: readState(root, "notes.json")?.notes ?? [],
      verify: verifyResult,
      productName: plan.provider?.productName,
    })
  )
  const ch = changesSince(root, session)
  const { top } = ch
  // Our state goes in by its own three names, not through the change list.
  const isState = (p) => /(^|\/)\.ambientui\//.test(p)
  const added = ch.added.filter((p) => !isState(p))
  const modified = ch.modified.filter((p) => !isState(p))
  const deleted = ch.deleted.filter((p) => !isState(p))

  const rootFromTop = rel(top, root)
  const stateFromTop = (n) => (rootFromTop === "." ? `.ambientui/${n}` : `${rootFromTop}/.ambientui/${n}`)
  const pkgPaths = [...new Set([join(rootFromTop, "package.json"), join(rootFromTop, plan.appDirFromRoot ?? ".", "package.json")].map((p) => p.replace(/^\.\//, "")))]
  const dependenciesAdded = {}
  const dependencies = {}
  for (const p of pkgPaths) {
    const d = depsDiff(top, session.base, p)
    dependencies[p] = d
    Object.assign(dependenciesAdded, d.added)
  }

  const manifest = {
    base: session.base,
    branch: session.branch,
    installedAt: new Date().toISOString(),
    path: plan.path,
    doors: plan.doors,
    files: { added, modified, deleted },
    dependenciesAdded,
    dependencies,
    commitTrailer: TRAILER,
  }
  writeState(root, "manifest.json", manifest)

  // The state files are force-added: a host that ignores .ambientui/ still
  // needs the manifest in the commit uninstall reverts.
  const files = [...added, ...modified, ...deleted]
  const state = [stateFromTop("manifest.json"), stateFromTop("plan.json"), stateFromTop("profile.json"), stateFromTop(".gitignore")]
  if (readState(root, "notes.json")) state.push(stateFromTop("notes.json"))
  const cmd = `${files.length ? `git add -- ${files.map(q).join(" ")} && ` : ""}git add -f -- ${state.map(q).join(" ")} && git commit -m "Add the ambientui layer" -m "${TRAILER}"`
  const cd = rootFromTop === "." ? "" : `cd ${q(rel(root, top))} && `

  out.head(`CHANGED SINCE ${session.base.slice(0, 10)}`)
  for (const p of added) out.ok(`added     ${p}`)
  for (const p of modified) out.warn(`modified  ${p}`)
  for (const p of deleted) out.fail(`deleted   ${p}`)
  if (!added.length && !modified.length && !deleted.length) out.warn("nothing changed since begin")
  const deps = Object.entries(dependenciesAdded)
  if (deps.length) out.info(`dependencies added: ${deps.map(([k, v]) => `${k}@${v}`).join(", ")}`)
  if (session.dirty?.length) out.info(`left out (dirty at begin): ${session.dirty.length} path(s)`)
  // Ignored files never show up above; say so when the doors write there.
  const ign = git(["check-ignore", "--no-index", "-q", "--", ".claude/skills/ambientui-start/SKILL.md"], top)
  if (ign.code === 0) out.warn(".claude/ is gitignored here: the start/governance files are not in this commit")
  out.info(`manifest: ${rel(root, join(root, ".ambientui/manifest.json"))}`)
  out.info(`developer notes: ${rel(root, notesFile)} — tell the owner it is there`)

  if (opts.commit) {
    for (const args of [files.length ? ["add", "--", ...files] : null, ["add", "-f", "--", ...state]].filter(Boolean)) {
      const add = git(args, top)
      if (add.code !== 0) throw new CliError(`git add failed: ${add.stderr.trim()}`)
    }
    const c = git(["commit", "-m", "Add the ambientui layer", "-m", TRAILER], top, { timeout: 600_000 })
    if (c.code !== 0) {
      out.fail("git commit failed (a pre-commit hook?):")
      for (const l of (c.stdout + c.stderr).trim().split("\n").slice(-20)) out.info(l)
      out.done({ ok: false, manifest }, "fix what the hook reported, then `ambientui end --commit` again")
      return 1
    }
    const head = git(["rev-parse", "HEAD"], top).stdout.trim()
    out.ok(`committed ${head.slice(0, 10)} with trailer "${TRAILER}"`)
    out.done({ ok: true, manifest, commit: head }, "the reveal: give the owner the URL and the hotkey from plan.provider.hotkey, and tell them `ambientui uninstall` removes it")
    return 0
  }
  out.head("COMMIT (ask the owner before running it, or run `ambientui end --commit`)")
  out.raw(`${cd}${cmd}`)
  out.done({ ok: true, manifest, commitCommand: `${cd}${cmd}` }, "ask the owner, then `ambientui end --commit`")
  return 0
}
