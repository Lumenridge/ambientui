import { HomeView } from "@/components/home/home-view"
import { SiteJsonLd } from "@/components/json-ld"

/**
 * The landing page. Metadata comes from the root layout, which already
 * describes exactly this page — restating it here would be a second copy
 * of one sentence.
 */
export default function Home() {
  return (
    <>
      <SiteJsonLd />
      <HomeView />
    </>
  )
}
