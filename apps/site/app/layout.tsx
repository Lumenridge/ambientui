/**
 * THE ROOT LAYOUT — and the one place every stylesheet is imported.
 *
 * ORDER MATTERS AND IS FRAGILE. theme.css deliberately overrides tokens set
 * by globals.css, so it must come after. Next guarantees import order
 * WITHIN a file but not ACROSS component files, so putting all four here,
 * above any component import, is the whole mitigation — split them across
 * components and the cascade becomes build-order dependent.
 */
import "@/styles/tailwind.css"
import "ambientui/styles/ambient.css"
import "@/styles/theme.css"
import "@/styles/viz.css"

import type { Metadata } from "next"

import { SiteChrome } from "@/components/site-chrome"
import { SiteProviders } from "@/components/providers/site-providers"
import { INSTALLABLE_COMPONENTS } from "@/lib/registry-facts"
import { BRAND_CARD_TITLE, OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site"
import { THEME_BOOT } from "@/lib/theme-boot"

export const metadata: Metadata = {
  // metadataBase makes every canonical and OG url ABSOLUTE. Without it a
  // page under a basePath emits relative canonicals, which either resolve
  // to the wrong origin or are ignored — and a wrong canonical is worse
  // than none: it tells a crawler the real page is somewhere else.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ambientui — an AI layer that inherits your design system",
    template: `%s`,
  },
  description:
    "An AI assistant that sits above your product instead of inside it. It looks like the rest of your app because it is built from your components. Installs as code you own, on shadcn/ui and Tailwind CSS.",
  alternates: { canonical: "/" },
  /**
   * THE CARD LEADS WITH THE WORDMARK AND WHAT THIS IS.
   *
   * It is read by someone who was not looking for anything — a link in a
   * feed — so it has one job: say the name, then say the thing in a breath.
   * "On top of your product" is the whole shape of the idea, and it is the
   * distinction the overview opens with: most products add AI by finding a
   * spot for it, and this is a layer over the product rather than a room
   * inside it.
   *
   * This is the ONE card where the brand stands alone. Every other page
   * carries the same sentence as a suffix behind its own name, which is
   * why the string lives in site.ts rather than here — see BRAND_CARD_TITLE
   * and `cardTitle`, and the note there on why the <title> differs.
   */
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: BRAND_CARD_TITLE,
    // THE COUNT IS DERIVED, like every other count on this site. A literal
    // here would be a number in prose that nothing keeps honest, which is
    // the one thing the README says never to do.
    description: `${INSTALLABLE_COMPONENTS} components for the AI parts of your product: the orb, the spotlight, the panel, the dock, the history. Built from your design system, not their own.`,
    images: [OG_IMAGE],
  },
  // summary_large_image was already declared and no image was ever emitted,
  // on 68 pages — which renders WORSE than claiming no card at all: the
  // platform reserves the large slot and fills it with nothing.
  twitter: {
    card: "summary_large_image",
    title: BRAND_CARD_TITLE,
    images: [OG_IMAGE.url],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // suppressHydrationWarning: the boot script below stamps a class on this
    // element before React runs, so the server's markup and the client's
    // first read legitimately differ by exactly that class.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* BEFORE FIRST PAINT — see lib/theme-boot.ts.
            A PLAIN <script>, deliberately. next/script with
            `beforeInteractive` looked like the tidier answer and silently
            dropped it from the static export altogether — the flash came
            back and nothing said so, which is worse than the dev-mode
            warning React emits about script tags in components. The
            emitted HTML is what matters, and check-static-html.mjs now
            asserts this script is in it. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        {/* the switcher belongs to the SITE, not to any page — a route
            cannot forget to render it from here */}
        <SiteProviders>
          <SiteChrome />
          {children}
        </SiteProviders>
      </body>
    </html>
  )
}
