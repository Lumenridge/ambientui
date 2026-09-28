#!/usr/bin/env node
/**
 * ambientui — THE INSTALL PIPELINE, AS COMMANDS AN AGENT CANNOT GET WRONG.
 *
 *   doctor     survey the host, write profile.json + plan.json, list blockers and questions
 *   plan       re-derive plan.json from the profile and the owner's answers
 *   begin      record the base commit the install is measured against
 *   install    run the plan's shadcn commands; restore the product's primitives;
 *              then adapt the landed files to this product
 *   adapt      re-apply those adaptations on their own (idempotent)
 *   end        write the manifest; print (or --commit) the install commit
 *   verify     static and runtime checks, each PASS / FAIL / SKIPPED / PRE-EXISTING
 *   uninstall  git revert the install commit(s); list leftovers
 *
 * WHY A CLI AT ALL. The install used to be prose (docs/start.md) that an
 * agent interpreted. Across five real products the prose was right and the
 * interpretation drifted: the wrong door, a CSS line Vite silently dropped,
 * a stub flag the bundler never exposed. Decisions now come from a pure
 * function over detected facts, and every failure is loud.
 */
import { resolve } from "node:path"
import { readFileSync } from "node:fs"

import { adapt } from "../src/commands/adapt.mjs"
import { begin } from "../src/commands/begin.mjs"
import { doctor } from "../src/commands/doctor.mjs"
import { end } from "../src/commands/end.mjs"
import { install } from "../src/commands/install.mjs"
import { plan } from "../src/commands/plan.mjs"
import { uninstall } from "../src/commands/uninstall.mjs"
import { verify } from "../src/commands/verify.mjs"
import { createOutput } from "../src/output.mjs"
import { CliError } from "../src/util.mjs"

const COMMANDS = { doctor, plan, begin, install, adapt, end, verify, uninstall }

/** Flags that take a value; everything else is boolean. */
const VALUED = new Set(["cwd", "url", "path", "hotkey", "look", "governance", "theme", "timeout"])

export function parseArgs(argv) {
  const opts = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("--")) {
      opts._.push(a)
      continue
    }
    const eq = a.indexOf("=")
    const raw = eq >= 0 ? a.slice(2, eq) : a.slice(2)
    const key = raw.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    if (eq >= 0) opts[key] = a.slice(eq + 1)
    else if (VALUED.has(raw)) {
      const v = argv[i + 1]
      if (v == null || v.startsWith("--")) throw new CliError(`--${raw} needs a value`)
      opts[key] = v
      i++
    } else opts[key] = true
  }
  return opts
}

const HELP = `ambientui — install the ambient layer into a React product

Usage: ambientui <command> [--cwd <dir>] [--json]

  doctor [--baseline] [--url <devServerUrl>] [--timeout <s>]
  plan [--path layer|full] [--hotkey takeover|coexist|yield|off]
       [--look current|reference] [--governance yes|no] [--theme mirror|light]
  begin [--allow-dirty]
  install [--timeout <s>]
  adapt                re-apply the plan's per-product changes to the installed files
  end [--commit]
  verify [--url <devServerUrl>] [--static-only] [--no-scripts] [--timeout <s>]
  uninstall [--dry-run]

State lives in <project>/.ambientui/. Start with: ambientui doctor`

async function main() {
  let opts
  let out = createOutput({ json: process.argv.includes("--json") })
  try {
    opts = parseArgs(process.argv.slice(2))
    out = createOutput({ json: Boolean(opts.json) })
    if (opts.version) {
      const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
      process.stdout.write(`${pkg.version}\n`)
      return 0
    }
    const cmd = opts._[0]
    if (!cmd || opts.help || cmd === "help") {
      process.stdout.write(HELP + "\n")
      return cmd || opts.help ? 0 : 1
    }
    const fn = COMMANDS[cmd]
    if (!fn) throw new CliError(`unknown command "${cmd}"`, { next: "ambientui --help" })
    opts.cwd = resolve(opts.cwd ?? process.cwd())
    return await fn(opts, out)
  } catch (e) {
    if (e instanceof CliError) {
      out.fail(e.message)
      out.done({ ok: false, error: e.message }, e.next ?? "ambientui doctor")
      return e.exitCode ?? 1
    }
    process.stderr.write(`✗ unexpected error: ${e?.stack ?? e}\n`)
    return 2
  }
}

main().then((code) => {
  process.exitCode = code
})
