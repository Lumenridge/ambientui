/**
 * THE BROWSER, LOADED ONLY WHEN ASKED FOR.
 *
 * WHY LAZY. Every command but the runtime probes works on files and git.
 * `playwright-core` is the one dependency, and it is useless without a
 * browser binary — which many machines, and most CI images, do not have.
 * So it is imported dynamically, and when it or a browser is missing the
 * caller gets `{ ok: false, hint }` naming exactly what to run, and prints a
 * SKIPPED line. A runtime check that quietly did not run and reported
 * nothing is the failure mode this CLI was written to remove.
 */

export const INSTALL_HINT =
  "npm install -g playwright-core && npx playwright install chromium   (or install Google Chrome — the probes launch channel \"chrome\" first)"

export async function openBrowser() {
  let pw
  try {
    pw = await import("playwright-core")
  } catch {
    return { ok: false, reason: "playwright-core is not installed", hint: INSTALL_HINT }
  }
  const chromium = pw.chromium ?? pw.default?.chromium
  let browser = null
  let lastErr = null
  for (const opts of [{ channel: "chrome" }, {}]) {
    try {
      browser = await chromium.launch({ ...opts, headless: true })
      break
    } catch (e) {
      lastErr = e
    }
  }
  if (!browser) {
    return { ok: false, reason: `no browser could be launched (${String(lastErr?.message ?? lastErr).split("\n")[0]})`, hint: INSTALL_HINT }
  }
  return { ok: true, browser }
}

export const STYLE_PROPS = [
  "display",
  "position",
  "top",
  "left",
  "width",
  "height",
  "margin",
  "padding",
  "font-size",
  "line-height",
  "font-weight",
  "color",
  "background-color",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-radius",
  "box-shadow",
  "opacity",
  "z-index",
]

/**
 * THE HOST'S SCREENS, AS NUMBERS. Computed styles of up to 3000 visible
 * elements keyed by a DOM path (tag + nth-of-type), skipping the layer's own
 * subtree. Taken before install and again after: any element whose computed
 * style moved is a screen the install restyled — the thing the layer path
 * promises never happens.
 */
export async function snapshotStyles(page, props = STYLE_PROPS, limit = 3000) {
  return page.evaluate(
    ({ props, limit }) => {
      const out = {}
      let n = 0
      const pathOf = (el) => {
        const parts = []
        for (let e = el; e && e.nodeType === 1 && e !== document.documentElement; e = e.parentElement) {
          let i = 1
          for (let s = e.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === e.tagName) i++
          parts.unshift(`${e.tagName.toLowerCase()}:nth-of-type(${i})`)
        }
        return "html>" + parts.join(">")
      }
      const walk = (el) => {
        if (n >= limit) return
        if (el.hasAttribute && el.hasAttribute("data-ambient-root")) return
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        if (r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none") {
          const rec = {}
          for (const p of props) rec[p] = cs.getPropertyValue(p)
          out[pathOf(el)] = rec
          n++
        }
        for (const c of el.children) walk(c)
      }
      walk(document.body)
      return out
    },
    { props, limit }
  )
}

/** Open a URL at a viewport, wait for the network to settle, plus 1s. */
export async function load(page, url, { width = 1280, height = 800 } = {}) {
  await page.setViewportSize({ width, height })
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 }).catch(async () => {
    await page.goto(url, { waitUntil: "load", timeout: 60_000 })
  })
  await page.waitForTimeout(1000)
}

/** Elements whose computed style changed, excluding the layer's subtree. */
export function diffStyles(before, after, max = 20) {
  const changed = []
  let total = 0
  for (const [key, rec] of Object.entries(before)) {
    const now = after[key]
    if (!now) continue
    const props = Object.keys(rec).filter((p) => rec[p] !== now[p])
    if (!props.length) continue
    total++
    if (changed.length < max) changed.push({ element: key, changes: props.map((p) => `${p}: ${rec[p]} → ${now[p]}`) })
  }
  return { total, changed }
}
