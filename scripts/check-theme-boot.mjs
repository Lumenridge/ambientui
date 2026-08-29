#!/usr/bin/env node
/**
 * The pre-paint theme script must not restate the storage key.
 *
 * In the SPA it had to: the script lived in index.html, which cannot
 * import, so the key and the default were a copy — and the copy went wrong
 * exactly once, silently, producing a flash on every load while the page
 * looked perfect. A checker compared the two.
 *
 * As a TypeScript module it imports them instead, so the disagreement is
 * now IMPOSSIBLE rather than merely detected. This asserts that property
 * holds: no quoted storage key in the boot module, and the import present.
 * Removing a class of bug is better than checking for it, and this is the
 * check that the removal stays removed.
 */
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const boot = readFileSync(resolve(ROOT, "apps/site/src/lib/theme-boot.ts"), "utf8")
const provider = readFileSync(
  resolve(ROOT, "apps/site/src/components/theme-provider.tsx"),
  "utf8"
)

const problems = []
if (!/THEME_STORAGE_KEY\s*=\s*"/.test(provider))
  problems.push("theme-provider.tsx no longer declares THEME_STORAGE_KEY")
if (!/import\s*\{[^}]*THEME_STORAGE_KEY[^}]*\}\s*from/.test(boot))
  problems.push("theme-boot.ts does not import THEME_STORAGE_KEY — it is restating it")
if (/getItem\(\s*"/.test(boot))
  problems.push("theme-boot.ts hardcodes a storage key string")

if (problems.length) {
  console.error("✗ the pre-paint theme script has drifted from its source:")
  for (const p of problems) console.error(`    ${p}`)
  process.exit(1)
}
console.log("✔ theme boot imports its key and default — no copy to drift")
