/**
 * THE ONE PLACE THAT KNOWS WHERE THE SITE IS MOUNTED.
 *
 * GitHub Pages serves a project site from `/<repo>/`, so every path the app
 * writes into the URL — and every path it reads back out — carries that
 * prefix. A custom domain later removes it again.
 *
 * Vite fills `BASE_URL` from the `base` option, so the value is set once in
 * the deploy workflow and never appears as a literal anywhere else. That
 * matters more than it looks: the failure mode of a missed prefix is a page
 * that loads, renders, and then routes to the wrong thing — which reads as a
 * routing bug rather than a deployment one.
 *
 * Its own module (not App.tsx) for the Fast Refresh rule: a file exporting
 * both components and values loses refresh for everything importing it.
 */

/** "/" in dev, "/ambientui/" on project Pages. */
export const BASE = import.meta.env.BASE_URL

/** BASE without its trailing slash — "" at the root, "/ambientui" otherwise. */
const PREFIX = BASE.replace(/\/$/, "")

/** Turn an app path ("/ds") into a real URL ("/ambientui/ds"). */
export const withBase = (path: string) => `${PREFIX}${path}` || "/"

/** Turn a real pathname back into an app path, so routing can match on it. */
export const stripBase = (pathname: string) => {
  if (!PREFIX) return pathname
  if (pathname === PREFIX) return "/"
  return pathname.startsWith(`${PREFIX}/`)
    ? pathname.slice(PREFIX.length)
    : pathname
}
