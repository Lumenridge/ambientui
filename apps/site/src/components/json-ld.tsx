import { REPO_URL, SITE_NAME, SITE_URL } from "@/lib/site"

/**
 * STRUCTURED DATA — only what is true.
 *
 * Notably absent: `SearchAction`. There is no search endpoint on this site,
 * and declaring one would be a fabricated capability in a machine-readable
 * format — exactly the class of claim the rest of this repo builds gates to
 * prevent. Also absent: FAQPage and HowTo, because no matching content
 * exists. Structured data is a place it is unusually easy to lie, and
 * unusually hard to notice.
 */
function Script({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/** The site and the thing it is: an open-source codebase. */
export function SiteJsonLd() {
  return (
    <>
      <Script
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
        }}
      />
      <Script
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareSourceCode",
          name: SITE_NAME,
          description:
            "An AI assistant layer that composes entirely from your own design system, and the design architecture that makes it safe for a generator to build inside.",
          url: SITE_URL,
          codeRepository: REPO_URL,
          programmingLanguage: "TypeScript",
          license: "https://opensource.org/licenses/MIT",
        }}
      />
    </>
  )
}

/** A document or the paper: a technical article with a real headline. */
export function ArticleJsonLd({
  headline,
  description,
  path,
}: {
  headline: string
  description: string
  path: string
}) {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline,
        description,
        url: `${SITE_URL}${path}`,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
      }}
    />
  )
}

/** Three levels deep is where a breadcrumb earns its place. */
export function BreadcrumbJsonLd({
  trail,
}: {
  trail: { name: string; path: string }[]
}) {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: trail.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: t.name,
          item: `${SITE_URL}${t.path}`,
        })),
      }}
    />
  )
}
