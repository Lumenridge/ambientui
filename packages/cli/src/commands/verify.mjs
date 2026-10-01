/**
 * `ambientui verify` — FAIL LOUDLY, WITH THE REASON.
 *
 * Each check ends in exactly one of
 *
 *   PASS · FAIL · SKIPPED (with the reason and the fix) · PRE-EXISTING
 *
 * PRE-EXISTING fails the same way it did at `doctor --baseline`, so it does
 * not block the install. A check that could not run is SKIPPED, never PASS.
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { diffStyles, INSTALL_HINT, load, openBrowser, snapshotStyles } from "../browser.mjs"
import { changesSince, sha } from "../session.mjs"
import { git, gitRoot, isDir, readJson, readState, rel, statePath, walk, writeState } from "../util.mjs"
import { checkCommands, runCheck } from "./doctor.mjs"

const MOD = process.platform === "darwin" ? "Meta" : "Control"

export async function verify(opts, out) {
  const root = opts.cwd
  const profile = readState(root, "profile.json")
  const plan = readState(root, "plan.json")
  if (!profile || !plan) {
    out.fail("No .ambientui/profile.json or plan.json.")
    out.done({ ok: false }, "ambientui doctor")
    return 1
  }
  const session = readState(root, "session.json")
  const manifest = readState(root, "manifest.json")
  const checks = []
  const add = (id, status, detail, extra = {}) => checks.push({ id, status, detail, ...extra })
  const appAbs = join(root, plan.appDirFromRoot ?? ".")
  const srcAbs = join(appAbs, plan.srcRoot ?? ".")

  /* ---------------------------- host scripts ---------------------------- */
  if (!opts.noScripts) {
    const cmds = checkCommands(profile)
    for (const id of ["typecheck", "lint", "test", "build"]) {
      const c = cmds.find((x) => x.id === id)
      if (!c) {
        add(id, "SKIPPED", "no script for it in the app package")
        continue
      }
      out.live(`… ${id}: ${c.command}`)
      const r = runCheck(root, profile, c, Number(opts.timeout ?? 600) * 1000)
      const base = profile.baseline?.checks?.find((b) => b.id === id)
      if (r.code === 0) add(id, "PASS", c.command)
      else if (base && base.code !== 0 && base.code === r.code) add(id, "PRE-EXISTING", `${c.command} failed at baseline too (exit ${base.code})`, { tail: r.tail })
      else add(id, "FAIL", `${c.command} exited ${r.timedOut ? "(timeout)" : r.code}${base ? ` (baseline: ${base.code})` : " (no baseline: run `ambientui doctor --baseline` before installing to tell pre-existing failures apart)"}`, { tail: r.tail })
    }
  }

  /* ------------------------------ placement ----------------------------- */
  let added = manifest?.files?.added ?? null
  let top = gitRoot(root)
  if (!added && session) {
    try {
      const ch = changesSince(root, session)
      added = ch.added
      top = ch.top
    } catch (e) {
      add("placement", "SKIPPED", `could not compute changes: ${e.message}`)
    }
  }
  if (!added && !checks.some((c) => c.id === "placement")) add("placement", "SKIPPED", "no install session or manifest (run `ambientui begin` before installing)")
  if (added) {
    const srcFromTop = rel(top, srcAbs)
    const prefix = srcFromTop === "." ? "" : `${srcFromTop}/`
    const misplaced = added.filter((p) => /(^|\/)components\/ambient\//.test(p) && !p.startsWith(`${prefix}components/ambient/`))
    const atDir = isDir(join(appAbs, "@"))
    const layerDir = join(srcAbs, "components/ambient")
    let ignored = []
    if (isDir(layerDir)) {
      const files = walk(layerDir, { maxFiles: 2000 }).files.map((f) => rel(top, f))
      const r = git(["check-ignore", "--no-index", "--", ...files.slice(0, 500)], top)
      ignored = r.stdout.split("\n").filter(Boolean)
    }
    if (!isDir(layerDir)) add("placement", "FAIL", `${rel(root, layerDir)} does not exist — the layer did not land under the source root`)
    else if (misplaced.length || atDir || ignored.length) {
      add("placement", "FAIL", [misplaced.length && `outside ${plan.srcRoot}/: ${misplaced.slice(0, 5).join(", ")}`, atDir && `a literal "@" directory exists at ${rel(root, join(appAbs, "@"))}`, ignored.length && `gitignored: ${ignored.slice(0, 5).join(", ")}`].filter(Boolean).join("; "))
    } else add("placement", "PASS", `layer under ${rel(root, layerDir)}; nothing gitignored; no "@" directory`)
  }

  /* ------------------------ restored primitives ------------------------- */
  const prot = session?.install?.protected
  if (!prot) add("primitives", "SKIPPED", "no install record (run `ambientui install`)")
  else {
    const changed = Object.entries(prot).filter(([p, h]) => {
      const f = join(root, p)
      return !existsSync(f) || sha(readFileSync(f)) !== h
    })
    if (changed.length) add("primitives", "FAIL", `the product's own files changed since install: ${changed.map(([p]) => p).join(", ")}`)
    else add("primitives", "PASS", `${Object.keys(prot).length} product file(s) unchanged`)
  }

  /* ------------------------------ built css ----------------------------- */
  const outDirs = ["dist", "build", ".next/static/css", "out"].map((d) => join(appAbs, d)).filter(isDir)
  const cssFiles = outDirs.flatMap((d) => walk(d, { exts: [".css"], maxFiles: 2000, ignore: new Set(["node_modules"]) }).files)
  if (!cssFiles.length) add("built-css", "SKIPPED", `no built CSS under ${["dist", "build", ".next/static/css", "out"].join(", ")} — run the build first`)
  else {
    const all = cssFiles.map((f) => readFileSync(f, "utf8")).join("\n")
    const unescaped = all.replace(/\\/g, "")
    const miss = []
    if (!all.includes("--glass-fill")) miss.push("--glass-fill")
    if (!all.includes(".ambient-glass")) miss.push(".ambient-glass")
    if (plan.doors?.includes("ambient-layer-tw3") && !unescaped.includes(".bg-[color:var(--glass-wash)]")) miss.push(".bg-[color:var(--glass-wash)] (the v3 arbitrary classes were not generated — check tailwind.config content covers components/ambient)")
    if (profile.tokens?.format === "hsl-triplet") {
      const decl = /--glass-fill\s*:\s*([^;]+)/.exec(all)?.[1] ?? ""
      if (!/hsl\(var\(--popover\)\)/.test(decl.replace(/\s+/g, ""))) miss.push(`--glass-fill reads hsl(var(--popover)) (got "${decl.slice(0, 60)}") — the HSL door is missing, the glass is transparent`)
    }
    if (miss.length) add("built-css", "FAIL", `built CSS lacks: ${miss.join("; ")}`)
    else add("built-css", "PASS", `material wired (${cssFiles.length} css file(s))`)
  }

  /* ------------------------- productName at mount ------------------------ */
  const mountHits = []
  if (isDir(srcAbs)) {
    for (const f of walk(srcAbs, { exts: [".tsx", ".jsx"], maxFiles: 20000 }).files) {
      if (/\/components\/ambient\//.test(f)) continue
      const t = readFileSync(f, "utf8")
      const i = t.indexOf("<AssistantProvider")
      if (i < 0) continue
      // The opening tag: up to where its first child element starts.
      const rest = t.slice(i, i + 1500)
      const child = rest.slice(1).search(/\n\s*<[A-Za-z{]/)
      const tag = child > 0 ? rest.slice(0, child + 1) : rest
      mountHits.push({ file: rel(root, f), productName: /productName\s*=/.test(tag) })
    }
  }
  if (!mountHits.length) add("mount", "FAIL", `no <AssistantProvider> found under ${rel(root, srcAbs)} — mount it in ${plan.mount?.file ?? "the root component"}`)
  else if (!mountHits.some((h) => h.productName)) add("mount", "FAIL", `<AssistantProvider> in ${mountHits[0].file} does not pass productName (the layer would name itself "ambientui")`)
  else add("mount", "PASS", `mounted in ${mountHits.find((h) => h.productName).file} with productName`)

  /* ------------------------------- runtime ------------------------------ */
  if (opts.staticOnly) add("runtime", "SKIPPED", "--static-only")
  else if (!opts.url) add("runtime", "SKIPPED", "no --url: start the dev server and pass --url http://localhost:<port> to run the runtime checks")
  else {
    const b = await openBrowser()
    if (!b.ok) add("runtime", "SKIPPED", `${b.reason}. Run: ${b.hint ?? INSTALL_HINT}`)
    else {
      try {
        await runtime(b.browser, opts.url, root, plan, add)
      } catch (e) {
        add("runtime", "FAIL", `the runtime probe crashed: ${String(e.message ?? e).split("\n")[0]}`)
      } finally {
        await b.browser.close()
      }
    }
  }

  /* ------------------------------- report ------------------------------- */
  const failed = checks.filter((c) => c.status === "FAIL")
  writeState(root, "verify.json", { at: new Date().toISOString(), url: opts.url ?? null, ok: failed.length === 0, checks })
  out.head("VERIFY")
  for (const c of checks) {
    const mark = { PASS: out.ok, FAIL: out.fail, SKIPPED: out.warn, "PRE-EXISTING": out.warn }[c.status]
    mark(`${c.status.padEnd(12)} ${c.id}: ${c.detail}`)
    if (c.status === "FAIL" && c.tail) for (const l of c.tail.split("\n").slice(-12)) out.info(`  ${l}`)
    if (c.status === "FAIL" && c.list) for (const l of c.list) out.info(`  ${l}`)
  }
  const next = failed.length
    ? `fix the FAIL lines above, then \`ambientui verify${opts.url ? ` --url ${opts.url}` : ""}\` again`
    : manifest
      ? "done — the install is committed and verified"
      : "ambientui end"
  out.done({ ok: failed.length === 0, checks }, next)
  return failed.length ? 1 : 0
}

/* ------------------------------ the probes ------------------------------ */

async function runtime(browser, url, root, plan, add) {
  const page = await browser.newPage()
  const errors = []
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
  page.on("pageerror", (e) => errors.push(String(e.message ?? e)))
  await load(page, url)

  // HOST SCREENS FIRST, before anything opens.
  const basePath = statePath(root, "baseline/styles.json")
  const baseline = readJson(basePath)
  if (!baseline) add("host-screens", "SKIPPED", "no .ambientui/baseline/styles.json (run `ambientui doctor --url <url>` before installing)")
  else if (baseline.url !== url) add("host-screens", "SKIPPED", `baseline was taken at ${baseline.url}, not ${url}`)
  else {
    const now = await snapshotStyles(page)
    const d = diffStyles(baseline.elements, now)
    if (d.total) add("host-screens", "FAIL", `${d.total} element(s) of the product changed computed style`, { list: d.changed.map((c) => `${c.element}: ${c.changes.slice(0, 3).join("; ")}`) })
    else add("host-screens", "PASS", `${Object.keys(baseline.elements).length} elements unchanged`)
  }

  // TOKENS AND MATERIAL.
  const tok = await page.evaluate(() => {
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--ambient-accent").trim()
    const probe = document.createElement("div")
    probe.className = "ambient-glass"
    probe.style.cssText = "position:fixed;left:-9999px;top:0;width:40px;height:40px"
    document.body.appendChild(probe)
    const bg = getComputedStyle(probe).backgroundColor
    probe.remove()
    return { accent, bg }
  })
  const transparent = !tok.bg || tok.bg === "transparent" || tok.bg === "rgba(0, 0, 0, 0)"
  if (!tok.accent || transparent) add("tokens", "FAIL", `${!tok.accent ? "--ambient-accent is empty" : ""}${!tok.accent && transparent ? "; " : ""}${transparent ? `.ambient-glass background is ${tok.bg || "empty"} (the material or its tokens are not loaded)` : ""}`)
  else add("tokens", "PASS", `--ambient-accent ${tok.accent}; glass ${tok.bg}`)

  const mounted = await page.$("[data-ambient-root]")
  if (!mounted) add("mounted", "FAIL", "[data-ambient-root] not found — the layer did not mount")
  else add("mounted", "PASS", "[data-ambient-root] present")

  // THE HOTKEY: open, close, five times; then state reset after Escape.
  const hk = plan.provider?.hotkey
  const SPOT = '[data-ambient-surface="spotlight"]'
  let spotlightOpen = false
  if (hk === false || hk == null) add("hotkey", "SKIPPED", "the plan has no hotkey (orb only)")
  else if (!mounted) add("hotkey", "SKIPPED", "the layer is not mounted")
  else {
    const key = String(hk).split("+").pop()
    const combo = `${MOD}+${key.length === 1 ? key.toLowerCase() : key}`
    const openIt = async () => {
      await page.keyboard.press(combo)
      await page.waitForSelector(SPOT, { state: "visible", timeout: 1500 })
    }
    const closeIt = async () => {
      await page.keyboard.press(combo)
      await page.waitForSelector(SPOT, { state: "hidden", timeout: 1500 })
    }
    let step = "first open"
    try {
      // The layer listens from an effect, after the first paint; wait a beat
      // and let only the first open retry once.
      await page.waitForTimeout(600)
      await openIt().catch(async () => {
        await page.waitForTimeout(600)
        await openIt()
      })
      await closeIt()
      for (let i = 1; i < 5; i++) {
        step = `open #${i + 1}`
        await openIt()
        step = `close #${i + 1}`
        await closeIt()
      }
      step = "reopen for input"
      await openIt()
      step = "type into [data-ambient-input]"
      await page.fill("[data-ambient-input]", "zzq").catch(async () => {
        await page.click("[data-ambient-input]")
        await page.keyboard.type("zzq")
      })
      step = "escape twice"
      await page.keyboard.press("Escape")
      await page.keyboard.press("Escape")
      await page.waitForSelector(SPOT, { state: "hidden", timeout: 1500 })
      step = "reopen"
      await openIt()
      const v = await page.$eval("[data-ambient-input]", (el) => el.value ?? el.textContent ?? "").catch(() => "")
      if (v.trim()) add("hotkey", "FAIL", `after Escape and reopen, the input still holds "${v.trim()}"`)
      else add("hotkey", "PASS", `${combo} opens and closes the spotlight 5×; Escape resets the input`)
      spotlightOpen = true
    } catch {
      add("hotkey", "FAIL", `${combo}: the spotlight did not respond within 1.5s at step "${step}"`)
      spotlightOpen = await page.isVisible(SPOT).catch(() => false)
    }
  }

  // WITH THE SPOTLIGHT OPEN: stacking, render loop, branding.
  if (!spotlightOpen && mounted && hk) {
    const key = String(hk).split("+").pop()
    await page.keyboard.press(`${MOD}+${key}`).catch(() => {})
    spotlightOpen = await page.waitForSelector(SPOT, { state: "visible", timeout: 1500 }).then(() => true).catch(() => false)
  }
  if (!spotlightOpen) {
    for (const id of ["stacking", "render-loop", "branding"]) add(id, "SKIPPED", "the spotlight could not be opened")
  } else {
    const stack = await page.evaluate((SPOT) => {
      const el = document.querySelector(`${SPOT} [data-ambient-panel]`) ?? document.querySelector(SPOT)
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      const inside = Boolean(hit && hit.closest("[data-ambient-root]"))
      const d = hit ? `${hit.tagName.toLowerCase()}${hit.id ? `#${hit.id}` : ""}${typeof hit.className === "string" && hit.className ? `.${hit.className.split(/\s+/).slice(0, 2).join(".")}` : ""}` : "nothing"
      return { inside, d }
    }, SPOT)
    if (stack.inside) add("stacking", "PASS", "the spotlight is on top at its centre")
    else add("stacking", "FAIL", `the spotlight's centre is covered by ${stack.d} — raise the provider's zIndex`)

    const muts = await page.evaluate(
      () =>
        new Promise((res) => {
          let n = 0
          const mo = new MutationObserver((l) => (n += l.length))
          mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true })
          setTimeout(() => {
            mo.disconnect()
            res(n)
          }, 2000)
        })
    )
    if (muts > 2000) add("render-loop", "FAIL", `${muts} DOM mutations in 2s with the spotlight idle — a render loop`)
    else add("render-loop", "PASS", `${muts} mutations in 2s`)

    const text = await page.$eval("[data-ambient-root]", (el) => el.innerText).catch(() => "")
    const name = String(plan.provider?.productName ?? "")
    if (/ambientui/i.test(text) && !/ambientui/i.test(name)) add("branding", "FAIL", `the layer shows "ambientui" to the product's users — pass productName="${name}"`)
    else add("branding", "PASS", "no ambientui branding in the open spotlight")
    await page.keyboard.press("Escape").catch(() => {})
    await page.keyboard.press("Escape").catch(() => {})
  }

  // THEME: the layer follows .dark on <html>.
  if (plan.provider?.dark === "html-class") {
    const t = await page.evaluate(() => {
      const probe = document.createElement("div")
      probe.className = "ambient-glass"
      probe.style.cssText = "position:fixed;left:-9999px;top:0;width:40px;height:40px"
      document.body.appendChild(probe)
      const html = document.documentElement
      const had = html.classList.contains("dark")
      const a = getComputedStyle(probe).backgroundColor
      html.classList.toggle("dark")
      const b = getComputedStyle(probe).backgroundColor
      html.classList.toggle("dark", had)
      probe.remove()
      return { a, b }
    })
    if (t.a === t.b) add("theme", "FAIL", `toggling .dark on <html> left the glass at ${t.a}`)
    else add("theme", "PASS", `glass ${t.a} ⇄ ${t.b}`)
  } else add("theme", "SKIPPED", "the product's dark mode is not .dark on <html>; check the `dark` prop by hand in both themes")

  // RTL: the floating surfaces keep their physical places; their content
  // must mirror (input direction, row order) and stay on screen.
  if (plan.i18n?.rtl && mounted && hk) {
    const before = await page.evaluate(() => {
      const d = document.documentElement.getAttribute("dir")
      document.documentElement.setAttribute("dir", "rtl")
      return d
    })
    await page.keyboard.press(`${MOD}+${String(hk).split("+").pop()}`).catch(() => {})
    await page.waitForSelector(SPOT, { state: "visible", timeout: 1500 }).catch(() => {})
    const r = await page.evaluate(async ({ SPOT }) => {
      const html = document.documentElement
      await new Promise((res) => setTimeout(res, 150))
      const panel = document.querySelector(`${SPOT} [data-ambient-panel]`) ?? document.querySelector(SPOT)
      const input = document.querySelector("[data-ambient-input]")
      const row = document.querySelector("[data-palette-item]")
      const out = { open: Boolean(panel) }
      if (panel) {
        const b = panel.getBoundingClientRect()
        out.inside = b.left >= 0 && b.right <= innerWidth + 1
        out.overflow = html.scrollWidth > innerWidth + 1
        out.dir = input ? getComputedStyle(input).direction : null
        if (row && row.children.length >= 2) {
          const [first, second] = [...row.children].map((c) => c.getBoundingClientRect().left)
          out.mirrored = first > second
        }
      }
      return out
    }, { SPOT })
    await page.keyboard.press("Escape").catch(() => {})
    await page.keyboard.press("Escape").catch(() => {})
    await page.evaluate((d) => {
      if (d == null) document.documentElement.removeAttribute("dir")
      else document.documentElement.setAttribute("dir", d)
    }, before)
    if (!r.open) add("rtl", "SKIPPED", "the spotlight was not open to check under dir=\"rtl\"")
    else if (r.dir !== "rtl" || r.inside === false || r.overflow || r.mirrored === false)
      add("rtl", "FAIL", `under dir="rtl": input direction ${r.dir}, inside viewport ${r.inside}, page overflow ${r.overflow}, rows mirrored ${r.mirrored}`)
    else add("rtl", "PASS", `under dir="rtl" the spotlight's input and rows mirror, and it stays on screen`)
  }

  // MOBILE: the orb must not cover fixed/sticky product UI.
  await page.setViewportSize({ width: 375, height: 812 })
  await page.reload({ waitUntil: "networkidle" }).catch(() => {})
  await page.waitForTimeout(1000)
  await page.keyboard.press("Escape").catch(() => {})
  const mob = await page.evaluate(() => {
    const orb = document.querySelector('[data-ambient-surface="orb"]')
    if (!orb) return { missing: true }
    const o = orb.getBoundingClientRect()
    const hits = []
    for (const el of document.body.querySelectorAll("*")) {
      if (el.closest("[data-ambient-root]")) continue
      const cs = getComputedStyle(el)
      if (cs.position !== "fixed" && cs.position !== "sticky") continue
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      if (r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top) {
        hits.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}` : ""}`)
      }
    }
    return { hits: hits.slice(0, 5) }
  })
  if (mob.missing) add("mobile", "FAIL", 'at 375×812 there is no [data-ambient-surface="orb"]')
  else if (mob.hits.length) add("mobile", "FAIL", `at 375×812 the orb overlaps fixed product UI: ${mob.hits.join(", ")} — set defaultOrbAnchor (e.g. "mr")`)
  else add("mobile", "PASS", "the orb clears all fixed/sticky product UI at 375×812")

  // CONSOLE ERRORS, all reported; the damning ones fail.
  const pre = new Set(baseline?.consoleErrors ?? [])
  const bad = errors.filter((e) => /Maximum update depth|ambient/i.test(e) || (baseline?.consoleErrors && !pre.has(e)))
  if (bad.length) add("console", "FAIL", `${bad.length} console error(s)`, { list: bad.slice(0, 10).map((e) => e.slice(0, 200)) })
  else if (errors.length) add("console", "PASS", `${errors.length} console error(s), none from the layer (no pre-install record to compare)`, { list: errors.slice(0, 10) })
  else add("console", "PASS", "no console errors")
}
