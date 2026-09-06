#!/usr/bin/env node
/**
 * THE FIRST LINE SOMEONE WRITES AFTER `npm i` MUST WORK.
 *
 * The README says `npm i ambientui`. For months the only thing that worked
 * afterward was a deep import, because every package's exports map started
 * at `./*` and had no `"."` at all. `import { Assistant } from "ambientui"`
 * failed with ERR_PACKAGE_PATH_NOT_EXPORTED — an error that names the
 * package and explains nothing.
 *
 * Nothing in this repo could notice, because nothing in this repo imports
 * that way: the site and the packages all use deep specifiers. So this
 * bundles the line a stranger writes, with the bundler a stranger uses.
 *
 * WHY A BUNDLER AND NOT `node --import`. tsup builds one file per source
 * with `bundle: false`, and the relative imports it emits are extensionless
 * (`./ambient-runtime`). Node's own ESM resolver requires the extension;
 * every bundler resolves it. So these packages are bundler-targeted ESM,
 * which is what React packages are, and testing them under bare Node would
 * fail for a reason that has nothing to do with the export map.
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/** One real named export per package — a barrel that resolves but exports
 *  nothing would otherwise pass. */
const ROOTS = [
  { spec: "ambientui", name: "Assistant" },
  { spec: "@ambient-ui/ui", name: "Button" },
  { spec: "@ambient-ui/foundation", name: "FoundationProvider" },
]

// The entry has to live INSIDE the repo: resolution walks up from the file,
// and a temp dir has no node_modules to find.
const entry = join(ROOT, ".package-roots-check.mjs")
const out = mkdtempSync(join(tmpdir(), "ambientui-roots-"))

writeFileSync(
  entry,
  ROOTS.map((r) => `import { ${r.name} } from "${r.spec}"`).join("\n") +
    `\nconsole.log(${ROOTS.map((r) => r.name).join(", ")})\n`
)

try {
  execFileSync(
    "npx",
    [
      "esbuild",
      entry,
      "--bundle",
      "--format=esm",
      "--platform=browser",
      "--external:react",
      "--external:react-dom",
      "--external:react/jsx-runtime",
      `--outfile=${join(out, "bundle.mjs")}`,
      "--log-level=error",
    ],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8" }
  )
} catch (e) {
  console.error("\n✗ a package root does not import:")
  console.error(String(e.stderr || e.stdout || e).trim())
  console.error(
    "\n  Each package needs a `.` in its exports map pointing at a built" +
      "\n  barrel (src/index.ts). Deep imports working is not the same thing."
  )
  process.exit(1)
} finally {
  rmSync(entry, { force: true })
  rmSync(out, { recursive: true, force: true })
}

console.log(
  `✔ package roots: ${ROOTS.map((r) => r.spec).join(", ")} import by name`
)
