/**
 * WHAT THE PRODUCT'S CODE ALREADY DOES — the collisions and the seams.
 *
 * COLLISIONS are things the layer would fight (an existing ⌘K owner, a high
 * modal layer, fixed bottom UI). SEAMS are where it plugs in (HTTP client and
 * auth, worker bridge, AI SDK, i18n). Every hit is file:line so it can be acted
 * on; `ambientui verify` checks stacking and overlap in the running page.
 */
import { join } from "node:path"

import { isDir, readJson, readText } from "../util.mjs"
import { OURS } from "./styling.mjs"

/** Grep lines across files, skipping the layer's own files. */
function grep(ctx, files, re, { limit = 50, window = 0, also = null } = {}) {
  const hits = []
  for (const f of files) {
    const rp = ctx.rel(f)
    if (OURS.test(rp) || /\.(test|spec|stories)\.[jt]sx?$/.test(rp) || /(^|\/)(__tests__|__mocks__|e2e|tests?)\//.test(rp)) continue
    const t = ctx.read(f)
    if (!t) continue
    const lines = t.split("\n")
    for (let i = 0; i < lines.length; i++) {
      if (!re.test(lines[i])) continue
      if (also) {
        const win = lines.slice(Math.max(0, i - window), i + window + 1).join("\n")
        if (!also.test(win)) continue
      }
      hits.push({ file: rp, line: i + 1, text: lines[i].trim().slice(0, 160) })
      if (hits.length >= limit) return hits
    }
  }
  return hits
}

/* --------------------------------- hotkeys -------------------------------- */

const K_TOKEN = /(["'`])[kK]\1|\bKeyK\b|KEYS\.K\b|\bkeyCode\s*===?\s*75\b/
const MOD_TOKEN = /\b(metaKey|ctrlKey|CTRL_OR_CMD|isMac\w*|getModifierState)\b|(?:mod|meta|cmd|ctrl|command|control)\s*\+\s*k\b/i

/**
 * EXISTING ⌘K / Ctrl+K OWNERS. The layer defaults to mod+k; a second owner
 * means both open at once or one never does.
 */
export function detectHotkeys(ctx) {
  const owners = []
  for (const lib of ["cmdk", "kbar", "react-cmdk", "@react-hook/hotkey", "react-command-palette"]) {
    if (ctx.deps[lib]) {
      owners.push({ kind: "dependency", name: lib, file: ctx.depFile(lib) })
      ctx.ev("hotkeys", { pkg: lib })
    }
  }
  const files = ctx.codeFiles.filter((f) => /\.[jt]sx?$/.test(f))
  // Hotkey libraries: `useHotkeys("mod+k", …)`, tinykeys `"$mod+KeyK"`.
  for (const h of grep(ctx, files, /["'`](?:\$?mod|meta|cmd|ctrl|command|control)\s*\+\s*(?:k|KeyK)\b["'`,\]]/i, { limit: 20 })) {
    owners.push({ kind: "hotkey-lib", ...h })
    ctx.ev("hotkeys", { file: h.file, line: h.line, note: h.text })
  }
  // Raw handlers: a modifier and `k` within two lines of each other.
  const raw = grep(ctx, files, K_TOKEN, { window: 2, also: MOD_TOKEN, limit: 40 })
  for (const h of raw) {
    if (!MOD_TOKEN.test(h.text) && !/key/i.test(h.text)) continue
    if (owners.some((o) => o.file === h.file && Math.abs((o.line ?? 0) - h.line) <= 2)) continue
    owners.push({ kind: "handler", ...h })
    ctx.ev("hotkeys", { file: h.file, line: h.line, note: h.text })
  }
  // The commands a takeover must re-register.
  const features = []
  for (const o of owners.filter((x) => x.file && x.kind !== "dependency")) {
    const t = ctx.read(join(ctx.root, o.file)) ?? ""
    // Headings are kept too — they name the groups.
    const items = [
      ...t.matchAll(/\b(?:name|label|heading|title)\s*:\s*(?:t\(\s*)?["'`]([^"'`$]{2,50})["'`]|<Command\.Item[^>]*>\s*([A-Za-z][^<{]{1,40})/g),
    ]
      .map((m) => (m[1] ?? m[2]).trim())
      .filter(Boolean)
    if (items.length) features.push({ file: o.file, items: [...new Set(items)].slice(0, 25) })
  }
  return { owners, conflict: owners.length > 0, features }
}

/* --------------------------------- z-index -------------------------------- */

const MODALISH = /modal|dialog|overlay|popover|toast|drawer|sheet|backdrop|lightbox|tooltip|dropdown|menu/i

/**
 * THE HOST'S STACKING SCALE. The plan sets the provider's zIndex above the
 * host's content and below its modal layer, so a product modal still covers
 * the orb.
 */
export function detectZIndex(ctx) {
  const vals = []
  const res = [
    /z-index\s*:\s*(\d+)/g,
    /zIndex\s*:\s*["']?(\d+)/g,
    /\bz-\[(\d+)\]/g,
    /\bz-(10|20|30|40|50)\b/g,
    /\$z[\w-]*\s*:\s*(\d+)/g,
    /(--z-?index[\w-]*)\s*:\s*(\d+)/gi,
  ]
  for (const f of [...ctx.codeFiles, ...ctx.cssFiles]) {
    const rp = ctx.rel(f)
    if (OURS.test(rp) || /(^|\/)components\/ui\//.test(rp)) continue
    const t = ctx.read(f)
    if (!t) continue
    const lines = t.split("\n")
    lines.forEach((l, i) => {
      for (const re of res) {
        re.lastIndex = 0
        for (const m of l.matchAll(re)) {
          // A NAMED scale (`--zIndex-modal: 1000`) says what each layer is;
          // otherwise the surrounding selector or file name has to.
          const named = m.length > 2 && m[2] != null
          const n = Number(named ? m[2] : m[1])
          const near = lines.slice(Math.max(0, i - 6), i + 2).join(" ")
          const modal = named ? /modal|dialog/i.test(m[1]) : MODALISH.test(near) || MODALISH.test(rp)
          vals.push({ value: n, file: rp, line: i + 1, modal, named })
        }
      }
    })
  }
  const outliers = vals.filter((v) => v.value > 1_000_000)
  const real = vals.filter((v) => v.value <= 1_000_000)
  const max = real.reduce((a, v) => (v.value > (a?.value ?? -1) ? v : a), null)
  const namedModals = real.filter((v) => v.modal && v.named)
  const modals = namedModals.length ? namedModals : real.filter((v) => v.modal)
  const modal = modals.reduce((a, v) => (v.value > (a?.value ?? -1) ? v : a), null)
  const nonModalMax = real.filter((v) => !v.modal).reduce((a, v) => (v.value > (a?.value ?? -1) ? v : a), null)
  if (max) ctx.ev("zIndex.max", { file: max.file, line: max.line, note: `z-index ${max.value}` })
  if (modal) ctx.ev("zIndex.modal", { file: modal.file, line: modal.line, note: `z-index ${modal.value}` })
  for (const o of outliers.slice(0, 5)) ctx.ev("zIndex.outliers", { file: o.file, line: o.line, note: `z-index ${o.value} (ignored)` })
  return {
    max: max?.value ?? null,
    maxAt: max ? `${max.file}:${max.line}` : null,
    modal: modal?.value ?? null,
    modalAt: modal ? `${modal.file}:${modal.line}` : null,
    modalNamed: Boolean(modal?.named),
    nonModalMax: nonModalMax?.value ?? null,
    outliers: outliers.slice(0, 10).map((o) => ({ value: o.value, at: `${o.file}:${o.line}` })),
    count: real.length,
  }
}

/* ------------------------------ fixed bottom ------------------------------ */

/**
 * FIXED BOTTOM UI the resting orb would cover. Static and approximate; verify
 * measures the real overlap at 375px.
 */
export function detectFixedBottom(ctx) {
  // shadcn primitives (a bottom Sheet) are not product chrome.
  const files = ctx.codeFiles
    .filter((f) => /\.[jt]sx?$/.test(f))
    .concat(ctx.cssFiles)
    .filter((f) => !/(^|\/)components\/ui\//.test(ctx.rel(f)))
  // A full-screen overlay (fixed, top AND bottom, or inset-0) is a modal
  // backdrop, not a bar the orb could cover.
  const overlay = /\binset-0\b|\btop-(0|\d+)\b|modal|dialog|\bbackdrop\b(?!-)|overlay/i
  const hits = [
    ...grep(ctx, files, /\bfixed\b[^"'`]*\bbottom-(0|\d+|\[)|\bbottom-(0|\d+)\b[^"'`]*\bfixed\b/, { limit: 40 }).filter((h) => !overlay.test(h.text)),
    ...grep(ctx, files, /position\s*:\s*["']?fixed/, { window: 4, also: /\bbottom\s*:/, limit: 40 }).filter((h) => {
      const t = ctx.read(join(ctx.root, h.file)) ?? ""
      const win = t.split("\n").slice(Math.max(0, h.line - 6), h.line + 5).join("\n")
      return !/\btop\s*:\s*0|inset\s*:\s*0/.test(win) && !/modal|dialog|\bbackdrop\b(?![-_])|overlay/i.test(win)
    }),
  ].slice(0, 20)
  for (const h of hits.slice(0, 10)) ctx.ev("fixedBottom", { file: h.file, line: h.line, note: h.text })
  return hits
}

/* ---------------------------------- i18n ---------------------------------- */

const RTL = ["ar", "he", "fa", "ur", "yi", "ps", "ku", "dv", "iw"]

export function detectI18n(ctx) {
  const d = ctx.deps
  const lib = ["react-i18next", "i18next", "next-intl", "react-intl", "@lingui/react", "@lingui/core", "next-i18next", "typesafe-i18n"].find((k) => d[k])
  const localeCodes = new Set()
  const where = []
  // Includes the workspace packages the app is built from, where locales
  // often live.
  for (const f of [...ctx.allFiles, ...ctx.relatedFiles]) {
    const m = /\/(?:locales?|messages|translations|i18n|lang)\/(?:[^/]+\/)?([a-z]{2,3}(?:[-_][A-Za-z]{2,4})?)(?:\.json|\.ts|\.js|\.po|\/)/.exec(f)
    if (m && !/node_modules/.test(f)) {
      if (!localeCodes.has(m[1])) where.push(ctx.rel(f))
      localeCodes.add(m[1])
    }
  }
  const locales = [...localeCodes].sort()
  const rtl = locales.filter((c) => RTL.includes(c.split(/[-_]/)[0].toLowerCase()))
  if (lib) ctx.ev("i18n", { pkg: lib, note: `${locales.length} locales${rtl.length ? `, RTL: ${rtl.join(", ")}` : ""}` })
  else if (locales.length >= 2) ctx.ev("i18n", { file: where[0], note: `${locales.length} locale files, no i18n library (a custom loader)` })
  if (!lib && locales.length < 2) return null
  return { lib: lib ?? "custom", locales, count: locales.length, rtl, sample: where.slice(0, 3) }
}

/* --------------------------------- network -------------------------------- */

/**
 * THE SEAM THE ASSISTANT'S REQUESTS GO THROUGH. The layer makes no requests;
 * the host's API layer does, with the host's auth, so its client, wrapper,
 * auth conventions and any worker bridge are named for the handler to reuse.
 */
export function detectNetwork(ctx) {
  const d = ctx.deps
  const clients = [
    "axios",
    "ky",
    "ofetch",
    "@tanstack/react-query",
    "react-query",
    "swr",
    "@trpc/client",
    "@trpc/react-query",
    "@apollo/client",
    "urql",
    "graphql-request",
    "@rtk-query/codegen-openapi",
    "@reduxjs/toolkit",
  ].filter((k) => d[k])
  for (const c of clients) ctx.ev("network.clients", { pkg: c })
  const files = ctx.codeFiles.filter((f) => /\.[jt]sx?$/.test(f))

  // FETCH WRAPPERS, ranked by how many calls they make.
  const wrappers = []
  for (const f of files) {
    const rp = ctx.rel(f)
    if (OURS.test(rp) || !/(^|\/)(api|apis|services?|utils?|lib|http|client|network|fetch)(\/|\.)/i.test(rp)) continue
    const t = ctx.read(f) ?? ""
    const n = (t.match(/\bfetch\(|axios\.create\(|ky\.create\(|ofetch\.create\(/g) ?? []).length
    if (n) wrappers.push({ file: rp, calls: n })
  }
  wrappers.sort((a, b) => b.calls - a.calls)
  if (wrappers[0]) ctx.ev("network.wrapper", { file: wrappers[0].file, note: `${wrappers[0].calls} fetch/client calls` })

  // A SHARED HELPER inside those calls (`fetch(getApiPath(…))`) is the
  // convention, not any one service.
  const helperCounts = {}
  for (const w of wrappers) {
    const t = ctx.read(join(ctx.root, w.file)) ?? ""
    for (const m of t.matchAll(/\bfetch\(\s*([A-Za-z_]\w*)\(/g)) helperCounts[m[1]] = (helperCounts[m[1]] ?? 0) + 1
  }
  const [helperName, helperUses] = Object.entries(helperCounts).sort((a, b) => b[1] - a[1])[0] ?? []
  let helper = null
  if (helperName && helperUses >= 3) {
    const def = grep(ctx, files, new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${helperName}\\b`), { limit: 1 })[0]
    helper = { name: helperName, uses: helperUses, file: def?.file ?? null, line: def?.line ?? null }
    ctx.ev("network.helper", { file: def?.file, line: def?.line, note: `fetch(${helperName}(…)) in ${helperUses} call sites` })
  }
  const serviceDirs = {}
  for (const w of wrappers) {
    const d = w.file.split("/").slice(0, -1).join("/")
    serviceDirs[d] = (serviceDirs[d] ?? 0) + 1
  }
  const [serviceDir, serviceCount] = Object.entries(serviceDirs).sort((a, b) => b[1] - a[1])[0] ?? []

  // WORKER / IPC TRANSPORTS.
  const transports = []
  const ipc = grep(ctx, files, /\bipcRenderer\b|contextBridge\.exposeInMainWorld/, { limit: 3 })
  if (ipc.length) transports.push({ kind: "electron-ipc", at: ipc })
  const sendImports = grep(ctx, files, /import\s*\{[^}]*\bsend\b[^}]*\}\s*from\s*["'][^"']+["']/, { limit: 400 })
  if (sendImports.length >= 5) {
    const from = {}
    for (const h of sendImports) {
      const m = /from\s*["']([^"']+)["']/.exec(h.text)
      if (m) from[m[1]] = (from[m[1]] ?? 0) + 1
    }
    const [mod, count] = Object.entries(from).sort((a, b) => b[1] - a[1])[0] ?? []
    if (mod) {
      transports.push({ kind: "send-bridge", module: mod, importers: count, at: sendImports.slice(0, 3) })
      ctx.ev("network.transports", { file: sendImports[0].file, line: sendImports[0].line, note: `send() from ${mod} in ${count} files` })
    }
  }
  const worker = grep(ctx, files, /new\s+(?:Shared)?Worker\(/, { limit: 3 })
  if (worker.length) transports.push({ kind: "web-worker", at: worker })

  // AUTH HINTS in the wrapper modules (and anywhere, capped).
  const scope = wrappers.length
    ? [...wrappers.map((w) => join(ctx.root, w.file)), ...(helper?.file ? [join(ctx.root, helper.file)] : []), ...files.filter((f) => /csrf|auth|http|api(client)?\.[jt]sx?$/i.test(f))]
    : files
  const auth = {
    credentialsInclude: grep(ctx, scope, /credentials\s*:\s*["']include["']|withCredentials\s*:\s*true/, { limit: 3 }),
    csrf: grep(ctx, scope, /x-(?:csrf|xsrf)-token|csrf/i, { limit: 3 }),
    bearer: grep(ctx, scope, /Authorization["']?\s*[:,]\s*[`"']Bearer|["']Authorization["']/, { limit: 3 }),
    on401: grep(ctx, scope, /status\s*===?\s*401|\b401\b/, { limit: 3 }),
  }
  const base = grep(ctx, scope, /["'`](\/api)(\/|["'`])/, { limit: 3 })
  const basePath = base.length ? "/api" : null
  for (const [k, v] of Object.entries(auth)) if (v[0]) ctx.ev(`network.auth.${k}`, { file: v[0].file, line: v[0].line, note: v[0].text })
  return {
    clients,
    wrapper: helper?.file ?? wrappers[0]?.file ?? null,
    wrappers: wrappers.slice(0, 5),
    helper,
    serviceDir: serviceCount >= 3 ? { dir: serviceDir, modules: serviceCount } : null,
    transports,
    auth: {
      credentialsInclude: auth.credentialsInclude[0] ?? null,
      csrf: auth.csrf[0] ?? null,
      bearer: auth.bearer[0] ?? null,
      on401: auth.on401[0] ?? null,
      basePath,
    },
  }
}

/* ----------------------------------- AI ----------------------------------- */

export function detectAi(ctx) {
  const d = Object.keys(ctx.deps)
  const sdk = d.filter((k) => k === "ai" || k.startsWith("@ai-sdk/") || k === "@assistant-ui/react" || k.startsWith("@copilotkit/"))
  const provider = d.filter((k) => ["openai", "@anthropic-ai/sdk", "langchain", "@google/generative-ai", "@google/genai", "@mistralai/mistralai", "groq-sdk", "ollama"].includes(k) || k.startsWith("@langchain/"))
  for (const k of [...sdk, ...provider]) ctx.ev("ai", { pkg: k })
  const envNames = new Set()
  const envFiles = [".env", ".env.example", ".env.local", ".env.development", ".env.sample"].flatMap((f) => [join(ctx.app.abs, f), join(ctx.root, f)])
  for (const f of envFiles) {
    const t = readText(f)
    if (!t) continue
    for (const m of t.matchAll(/^\s*([A-Z0-9_]*(?:LLM|OPENAI|ANTHROPIC|GEMINI|MISTRAL|GROQ|AI)_[A-Z0-9_]*(?:KEY|URL|MODEL|BACKEND|ENDPOINT|HOST))\s*=/gm)) {
      envNames.add(m[1])
      ctx.ev("ai.env", { file: f, note: m[1] })
    }
  }
  const files = ctx.codeFiles.filter((f) => /\.[jt]sx?$/.test(f))
  const routes = grep(ctx, files, /["'`](?:\/api)?\/(?:ai|chat|assistant|llm|completions?)(?:\/[\w-]*)?["'`]/, { limit: 5 })
  for (const r of routes) ctx.ev("ai.routes", { file: r.file, line: r.line, note: r.text })
  const kind = sdk.length ? "sdk-streaming" : provider.length ? "provider-sdk" : routes.length || envNames.size ? "http-endpoint" : "none"
  return { kind, sdk, provider, envNames: [...envNames], routes }
}

/* ---------------------------- existing install ---------------------------- */

/**
 * AN EARLIER INSTALL. The survey then describes the host plus the layer, and
 * the owner should know that before trusting the plan.
 */
export function detectExistingInstall(ctx) {
  const hits = []
  for (const d of [join(ctx.srcRootAbs, "components/ambient"), join(ctx.app.abs, "components/ambient"), join(ctx.app.abs, "src/components/ambient")]) {
    if (isDir(d) && !hits.includes(ctx.rel(d))) hits.push(ctx.rel(d))
  }
  const manifest = readJson(join(ctx.root, ".ambientui/manifest.json"))
  for (const f of ctx.cssFiles) if (/(^|\/)styles\/ambient\.css$/.test(ctx.rel(f))) hits.push(ctx.rel(f))
  if (hits.length) ctx.ev("existingInstall", { note: hits.join(", ") })
  return { present: hits.length > 0 || Boolean(manifest), paths: [...new Set(hits)], manifest: Boolean(manifest) }
}

