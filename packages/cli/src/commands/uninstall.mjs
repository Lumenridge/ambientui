/**
 * `ambientui uninstall` — GIT IS THE MECHANISM.
 *
 * The install is one commit carrying `Ambientui-Install: 1`; uninstalling
 * is `git revert` of it — reviewable and itself revertible. Code written
 * after the install that uses the layer is listed by file:line for the
 * agent to remove.
 */
import { CliError, git, gitRoot, porcelainPaths, readState } from "../util.mjs"
import { TRAILER } from "./end.mjs"

export async function uninstall(opts, out) {
  const root = opts.cwd
  const top = gitRoot(root)
  if (!top) throw new CliError("Not a git repository.")
  const dirty = porcelainPaths(git(["status", "--porcelain"], top).stdout).filter((p) => !/(^|\/)\.ambientui\//.test(p))
  if (dirty.length) {
    out.fail(`the working tree has ${dirty.length} uncommitted change(s); uninstall reverts commits and needs a clean tree`)
    for (const p of dirty.slice(0, 10)) out.info(p)
    out.done({ ok: false, dirty }, "commit or stash your changes, then `ambientui uninstall`")
    return 1
  }
  const log = git(["log", "--format=%H %s", `--grep=^${TRAILER.split(":")[0]}:`], top)
  const commits = log.stdout
    .split("\n")
    .filter(Boolean)
    .map((l) => ({ sha: l.slice(0, 40), subject: l.slice(41) }))
  if (!commits.length) {
    out.fail("no install commit on this branch")
    out.info(`uninstall works on the install commit made by \`ambientui end --commit\` (it carries the trailer "${TRAILER}").`)
    out.info("If the install was committed by hand without it, revert that commit yourself: git revert <sha>")
    out.done({ ok: false, commits: [] }, "find the install commit and `git revert` it")
    return 1
  }
  out.head(opts.dryRun ? "WOULD REVERT (newest first)" : "REVERTING (newest first)")
  for (const c of commits) out.info(`${c.sha.slice(0, 10)} ${c.subject}`)
  if (!opts.dryRun) {
    for (const c of commits) {
      const r = git(["revert", "--no-edit", c.sha], top, { timeout: 600_000 })
      if (r.code !== 0) {
        out.fail(`git revert ${c.sha.slice(0, 10)} stopped:`)
        for (const l of (r.stdout + r.stderr).trim().split("\n").slice(-15)) out.info(l)
        out.done({ ok: false, commits, stoppedAt: c.sha }, "resolve the conflicts and `git revert --continue` (or `git revert --abort`), then `ambientui uninstall` again")
        return 1
      }
      out.ok(`reverted ${c.sha.slice(0, 10)}`)
    }
  }

  // LEFTOVERS: tracked code that still reaches for the layer.
  const g = git(
    ["grep", "-n", "-I", "-E", "components/ambient|from [\"']ambientui|styles/ambient(-[a-z]+)?\\.css|AssistantProvider|useAssistant|useRegisterCommands|setPageChip|data-ambient-", "--", ".", ":(exclude).ambientui/**", ":(exclude)**/package-lock.json", ":(exclude)**/yarn.lock", ":(exclude)**/pnpm-lock.yaml", ":(exclude)**/CHANGELOG.md"],
    top
  )
  const leftovers = g.stdout.split("\n").filter(Boolean).slice(0, 100)
  if (leftovers.length) {
    out.head(`LEFTOVERS${opts.dryRun ? " (before the revert)" : ""} — remove these references by hand`)
    for (const l of leftovers) out.info(l.length > 180 ? l.slice(0, 180) + "…" : l)
  } else out.ok("no remaining references to the layer")

  const profile = (() => {
    try {
      return readState(root, "profile.json")
    } catch {
      return null
    }
  })()
  const installCmd = profile?.packageManager?.installCmd ?? "npm install"
  out.done({ ok: true, dryRun: Boolean(opts.dryRun), commits, leftovers }, opts.dryRun ? "ambientui uninstall" : `${installCmd}   (refresh node_modules after the revert)`)
  return 0
}
