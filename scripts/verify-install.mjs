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
 *   node scripts/verify-install.mjs --fixture=consumer-bare   one fixture's doors
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
const FIXTURES = resolve(ROOT, "fixtures")
// AMBIENTUI_VERIFY_PORT when 4321 is taken; this script never shares a port
const PORT = Number(process.env.AMBIENTUI_VERIFY_PORT ?? 4321)
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
  // one icon library instead of five (scripts/variants/icons.mjs)
  {
    name: "icon-lucide",
    compile: true,
    landed: { "src/components/ui/icon.tsx": "SETS.lucide!" },
  },
  // THE TAILWIND v3 DOORS, in a stock shadcn v3 project (fixtures/consumer-tw3).
  // `built` names rewritten classes that must appear in the compiled CSS.
  {
    name: "ambient-layer-tw3",
    fixture: "consumer-tw3",
    compile: true,
    // from the entry file, as start.md says: an @import after @tailwind is dropped
    entryImports: ["./styles/ambient.css"],
    builtText: ["hsl(var(--popover))"],
    built: [
      "bg-[color:var(--glass-wash)]",
      "border-[color:var(--glass-border)]",
      "[transition-duration:var(--motion-surface)]",
      "h-[8.333333%]",
      "!min-h-0",
    ],
  },
  // REACT 18 WITH ITS OWN TYPES (fixtures/consumer-react18): the layer must
  // type-check against React 18's types too.
  { name: "ambient-layer", fixture: "consumer-react18", compile: true, mount: true },
  { name: "icon-lucide", fixture: "consumer-react18", compile: true },

  // A PRODUCT WITHOUT TAILWIND'S RESET OR shadcn (fixtures/consumer-bare).
  // `ambient-base` brings the helper and the roles; its preflight reaches the
  // layer only, so the built CSS has no global reset rule.
  {
    name: "ambient-base",
    fixture: "consumer-bare",
    compile: false,
    landed: {
      "src/lib/utils.ts": "export function cn",
      "src/styles/ambient-tokens.css": ":where(:root)",
    },
  },
  {
    name: "ambient-layer",
    fixture: "consumer-bare",
    compile: true,
    cssLines: {
      "src/index.css": [
        '@import "./styles/ambient-preflight.css" layer(base);',
        '@import "./styles/ambient-tokens.css";',
        '@import "./styles/ambient.css";',
      ],
    },
    // mount the layer so Tailwind scans its classes
    mount: true,
    builtText: [":where(.ambient-scope) button", "--glass-fill"],
    builtAbsent: [
      // an unscoped preflight rule; a body starting `--` (Tailwind's own
      // `*{--tw-…}` defaults) is not a reset
      "(^|[{}])\\s*(\\*|button|html|body|h1)[^{]*\\{\\s*[a-z]",
    ],
  },
  {
    name: "ambient-styles-hsl",
    fixture: "consumer-tw3",
    compile: false,
    landed: { "src/styles/ambient.css": "hsl(var(--popover))" },
  },
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

  // 3. a variant's rewrite reached the file that landed
  for (const [rel, needle] of Object.entries(door.landed ?? {})) {
    const p = join(app, rel)
    if (!existsSync(p) || !readFileSync(p, "utf8").includes(needle))
      problems.push(`${door.name}: ${rel} does not contain ${needle}`)
  }

  // 4. cssVars reached the consumer's stylesheet
  const css = readFileSync(join(app, "src/index.css"), "utf8")
  for (const key of Object.keys(item.cssVars?.light ?? {})) {
    if (!css.includes(`--${key}`)) problems.push(`${door.name}: cssVar --${key} not in index.css`)
  }

  return problems
}

/** The classes a door promises are in the consumer's compiled CSS. */
function checkBuilt(doors, app) {
  const assets = join(app, "dist/assets")
  const css = readdirSync(assets)
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(join(assets, f), "utf8"))
    .join("\n")
    .replace(/\\/g, "") // compare selectors unescaped
  const problems = []
  for (const door of doors) {
    for (const cls of door.built ?? []) {
      if (!css.includes(`.${cls}`)) problems.push(`${door.name}: ${cls} is not in the built CSS`)
    }
    for (const text of door.builtText ?? []) {
      if (!css.includes(text)) problems.push(`${door.name}: "${text}" is not in the built CSS`)
    }
    for (const pattern of door.builtAbsent ?? []) {
      const hit = css.match(new RegExp(pattern, "m"))
      if (hit) problems.push(`${door.name}: built CSS has "${hit[0].trim()}", which it must not`)
    }
  }
  return problems
}

/* -------------------------------- the run -------------------------------- */

