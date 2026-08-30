/**
 * ASSET PATHS, WRITE-ONLY — the last descendant of the SPA's base.ts.
 *
 * `next/link` and the router prefix routes themselves, so there is no
 * `stripBase` successor and nothing reads a path back. This exists for the
 * handful of places that bypass the router entirely: an asset URL handed to
 * a shader, a raw <img src>, a CSS url().
 *
 * SHAPE PAPER CUT: Vite's `base` wanted a trailing slash, Next's `basePath`
 * must NOT have one. Getting it wrong yields "//" in every URL, so the
 * joining is done here once rather than at each call site.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

export const asset = (path: string) =>
  `${BASE.replace(/\/$/, "")}/${path.replace(/^\//, "")}`

/** What the ambient layer needs told, since it loads its shapes by URL. */
export const ASSET_BASE = BASE || "/"
