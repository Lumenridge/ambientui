/**
 * `ambientui plan` — RE-DERIVE THE PLAN FROM THE PROFILE AND THE ANSWERS.
 *
 * No survey: the profile is what doctor saw, and the owner's answers are
 * the only new input. Answers persist in plan.json (`given`), so answering
 * one question later does not forget the others.
 */
import { buildPlan, questions as questionsOf } from "../plan.mjs"
import { CliError, readState, writeState } from "../util.mjs"
import { printPlanSummary, registryFromEnv } from "./doctor.mjs"

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
  try {
    given = readState(root, "plan.json")?.given ?? {}
  } catch {
    given = {}
  }
  for (const [k, vals] of Object.entries(VALID)) {
    if (opts[k] == null) continue
    if (!vals.includes(opts[k])) throw new CliError(`--${k} must be one of: ${vals.join(", ")} (got "${opts[k]}")`)
    given[k] = opts[k]
  }
  const p = buildPlan(profile, given, { registry: registryFromEnv() })
  writeState(root, "plan.json", { ...p, given })
  if (p.blockers.length) {
    out.head("BLOCKERS")
    for (const b of p.blockers) out.fail(`${b.message} → ${b.fix}`)
  }
  const { questions } = questionsOf(profile, given)
  const open = questions.filter((q) => !q.informational && given[q.id] == null)
  for (const q of open) out.ask(`[${q.id}] unanswered — using default "${q.default}"`)
  printPlanSummary(p, out)
  out.head("COMMANDS (run by `ambientui install`, from the app dir)")
  for (const c of p.commands) out.info(c.run)
  const next = p.blockers.length ? "fix the blockers above, then `ambientui plan` again" : "ambientui begin"
  out.done({ plan: p }, next)
  return p.blockers.length ? 1 : 0
}
