/**
 * THE ROOT LAYOUT — and the one place every stylesheet is imported.
 *
 * ORDER MATTERS AND IS FRAGILE. theme.css deliberately overrides tokens set
 * by globals.css, so it must come after. Next guarantees import order
 * WITHIN a file but not ACROSS component files, so putting all four here,
 * above any component import, is the whole mitigation — split them across
 * components and the cascade becomes build-order dependent.
 */
import "@ambientui/ui/globals.css"
import "ambientui/styles/ambient.css"
import "@/styles/theme.css"
import "@/styles/viz.css"

import type { Metadata } from "next"

import { SITE_NAME, SITE_URL } from "@/lib/site"
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
    "An AI assistant that lives above your product, composed entirely from your own design system. Built on shadcn/ui and Tailwind CSS, installed as source you own.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "ambientui — an AI layer that inherits your design system",
    description:
      "A design system has to become a bounded configuration space before an AI can safely build inside it. This is that argument, applied to itself.",
  },
  twitter: { card: "summary_large_image" },
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
        {/* before first paint — see lib/theme-boot.ts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
