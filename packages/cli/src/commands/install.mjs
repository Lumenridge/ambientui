/**
 * `ambientui install` — RUN THE PLAN'S COMMANDS, AND UNDO WHAT THEY MUST NOT DO.
 *
 * The shadcn CLI lands the doors; around it:
 *
 *   1. `--overwrite` also replaces the product's own primitives, so every
 *      file under the ui dir and utils is snapshotted and restored if it
 *      changed. The product's primitives are never replaced.
 *   2. Items with explicit `target`s land at `<app>/<target>` even when `@/`
 *      points elsewhere; they are moved under the source root.
 *   3. Config the CLI reformats is not undone, but its diff is printed for
 *      review.
 *
 * Then the plan's adaptations (src/adapt.mjs) run on what landed. Wiring
 * the CSS, the mount and the aliases is the agent's job, from the plan.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { applyAdaptations } from "../adapt.mjs"
import { requireSession, sha } from "../session.mjs"
import { CliError, git, isDir, readState, rel, run, statePath, tail, walk, writeState } from "../util.mjs"

/** The files install protects: the ui dir and utils, if they exist now. */
function protectedFiles(root, profile) {
  const out = []
  const ui = join(root, profile.shadcn?.uiDir ?? "src/components/ui")
  if (isDir(ui)) out.push(...walk(ui, { maxFiles: 2000 }).files)
  const utils = profile.shadcn?.utils?.file
  if (utils && existsSync(join(root, utils))) out.push(join(root, utils))
  return out
}

/** Target roots the registry writes to, relative to the app dir. */
const TARGET_DIRS = ["components/ambient", "components/ui", "components", "lib", "hooks", "styles"]

