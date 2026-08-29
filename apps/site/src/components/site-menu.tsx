"use client"

import { usePathname, useRouter } from "next/navigation"

import { type IconName } from "@ambientui/ui/components/icon"

import { ViewMenu } from "@/components/view-menu"

/**
 * SITE MENU — the one switcher, everywhere.
 *
 * The five destinations are a single set, so the pill that names them is a
 * single object: same segments, same centred-top place, on every page.
 *
 * IT OWNS NO STATE. The active segment is derived from the URL rather than
 * tracked — which is what makes it correct on a static site, where a
 * visitor can arrive at any page directly rather than navigating to it.
 * Under the SPA it read a `?view=` param and pushed history; here the
 * router does both, and `basePath` is handled for us.
 */
const DESTINATIONS: {
  id: string
  label: string
  icon: IconName
  href: string
  /** The kind this destination is. ViewMenu draws a rule where it changes. */
  group: string
}[] = [
  // The project itself: the argument, and the system it produced.
  { id: "overview", label: "Overview", icon: "home", href: "/", group: "site" },
  { id: "architecture", label: "Architecture", icon: "ruler", href: "/architecture", group: "site" },
  { id: "ds", label: "Design system", icon: "layers", href: "/ds", group: "site" },
  // Demonstrations of it. They are noindex and they are not the product,
  // which the pill should say before someone clicks rather than after.
  { id: "devtool", label: "Dev tool demo", icon: "code", href: "/demo/devtool", group: "demo" },
  { id: "canvas", label: "Canvas", icon: "image", href: "/demo/canvas", group: "demo" },
]

/** The longest matching prefix wins, so /ds/components/x still reads as /ds. */
function activeId(pathname: string) {
  const match = DESTINATIONS.filter(
    (d) => d.href !== "/" && pathname.startsWith(d.href)
  ).sort((a, b) => b.href.length - a.href.length)[0]
  return match?.id ?? "overview"
}

export function SiteMenu() {
  const pathname = usePathname()
  const router = useRouter()
  return (
    <ViewMenu
      items={DESTINATIONS}
      value={activeId(pathname)}
      onSelect={(id) => {
        const dest = DESTINATIONS.find((d) => d.id === id)
        if (dest) router.push(dest.href)
      }}
    />
  )
}
