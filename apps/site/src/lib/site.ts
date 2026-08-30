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

/**
 * THE SHARE CARD — the real hero, captured, not a drawing of it.
 *
 * ITS URL IS ABSOLUTE ON PURPOSE. `metadataBase` is SITE_URL including the
 * project-Pages base path, and a leading-slash path resolves against the
 * ORIGIN rather than that base: "/og-home.png" would become
 * lumenridge.github.io/og-home.png, dropping "/ambientui" and pointing
 * every card at a 404. Written out in full it cannot lose the prefix, and
 * it follows SITE_URL if a custom domain ever removes one.
 *
 * IT LIVES HERE BECAUSE EVERY PAGE THAT DECLARES `openGraph` MUST REPEAT
 * IT. Next replaces that object rather than deep-merging it, so a page
 * setting its own title and description silently drops the parent's image
 * — which is how 51 of 63 pages ended up declaring a large-image card with
 * no image in it. One exported constant, spread at each site.
 *
 * The dimensions are the CARD's, not the file's: the PNG is captured at 2x
 * for crispness and every platform scales to the 1200x630 declared here.
 */
export const OG_IMAGE = {
  url: `${SITE_URL}/og-home.png`,
  width: 1200,
  height: 630,
  alt: "The ambientui wordmark, filled with the assistant's own heat shader, with a product dashboard rising up behind it.",
}
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
