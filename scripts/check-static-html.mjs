#!/usr/bin/env node
/**
 * THE CHECK THE WHOLE MIGRATION EXISTS FOR.
 *
 * A static export can complete, look perfect to a human, and still ship
 * empty documents to a crawler — every page carrying the layout's title,
 * its content mounted only after hydration. That failure is invisible in a
 * browser, which is the only place anyone looks. Without this assertion the
 * migration can finish and fail at its single purpose.
 *
 * So, per indexed page: it must carry its OWN <title> (not the layout's),
 * its own meta description, and enough real prose to prove the content
 * rendered on the server rather than being promised to JavaScript.
 *
 * Demo routes are checked for the opposite: they must be noindex, because
 * a GitHub project Pages site cannot serve an effective robots.txt and the
 * meta tag is the only exclusion that works.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs"
import { resolve, dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const OUT = resolve(ROOT, "apps/site/out")

if (!existsSync(OUT)) {
  console.error("✗ no export found at apps/site/out — build the site first")
  process.exit(1)
}

/** Visible text: scripts and styles stripped, tags removed. */
function prose(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}


/** Below this, a page is a shell with a heading, not a rendered document. */
const MIN_PROSE = 400
/** the shortest card text that can still explain a page to a stranger */
const MIN_CARD_DESC = 60

/**
 * Routes not yet ported, with the phase that ports them. Every entry is a
 * promise with a date on it — the same contract as NOT_DISTRIBUTABLE and
 * NO_STORIES: an exemption must name its reason, and this list must empty.
 */
const NOT_YET = {}

const pages = []
;(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) {
      if (e === "_next") continue
      walk(p)
    } else if (p.endsWith(".html")) pages.push(p)
  }
})(OUT)

const problems = []
const ogImages = new Set()
const ogDescs = new Map()

/**
 * The site's own origin+base, READ FROM THE BUILD rather than restated here.
 *
 * The home page's canonical is already asserted to be correct above, so it
 * is the one string in the export that is safe to derive from — and a copy
 * of SITE_URL in this file would be one more pair that has to be kept in
 * step by hand, which is the failure this whole script exists to catch.
 */
const HOME = readFileSync(join(OUT, "index.html"), "utf8")
const SITE_URL = (
  HOME.match(/rel="canonical" href="([^"]*)"/)?.[1] ?? ""
).replace(/\/$/, "")

/**
 * What the LAYOUT says, read off the home page instead of restated here.
 *
 * These were a hardcoded string, and the moment the layout's card title
 * was rewritten the copy went stale — at which point the assertion below
 * still passed on every page while catching nothing, because it was
 * comparing against a title no page could have any more. A check that
 * silently stops checking is worse than no check, and this file exists to
 * catch exactly that failure mode elsewhere.
 *
 * The home page IS the layout's metadata (app/page.tsx sets none of its
 * own), which is what makes it the honest source.
 */
const LAYOUT_TITLE = HOME.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""
const LAYOUT_OG_TITLE =
  HOME.match(/property="og:title" content="([^"]*)"/)?.[1] ?? ""

/**
 * THE PITCH EVERY OTHER CARD CARRIES, read off the home card.
 *
 * The home title is "Ambient UI — <pitch>"; every other page's is
 * "<page> — Ambient UI, <pitch>". So the tail after the first dash IS the
 * shared half, and taking it from the build means rewriting the pitch in
 * site.ts cannot leave this check comparing against a string no page has
 * — the failure the comment above describes, which already happened once.
 */
const PITCH = LAYOUT_OG_TITLE.split(" — ").slice(1).join(" — ")
let indexed = 0
let excluded = 0
const pending = []
const canonicals = new Map()

