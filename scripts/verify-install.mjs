#!/usr/bin/env node
/**
 * PROVES A DOOR ACTUALLY INSTALLS — in a project that is not this one.
 *
 * The gate proves `registry.json` is internally consistent. It has never
 * proven an install WORKS, and the difference is not academic: the registry
 * shipped for weeks with no rewrite rule for `ambientui/…`, and with the
 * orb's shader shapes missing entirely. Both were invisible here, because
 * both only fail in someone else's repo.
 *
 * So: copy a committed fixture to a temp dir, serve the built registry over
 * localhost, rebuild it so its cross-references point THERE, and run the
 * real `shadcn add` for each door. Then check what landed.
 *
 * NOT IN `npm run gate`. It installs packages and runs builds — minutes,
 * not seconds — and a pre-commit hook that slow gets disabled, at which
 * point the gate is advice. It runs on demand, in CI on package changes,
 * nightly (upstream shadcn, Tailwind and Radix move underneath us), and
 * before the deploy publishes a page full of commands.
 *
 *   node scripts/verify-install.mjs                 every door
 *   node scripts/verify-install.mjs --door=foundation
 *   node scripts/verify-install.mjs --quick         skip the vite build
 *   node scripts/verify-install.mjs --keep          leave the scratch dir
 */
import { execFileSync, spawn } from "node:child_process"
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const FIXTURE = resolve(ROOT, "fixtures/consumer")
const PORT = 4321
const HOST = `http://127.0.0.1:${PORT}`

const arg = (name) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1]
const has = (name) => process.argv.includes(`--${name}`)

/**
 * The doors, and what each one claims. `compile: false` for items whose
 * contents are not TypeScript the fixture can build (assets, css, and the
 * governance files, which land outside the project entirely).
 */
const DOORS = [
  { name: "ambient-layer", compile: true },
  { name: "reasoning-panel", compile: true },
  { name: "foundation", compile: true },
  { name: "foundation-ambient-bridge", compile: true },
  { name: "icon", compile: true },
  { name: "ambient-styles", compile: false },
  { name: "ambient-assets", compile: false },
  { name: "foundation-theme", compile: false },
  // the promoted product patterns — /ds prints an install command for each,
  // so each is exercised like any other door
  { name: "section-rail", compile: true },
  { name: "view-menu", compile: true },
  { name: "save-reminder", compile: true },
  // the governance files: the CLI resolves their ~/ targets to the project
  // root, so this proves the fetch and the landing, not their content
  { name: "governance", compile: false },
  { name: "start", compile: false },
]

const log = (s) => console.log(s)
const run = (cmd, args, cwd, env) =>
  execFileSync(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "pipe",
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  })

/* ------------------------------ the server ------------------------------ */

/**
 * A SEPARATE PROCESS, deliberately. This script drives npm and shadcn with
 * execFileSync, which blocks the event loop — an in-process server would
 * accept the connection and never answer, and the CLI reports a headers
 * timeout that looks like a network fault and is not one.
 */
function serve(dir) {
  const child = spawn(
    process.execPath,
    [resolve(ROOT, "scripts/registry-server.mjs"), dir, String(PORT)],
    { stdio: "ignore", detached: false }
  )
  return child
}

/** execFileSync blocks, so wait for the port the same way. */
function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      run("curl", ["-sf", "-o", "/dev/null", `${HOST}/r/registry.json`], ROOT)
      return
    } catch {
      execFileSync("sleep", ["0.2"])
    }
  }
  throw new Error("the registry server never came up")
}

