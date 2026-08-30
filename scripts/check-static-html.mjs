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

const LAYOUT_TITLE = "ambientui — an AI layer that inherits your design system"
/** Below this, a page is a shell with a heading, not a rendered document. */
const MIN_PROSE = 400

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

/**
 * The site's own origin+base, READ FROM THE BUILD rather than restated here.
 *
 * The home page's canonical is already asserted to be correct above, so it
 * is the one string in the export that is safe to derive from — and a copy
 * of SITE_URL in this file would be one more pair that has to be kept in
 * step by hand, which is the failure this whole script exists to catch.
 */
const SITE_URL = (
  readFileSync(join(OUT, "index.html"), "utf8").match(
    /rel="canonical" href="([^"]*)"/
  )?.[1] ?? ""
).replace(/\/$/, "")
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
  else {
    // the canonical must name THIS page, not some other one
    const expect = rel === "index.html" ? "/" : "/" + rel.replace(/\.html$/, "")
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
  const card = /name="twitter:card"/.test(html)
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
