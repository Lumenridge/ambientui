import "server-only"

import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { SYSTEM_DOC_META } from "@/lib/system-docs.meta"

/**
 * THE GOVERNING DOCUMENTS' REAL BYTES, read at build time.
 *
 * This replaces Vite's `?raw`. Same guarantee, different mechanism: the page
 * renders the file that actually rules the repo, so editing DESIGN.md
 * changes the site and there is no copy to fall out of step.
 *
 * `import "server-only"` makes the boundary a BUILD ERROR rather than a
 * discovery: importing this from a client component fails loudly instead of
 * shipping a filesystem call to a browser.
 *
 * THE REPO ROOT IS RESOLVED FROM THIS MODULE, NEVER `process.cwd()`. cwd is
 * `apps/site` under turbo and the repo root under a bare npm script — the
 * difference is a build that works locally and fails in CI, which is the
 * worst kind.
 */
const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, "../../../..")

export function readDocBySlug(slug: string): { meta: (typeof SYSTEM_DOC_META)[number]; source: string } | null {
  const meta = SYSTEM_DOC_META.find((d) => d.slug === slug)
  if (!meta) return null
  return { meta, source: readFileSync(resolve(REPO_ROOT, meta.path), "utf8") }
}

export function readDocById(id: string): string {
  const meta = SYSTEM_DOC_META.find((d) => d.id === id)
  if (!meta) throw new Error(`unknown document id: ${id}`)
  return readFileSync(resolve(REPO_ROOT, meta.path), "utf8")
}
