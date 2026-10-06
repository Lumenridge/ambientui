/**
 * EVERY FACT SAYS WHERE IT CAME FROM, AND HOW SURE IT IS, so a guess is never
 * stated in the same voice as a fact.
 *
 *   EVIDENCE. Absence is a claim too: when a detector finds nothing, what was
 *   searched is recorded.
 *
 *   CONFIDENCE. `high` = read from a declaration; `medium` = a strong
 *   convention; `low` = a heuristic that can be wrong on an ordinary project.
 *   Low facts are printed with the reason so the agent checks them.
 */

/** The evidence keys each printed fact draws on (first hit is shown). */
export const FACT_EVIDENCE = {
  app: ["repo.appDir", "repo.monorepo"],
  packageManager: ["packageManager"],
  git: ["git"],
  framework: ["framework", "framework.router"],
  react: ["react"],
  typescript: ["typescript"],
  moduleType: ["moduleType"],
  jest: ["jest"],
  tailwind: ["styling.tailwind"],
  cssEntry: ["styling.cssEntry"],
  tokens: ["tokens"],
  shadcn: ["shadcn.componentsJson", "shadcn.button"],
  srcRoot: ["aliases.tsconfig", "srcRoot"],
  aliases: ["aliases.tsconfig", "aliases.bundler", "aliases.test"],
  env: ["env.prefix", "env.definePlugin", "env.default"],
  staticDir: ["staticDir"],
  bundle: ["bundle.precacheLimit", "bundle.pwa", "bundle.coep", "bundle"],
  componentLibrary: ["componentLibrary"],
  icons: ["icons"],
  naming: ["naming"],
  darkMode: ["darkMode"],
  hotkeys: ["hotkeys"],
  zIndex: ["zIndex.max", "zIndex.modal", "zIndex"],
  fixedBottom: ["fixedBottom"],
  i18n: ["i18n"],
  network: ["network.helper", "network.transports", "network.wrapper", "network.clients", "network"],
  ai: ["ai", "ai.stack", "ai.env", "ai.routes"],
  tests: ["tests", "tests.vrt"],
  lint: ["lint.eslint", "lint.oxlint", "lint.biome", "lint.prettier", "lint.oxfmt", "lint"],
  agent: ["agent.claudeMd", "agent.agentsMd", "agent.designMd", "agent"],
  product: ["product.name"],
  scripts: ["scripts.build", "scripts.dev", "scripts.test", "scripts.port", "scripts"],
  entry: ["entry.providers", "entry"],
  existingInstall: ["existingInstall"],
}

/** "file:line", "pkg", or the note — the shortest honest pointer. */
export function formatEvidence(e) {
  if (!e) return null
  if (e.file) return `${e.file}${e.line ? `:${e.line}` : ""}`
  if (e.pkg) return e.pkg
  return e.note ?? null
}

export function evidenceFor(profile, fact) {
  for (const k of FACT_EVIDENCE[fact] ?? [fact]) {
    const list = profile.evidence?.[k]
    if (list?.length) return list[0]
  }
  return null
}

/**
 * Fill in absence evidence and grade confidence. Mutates and returns the
 * profile; `ctx` supplies the evidence recorder.
 */
