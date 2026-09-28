/**
 * `ambientui plan` — RE-DERIVE THE PLAN, WITH TWO KINDS OF NEW INPUT.
 *
 *   --path/--hotkey/--look/--governance/--theme  an owner's explicit choice,
 *       for a reinstall after trying the layer with the doctor's decisions.
 *   --set key=value --because "…"               the agent's correction, after
 *       reviewing the survey against the code (docs/doctor.md).
 *
 * No survey: the profile is what doctor saw. Both inputs persist in
 * plan.json (`given`, `overrides`), so a later run forgets neither.
 */
import { applyOverrides, buildPlan, parseOverride } from "../plan.mjs"
import { CliError, readState, writeState } from "../util.mjs"
import { printDecisions, printPlanSummary, registryFromEnv } from "./doctor.mjs"

const VALID = {
  path: ["layer", "full"],
  hotkey: ["takeover", "coexist", "yield", "off"],
  look: ["current", "reference"],
  governance: ["yes", "no"],
  theme: ["mirror", "light"],
}

export async function plan(opts, out) {
  const root = opts.cwd
  const profile = readState(root, "profile.json")
  if (!profile) throw new CliError("No .ambientui/profile.json yet.", { next: "ambientui doctor" })
  let given = {}
  let overrides = []
  try {
    const prev = readState(root, "plan.json")
    given = prev?.given ?? {}
    overrides = prev?.overrides ?? []
  } catch {
    given = {}
  }
  if (opts.set) {
    let o
    try {
      o = parseOverride(String(opts.set), opts.because)
    } catch (e) {
      throw new CliError(e.message)
    }
    if (!opts.because)
      throw new CliError("--set needs --because \"…\": every correction is written into AMBIENTUI-NOTES.md with its reason", {
        next: `ambientui plan --set ${opts.set} --because "<why the survey was wrong>"`,
      })
    overrides = [...overrides.filter((x) => x.key !== o.key), o]
  }
  for (const [k, vals] of Object.entries(VALID)) {
    if (opts[k] == null) continue
    if (!vals.includes(opts[k])) throw new CliError(`--${k} must be one of: ${vals.join(", ")} (got "${opts[k]}")`)
    given[k] = opts[k]
  }
  const p = applyOverrides(buildPlan(profile, given, { registry: registryFromEnv() }), overrides)
  writeState(root, "plan.json", { ...p, given })
  if (p.blockers.length) {
    out.head("BLOCKERS")
    for (const b of p.blockers) out.fail(`${b.message} → ${b.fix}`)
  }
  printDecisions(p, out)
  printPlanSummary(p, out)
  out.head("COMMANDS (run by `ambientui install`, from the app dir)")
  for (const c of p.commands) out.info(c.run)
  const next = p.blockers.length ? "fix the blockers above, then `ambientui plan` again" : "ambientui begin"
  out.done({ plan: p }, next)
  return p.blockers.length ? 1 : 0
}