for (const file of pages) {
  const rel = relative(OUT, file)
  const html = readFileSync(file, "utf8")
  const isDemo = rel.startsWith("demo/")
  // Next writes both: 404.html (what Pages serves) and _not-found.html
  const is404 = rel === "404.html" || rel === "_not-found.html"
  const noindex = /name="robots"[^>]*content="[^"]*noindex/.test(html)

  if (isDemo || is404) {
    if (!noindex) problems.push(`${rel}: a demo/404 page that is NOT noindex`)
    else excluded++
    continue
  }
  if (NOT_YET[rel]) {
    pending.push(`${rel}: ${NOT_YET[rel]}`)
    continue
  }

  indexed++
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""
  const desc = html.match(/name="description" content="([^"]*)"/)?.[1] ?? ""
  const canonical = html.match(/rel="canonical" href="([^"]*)"/)?.[1] ?? ""
  const body = prose(html)
  canonicals.set(rel, canonical)

  if (!title) problems.push(`${rel}: no <title>`)
  else if (rel !== "index.html" && title === LAYOUT_TITLE)
    problems.push(`${rel}: wears the LAYOUT's title — it has none of its own`)
  if (!desc) problems.push(`${rel}: no meta description`)
  if (noindex) problems.push(`${rel}: an indexed page marked noindex`)
  if (!canonical) problems.push(`${rel}: no canonical`)
  else if (rel === "index.html") {
    // it must at least be absolute; that it is the SITE ROOT is settled
    // below, against a sibling page rather than against a pattern
    if (!/^https:\/\/[^/\s]+/.test(canonical))
      problems.push(`${rel}: canonical is not absolute (${canonical})`)
  } else {
    // the canonical must name THIS page, not some other one
    const expect = "/" + rel.replace(/\.html$/, "")
    if (!canonical.endsWith(expect) && !canonical.endsWith(expect + "/"))
      problems.push(`${rel}: canonical points elsewhere (${canonical})`)
  }
  if (body.length < MIN_PROSE)
    problems.push(
      `${rel}: only ${body.length} chars of prose (min ${MIN_PROSE}) — content may be client-only`
    )

  /**
   * A LARGE-IMAGE CARD WITH NO IMAGE IS WORSE THAN NO CARD.
   *
   * The site declared `summary_large_image` on every page and emitted an
   * og:image on none of them, for as long as the metadata existed: the
   * platform reserves the large slot and fills it with nothing. It stayed
   * invisible because nothing here renders a share card, so the only way
   * to see it was to post a link.
   *
   * The URL is checked too, not just its presence. `metadataBase` carries
   * the project-Pages base path, and a leading-slash image path resolves
   * against the ORIGIN instead — silently dropping "/ambientui" and
   * pointing every card at a 404 that still looks fine in the HTML.
   */
  /**
   * THE CARD MUST DESCRIBE THIS PAGE, NOT THE SITE.
   *
   * Next replaces `openGraph` rather than deep-merging it, so a page that
   * sets only a title and a description inherits the LAYOUT's card whole.
   * Seven pages shipped that way — every <title> and meta description
   * correct, every share card showing the site's name and the site's pitch.
   * The existing title assertion could not see it, because the fields it
   * checks were right; it is the card that was generic.
   */
  const ogTitle = html.match(/property="og:title" content="([^"]*)"/)?.[1] ?? ""
  const ogDesc =
    html.match(/property="og:description" content="([^"]*)"/)?.[1] ?? ""
  /**
   * AND IT MUST STILL SAY WHAT THIS IS. A card is shown to someone who
   * searched for nothing, so "Motion" on its own is a word with no product
   * attached to it. Every page but the home page names itself and then
   * carries the pitch — see `cardTitle` in src/lib/site.ts.
   */
  const card = /name="twitter:card"/.test(html)
  const twTitle =
    html.match(/name="twitter:title" content="([^"]*)"/)?.[1] ?? ""
  if (!ogTitle) problems.push(`${rel}: no og:title`)
  else if (rel !== "index.html") {
    if (ogTitle === LAYOUT_OG_TITLE)
      problems.push(`${rel}: card wears the LAYOUT's og:title — use pageMetadata()`)
    else if (PITCH && !ogTitle.endsWith(PITCH))
      problems.push(`${rel}: og:title does not carry the pitch (${ogTitle})`)
  }
  /**
   * TWITTER IS A SECOND OBJECT WITH THE SAME TRAP. /architecture set its
   * own openGraph and no twitter block, so it shared on X under the home
   * page's title while every assertion here passed — og:title was correct,
   * and nothing looked at the other one.
   */
  if (card && !twTitle) problems.push(`${rel}: declares a share card with no twitter:title`)
  else if (card && rel !== "index.html" && twTitle === LAYOUT_OG_TITLE)
    problems.push(`${rel}: card wears the LAYOUT's twitter:title — state a twitter block too`)
  if (!ogDesc) problems.push(`${rel}: no og:description`)
  else {
    /**
     * A DESCRIPTION HAS TO DESCRIBE. Eleven component pages shipped card
     * text under 55 characters ("Single-line text entry.") — correct as a
     * vocabulary line sitting beside the component, and an explanation of
     * nothing in a search result, where it is all a stranger gets. The
     * floor is well under what the pages now carry; it exists to catch a
     * new page written thin, not to police the ones that are fine.
     */
    if (ogDesc.length < MIN_CARD_DESC)
      problems.push(
        `${rel}: og:description is ${ogDesc.length} chars (min ${MIN_CARD_DESC}) — too thin to explain the page`
      )
    const seen = ogDescs.get(ogDesc)
    if (seen)
      problems.push(`${rel}: og:description is identical to ${seen}'s`)
    else ogDescs.set(ogDesc, rel)
  }

  const ogImage = html.match(/property="og:image" content="([^"]*)"/)?.[1] ?? ""
  const twImage = html.match(/name="twitter:image" content="([^"]*)"/)?.[1] ?? ""
  if (card && !ogImage)
    problems.push(`${rel}: declares a share card with no og:image`)
  if (card && !twImage)
    problems.push(`${rel}: declares a share card with no twitter:image`)
  for (const [what, url] of [["og:image", ogImage], ["twitter:image", twImage]]) {
    if (!url) continue
    // an off-site url is already the bug; do not also try to resolve it to
    // a local file, which slices it into nonsense and reports the wrong thing
    if (!url.startsWith(SITE_URL + "/"))
      problems.push(`${rel}: ${what} is not under the site url (${url})`)
    else ogImages.add(url)
  }
}