export async function install(opts, out) {
  const root = opts.cwd
  const profile = readState(root, "profile.json")
  const plan = readState(root, "plan.json")
  if (!profile || !plan) throw new CliError("No plan yet (.ambientui/plan.json).", { next: "ambientui doctor" })
  const session = requireSession(root)
  if (plan.blockers?.length) {
    for (const b of plan.blockers) out.fail(`${b.message} → ${b.fix}`)
    out.done({ ok: false, blockers: plan.blockers }, "fix the blockers, then `ambientui doctor`")
    return 1
  }
  const appAbs = join(root, plan.appDirFromRoot ?? ".")
  const srcAbs = join(appAbs, plan.srcRoot ?? ".")
  const logPath = statePath(root, "install.log")
  mkdirSync(dirname(logPath), { recursive: true })
  writeFileSync(logPath, `# ambientui install — ${new Date().toISOString()}\n`)

  // Untracked files before anything runs: a MOVE only touches new files.
  const untrackedBefore = new Set(
    git(["ls-files", "--others", "--exclude-standard"], root).stdout.split("\n").filter(Boolean).map((p) => join(root, p))
  )

  // SNAPSHOT — first sighting wins, so a host file keeps its pre-install body.
  const snap = new Map()
  const takeSnapshot = (origin) => {
    for (const f of protectedFiles(root, profile)) {
      if (snap.has(f)) continue
      snap.set(f, { content: readFileSync(f), origin })
    }
  }
  takeSnapshot("host")

  const results = []
  let failed = null
  for (const c of plan.commands) {
    takeSnapshot(results.length ? "door" : "host")
    const label = c.door ? `@ambientui/${c.door}` : (c.label ?? "registry add")
    out.live(`… ${label}`)
    const cwd = join(root, c.cwd ?? ".")
    const r = run("sh", ["-c", c.run], { cwd, timeout: Number(opts.timeout ?? 600) * 1000, env: { CI: "1" } })
    appendFileSync(logPath, `\n$ (cd ${c.cwd ?? "."} && ${c.run})\n# exit ${r.code}${r.timedOut ? " (timed out)" : ""} in ${r.ms}ms\n${r.stdout}\n${r.stderr}\n`)
    results.push({ door: c.door ?? null, label: c.label ?? null, command: c.run, code: r.code, ms: r.ms })
    if (r.code !== 0) {
      out.live(`✗ ${label} failed (exit ${r.timedOut ? "timeout" : r.code})`)
      failed = { command: c.run, code: r.code, tail: tail((r.stdout + "\n" + r.stderr).trim(), 30) }
      break
    }
    out.live(`✔ ${label}`)
  }

  // (1) RESTORE the product's own primitives — even after a failure.
  const restored = []
  for (const [f, s] of snap) {
    if (s.origin !== "host") continue
    const now = existsSync(f) ? readFileSync(f) : null
    if (now && Buffer.compare(now, s.content) === 0) continue
    writeFileSync(f, s.content)
    restored.push(rel(root, f))
  }

  // (2) MOVE files that landed at <app>/<target> outside the source root.
  const moved = []
  const conflicts = []
  if (srcAbs !== appAbs) {
    for (const d of TARGET_DIRS) {
      const from = join(appAbs, d)
      if (!isDir(from) || from.startsWith(srcAbs + "/")) continue
      for (const f of walk(from, { maxFiles: 5000 }).files) {
        if (!untrackedBefore.has(f) && isNew(root, f, untrackedBefore)) {
          const to = join(srcAbs, rel(appAbs, f))
          if (existsSync(to)) {
            conflicts.push(`${rel(root, f)} (exists at ${rel(root, to)})`)
            continue
          }
          mkdirSync(dirname(to), { recursive: true })
          renameSync(f, to)
          moved.push(`${rel(root, f)} → ${rel(root, to)}`)
        }
      }
    }
  }
  // A literal `@` directory: the CLI could not resolve the alias.
  const at = join(appAbs, "@")
  if (isDir(at)) {
    for (const f of walk(at, { maxFiles: 5000 }).files) {
      const to = join(srcAbs, rel(at, f))
      if (existsSync(to)) {
        conflicts.push(`${rel(root, f)} (exists at ${rel(root, to)})`)
        continue
      }
      mkdirSync(dirname(to), { recursive: true })
      renameSync(f, to)
      moved.push(`${rel(root, f)} → ${rel(root, to)}`)
    }
    if (!walk(at, { maxFiles: 1 }).files.length) rmSync(at, { recursive: true, force: true })
  }

  // (2b) ADAPT the landed files to this product.
  const adapted = applyAdaptations({
    root,
    plan,
    profile,
    isNew: (f) => !untrackedBefore.has(f) && isNew(root, f, untrackedBefore),
  })

  // Remember what was protected, by hash, for `verify`.
  const protectedHashes = {}
  for (const [f, s] of snap) if (s.origin === "host") protectedHashes[rel(root, f)] = sha(s.content)
  writeState(root, "session.json", { ...session, install: { at: new Date().toISOString(), results, restored, moved, conflicts, adapted, protected: protectedHashes } })

  // (3) The config diff to review.
  const cfg = ["package.json", join(plan.appDirFromRoot ?? ".", "package.json"), "components.json", join(plan.appDirFromRoot ?? ".", "components.json"), profile.styling?.tailwind?.config, plan.css?.entry, plan.css?.entryFile]
    .filter(Boolean)
    .map((p) => p.replace(/^\.\//, ""))
  const diff = git(["diff", "--stat", session.base, "--", ...new Set(cfg)], root)

  out.head("INSTALL")
  for (const r of results) (r.code === 0 ? out.ok : out.fail)(`${r.door ? `@ambientui/${r.door}` : (r.label ?? "registry add")} (${Math.round(r.ms / 1000)}s)`)
  if (restored.length) {
    out.warn(`restored ${restored.length} product file(s) the CLI changed (the product's own primitives are never replaced):`)
    for (const p of restored) out.info(p)
  } else out.ok("no product primitive was changed")
  if (moved.length) {
    out.warn(`moved ${moved.length} file(s) under the source root (${plan.srcRoot}):`)
    for (const m of moved.slice(0, 30)) out.info(m)
  }
  for (const c of conflicts) out.fail(`not moved, destination exists: ${c}`)
  for (const a of adapted) {
    if (a.skipped) out.info(`adapt ${a.id}: kept as is — ${a.why}`)
    else if (a.changed.length) out.ok(`adapt ${a.id}: ${a.changed.length} file(s) — ${a.why}`)
    else out.info(`adapt ${a.id}: nothing to change${a.note ? ` (${a.note})` : ""}`)
    for (const c of a.conflicts) out.fail(`adapt ${a.id}: not moved, destination exists: ${c}`)
  }
  if (diff.stdout.trim()) {
    out.head("CONFIG FILES TOUCHED — review `git diff` on each (the CLI reformats)")
    for (const l of diff.stdout.trim().split("\n")) out.info(l.trim())
  }
  out.info(`full output: ${rel(root, logPath)}`)

  if (failed) {
    out.head(`FAILED: ${failed.command}`)
    for (const l of failed.tail.split("\n")) out.info(l)
    out.done({ ok: false, results, restored, moved, conflicts, failed }, "fix the failure above (see .ambientui/install.log), then `ambientui install` again")
    return 1
  }
  out.done(
    { ok: true, results, restored, moved, conflicts },
    "wire the plan (css lines, mount, alias edits, env flag, transport) from .ambientui/plan.json, then `ambientui verify`"
  )
  return 0
}

/** New since begin: untracked now and not tracked at base. */
function isNew(root, f, untrackedBefore) {
  if (untrackedBefore.has(f)) return false
  const r = git(["ls-files", "--error-unmatch", "--", f], root)
  return r.code !== 0
}
