import { type IconName } from "@ambientui/ui/components/icon"

import { withBase } from "@/base"
import { ViewMenu } from "@/components/view-menu"

/**
 * SITE MENU — the one switcher, everywhere. The home page's four views
 * and the design system are a single set of destinations, so the pill
 * that names them is a single object: same segments, same centred-top
 * place, on `/` and `/ds` alike. Navigation goes through the history
 * API + a popstate dispatch, which both the App's router and the home
 * page's view state already listen to — the menu owns no state at all.
 */

const DESTINATIONS: { id: string; label: string; icon: IconName }[] = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "architecture", label: "Architecture", icon: "ruler" },
  { id: "devtool", label: "Dev tool demo", icon: "code" },
  { id: "canvas", label: "Canvas", icon: "image" },
  { id: "ds", label: "Design system", icon: "layers" },
]

const hrefFor = (id: string) =>
  id === "ds"
    ? withBase("/ds")
    : withBase(id === "overview" ? "/" : `/?view=${id}`)

export function SiteMenu({ value }: { value: string }) {
  const select = (id: string) => {
    const url = hrefFor(id)
    if (window.location.pathname + window.location.search !== url) {
      window.history.pushState(null, "", url)
    }
    window.dispatchEvent(new PopStateEvent("popstate"))
  }
  return <ViewMenu items={DESTINATIONS} value={value} onSelect={select} />
}
