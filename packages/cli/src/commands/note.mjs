/**
 * `ambientui note "<what and why>" [--kind judgement|manual|unavailable]` —
 * RECORD A JUDGEMENT CALL, as it is made.
 *
 * The install takes the best path the survey supports, and the agent may
 * go further by hand where the tooling cannot: a transport the plan could
 * not wire, a mount point it could not find, a pattern of the product's
 * that nothing here fits. That is allowed — the point is for the owner to
 * see ambientui working before they commit to it — but it must not be
 * silent. Every such call is noted here, and `end` writes the notes into
 * AMBIENTUI-NOTES.md for the developer who inherits the install.
 *
 *   judgement    a choice between workable options ("mounted in Layout.tsx,
 *                not App.tsx: App renders before the router")
 *   manual       something done by hand that the pipeline would normally do
 *   unavailable  something the product lacked, and what was done instead
 */
import { CliError, readState, writeState } from "../util.mjs"

const KINDS = ["judgement", "manual", "unavailable"]

export async function note(opts, out) {
  const root = opts.cwd
  const text = opts._.slice(1).join(" ").trim()
  if (!text) throw new CliError('note needs the what and the why: ambientui note "…" [--kind judgement|manual|unavailable]')
  const kind = opts.kind ?? "judgement"
  if (!KINDS.includes(kind)) throw new CliError(`--kind must be one of: ${KINDS.join(", ")} (got "${kind}")`)
  const notes = readState(root, "notes.json")?.notes ?? []
  notes.push({ kind, text, at: new Date().toISOString() })
  writeState(root, "notes.json", { notes })
  out.ok(`noted (${kind}): ${text}`)
  out.done({ ok: true, notes }, "carry on; `ambientui end` writes every note into AMBIENTUI-NOTES.md")
  return 0
}
