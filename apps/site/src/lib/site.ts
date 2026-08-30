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
 * THE NAME AND THE PITCH, AS SHARE-CARD TITLES.
 *
 * A card is read by someone who was not looking for anything — a link in a
 * feed — so every one of them says what this is, not just which page it is.
 * "Motion" alone tells a stranger nothing; "Motion — Ambient UI, the AI
 * layer on top of your product" tells them whether to click.
 *
 * THE <title> IS DELIBERATELY DIFFERENT AND STAYS THAT WAY. A search
 * result is FOUND, by someone typing a package name or "AI design system",
 * so titles keep "ambientui" and the category words a query would contain.
 * The card is SHOWN to someone who typed nothing. Do not "fix" one to
 * match the other; they answer to different readers.
 *
 * The comma in the suffix is load-bearing: the page name already spends
 * the em dash, and two of them in one line reads as three fragments
 * rather than a page inside a product.
 */
const BRAND = "Ambient UI"
const PITCH = "the AI layer on top of your product"

/** The home card, and the only place the brand stands alone. */
export const BRAND_CARD_TITLE = `${BRAND} — ${PITCH}`

/**
 * Every other card. `name` is the SHORT page name — "Motion", not
 * "Motion — ambientui design system" — because the tail is the brand's
 * job here, and the section suffix belongs to the <title>.
 */
export const cardTitle = (name: string) => `${name} — ${BRAND}, ${PITCH}`

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

/**
 * A PAGE'S METADATA, WITH THE CARD FIELDS ATTACHED.
 *
 * Next does NOT deep-merge `openGraph`: a page that sets a title and
 * description but no openGraph block inherits the layout's card wholesale,
 * so a link to /ds/motion shared anywhere showed the site's name and the
 * site's pitch instead of "Motion" and what motion roles are. Seven pages
 * were in that state and nothing caught it, because each one's <title> and
 * meta description were correct — only the card was generic, and nothing
 * in this repo renders a card.
 *
 * So the card is not something a page remembers to add. Describe the page
 * once and the OG and Twitter fields are derived from that description,
 * which is the same reason `DeclareContext` exists on the layer side: a
 * rule each page must re-implement is a rule that decays.
 */
export function pageMetadata({
  title,
  name,
  description,
  canonical,
  type = "website",
}: {
  /** The full <title>, for a reader who searched. */
  title: string
  /**
   * The short page name, for a reader who did not. `cardTitle` adds the
   * brand and the pitch; passing the full <title> here would say
   * "ambientui" twice in one line.
   */
  name: string
  description: string
  /** Site-relative path, e.g. "/ds/motion". */
  canonical: string
  type?: "website" | "article"
}) {
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type,
      siteName: SITE_NAME,
      url: `${SITE_URL}${canonical}`,
      title: cardTitle(name),
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: cardTitle(name),
      description,
      images: [OG_IMAGE.url],
    },
  }
}
