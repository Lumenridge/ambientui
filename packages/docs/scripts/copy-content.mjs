#!/usr/bin/env node
/**
 * SNAPSHOTS THE GOVERNING DOCUMENTS INTO THE PACKAGE.
 *
 * The repo-root files stay the editable source of truth; this copies them
 * into content/ at build time so the packed package carries the release's
 * own account of itself. content/ is gitignored — a committed copy is a
 * copy that drifts.
 *
 * PATHS ARE MIRRORED, not flattened: the site's system-docs metadata names
 * each document by its repo path (`docs/motion-spec.md`), and a consumer
 * resolves `content/<that path>` — one mapping, no second table.
 *
 * registry.json rides along: it is the committed, gate-checked index of what
 * the registry ships, and the site derives printed counts and install
 * commands from it. Shipping it here means the site reads the version it was
 * built against, not whatever the library repo's HEAD happens to say.
 */
import { copyFileSync, mkdirSync, rmSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, "../../..")
const CONTENT = resolve(HERE, "../content")

const FILES = [
  "DESIGN.md",
  "README.md",
  "CLAUDE.md",
  "docs/motion-spec.md",
  "docs/ambient-shell-spec.md",
  "figma/figma-sync.md",
  "registry.json",
]

rmSync(CONTENT, { recursive: true, force: true })
for (const rel of FILES) {
  const out = resolve(CONTENT, rel)
  mkdirSync(dirname(out), { recursive: true })
  copyFileSync(resolve(REPO_ROOT, rel), out)
}
console.log(`✔ ${FILES.length} documents → packages/docs/content`)
