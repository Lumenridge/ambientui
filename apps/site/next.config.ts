import type { NextConfig } from "next"

/**
 * STATIC EXPORT. There is no server: every route is prerendered to real HTML
 * at build time and served by GitHub Pages. That is the whole reason for
 * this app — the Vite SPA served one identical document for every URL, so
 * nothing but "/" could carry a title, a description, or its own content
 * to a crawler.
 *
 * `basePath` is a variable for the same reason the Vite `base` was: project
 * Pages serve from /<repo>/, and a custom domain later must not. NOTE the
 * shape difference — Vite wanted a trailing slash, Next must NOT have one,
 * and getting it wrong produces "//" in every URL.
 *
 * `transpilePackages` is what lets the workspace packages be consumed the
 * way a real installer consumes them: through their `exports` maps, from
 * `dist`. The Vite app aliased two of the three straight to source, which
 * meant the site could build green against a stale dist and never exercise
 * the artifact it publishes.
 */
const basePath = process.env.AMBIENTUI_BASE_PATH ?? ""

const nextConfig: NextConfig = {
  // Next writes its own CLAUDE.md/AGENTS.md into the app by default. This
  // repo's agent rules are a GOVERNED document at the root (CLAUDE.md, the
  // constitution's companion) — a second, generated one inside the app is
  // exactly the competing source of truth the project exists to argue
  // against, and it would be read by an agent working here.
  agentRules: false,
  output: "export",
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
  transpilePackages: [
    "@ambientui/ui",
    "ambientui",
    "@ambientui/foundation",
    "@ambientui/patterns",
    "@ambientui/docs",
  ],
}

export default nextConfig
