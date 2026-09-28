/**
 * `ambientui adapt` — re-apply the plan's adaptations to the installed
 * files, on their own. `install` runs them after the doors; this is for
 * after a door is re-added (the shadcn CLI writes the generic bytes back),
 * or after `ambientui plan` changed an answer that an adaptation depends on.
 * Every adaptation is idempotent.
 */
import { applyAdaptations } from "../adapt.mjs"
import { CliError, readState } from "../util.mjs"

export async function adapt(opts, out) {
  const root = opts.cwd
  const profile = readState(root, "profile.json")
  const plan = readState(root, "plan.json")
  if (!profile || !plan) throw new CliError("No plan yet (.ambientui/plan.json).", { next: "ambientui doctor" })
  const results = applyAdaptations({ root, plan, profile })
  out.head("ADAPT")
  if (!results.length) out.info("the plan has no adaptations for this product")
  for (const a of results) {
    if (a.skipped) out.info(`${a.id}: kept as is — ${a.why}`)
    else if (a.changed.length) {
      out.ok(`${a.id}: ${a.changed.length} file(s) — ${a.why}`)
      for (const c of a.changed.slice(0, 20)) out.info(c)
    } else out.ok(`${a.id}: already applied${a.note ? ` (${a.note})` : ""}`)
    for (const c of a.conflicts) out.fail(`${a.id}: not moved, destination exists: ${c}`)
  }
  const failed = results.some((a) => a.conflicts?.length)
  out.done({ ok: !failed, results }, failed ? "resolve the conflicts above, then `ambientui adapt`" : "ambientui verify --url <dev server url>")
  return failed ? 1 : 0
}