/* ------------------------------- the checks ------------------------------ */

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".git") continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function checkDoor(door, app, registry) {
  const item = registry.items.find((i) => i.name === door.name)
  if (!item) return [`${door.name}: not in the registry at all`]
  const problems = []

  // 1. every declared target landed where the item said it would
  for (const f of item.files ?? []) {
    if (f.target?.startsWith("~")) continue // governance writes to $HOME
    const guess = [
      join(app, "src", f.target),
      join(app, f.target),
      join(app, "public", f.target.replace(/^public\//, "")),
    ]
    if (!guess.some(existsSync)) problems.push(`${door.name}: missing ${f.target}`)
  }

  // 2. NO WORKSPACE SPECIFIER SURVIVED. This is the bug class that only
  //    ever shows up here — the file publishes and installs fine, and then
  //    does not resolve.
  for (const p of walk(join(app, "src"))) {
    if (!/\.(ts|tsx|css)$/.test(p)) continue
    const text = readFileSync(p, "utf8")
    const leak = text.match(/from\s+"(@ambient-?ui\/[^"]+|ambientui\/[^"]+)"/)
    if (leak) problems.push(`${door.name}: ${p.slice(app.length + 1)} imports ${leak[1]}`)
    if (text.includes(".registry/"))
      problems.push(`${door.name}: ${p.slice(app.length + 1)} references the staging dir`)
  }

  // 3. cssVars reached the consumer's stylesheet
  const css = readFileSync(join(app, "src/index.css"), "utf8")
  for (const key of Object.keys(item.cssVars?.light ?? {})) {
    if (!css.includes(`--${key}`)) problems.push(`${door.name}: cssVar --${key} not in index.css`)
  }

  return problems
}

/* -------------------------------- the run -------------------------------- */

const only = arg("door")
const doors = only ? DOORS.filter((d) => d.name === only) : DOORS
if (!doors.length) {
  console.error(`✗ unknown door: ${only}`)
  process.exit(1)
}

log("· building the registry against the local host")
run("node", ["scripts/build-registry.mjs"], ROOT, {
  AMBIENTUI_REGISTRY_HOST: HOST,
})
run("npx", ["shadcn", "build", "--output", "registry-dist/r"], ROOT, {
  AMBIENTUI_REGISTRY_HOST: HOST,
})
const registry = JSON.parse(readFileSync(resolve(ROOT, "registry.json"), "utf8"))

const server = serve(resolve(ROOT, "registry-dist"))
waitForServer()
const scratch = mkdtempSync(join(tmpdir(), "ambientui-verify-"))
const app = join(scratch, "consumer")
let failed = []

try {
  cpSync(FIXTURE, app, { recursive: true })

  /**
   * THE NAMESPACE FORM IS WHAT WE PUBLISH, SO IT IS WHAT WE RUN.
   *
   * The site and the README print `npx shadcn add @ambientui/ambient-layer`,
   * not a URL. Those are not the same command: the namespace only resolves
   * because `components.json` maps `@ambientui` to a URL TEMPLATE, which is
   * what `shadcn registry add` writes. Running the URL form here proved the
   * item was fetchable and proved nothing about the line a visitor pastes.
   *
   * The fixture commits the mapping with a `{REGISTRY_HOST}` placeholder so
   * a localhost port never gets baked into a checked-in file.
   */
  const cj = join(app, "components.json")
  writeFileSync(
    cj,
    readFileSync(cj, "utf8").replaceAll("{REGISTRY_HOST}", HOST)
  )

  log("· installing the fixture's own dependencies")
  run("npm", ["install", "--no-audit", "--no-fund"], app)

  for (const door of doors) {
    log(`· ${door.name}`)
    try {
      run("npx", ["shadcn@latest", "add", `@ambientui/${door.name}`, "--yes", "--overwrite"], app)
    } catch (e) {
      failed.push(`${door.name}: shadcn add failed — ${String(e.stdout ?? e).slice(-400)}`)
      continue
    }
    failed.push(...checkDoor(door, app, registry))
  }

  if (!failed.length && doors.some((d) => d.compile)) {
    log("· typechecking the consumer")
    try {
      run("npx", ["tsc", "--noEmit"], app)
    } catch (e) {
      failed.push(`tsc failed:\n${String(e.stdout ?? e).slice(0, 2000)}`)
    }
    if (!has("quick") && !failed.length) {
      log("· building the consumer")
      try {
        run("npx", ["vite", "build"], app)
      } catch (e) {
        failed.push(`vite build failed:\n${String(e.stdout ?? e).slice(0, 1500)}`)
      }
    }
  }

  /**
   * THE npm DOOR RUNS TOO. The site prints `npm i ambientui` beside the
   * registry commands, and the same rule applies: a command is not printed
   * until something has run it. This one needs the real npm registry, so it
   * rides the full run (with the vite build), not --quick — the nightly
   * exercises it against whatever npm is serving.
   */
  if (!has("quick") && !failed.length) {
    log("· npm i ambientui — the versioned door")
    try {
      run("npm", ["install", "ambientui@^0.1.0", "--no-audit", "--no-fund"], app)
      // resolve through the exports map, the way a consumer's import would —
      // ESM resolution deliberately: the package exports import-only, and a
      // CJS require.resolve is the wrong question to ask of it
      run(
        "node",
        [
          "--input-type=module",
          "-e",
          "import.meta.resolve('ambientui'); import.meta.resolve('ambientui/styles/ambient.css')",
        ],
        app
      )
    } catch (e) {
      failed.push(`npm i ambientui failed:\n${String(e.stdout ?? e).slice(0, 1200)}`)
    }
  }
} finally {
  server.kill()
  // put the registry back on its published host, or the next commit ships
  // JSON that points at localhost
  run("node", ["scripts/build-registry.mjs"], ROOT)
  run("npx", ["shadcn", "build", "--output", "registry-dist/r"], ROOT)
  run("node", ["scripts/build-registry.mjs", "--finalize", "registry-dist"], ROOT)
  if (has("keep")) log(`· scratch kept at ${app}`)
  else rmSync(scratch, { recursive: true, force: true })
}

if (failed.length) {
  console.error("\n✗ a door does not install:")
  for (const f of failed) console.error(`    ${f}`)
  process.exit(1)
}
log(`\n✔ ${doors.length} door(s) install and compile in a project that is not this one`)