/**
 * THE HOME CANONICAL IS THE SITE ROOT — measured against a SIBLING, not a
 * pattern.
 *
 * Whether it ends in a slash is the HOST's decision, not this repo's.
 * Under a project-Pages base path the metadataBase carries a path of its
 * own, so Next resolves "/" to ".../ambientui/", slash included; served
 * from a domain root there is nothing to append to and it emits the bare
 * origin. The old assertion demanded the slash, which passed for exactly
 * as long as the site had a base path and failed the instant it did not —
 * a law about one deployment wearing a check's clothes.
 *
 * Loosening it to "origin, maybe one path segment" would have accepted
 * /ds as the home page's canonical. So the root is DERIVED: take any
 * other page, subtract its own path from its canonical, and what remains
 * is where the site is rooted, base path and all. A wrong home canonical
 * cannot agree with that by accident.
 */
{
  const home = (canonicals.get("index.html") ?? "").replace(/\/$/, "")
  const sibling = [...canonicals].find(([r]) => r !== "index.html")
  if (home && sibling) {
    const [rel, url] = sibling
    const path = "/" + rel.replace(/\.html$/, "")
    const bare = url.replace(/\/$/, "")
    if (!bare.endsWith(path))
      problems.push(`${rel}: canonical does not end in its own path (${url})`)
    else {
      const root = bare.slice(0, -path.length).replace(/\/$/, "")
      if (home !== root)
        problems.push(
          `index.html: canonical is not the site root — says ${home}, ${rel} puts the root at ${root}`
        )
    }
  }
}

// every card image the build emitted must be a file the build shipped
for (const url of ogImages) {
  const rel = url.slice(SITE_URL.length).replace(/^\//, "")
  if (!existsSync(join(OUT, rel)))
    problems.push(`card image ${url} is not in the export (looked for out/${rel})`)
}

/**
 * THE PRE-PAINT THEME SCRIPT MUST BE IN THE EMITTED HEAD.
 *
 * It vanished twice while every page still looked perfect: once when
 * next/script's `beforeInteractive` quietly declined to emit it into a
 * static export, and once when it was built from a constant imported
 * through a "use client" module, so the server rendered an empty string.
 * Both times the only symptom was a theme flash nobody would attribute to
 * a build change.
 */
const home = readFileSync(resolve(OUT, "index.html"), "utf8")
const head = home.slice(0, home.indexOf("</head>"))
if (!head.includes("ambientui-theme")) {
  problems.push(
    "index.html: the pre-paint theme script is not in the emitted <head> — every load will flash"
  )
}

// the sitemap must list exactly the pages that were built and indexed
const sitemapPath = resolve(OUT, "sitemap.xml")
if (!existsSync(sitemapPath)) {
  problems.push("sitemap.xml is missing from the export")
} else {
  const xml = readFileSync(sitemapPath, "utf8")
  const listed = new Set(
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      m[1].replace(/\/$/, "").split("/").slice(3).join("/")
    )
  )
  for (const [rel] of canonicals) {
    const path = rel === "index.html" ? "" : rel.replace(/\.html$/, "")
    const key = path.split("/").filter(Boolean).join("/")
    const inMap = [...listed].some((l) => l.endsWith(key))
    if (!inMap) problems.push(`${rel}: indexed but absent from sitemap.xml`)
  }
}

if (problems.length) {
  console.error("✗ the static export would not be indexable:")
  for (const p of problems) console.error(`    ${p}`)
  process.exit(1)
}
console.log(
  `✔ static html: ${indexed} indexed pages carry their own title, description, canonical and prose, all present in sitemap.xml; ${excluded} excluded`
)
for (const p of pending) console.log(`  · not yet ported — ${p}`)
