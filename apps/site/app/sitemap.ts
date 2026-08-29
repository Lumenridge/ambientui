import type { MetadataRoute } from "next"

import { AMBIENT_COMPONENTS, SHADCN_DEFAULT_COMPONENTS } from "@/lib/catalog"
import { SITE_URL } from "@/lib/site"
import { SYSTEM_DOC_META } from "@/lib/system-docs.meta"

// `output: export` has no server, so these must be declared static:
// they are generated once at build time and written as files.
export const dynamic = "force-static"

/**
 * THE SITEMAP IS DERIVED, NEVER LISTED.
 *
 * It reads the same two modules the registry and the pages do, so a new
 * component enters the sitemap BECAUSE it was documented — the same
 * mechanism as CLAUDE.md rule 10, extended one step further. A hand-kept
 * list of 72 URLs would be stale within a week and nothing would say so.
 *
 * The demo routes are deliberately absent: they are noindex, and listing a
 * page you have asked crawlers to ignore is a contradiction in the same
 * document.
 */
const TOOLS = [
  "foundation",
  "colors",
  "spacing",
  "shadows",
  "motion",
  "translucency",
  "form-factors",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const url = (path: string) => `${SITE_URL}${path}`

  return [
    { url: url("/"), lastModified: now, priority: 1 },
    { url: url("/architecture"), lastModified: now, priority: 0.9 },
    { url: url("/ds"), lastModified: now, priority: 0.8 },
    { url: url("/docs"), lastModified: now, priority: 0.8 },
    ...TOOLS.map((t) => ({
      url: url(`/ds/${t}`),
      lastModified: now,
      priority: 0.6,
    })),
    ...SYSTEM_DOC_META.map((d) => ({
      url: url(`/docs/${d.slug}`),
      lastModified: now,
      priority: 0.6,
    })),
    ...[...AMBIENT_COMPONENTS, ...SHADCN_DEFAULT_COMPONENTS].map((c) => ({
      url: url(`/ds/components/${c.id}`),
      lastModified: now,
      priority: 0.5,
    })),
  ]
}
