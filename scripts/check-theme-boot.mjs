#!/usr/bin/env node
/**
 * The pre-paint theme script lives in index.html and cannot import anything;
 * theme-provider.tsx owns the same two values in TypeScript. That is a copy,
 * and this project's named failure mode is two copies of one value.
 *
 * The copy is unavoidable — a blocking script in the head is the only thing
 * that runs before first paint — so it is checked instead. If the key or the
 * default drift apart, the symptom is a theme flash on every load that
 * nobody notices in dev, because dev already has the right value stored.
 */
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const ts = readFileSync(resolve(ROOT, "apps/web/src/components/theme-provider.tsx"), "utf8")
const html = readFileSync(resolve(ROOT, "apps/web/index.html"), "utf8")

const key = ts.match(/THEME_STORAGE_KEY = "([^"]+)"/)?.[1]
const def = ts.match(/THEME_DEFAULT: Theme = "([^"]+)"/)?.[1]
if (!key || !def) {
  console.error("✗ theme-provider.tsx: THEME_STORAGE_KEY / THEME_DEFAULT not found")
  process.exit(1)
}

const boot = html.match(/localStorage\.getItem\("([^"]+)"\)\s*\|\|\s*"([^"]+)"/)
if (!boot) {
  console.error("✗ index.html: the pre-paint theme script is missing or unrecognisable")
  process.exit(1)
}
const [, bootKey, bootDefault] = boot

const problems = []
if (bootKey !== key) problems.push(`storage key: html "${bootKey}" vs ts "${key}"`)
if (bootDefault !== def) problems.push(`default: html "${bootDefault}" vs ts "${def}"`)

if (problems.length) {
  console.error("✗ the pre-paint theme script disagrees with theme-provider.tsx:")
  for (const p of problems) console.error(`    ${p}`)
  process.exit(1)
}
console.log(`✔ theme boot agrees (key "${key}", default "${def}")`)