export function annotate(p, ctx) {
  // Absence is recorded only when no evidence exists for the fact under any
  // of its keys (an AI env name is evidence for "ai" too).
  const none = (key, note) => {
    if (!evidenceFor(p, key)) ctx.ev(key, { note })
  }
  const conf = {}
  const grade = (fact, level, reason) => (conf[fact] = { level, reason })

  // ---- absence evidence: what was searched when nothing was found ----
  none("packageManager", `no lockfile or packageManager field; ${p.packageManager.name} by default${p.packageManager.onPath ? "" : " (not on PATH)"}`)
  none("git", p.git.isRepo ? `git status: ${p.git.clean ? "clean" : `${p.git.dirtyCount} changed path(s)`} on ${p.git.branch ?? "detached HEAD"}` : "`git rev-parse --show-toplevel` failed")
  none("repo.appDir", "no package with react + a bundler config; using the surveyed directory")
  if (!p.react) none("react", "no react in the app's or root's dependencies")
  if (!p.jest.present) none("jest", "no jest config, package.json#jest or jest dependency")
  if (!p.styling.tailwind) none("styling.tailwind", "no tailwindcss in the app/root package.json or node_modules")
  none("styling.cssEntry", p.styling.entry ? `imported by ${p.entry.file}` : `no CSS with @import "tailwindcss" / @tailwind, and none imported by ${p.entry.file ?? "the entry"}`)
  none("tokens", `no --background/--popover/… declarations in ${p.tokens.files?.join(", ") || "the global CSS"} (or its direct @imports)`)
  none("shadcn.componentsJson", "no components.json in the app dir or root")
  none("srcRoot", p.aliases.atResolves ? "@/* in tsconfig paths" : `no @/* alias; ${p.srcRoot === "src" ? "src/ exists" : p.srcRoot === "." ? "no src/, using the app dir" : "the entry file's directory"}`)
  none("env.default", `${p.framework.name} convention: ${p.env.allowedPrefix ?? "(no prefix)"}${p.env.prefix !== p.env.allowedPrefix ? `; house prefix ${p.env.prefix} from ${p.env.usedNames.length} env names in code` : ""}`)
  none("staticDir", `${p.framework.name} default`)
  none("bundle", "no PWA plugin, precache limit or COEP header in the bundler config, vercel.json, public/_headers or netlify.toml")
  none("componentLibrary", "no radix/base-ui/mui/chakra/mantine/antd/headlessui/react-aria dependency")
  none("icons", "no lucide/tabler/phosphor/remix/hugeicons/heroicons/react-icons dependency")
  none("darkMode", "no .dark toggle, next-themes, data-theme, theme--dark, useTheme hook or prefers-color-scheme in code/CSS")
  none("hotkeys", "no cmdk/kbar dependency, no mod+k hotkey binding, no metaKey/ctrlKey handler near 'k'")
  none("zIndex", "no z-index / zIndex / z-[n] / z-50 values outside components/ui")
  none("fixedBottom", "no fixed + bottom positioning outside components/ui and modal overlays")
  none("i18n", "no i18next/next-intl/react-intl/lingui dependency and fewer than two locale files")
  none("network", "no HTTP client dependency, fetch wrapper module, worker or IPC bridge")
  none("ai", "no AI SDK or provider dependency, no AI env names in .env*, no /ai or /chat routes")
  none("tests", "no vitest/jest/playwright/cypress dependency")
  none("lint", "no eslint/oxlint/biome/prettier config or dependency")
  none("agent", "no CLAUDE.md, AGENTS.md or DESIGN.md at the root")
  none("scripts", `no build/dev/test scripts in ${p.repo.appDirFromRoot === "." ? "package.json" : `${p.repo.appDirFromRoot}/package.json`}`)
  none("entry", "no entry file found (index.html module script, webpack entry, root layout, src/main.tsx)")
  none("existingInstall", "no components/ambient, styles/ambient.css or .ambientui/manifest.json")
  none("product.name", "no <title>, manifest name, productName or package name")
  none("moduleType", "package.json has no \"type\"")
  none("naming", "no component files")

  // ---- confidence ----
  const c = p.repo.appCandidates
  if (!c.length) grade("app", "low", "no package has react + a bundler config; surveyed the directory given")
  else if (c.length > 1 && c[1].uiFiles > c[0].uiFiles * 0.6 && !/examples?|docs?/.test(c[1].dir)) grade("app", "low", `${c[1].dir} has nearly as many UI files (${c[1].uiFiles} vs ${c[0].uiFiles}); pass --cwd to choose`)
  else grade("app", "high", `react + ${c[0].framework} config`)

  grade("packageManager", p.packageManager.lockfile ? "high" : "medium", p.packageManager.lockfile ? `lockfile ${p.packageManager.lockfile}` : "no lockfile; defaulted")
  const tw = p.styling.tailwind
  if (tw) grade("tailwind", tw.source === "installed" ? "high" : "medium", tw.source === "installed" ? "node_modules" : `declared range ${tw.declared} (no node_modules): the floor of the range`)
  if (p.react) grade("react", p.react.source === "installed" ? "high" : "medium", p.react.source === "installed" ? "node_modules" : "declared range (no node_modules)")

  if (!p.styling.entry) grade("cssEntry", "low", "no global stylesheet identified")
  else if (p.styling.directive) grade("cssEntry", p.styling.tailwindCssFiles.length > 1 ? "medium" : "high", p.styling.tailwindCssFiles.length > 1 ? `${p.styling.tailwindCssFiles.length} files load Tailwind: ${p.styling.tailwindCssFiles.join(", ")}` : "the file that loads Tailwind")
  else grade("cssEntry", "medium", "no Tailwind directive; the stylesheet the entry imports first")

  const t = p.tokens
  if (t.format === "none") grade("tokens", t.present.length ? "low" : "high", t.present.length ? "some roles declared, none classifiable" : "no role declarations found")
  else if (t.missing.length > 6) grade("tokens", "medium", `only ${t.present.length} of 18 roles declared`)
  else grade("tokens", "high", `${t.present.length} roles, --popover: ${t.sample?.value}`)

  if (p.aliases.atResolves) grade("srcRoot", "high", "@/* in tsconfig paths")
  else if (p.srcRoot === ".") grade("srcRoot", "low", "no @/ alias and no src/; the app dir itself")
  else grade("srcRoot", "medium", p.srcRoot === "src" ? "no @/ alias; src/ exists" : "no @/ alias; the entry file's directory")

  if (p.framework.name === "webpack") grade("env", p.env.definePluginKeys?.length ? "medium" : "low", p.env.definePluginKeys?.length ? `DefinePlugin keys: ${p.env.definePluginKeys.join(", ")}` : "no DefinePlugin found: the flag must be defined by hand")
  else if (p.evidence["env.prefix"]) grade("env", "high", "envPrefix in the bundler config")
  else grade("env", p.env.prefix !== p.env.allowedPrefix ? "medium" : "high", p.env.prefix !== p.env.allowedPrefix ? `house prefix ${p.env.prefix} inferred from env names in code` : `${p.framework.name} convention`)

  // Competing MECHANISMS lower confidence; a Tailwind darkMode key or a
  // prefers-color-scheme fallback beside one of them is corroboration.
  const kinds = new Set(p.darkMode.signals.map((s) => s.kind).filter((k) => !["tailwind-config", "media", "next-themes"].includes(k)))
  if (p.darkMode.mechanism === "none") grade("darkMode", "medium", "no dark-mode signal found")
  else if (kinds.size > 1) grade("darkMode", "low", `competing signals: ${[...kinds].join(", ")} — check which one the product actually toggles`)
  else if (p.darkMode.mechanism === "media" || p.darkMode.mechanism === "js-state") grade("darkMode", "low", `${p.darkMode.mechanism}: the theme may be chosen in JS; confirm how the product switches`)
  else grade("darkMode", "medium", p.darkMode.signal?.note ?? p.darkMode.mechanism)

  const hk = p.hotkeys
  if (!hk.conflict) grade("hotkeys", "medium", "static search only; verify presses the key for real")
  else if (hk.owners.some((o) => o.kind === "dependency" || o.kind === "hotkey-lib")) grade("hotkeys", "high", "a palette library or explicit mod+k binding")
  else grade("hotkeys", "medium", "a key handler where a modifier and k meet; read it to confirm it is ⌘K")

  const z = p.zIndex
  if (z.max == null) grade("zIndex", "high", "no z-index values")
  else if (z.modal == null) grade("zIndex", "medium", "the max over all values; no modal layer identified")
  else if (z.modalNamed) grade("zIndex", "high", "the product's own named scale gives the modal layer")
  else grade("zIndex", "low", "the modal layer is guessed from nearby words (modal/dialog/overlay…); check it before trusting the cap")

  grade("fixedBottom", p.fixedBottom.length ? "low" : "medium", "static class/style search; verify measures the real overlap at 375px")
  if (p.network.transports.some((x) => x.kind === "send-bridge" || x.kind === "electron-ipc")) grade("network", "high", "a send()/IPC bridge imported across the app")
  else if (p.network.helper) grade("network", "medium", `fetch(${p.network.helper.name}(…)) at ${p.network.helper.uses} call sites`)
  else if (p.network.wrapper) grade("network", "low", `the module with the most fetch calls (${p.network.wrapper}); may be one feature's client, not the app's`)
  else grade("network", p.network.clients.length ? "medium" : "high", p.network.clients.length ? "client dependency, no wrapper module found" : "nothing found")

  grade("ai", p.ai.kind === "none" ? "medium" : p.ai.kind === "http-endpoint" ? "low" : "high", p.ai.kind === "http-endpoint" ? "inferred from env names or route strings only" : p.ai.kind === "none" ? "no SDK, provider, env or route found" : "dependency")
  const pn = p.product.candidates[0]
  const pick = p.evidence["product.name"]?.[0]?.note ?? ""
  grade("product", /^(title|manifest|productName)/.test(pick) ? "medium" : "low", /^(title|manifest|productName)/.test(pick) ? pick : `from the package name${pn ? ` (${pn.value})` : ""}; check the product's title or manifest`)
  grade("entry", p.entry.file ? (p.evidence["entry"]?.some((e) => e.note) ? "high" : "medium") : "low", p.entry.file ? "from the bundler's entry declaration or a conventional path" : "not found")
  grade("naming", p.naming.pascal + p.naming.kebab < 10 ? "low" : "high", `${p.naming.pascal} PascalCase vs ${p.naming.kebab} kebab-case files`)
  grade("staticDir", p.evidence.staticDir?.[0]?.file ? "high" : "medium", p.evidence.staticDir?.[0]?.file ? "publicDir in the bundler config" : "framework default")

  p.confidence = conf
  return p
}
