/**
 * AMBIENTUI-NOTES.md — the developer's account of the install.
 *
 * The install decides for the owner instead of asking, so every decision,
 * correction and manual step is recorded here and committed with it.
 *
 * Pure: plan + notes + verify result in, markdown out.
 */

const KIND_TITLE = {
  judgement: "Judgement calls",
  manual: "Done by hand",
  unavailable: "Not available here, and what was done instead",
}

export function notesMarkdown({ plan, notes = [], verify = null, productName }) {
  const lines = []
  const say = (s = "") => lines.push(s)
  const offPath = notes.length > 0 || (plan.overrides ?? []).length > 0
  const failed = (verify?.checks ?? []).filter((c) => c.status === "FAIL")
  const skipped = (verify?.checks ?? []).filter((c) => c.status === "SKIPPED")

  say("# ambientui in this project")
  say()
  say(
    `The ambient layer was installed into ${productName ?? "this product"} by an AI agent following ambientui's setup guide. ` +
      "This file is the record of what it decided and why. It was committed with the install, so `npx -y @ambient-ui/cli uninstall` removes it along with everything else."
  )
  say()
  say(offPath ? "**Status: installed, with judgement calls.** Read the sections below before relying on it." : "**Status: installed on the happy path.** Every step ran as planned.")
  say()

  say("## What was installed")
  say()
  say(`- **Path:** ${plan.path === "full" ? "the full design architecture (the Foundation and the ambient layer)" : "the ambient layer only; the product's own screens were not changed"}`)
  say(`- **Doors:** ${plan.doors.map((d) => `\`${d}\``).join(", ")}`)
  if (plan.provider) {
    const pv = plan.provider
    say(`- **Hotkey:** ${pv.hotkey ? `\`${pv.hotkey}\`` : "none (the orb only)"}`)
  }
  for (const a of (plan.adapt ?? []).filter((a) => !a.skip)) say(`- **Adapted:** ${a.id} — ${a.why}`)
  say()

  if (plan.decisions?.length) {
    say("## Decisions made for you")
    say()
    say("Nothing was asked during the install. Each choice below is the best case the project survey supported. To choose differently, uninstall, then reinstall with the option set (the command is given for each).")
    say()
    for (const d of plan.decisions) {
      const chosen = d.options.find((o) => o.value === d.chosen)
      say(`- **${d.id}: ${d.chosen}**${chosen ? ` — ${chosen.label}` : ""}${d.source === "owner" ? " (your choice)" : ""}`)
      say(`  - Why: ${d.why}`)
      const others = d.options.filter((o) => o.value !== d.chosen)
      if (others.length) {
        say(`  - Other options: ${others.map((o) => `\`${o.value}\` (${o.label})`).join("; ")}`)
        say(`  - To choose one: \`npx -y @ambient-ui/cli plan --${d.id} <option>\` before reinstalling`)
      }
    }
    say()
  }

  if (plan.overrides?.length) {
    say("## Where the agent corrected the survey")
    say()
    say("The survey is heuristic. The agent checked it against the code and changed these parts of the plan:")
    say()
    for (const o of plan.overrides) say(`- \`${o.key}\` → \`${JSON.stringify(o.value)}\`${o.because ? ` — ${o.because}` : ""}`)
    say()
  }

  for (const kind of Object.keys(KIND_TITLE)) {
    const mine = notes.filter((n) => n.kind === kind)
    if (!mine.length) continue
    say(`## ${KIND_TITLE[kind]}`)
    say()
    for (const n of mine) say(`- ${n.text}`)
    say()
  }

  if (failed.length || skipped.length) {
    say("## What verify could not prove")
    say()
    for (const c of failed) say(`- **FAIL** ${c.id}: ${c.detail}`)
    for (const c of skipped) say(`- *skipped* ${c.id}: ${c.detail}`)
    say()
  }

  say("## Before you rely on it")
  say()
  if (offPath) {
    say(
      "This install left the happy path in the places listed above, to show you ambientui working in your product. " +
        "**We recommend you try it, then uninstall it** (`npx -y @ambient-ui/cli uninstall`) **and reinstall with the right options chosen on purpose**, " +
        "resolving the judgement calls above in your codebase's own terms rather than the agent's."
    )
  } else {
    say("Try it. If any decision above is not the one you would make, uninstall and reinstall with that option set.")
  }
  say()
  say("The assistant answers from stubs until a backend exists; see the stub flag in the plan (`.ambientui/plan.json`, `envFlag`).")
  say()
  return lines.join("\n")
}
