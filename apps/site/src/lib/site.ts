/**
 * WHERE THIS SITE LIVES. One value, because it ends up in canonical tags,
 * OG URLs and the sitemap — and those are the strings other people copy
 * into their own repos, so a rename has to be one edit here rather than a
 * search across published output.
 *
 * The default is the project Pages URL. A custom domain is one env var in
 * the deploy workflow (and would also let basePath become "", deleting the
 * prefix problem entirely — see the open decision in the launch plan).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://lumenridge.github.io/ambientui"
).replace(/\/$/, "")

export const SITE_NAME = "ambientui"
export const REPO_URL = "https://github.com/Lumenridge/ambientui"

/**
 * A governing document, on GitHub.
 *
 * The site used to render these itself at `/docs/<slug>`. That route is
 * gone, so every place that pointed at it — the /ds rail, the /ds index,
 * the paper's inline citations — sends the reader to the real file instead.
 * The blob view is the honest destination anyway: it shows the bytes, the
 * history, and who changed what, which is most of why these documents are
 * worth reading at all.
 */
export const docUrl = (path: string) => `${REPO_URL}/blob/main/${path}`
