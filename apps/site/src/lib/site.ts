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
