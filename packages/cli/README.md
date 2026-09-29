# @ambient-ui/cli

The ambientui install pipeline as commands. An AI coding agent following
`docs/start.md` runs these instead of guessing about the host project.

```bash
npx @ambient-ui/cli doctor                 # survey → .ambientui/profile.json + plan.json
npx @ambient-ui/cli plan --hotkey off      # re-plan with an explicit choice, for a reinstall
npx @ambient-ui/cli begin                  # record the base commit
npx @ambient-ui/cli install                # run the plan's shadcn commands safely
#   … wire the plan: CSS lines, mount, alias edits, env flag, transport …
npx @ambient-ui/cli verify --url http://localhost:5173
npx @ambient-ui/cli end --commit           # manifest + one commit, by file name
npx @ambient-ui/cli uninstall              # git revert of that commit
```

Every command takes `--cwd <dir>` and `--json`. Human output is one fact per
line (`✔` `✗` `!`) and ends with `Next: …`.

| command | what it does |
| --- | --- |
| `doctor [--baseline] [--url <u>]` | Surveys the host read-only: app package, package manager, Tailwind version, token format, aliases, env prefix, ⌘K owners, z-index scale, i18n, network layer, AI engine and more — each fact with evidence (file:line or package) and a confidence grade. Prints blockers, decisions, and the plan. `--baseline` runs the host's typecheck/lint/test/build once; `--url` snapshots computed styles of the running app. |
| `plan [--path] [--hotkey] [--look] [--governance] [--theme] [--set k=v --because "…"]` | Re-derives `plan.json` from the profile, explicit choices and `--set` corrections. The adapter is a pure function in `src/plan.mjs`. |
| `begin [--allow-dirty]` | Records HEAD and the dirty paths in `session.json`. |
| `install` | Runs the plan's commands with stdin closed; restores any product file under the ui dir or `lib/utils` that the CLI changed; moves files that landed outside the source root; prints the config diff to review. |
| `end [--commit]` | Writes `manifest.json` (files, dependencies) and prints — or runs — the commit with the `Ambientui-Install: 1` trailer. |
| `verify [--url <u>] [--static-only]` | Typecheck/lint/test/build against the baseline, placement, restored primitives, built CSS, mount; with `--url`, runtime probes (tokens, hotkey cycles, stacking, render loop, branding, mobile overlap, theme, host-screen style diff). Each check is PASS, FAIL, SKIPPED or PRE-EXISTING. |
| `uninstall [--dry-run]` | Reverts the install commit(s) and lists leftover references. |

State lives in `<project>/.ambientui/` (every file carries `"schema": 1`).
`playwright-core` is loaded only for `--url`; without it (or a browser) the
runtime checks print SKIPPED with the command to install one.

Tests: `node --test packages/cli/test/`.
