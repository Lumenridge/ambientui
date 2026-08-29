"use client"

import { SiteMenu } from "@/components/site-menu"

/**
 * THE CHROME EVERY PAGE WEARS: the switcher, floating centred at the top.
 *
 * It lives in the root layout so it cannot be forgotten by a new route —
 * which is exactly how it went missing once, when the page that rendered
 * it was deleted and nothing was left to notice.
 *
 * pointer-events-none on the rail, auto on the pill: the bar spans the full
 * width so the pill can centre, but it must not eat clicks on the page
 * beneath it.
 */
export function SiteChrome() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex items-start justify-center">
      <SiteMenu />
    </div>
  )
}
