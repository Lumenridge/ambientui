import "server-only"

import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"

import { SYSTEM_DOC_META } from "@/lib/system-docs.meta"

/**
 * THE GOVERNING DOCUMENTS' REAL BYTES, read at build time.
 *
 * They come from `@ambientui/docs/content/*` — the package snapshots the
 * repo-root originals at ITS build time, so the site renders the release it
 * depends on. In the monorepo that is still the live files one build behind
 * at most (turbo builds the package before the site); after the repos split
 * it is the pinned version, which is the point: a site cannot cite a
 * DESIGN.md it was not built against.
 *
 * `import "server-only"` makes the boundary a BUILD ERROR rather than a
 * discovery: importing this from a client component fails loudly instead of
 * shipping a filesystem call to a browser.
 *
 * RESOLVED THROUGH THE PACKAGE, never a repo-layout path or `process.cwd()`
 * — require.resolve finds @ambientui/docs wherever it lives (a workspace
 * symlink today, node_modules after the split).
 */
const require = createRequire(import.meta.url)
const CONTENT_ROOT = resolve(
  dirname(require.resolve("@ambientui/docs/package.json")),
  "content"
)

export function readDocBySlug(slug: string): { meta: (typeof SYSTEM_DOC_META)[number]; source: string } | null {
  const meta = SYSTEM_DOC_META.find((d) => d.slug === slug)
  if (!meta) return null
  return { meta, source: readFileSync(resolve(CONTENT_ROOT, meta.path), "utf8") }
}

export function readDocById(id: string): string {
  const meta = SYSTEM_DOC_META.find((d) => d.id === id)
  if (!meta) throw new Error(`unknown document id: ${id}`)
  return readFileSync(resolve(CONTENT_ROOT, meta.path), "utf8")
}
