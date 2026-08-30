import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

// `output: export` has no server, so these must be declared static:
// they are generated once at build time and written as files.
export const dynamic = "force-static"

/**
 * ROBOTS — with an honest caveat.
 *
 * A GitHub PROJECT Pages site cannot serve an effective robots.txt:
 * crawlers read lumenridge.github.io/robots.txt, which belongs to the org
 * root, not to this repo. This file is therefore decorative today, and the
 * real exclusion for /demo/* is the noindex meta tag on its layout (which
 * check-static-html.mjs asserts on every build).
 *
 * It is written anyway because it becomes real the moment a custom domain
 * is set, and a sitemap reference is worth having in place before then.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/demo/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
