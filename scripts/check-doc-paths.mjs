#!/usr/bin/env node
/**
 * Fails if a governing document cites a path that no longer exists.
 *
 * Born from the 2026-08-27 staleness audit, which found the moved Foundation
 * engine still cited in CLAUDE.md, DESIGN.md, and a day-old PAPER.md table.
 * Every one of those files still loaded and rendered without error — a dead
 * path in prose breaks nothing a compiler can see, so it has to be a gate
 * check or it becomes a future audit finding.
 *
 * What counts as a claim: a backtick-quoted token containing a slash and
 * starting with a top-level directory this repo actually has. Relative
 * fragments ("src/styles/globals.css", stated relative to a package under
 * discussion) and globs are not checkable and are skipped.
 *
 * DESIGN.md's §12 decision log is excluded on purpose: it is a historical
 * record, and history legitimately names files that no longer exist.
 */
import { readFileSync, existsSync, lstatSync, readdirSync } from "node:fs"
import { resolve, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/** The governing set: prose whose path claims must stay true. */
const DOCS = ["CLAUDE.md", "README.md", "PAPER.md", "DESIGN.md", "figma/figma-sync.md", "docs/ambient-shell-spec.md"]

// project skills join dynamically; symlinks (a contributor's personal
// tooling, e.g. a writing aid) are not the project's governance and skip
const skillsDir = join(ROOT, ".claude/skills")
if (existsSync(skillsDir)) {
  for (const entry of readdirSync(skillsDir)) {
    const dir = join(skillsDir, entry)
    if (lstatSync(dir).isSymbolicLink()) continue
    for (const file of readdirSync(dir)) {
      if (file.endsWith(".md")) DOCS.push(join(".claude/skills", entry, file))
    }
  }
}

const CHECKABLE = /^(apps|packages|tokens|figma|docs|scripts|\.claude|\.github)\//
const CLAIM = /`([A-Za-z0-9_@./-]+\/[A-Za-z0-9_@./-]+)`/g

const misses = []
for (const doc of DOCS) {
  const full = join(ROOT, doc)
  if (!existsSync(full)) {
    misses.push(`${doc} → (the document itself is missing)`)
    continue
  }
  let body = readFileSync(full, "utf8")
  if (doc === "DESIGN.md") {
    const [head, rest] = body.split("## 12. Decision log")
    const tail = rest?.split(/\n## 13\./)[1] ?? ""
    body = head + tail
  }
  for (const match of body.matchAll(CLAIM)) {
    const path = match[1].replace(/[.,]+$/, "")
    if (!CHECKABLE.test(path)) continue
    if (path.includes("*") || path.includes("{")) continue
    if (!existsSync(join(ROOT, path))) misses.push(`${doc} → ${path}`)
  }
}

if (misses.length > 0) {
  console.error("✗ governing docs cite paths that do not exist:")
  for (const m of [...new Set(misses)]) console.error(`    ${m}`)
  console.error(
    "  Fix the prose (or the tree) — a doc that names a missing file is\n" +
      "  drift, and the decision log (§12) is where moved history belongs."
  )
  process.exit(1)
}
console.log(`✔ governing-doc path claims resolve (${DOCS.length} documents)`)