const only = arg("door")
// --door=a,b selects by name; --fixture=x selects a fixture's doors
const onlyFixture = arg("fixture")
const doors = DOORS.filter(
  (d) =>
    (!only || only.split(",").includes(d.name)) &&
    (!onlyFixture || (d.fixture ?? "consumer") === onlyFixture)
)
if (!doors.length) {
  console.error(`✗ no door matches --door=${only ?? ""} --fixture=${onlyFixture ?? ""}`)
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

/**
 * A SERVER ALREADY ON THE PORT IS A FAILURE: doors would be verified against
 * whatever registry it serves, not this build.
 */
try {
  run("curl", ["-s", "-o", "/dev/null", `${HOST}/`], ROOT)
  console.error(
    `✗ something is already listening on ${HOST}; stop it or set AMBIENTUI_VERIFY_PORT`
  )
  process.exit(1)
} catch {
  // nothing there: the port is ours
}
const server = serve(resolve(ROOT, "registry-dist"))
waitForServer()
const scratch = mkdtempSync(join(tmpdir(), "ambientui-verify-"))
let failed = []

/** Every fixture the selected doors need, each installed from scratch. */
const fixtures = [...new Set(doors.map((d) => d.fixture ?? "consumer"))]

try {
  for (const fixture of fixtures) {
    const app = join(scratch, fixture)
    const mine = doors.filter((d) => (d.fixture ?? "consumer") === fixture)
    log(`· fixture ${fixture}`)
    cpSync(join(FIXTURES, fixture), app, { recursive: true })

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

    const before = failed.length
    for (const door of mine) {
      log(`· ${door.name}`)
      try {
        run("npx", ["shadcn@latest", "add", `@ambientui/${door.name}`, "--yes", "--overwrite"], app)
      } catch (e) {
        failed.push(`${door.name}: shadcn add failed — ${String(e.stdout ?? e).slice(-400)}`)
        continue
      }
      failed.push(...checkDoor(door, app, registry))
    }

    for (const door of mine) {
      for (const [rel, lines] of Object.entries(door.cssLines ?? {})) {
        const p = join(app, rel)
        writeFileSync(p, `${readFileSync(p, "utf8").trimEnd()}\n${lines.join("\n")}\n`)
      }
    }
    const entry = join(app, "src/main.tsx")
    if (mine.some((d) => d.mount)) {
      // the smallest real mount: provider + layer, rendered beside the product
      writeFileSync(
        entry,
        readFileSync(entry, "utf8")
          .replace(
            'import "./index.css"\n',
            'import "./index.css"\nimport { AssistantProvider } from "@/components/ambient/assistant-context"\nimport { Assistant } from "@/components/ambient/assistant"\n'
          )
          .replace(
            "  </StrictMode>",
            '    <AssistantProvider productName="Fixture">\n      <Assistant />\n    </AssistantProvider>\n  </StrictMode>'
          )
      )
    }
    for (const imp of mine.flatMap((d) => d.entryImports ?? [])) {
      writeFileSync(
        entry,
        readFileSync(entry, "utf8").replace('import "./index.css"\n', `import "./index.css"\nimport "${imp}"\n`)
      )
    }

    if (failed.length === before && mine.some((d) => d.compile)) {
      log("· typechecking the consumer")
      try {
        run("npx", ["tsc", "--noEmit"], app)
      } catch (e) {
        failed.push(`${fixture}: tsc failed:\n${String(e.stdout ?? e).slice(0, 2000)}`)
      }
      if (!has("quick") && failed.length === before) {
        log("· building the consumer")
        try {
          run("npx", ["vite", "build"], app)
          failed.push(...checkBuilt(mine, app))
        } catch (e) {
          failed.push(`${fixture}: vite build failed:\n${String(e.stdout ?? e).slice(0, 1500)}`)
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
    if (fixture === "consumer" && !has("quick") && !failed.length) {
      log("· npm i ambientui — the versioned door")
      try {
        run("npm", ["install", "ambientui@^0.2.0", "--no-audit", "--no-fund"], app)
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
        // npm reports its reasons (ERESOLVE, 404) on stderr
        failed.push(`npm i ambientui failed:\n${String(e.stderr || e.stdout || e).slice(0, 1200)}`)
      }
    }
  }
} finally {
  server.kill()
  // put the registry back on its published host, or the next commit ships
  // JSON that points at localhost
  run("node", ["scripts/build-registry.mjs"], ROOT)
  run("npx", ["shadcn", "build", "--output", "registry-dist/r"], ROOT)
  run("node", ["scripts/build-registry.mjs", "--finalize", "registry-dist"], ROOT)
  if (has("keep")) log(`· scratch kept at ${scratch}`)
  else rmSync(scratch, { recursive: true, force: true })
}

if (failed.length) {
  console.error("\n✗ a door does not install:")
  for (const f of failed) console.error(`    ${f}`)
  process.exit(1)
}
log(`\n✔ ${doors.length} door(s) install and compile in a project that is not this one`)
