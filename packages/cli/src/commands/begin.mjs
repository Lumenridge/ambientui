/**
 * `ambientui begin` — MARK WHERE THE INSTALL STARTS.
 *
 * The install is defined as "everything that differs from this commit", so
 * this records the commit. A dirty tree is refused by default: uncommitted
 * work would be indistinguishable from the install, and `end` would commit
 * it under the install's name — and `uninstall` would later revert it.
 * `--allow-dirty` records those paths so both leave them alone.
 */
import { CliError, git, gitRoot, porcelainPaths, writeState } from "../util.mjs"

export async function begin(opts, out) {
  const root = opts.cwd
  const top = gitRoot(root)
  if (!top) {
    throw new CliError("Not a git repository. Install and uninstall are git commits.", {
      next: 'git init && git add -A && git commit -m "Initial commit", then ambientui begin',
    })
  }
  const head = git(["rev-parse", "HEAD"], top)
  if (head.code !== 0) {
    throw new CliError("The repository has no commits yet; the install needs a base commit.", {
      next: 'git add -A && git commit -m "Initial commit", then ambientui begin',
    })
  }
  const branch = git(["branch", "--show-current"], top).stdout.trim() || null
  const status = git(["status", "--porcelain", "--untracked-files=all"], top)
  // The CLI's own state is never "dirty work".
  const dirty = porcelainPaths(status.stdout).filter((p) => !/(^|\/)\.ambientui\//.test(p))
  if (dirty.length && !opts.allowDirty) {
    out.fail(`the working tree has ${dirty.length} uncommitted change(s):`)
    for (const p of dirty.slice(0, 15)) out.info(p)
    if (dirty.length > 15) out.info(`… and ${dirty.length - 15} more`)
    out.info("Commit or stash them first, or re-run with --allow-dirty to leave them out of the install.")
    out.done({ ok: false, dirty }, "commit your work, then `ambientui begin` (or `ambientui begin --allow-dirty`)")
    return 1
  }
  const session = {
    base: head.stdout.trim(),
    branch,
    startedAt: new Date().toISOString(),
    dirty,
    porcelain: status.stdout.split("\n").filter(Boolean),
  }
  writeState(root, "session.json", session)
  out.ok(`session started at ${session.base.slice(0, 10)} on ${branch ?? "(detached HEAD)"}`)
  if (dirty.length) out.warn(`${dirty.length} dirty path(s) recorded; end and verify will leave them out`)
  out.done({ ok: true, session }, "ambientui install")
  return 0
}
