#!/usr/bin/env node
/**
 * Fails while a changeset is pending. Versions are bumped in the PR that
 * makes the change (`npm run version-packages`), so a reviewer sees what
 * will publish, and the release workflow on main only ever publishes.
 */
import { readdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../.changeset")
const pending = readdirSync(DIR).filter((f) => f.endsWith(".md") && f !== "README.md")

if (pending.length) {
  console.error(`✗ unversioned changesets: ${pending.join(", ")}`)
  console.error("  Run `npm run version-packages` and commit the version bump and changelog.")
  process.exit(1)
}
console.log("✔ no pending changesets")
