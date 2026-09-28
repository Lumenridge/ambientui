/**
 * THE ADAPTER — `profile + answers → plan`, and nothing else.
 *
 * WHY A PURE FUNCTION. Five real installs taught one lesson: the agent's
 * mistakes were never in running commands, they were in DECIDING — which
 * door, which CSS line where, which env prefix, whether the alias exists in
 * the test runner. Every decision now lives here, as data in and data out,
 * with no file reads, no environment, no clock. That makes each decision
 * unit-testable against a hand-written profile, reproducible from the
 * committed profile.json, and reviewable in one file when a new host breaks
 * a rule. The commands (doctor, plan) do the I/O around it.
 *
 * PATHS. `appDir` is relative to the git root (it is where the commands
 * run). Every other path in the plan is relative to the project root — the
 * directory doctor surveyed — unless it says otherwise.
 */
import { adaptationsFor } from "./adapt.mjs"
import { posix } from "node:path"

export const DEFAULT_REGISTRY = "https://registry.ambientui.ai"

const join = (...p) => posix.normalize(posix.join(...p)).replace(/^\.\//, "")
const relTo = (fromDir, to) => {
  const r = posix.relative(fromDir || ".", to)
  return r.startsWith(".") ? r : `./${r}`
}
const dirOf = (p) => (p ? posix.dirname(p) : ".")

/* ------------------------------- the choices ------------------------------ */

/** Tailwind as the plan sees it: 3, 4, or null (none). */
export function tailwindMajor(profile) {
  const m = profile.styling?.tailwind?.major
  return m == null ? null : m >= 4 ? 4 : m
}

/** An existing product has screens; an almost-empty repo is "from scratch". */
export const isExistingProduct = (profile) => (profile.repo?.appCandidates?.[0]?.uiFiles ?? 0) >= 5

/**
 * THE HARD STOPS. Things no answer can route around: the layer needs React
 * 18+, and install/uninstall ARE git commits.
 */
export function blockers(profile, answers = {}) {
  const out = []
  if (!profile.react) {
    out.push({ id: "no-react", message: "No React found in the app package (or anywhere in the workspace).", fix: "ambientui is a React layer; point --cwd at the React app." })
  } else if (profile.react.major < 18) {
    out.push({ id: "react-too-old", message: `React ${profile.react.version} — the layer needs React 18 or newer.`, fix: "Upgrade React to 18+ first, as its own change." })
  }
  if (!profile.git?.isRepo) {
    out.push({ id: "not-git", message: "Not a git repository.", fix: "run `git init` and commit first (install and uninstall are git commits)" })
  }
  if (tailwindMajor(profile) === 3 && answers.path === "full") {
    out.push({ id: "full-on-tw3", message: "The full design architecture needs Tailwind v4; this project is on Tailwind v3.", fix: "Use `--path layer` (the ambient layer only). Upgrading Tailwind is a separate project that rewrites existing screens." })
  }
  return out
}

/**
 * THE QUESTIONS FOR THE OWNER — only those that apply, each with a default
 * so the plan is complete before anyone answers. `infos` are the lines that
 * replace a question when the answer is forced.
 */
export function questions(profile, answers = {}) {
  const qs = []
  const infos = []
  const tw = tailwindMajor(profile)
  const existing = isExistingProduct(profile)

  if (tw === 3) {
    infos.push({
      id: "path",
      message:
        "Tailwind v3: the path is the ambient layer only. The design architecture needs v4, and upgrading rewrites the product's existing screens.",
    })
  } else if (existing) {
    qs.push({
      id: "path",
      prompt:
        "The ambient layer only — the assistant living above your existing screens, which stay exactly as they are — or the full design architecture, where the Foundation also governs your tokens, spacing, radius and motion?",
      options: [
        { value: "layer", label: "ambient layer only" },
        { value: "full", label: "full design architecture" },
      ],
      default: "layer",
      why: "The full path restyles existing components that consume its tokens; the layer path changes nothing on the product's own screens.",
    })
  }

  const hk = profile.hotkeys
  if (hk?.conflict) {
    const at = hk.owners
      .filter((o) => o.file && o.line)
      .slice(0, 3)
      .map((o) => `${o.file}:${o.line}`)
    const dep = hk.owners.find((o) => o.kind === "dependency")
    qs.push({
      id: "hotkey",
      prompt: `This product already uses ⌘K / Ctrl+K${dep ? ` (${dep.name})` : ""}${at.length ? ` at ${at.join(", ")}` : ""}. How should the assistant share it?`,
      options: [
        { value: "takeover", label: "the assistant owns ⌘K; the existing palette's features are re-registered as commands" },
        { value: "coexist", label: "the assistant uses ⌘J (or another free combo); the existing ⌘K stays" },
        { value: "yield", label: "the assistant owns ⌘K except when the product's own binding applies (a yieldHotkey function)" },
        { value: "off", label: "no hotkey; the orb only" },
      ],
      default: "coexist",
      why: "Two owners of one chord means both open at once, or one never opens — and the owner decides which is theirs.",
    })
  }

  const path = resolvePath(profile, answers)
  if (path === "full") {
    const hasDesign = Boolean(profile.agent?.designMd)
    qs.push({
      id: "look",
      prompt: "Keep the product's current look, or give a reference (a screenshot, a link, a few words) for the Foundation to express?",
      options: [
        { value: "current", label: "keep the product's current look" },
        { value: "reference", label: "give a reference" },
      ],
      default: hasDesign ? "current" : "reference",
      why: hasDesign ? "A DESIGN.md already states this product's look." : "The Foundation is configured from a reference; without one it starts from defaults.",
    })
  }

  if (profile.agent?.claudeMd || profile.agent?.agentsMd) {
    const existingFile = profile.agent.claudeMd ? "CLAUDE.md" : "AGENTS.md"
    qs.push({
      id: "governance",
      prompt: `Install ambientui's working rules as .claude/ambientui/CLAUDE.md and add one pointer line to your ${existingFile}?`,
      options: [
        { value: "yes", label: `install, plus one line in ${existingFile}` },
        { value: "no", label: "skip the rules" },
      ],
      default: "yes",
      why: `Your ${existingFile} stays yours; the rules live beside it and one line points at them.`,
    })
  }

  const dm = profile.darkMode
  if (dm && dm.mechanism !== "html-class") {
    const sig = dm.signal ? `${dm.signal.note}${dm.signal.file ? ` (${dm.signal.file}:${dm.signal.line})` : ""}` : "no dark mode found"
    qs.push({
      id: "theme",
      informational: true,
      prompt: `Dark mode here is ${dm.mechanism === "none" ? "absent" : `a ${dm.mechanism}`}: ${sig}. Mirror the product's theme with the \`dark\` prop?`,
      options: [
        { value: "mirror", label: "mirror the product's theme with the `dark` prop" },
        { value: "light", label: "always light" },
      ],
      default: "mirror",
      why: "The layer follows `.dark` on <html> by itself; any other signal must be passed in, or the glass stays light on a dark screen.",
    })
  }
  return { questions: qs, infos }
}

function resolvePath(profile, answers) {
  const tw = tailwindMajor(profile)
  if (tw === 3) return "layer"
  if (answers.path === "full" || answers.path === "layer") return answers.path
  return isExistingProduct(profile) ? "layer" : "full"
}

/** Answers with every applicable default filled in. */
export function resolveAnswers(profile, answers = {}) {
  const { questions: qs } = questions(profile, answers)
  const out = { path: resolvePath(profile, answers) }
  for (const q of qs) {
    if (q.id === "path") continue
    out[q.id] = answers[q.id] ?? q.default
  }
  return out
}

/* --------------------------------- pieces --------------------------------- */

/**
 * A TAILWIND v4 HOST WITHOUT THE GLOBAL RESET — it imports only
 * `tailwindcss/theme.css` + `utilities.css` (Excalidraw's shape after the
 * layer went in, fixtures/consumer-bare). It is treated like a host with no
 * Tailwind: the layer brings its own scoped preflight.
 */
export const isScopedV4 = (profile) =>
  tailwindMajor(profile) === 4 && profile.styling?.directive?.kind !== "v4-import" && !profile.styling?.preflight

function doorsFor(profile, a, reqs, warnings) {
  const tw = tailwindMajor(profile)
  const tokens = profile.tokens?.format ?? "none"
  const missing = profile.tokens?.missing ?? []
  const doors = ["start"]
  if (a.path === "full") {
    doors.push("foundation", "ambient-layer", "foundation-ambient-bridge")
  } else if (tw === 3) {
    // The v3 door reads roles as HSL triplets; a v3 host with none gets the
    // standard roles in that format, at zero specificity.
    if (tokens === "none") doors.push("ambient-tokens-hsl")
    doors.push("ambient-layer-tw3")
  } else if (tw === 4 && !isScopedV4(profile)) {
    if (tokens === "none" || (tokens === "color" && missing.length)) doors.push("ambient-tokens")
    doors.push("ambient-layer")
    if (tokens === "hsl-triplet") doors.push("ambient-styles-hsl")
  } else {
    // No Tailwind, or v4 without its reset: ambient-base brings the scoped
    // preflight, cn, and the standard roles (via ambient-tokens).
    doors.push("ambient-base", "ambient-layer")
    if (tokens === "hsl-triplet") doors.push("ambient-styles-hsl")
  }
  if (tokens === "hsl-triplet" && missing.length) {
    warnings.push(`The HSL-triplet token block lacks ${missing.join(", ")}; add them in the same triplet format, or those parts of the glass render transparent.`)
  }
  // ONE ICON LIBRARY on the layer-only path: the full `icon` item brings
  // five, and Remix alone put ~600 KB in Excalidraw's main chunk. The
  // Foundation switches libraries live, so the full path keeps all five.
  if (a.path !== "full") doors.push(`icon-${iconLibraryFor(profile)}`)
  if (a.governance === "yes" || (a.path === "full" && a.governance === undefined)) doors.push("governance")
  return doors
}

/** The registry's icon libraries, by the survey's ids. */
const REGISTRY_ICON = { lucide: "lucide", tabler: "tabler", phosphor: "phosphor", remixicon: "remix", hugeicons: "hugeicons" }
const ICON_PACKAGES = {
  lucide: ["lucide-react"],
  tabler: ["@tabler/icons-react"],
  phosphor: ["@phosphor-icons/react"],
  remix: ["@remixicon/react"],
}

/**
 * The product's own library if the registry has it, else HugeIcons (the
 * layer draws a few marks with it anyway). lucide before 0.300 lacks the
 * names icon.tsx uses (CircleAlert, House), so it falls back too.
 */
export function iconLibraryFor(profile) {
  for (const i of profile.icons ?? []) {
    const lib = REGISTRY_ICON[i.id]
    if (!lib) continue
    if (lib === "lucide" && i.legacyNames) continue
    return lib
  }
  return "hugeicons"
}

/**
 * Icon packages the layer's `icon` dependency brought that nothing uses:
 * not the product's own, not the one icon-<lib> draws with, and not
 * shadcn's. The shadcn primitives the layer composes (sheet, sidebar)
 * import their icon library directly — lucide by default — so removing it
 * broke the build (found running the pipeline end to end, 2026-09-28).
 */
export function unusedIconPackages(profile, lib) {
  const had = new Set((profile.icons ?? []).map((i) => i.pkg))
  const shadcns = REGISTRY_ICON[profile.shadcn?.iconLibrary ?? "lucide"] ?? "lucide"
  return Object.entries(ICON_PACKAGES)
    .filter(([name]) => name !== lib && name !== shadcns)
    .flatMap(([, pkgs]) => pkgs)
    .filter((pkg) => !had.has(pkg))
}

function cssFor(profile, a, srcRootFromApp, doors = []) {
  const tw = tailwindMajor(profile)
  // Every path here is relative to the project root, like the profile's.
  const srcRoot = join(profile.repo?.appDirFromRoot ?? ".", srcRootFromApp)
  const entryCss = profile.styling?.entry ?? null
  const entryFile = profile.entry?.file ?? null
  const ambientCss = join(srcRoot, "styles/ambient.css")
  // The token stylesheet a door ships, imported before the material.
  const tokensCss = doors.includes("ambient-tokens-hsl")
    ? join(srcRoot, "styles/ambient-tokens-hsl.css")
    : doors.includes("ambient-tokens") || doors.includes("ambient-base")
      ? join(srcRoot, "styles/ambient-tokens.css")
      : null
  if (tw === 3) {
    const from = dirOf(entryFile ?? join(srcRoot, "main.tsx"))
    return {
      mode: "v3-entry-import",
      entry: entryCss,
      entryFile,
      lines: [tokensCss && `import "${relTo(from, tokensCss)}"`, `import "${relTo(from, ambientCss)}"`].filter(Boolean),
      where: `in ${entryFile ?? "the app entry file"}, on the line right after the global stylesheet import (${entryCss ?? "the file with @tailwind base"})`,
      why: "An @import after the @tailwind directives is dropped by Vite with only a warning; before them, utilities override the layer. The entry-file import lands after both.",
    }
  }
  if (tw === 4 && !isScopedV4(profile)) {
    const from = dirOf(entryCss ?? join(srcRoot, "index.css"))
    const rel = relTo(from, ambientCss)
    if (a.path === "full") {
      return {
        mode: "v4-import",
        entry: entryCss,
        lines: ['@import "tailwindcss" theme(static);', `@import "${relTo(from, join(srcRoot, "styles/foundation.css"))}";`, `@import "${rel}";`],
        where: `in ${entryCss}: replace the existing \`@import "tailwindcss";\` with the first line, the other two right after it`,
        why: "theme(static) keeps every Tailwind variable emitted so the Foundation bridge can route through them.",
      }
    }
    return {
      mode: "v4-import",
      entry: entryCss,
      lines: [tokensCss && `@import "${relTo(from, tokensCss)}";`, `@import "${rel}";`].filter(Boolean),
      where: `in ${entryCss}, right after \`@import "tailwindcss";\``,
      why: "The layer's material must load after Tailwind so its layers order correctly.",
    }
  }
  // SCOPED: Tailwind v4 without its global preflight, so the product's own
  // screens are untouched; the layer's preflight is scoped to its root.
  const existing = isScopedV4(profile) && entryCss
  const file = existing ? entryCss : join(srcRoot, "ambient-root.css")
  const from = dirOf(file)
  const tail = [
    `@import "${relTo(from, join(srcRoot, "styles/ambient-preflight.css"))}" layer(base);`,
    tokensCss && `@import "${relTo(from, tokensCss)}";`,
    `@import "${relTo(from, ambientCss)}";`,
  ].filter(Boolean)
  const fromEntry = entryFile ? relTo(dirOf(entryFile), file) : "./ambient-root.css"
  return {
    mode: "scoped",
    entry: file,
    create: !existing,
    entryFile,
    lines: existing
      ? tail
      : ["@layer theme, base, components, utilities;", '@import "tailwindcss/theme.css" layer(theme);', '@import "tailwindcss/utilities.css" layer(utilities);', ...tail],
    entryImport: existing ? null : `import "${fromEntry}"`,
    where: existing
      ? `in ${file}, after its tailwindcss/theme.css and utilities imports`
      : `create ${file} with these lines, and import it from ${entryFile ?? "the app entry file"}`,
    why: 'A global `@import "tailwindcss"` brings preflight, which restyles every screen of a product that never had it. The scoped form gives the layer its reset and nobody else.',
  }
}

function aliasEditsFor(profile, srcRoot) {
  const al = profile.aliases ?? {}
  const edits = []
  const appDir = profile.repo?.appDirFromRoot ?? "."
  const srcFromRoot = join(appDir, srcRoot)
  for (const t of al.tsconfigs ?? []) {
    if (t.hasAt || t.node) continue
    const target = relTo(dirOf(t.file), srcFromRoot).replace(/\/$/, "")
    edits.push({
      where: "tsconfig",
      file: t.file,
      snippet: `"compilerOptions": { "paths": { "@/*": ["${target === "./." ? "./" : target + "/"}*"] } }`,
      why: "The shadcn CLI resolves `@/` through tsconfig paths — every tsconfig it may read, the root one included.",
    })
  }
  const b = al.bundler
  if (b && !b.hasAt && b.kind !== "next") {
    const target = relTo(dirOf(b.file ?? "."), srcFromRoot)
    let snippet = null
    if (b.kind === "vite" || b.kind === "react-router" || b.kind === "remix") {
      snippet = `resolve: { alias: { "@": path.resolve(__dirname, "${target}") } }  // or, if alias is an array: { find: /^@\\/(.*)$/, replacement: path.resolve(__dirname, "${target}/$1") }`
    } else if (b.kind === "webpack") {
      snippet = `resolve: { alias: { "@": path.resolve(__dirname, "${target}") } }`
    } else if (b.kind === "cra") {
      snippet = "CRA cannot alias without craco: add @craco/craco with webpack.alias { '@': path.resolve(__dirname, 'src') }"
    }
    edits.push({ where: "bundler", file: b.file, snippet, why: "The browser build resolves `@/` through the bundler, not tsconfig." })
  }
  const t = al.test
  // A test runner reading the bundler's own config is fixed by that edit.
  if (t && !t.hasAt && !(b && t.file === b.file)) {
    const snippet =
      t.kind === "jest"
        ? `moduleNameMapper: { "^@/(.*)$": "<rootDir>/${join(relTo(dirOf(t.file ?? "."), srcFromRoot), "$1").replace(/^\.\//, "")}" }`
        : `resolve: { alias: { "@": path.resolve(__dirname, "${relTo(dirOf(t.file ?? "."), srcFromRoot)}") } }`
    edits.push({ where: "test", file: t.file, snippet, why: "Tests that render the layer resolve `@/` through the runner's own mapping." })
  }
  if (al.forbidsAt?.length) {
    const f = al.forbidsAt[0]
    edits.push({
      where: "lint",
      file: f.file,
      line: f.line,
      snippet: null,
      note: "This project forbids `@/` imports in app code. Host code you write keeps the project's own convention (e.g. `#components/…` subpath imports); the vendored layer keeps `@/` internally, so the alias must still resolve — exclude the layer's folder from that rule.",
    })
  }
  return edits
}

function providerFor(profile, a) {
  const p = { productName: profile.product?.name ?? "this product" }
  const hk = a.hotkey
  if (!profile.hotkeys?.conflict || hk === "takeover" || hk === "yield") p.hotkey = "mod+k"
  else if (hk === "coexist") p.hotkey = "mod+j"
  else if (hk === "off") p.hotkey = false
  else p.hotkey = "mod+k"
  if (hk === "yield") p.yieldHotkey = "write (event) => boolean: true when the product's own mod+k should win (see hotkeys evidence)"

  const z = profile.zIndex
  if (z?.max != null && z.max >= 50) {
    let zi = z.max + 1
    if (z.modal != null && z.modal > 50) zi = Math.min(zi, z.modal - 1)
    p.zIndex = Math.min(zi, 2147483646)
  }
  const dm = profile.darkMode
  if (!dm || dm.mechanism === "html-class") p.dark = "html-class"
  else if (a.theme === "light") p.dark = false
  else
    p.dark = {
      mirror: dm.mechanism,
      signal: dm.signal ? `${dm.signal.note}${dm.signal.file ? ` @ ${dm.signal.file}:${dm.signal.line}` : ""}` : null,
      instruction: "pass dark={isDark} to <AssistantProvider>, computed from the product's own theme state",
    }
  if (profile.fixedBottom?.length) p.defaultOrbAnchor = "mr"
  if (profile.i18n) p.messages = "the product's translations of the layer's strings (see i18n)"
  return p
}

function mountFor(profile, srcRoot) {
  const fw = profile.framework?.name
  const lazy = Boolean(profile.bundle?.precacheLimit || profile.bundle?.pwa)
  const m = {
    file: profile.entry?.rootComponent ?? profile.entry?.file ?? null,
    lazy,
  }
  if (fw === "next" && profile.framework.router === "app") {
    m.note = /layout\.[jt]sx$/.test(m.file ?? "")
      ? "The root layout is a server component: mount inside a \"use client\" providers component it renders, not in layout.tsx itself."
      : `The layout is a server component; ${m.file} is the "use client" providers component it renders — mount there.`
  }
  if (lazy) {
    m.snippet =
      'const Assistant = React.lazy(() => import("@/components/ambient/assistant").then(m => ({ default: m.Assistant })))'
    m.note = [m.note, `Import AssistantProvider from "@/components/ambient/assistant-context" directly, not the barrel, so the provider does not pull the whole layer into the main chunk; render <Assistant /> inside <Suspense fallback={null}>.`]
      .filter(Boolean)
      .join(" ")
  }
  m.importFrom = "@/components/ambient/assistant"
  m.layerDir = join(profile.repo?.appDirFromRoot ?? ".", srcRoot, "components/ambient")
  return m
}

function transportFor(profile, srcRoot) {
  const n = profile.network ?? {}
  const ai = profile.ai ?? {}
  if (ai.kind === "sdk-streaming") {
    return {
      kind: "ai-sdk",
      guidance: `Bridge the product's existing streaming endpoint (${[...(ai.sdk ?? [])].join(", ")}${ai.routes?.[0] ? `, e.g. ${ai.routes[0].file}:${ai.routes[0].line}` : ""}) into ask(): return answerEventsFromSSE(response). Do not add a second AI stack.`,
    }
  }
  const bridge = n.transports?.find((t) => t.kind === "send-bridge" || t.kind === "electron-ipc")
  if (bridge) {
    return {
      kind: "worker-ipc",
      guidance: `add an ask handler inside the host's own backend behind its existing send()${bridge.module ? ` (${bridge.module}, used in ${bridge.importers} files)` : ""}; never a new server`,
    }
  }
  if (n.clients?.length || n.wrapper) {
    const hints = Object.entries(n.auth ?? {})
      .filter(([, v]) => v)
      .map(([k, v]) => (typeof v === "string" ? `${k}: ${v}` : `${k} (${v.file}:${v.line})`))
    const conv = [
      n.helper ? `the ${n.helper.name}() helper (${n.helper.file ?? "?"}${n.helper.line ? `:${n.helper.line}` : ""}, ${n.helper.uses} call sites)` : null,
      n.serviceDir ? `a new service module beside the ${n.serviceDir.modules} in ${n.serviceDir.dir}/` : null,
    ].filter(Boolean)
    return {
      kind: "http",
      client: n.wrapper ?? n.clients[0],
      guidance: `Use the product's own client${n.wrapper ? ` (${n.wrapper})` : ""}${n.clients?.length ? ` [${n.clients.join(", ")}]` : ""}${conv.length ? ` — ${conv.join(", as ")}` : ""} for the assistant's endpoints, and keep its auth${hints.length ? `: ${hints.join("; ")}` : ""}.${
        ai.kind === "http-endpoint" || ai.kind === "provider-sdk"
          ? ` The product already talks to an AI service (${[...(ai.provider ?? []), ...(ai.envNames ?? []), ...(ai.routes ?? []).map((r) => `${r.file}:${r.line}`)].slice(0, 4).join(", ")}): answer through it on the server, not a second stack.`
          : ""
      }`,
      auth: n.auth ?? null,
    }
  }
  return {
    kind: "none",
    guidance: `No API layer found: use the default ${join(profile.repo?.appDirFromRoot ?? ".", srcRoot, "lib/ambient/api.ts")} from start.md (stubs by default).`,
  }
}

function testsFor(profile, srcRoot) {
  const runners = profile.tests?.runners ?? []
  const runner = runners.includes("vitest") ? "vitest" : runners.includes("jest") ? "jest" : null
  const out = {
    runner,
    stubTestPath: runner ? join(profile.repo?.appDirFromRoot ?? ".", srcRoot, "lib/ambient/stubs.test.ts") : null,
    mocks: [],
  }
  if (runner === "jest" && profile.jest?.cjs) {
    out.mocks.push({
      why: "CommonJS Jest cannot load @paper-design/shaders-react (ESM-only), which the orb imports.",
      moduleNameMapper: `"^@/components/ambient/orb-character$": "<rootDir>/${join(srcRoot, "lib/ambient/__mocks__/orb-character.tsx")}"`,
      mock: 'jest.mock("@/components/ambient/orb-character", () => ({ OrbCharacter: () => null }))',
      transformIgnorePatterns: '"node_modules/(?!(@paper-design)/)"',
    })
  }
  return out
}

function lintFor(profile, srcRoot) {
  const appDir = profile.repo?.appDirFromRoot ?? "."
  const paths = [`${join(appDir, srcRoot, "components/ambient")}/**`]
  if (!profile.shadcn?.uiDirExists) paths.push(`${join(appDir, srcRoot, "components/ui")}/**`)
  const l = profile.lint ?? {}
  const targets = []
  if (l.eslint) {
    const flat = /eslint\.config\./.test(l.eslint.config ?? "")
    targets.push(
      l.eslint.config
        ? { tool: "eslint", file: l.eslint.config, key: flat ? "a config object { ignores: [...] }" : "ignorePatterns (or .eslintignore lines)" }
        : { tool: "eslint", file: null, key: "eslint is installed but no config file was found at the app or root — nothing to edit unless one exists deeper" }
    )
  }
  if (l.oxlint) targets.push({ tool: "oxlint", file: l.oxlint.config ?? ".oxlintrc.json", key: "ignorePatterns" })
  if (l.biome) targets.push({ tool: "biome", file: l.biome.config ?? "biome.json", key: "files.ignore (v1) / files.includes with !negations (v2)" })
  if (l.prettier) targets.push({ tool: "prettier", file: ".prettierignore", key: "one path per line" })
  if (l.oxfmt) targets.push({ tool: "oxfmt", file: l.oxfmt.config, key: "ignorePatterns" })
  for (const h of l.agentHooks ?? []) targets.push({ tool: "agent-hook", file: h.file, key: `the hook runs \`${h.command}\` on edit — make it skip these paths` })
  return { exclude: paths, targets }
}

/* ---------------------------------- plan ---------------------------------- */

export function buildPlan(profile, answers = {}, { registry = DEFAULT_REGISTRY } = {}) {
  const a = resolveAnswers(profile, answers)
  const srcRoot = profile.srcRoot ?? profile.aliases?.srcRoot ?? "."
  const tw = tailwindMajor(profile)
  const pm = profile.packageManager ?? { name: "npm", runner: "npx", invoke: "npm" }
  const requiredSteps = []
  const warnings = []

  // REQUIRED STEPS, in the order they must happen.
  if (!profile.git?.isRepo) {
    requiredSteps.push({ id: "git-init", title: "Put the project under git", command: 'git init && git add -A && git commit -m "Initial commit"' })
  }
  const t = profile.styling?.tailwind
  if (tw === 3 && (t.minor ?? 0) < 4) {
    requiredSteps.push({
      id: "tailwind-3.4",
      title: "bump tailwindcss to ^3.4 first",
      file: "package.json",
      command: `${pm.name === "npm" ? "npm install" : `${pm.invoke} add`} -D tailwindcss@^3.4`,
      detail: "A minor release: nothing visible changes, and the v3 door needs 3.4's arbitrary-value syntax.",
    })
  }
  if (tw == null) {
    const bundler = profile.framework?.name
    const plugin = bundler === "vite" || bundler === "react-router" || bundler === "remix" ? "@tailwindcss/vite" : "@tailwindcss/postcss"
    requiredSteps.push({
      id: "install-tailwind-v4",
      title: "Install Tailwind v4 for the layer (scoped — no global preflight)",
      command: `${pm.name === "npm" ? "npm install" : `${pm.invoke} add`} -D tailwindcss@^4 ${plugin}`,
      snippet:
        plugin === "@tailwindcss/vite"
          ? `import tailwindcss from "@tailwindcss/vite"  // in ${profile.framework?.configFile ?? "vite.config"}: plugins: [..., tailwindcss()]`
          : `// postcss.config.mjs\nexport default { plugins: { "@tailwindcss/postcss": {} } }`,
    })
  }
  if (!profile.shadcn?.componentsJson) {
    const aliasBase = "@"
    requiredSteps.push({
      id: "components-json",
      title: "Create components.json (without running shadcn init, which rewrites the global CSS)",
      file: join(profile.repo?.appDirFromRoot ?? ".", "components.json"),
      snippet: JSON.stringify(
        {
          $schema: "https://ui.shadcn.com/schema.json",
          style: "new-york",
          rsc: Boolean(profile.framework?.rsc),
          tsx: Boolean(profile.typescript?.present),
          tailwind: { config: tw === 3 ? profile.styling.tailwind.config ?? "tailwind.config.js" : "", css: posix.relative(profile.repo?.appDirFromRoot ?? ".", cssFor(profile, a, srcRoot).entry ?? "") || "", baseColor: "neutral", cssVariables: true },
          aliases: { components: `${aliasBase}/components`, utils: `${aliasBase}/lib/utils`, ui: `${aliasBase}/components/ui`, lib: `${aliasBase}/lib`, hooks: `${aliasBase}/hooks` },
        },
        null,
        2
      ),
    })
  }
  const aliasEdits = aliasEditsFor(profile, srcRoot)
  for (const e of aliasEdits.filter((x) => x.snippet)) {
    requiredSteps.push({ id: `alias-${e.where}`, title: `Add the @/ alias to ${e.file ?? e.where}`, file: e.file, snippet: e.snippet })
  }
  const env = profile.env ?? {}
  if (env.definePluginKeys && !env.alreadyDefined) {
    requiredSteps.push({
      id: "define-stub-flag",
      title: `Expose ${env.stubFlag} to the browser build`,
      file: profile.framework?.configFile,
      snippet: `new webpack.DefinePlugin({ "process.env.${env.stubFlag}": JSON.stringify(process.env.${env.stubFlag} || "") })  // or add ${env.stubFlag} to the existing DefinePlugin object`,
    })
  }
  const btn = profile.shadcn?.primitives?.button
  if (a.path !== "full" && tw === 4 && btn && (!btn.iconSm || !btn.iconXs)) {
    requiredSteps.push({
      id: "button-sizes",
      title: "Add the button sizes the layer uses to the product's own button",
      file: btn.file,
      snippet: `size: { …, "icon-sm": "size-8", "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3" }`,
      detail: "Install keeps the product's button untouched (it restores it if shadcn overwrites it). The layer composes it with sizes icon-sm and icon-xs; without them tsc fails. Adding two size variants is additive — no existing button changes.",
    })
  }

  // THE DOORS AND THE COMMANDS THAT OPEN THEM.
  const doors = doorsFor(profile, a, requiredSteps, warnings)
  const runner = pm.runner ?? "npx"
  const appDir = profile.repo?.appDir ?? "."
  const cwd = profile.repo?.appDirFromRoot ?? "."
  const commands = [
    { cwd, run: `${runner} shadcn@latest registry add "@ambientui=${registry.replace(/\/+$/, "")}/r/{name}.json"` },
    ...doors.map((d) => ({ cwd, door: d, run: `${runner} shadcn@latest add @ambientui/${d} --yes --overwrite` })),
  ]
  const iconDoor = doors.find((d) => d.startsWith("icon-"))
  if (iconDoor) {
    const unused = unusedIconPackages(profile, iconDoor.slice(5))
    const remover = pm.name === "npm" ? "npm uninstall" : `${pm.invoke ?? pm.name} remove`
    if (unused.length) commands.push({ cwd, label: "remove unused icon packages", run: `${remover} ${unused.join(" ")}`, why: `${iconDoor} draws with one library; these came with the full icon item and nothing imports them now` })
  }

  const css = cssFor(profile, a, srcRoot, doors)
  const provider = providerFor(profile, a)
  const mount = mountFor(profile, srcRoot)
  const transport = transportFor(profile, srcRoot)
  const tests = testsFor(profile, srcRoot)
  const lint = lintFor(profile, srcRoot)

  const naming = {
    convention: profile.naming?.convention ?? "unknown",
    note:
      profile.naming?.convention === "PascalCase"
        ? "vendored files keep kebab-case; tell the owner (the product's own files are PascalCase)"
        : "vendored files keep kebab-case; tell the owner",
  }
  const i18n = profile.i18n
    ? {
        lib: profile.i18n.lib,
        instruction: "pass `messages` to AssistantProvider with the host's translations",
        rtl: profile.i18n.rtl?.length
          ? `RTL locales present (${profile.i18n.rtl.join(", ")}): check the orb anchor and panel side mirror under dir="rtl"`
          : null,
      }
    : null

  // WARNINGS — true things the agent must keep in mind.
  if (a.path === "full" && !mount.lazy) warnings.push("The full path keeps all five icon libraries (the Foundation switches between them live; Remix is the heaviest); if bundle size matters, lazy-load Assistant (see mount.snippet shape).")
  if (profile.styling?.tailwind?.config) warnings.push(`The shadcn CLI may reformat ${profile.styling.tailwind.config} when a door adds colours: check \`git diff\` on it and restore dropped comments.`)
  if (a.path === "full") warnings.push("The Foundation replaces the palette: host tests or visual baselines that assert the old colours will need updating.")
  if (profile.tests?.vrt) warnings.push(`Visual regression (${profile.tests.vrt}): the orb appears on every screen; expect baseline diffs, or hide [data-ambient-root] in VRT runs.`)
  if (!pm.onPath) warnings.push(`${pm.name} is not on PATH; use \`${pm.invoke}\`. shadcn installs dependencies by calling ${pm.name} itself — make it reachable (e.g. \`corepack enable\`) before install, or dependency installs fail after files land.`)
  if (profile.deps?.convention === "devDependencies-only") warnings.push("This app keeps every package in devDependencies; move what shadcn adds to `dependencies` into devDependencies to match.")
  for (const i of profile.icons ?? []) if (i.legacyNames) warnings.push(`lucide-react ${i.version} predates the 0.300 renames (AlertCircle/Home, not CircleAlert/House), so the layer draws with HugeIcons instead of the product's lucide; upgrading lucide-react would let it use icon-lucide.`)
  if (profile.bundle?.coep) warnings.push(`COEP ${profile.bundle.coep.value} (${profile.bundle.coep.file}): cross-origin fonts and assets are blocked; keep the layer's assets same-origin under ${profile.staticDir ?? "public"}/.`)
  if (profile.bundle?.precacheLimit) warnings.push(`PWA precache limit ${profile.bundle.precacheLimit.expr} (${profile.bundle.precacheLimit.file}:${profile.bundle.precacheLimit.line}): a chunk above it is silently left out of the offline cache — lazy-load the layer.`)
  for (const c of profile.styling?.otherTailwindConsumers ?? []) warnings.push(`${c.file}:${c.line} also runs Tailwind (${c.text}); tailwind config changes reach that build too — rebuild and diff its output.`)
  if (profile.lint?.agentHooks?.length) warnings.push("An agent hook autofixes files on edit; exclude the vendored paths (lint.exclude) before writing them, or the hook rewrites them.")
  if (profile.existingInstall?.present) warnings.push(`An earlier ambientui install is present (${profile.existingInstall.paths.join(", ")}); this survey describes the host plus that layer.`)
  if (profile.repo?.alternatives?.length) warnings.push(`Other React apps in this repo: ${profile.repo.alternatives.join(", ")}. The plan targets ${cwd}.`)
  if (profile.styling?.cssInJs?.length && tw == null) warnings.push(`The product styles with ${profile.styling.cssInJs.join(", ")}; the layer's Tailwind is scoped so the product's screens are untouched.`)
  if (profile.cnPackage || profile.shadcn?.cnPackage) warnings.push("The product depends on the `cn` npm package; the layer's `cn` comes from @/lib/utils (clsx + tailwind-merge). Do not swap one for the other.")
  if (profile.shadcn?.utils && !profile.shadcn.utils.definesCn && profile.shadcn.utils.file) warnings.push(`${profile.shadcn.utils.file} exists but does not export cn; the layer imports cn from it — add the export (install restores the file if shadcn replaces it).`)
  if (a.path === "full" && tw == null) warnings.push("The full path on a product with no Tailwind brings Tailwind's global preflight to every screen; migrate screens deliberately.")
  if (profile.git?.isRepo && !profile.git.clean) warnings.push(`The working tree has ${profile.git.dirtyCount} uncommitted change(s); \`ambientui begin\` refuses a dirty tree unless --allow-dirty.`)

  return {
    path: a.path,
    answers: a,
    appDir,
    appDirFromRoot: cwd,
    srcRoot,
    packageManager: { name: pm.name, version: pm.version ?? null, invoke: pm.invoke, onPath: pm.onPath ?? null, installCmd: pm.installCmd },
    runner,
    registry,
    requiredSteps,
    doors,
    commands,
    css,
    staticDir: profile.staticDir ?? "public",
    // what `install` changes in the landed files for THIS product (src/adapt.mjs)
    adapt: adaptationsFor(profile, { srcRoot, staticDir: profile.staticDir ?? "public", path: a.path }),
    envFlag: envFlagFor(profile),
    aliasEdits,
    provider,
    mount,
    transport,
    tests,
    lint,
    naming,
    i18n,
    hotkey: hotkeyFor(profile, a),
    governance: governanceFor(profile, doors),
    warnings,
    blockers: blockers(profile, answers),
  }
}

/**
 * THE STUB FLAG'S NAME AND HOW CODE READS IT. The survey's house prefix wins
 * (Excalidraw's VITE_APP_, Actual's REACT_APP_ under Vite); without one, the
 * framework's own convention — the prefix the bundler actually exposes.
 */
export function envFlagFor(profile) {
  const fw = profile.framework?.name
  const env = profile.env ?? {}
  const conventional = { next: "NEXT_PUBLIC_", cra: "REACT_APP_", vite: "VITE_", "react-router": "VITE_", remix: "VITE_", webpack: "" }[fw] ?? "VITE_"
  const prefix = env.prefix ?? conventional
  const style = env.style ?? (["vite", "react-router", "remix"].includes(fw) ? "import.meta.env" : "process.env")
  const name = `${prefix}AMBIENT_STUBS`
  return {
    name,
    read: `${style}.${name}`,
    expression: `${style}.${name} !== "false"`,
    default: 'stubs on unless the flag is "false"',
  }
}

/** What the hotkey answer obliges the agent to do. */
function hotkeyFor(profile, a) {
  const hk = profile.hotkeys ?? {}
  if (!hk.conflict) return { answer: null, owners: [] }
  const owners = (hk.owners ?? []).map((o) => (o.file && o.line ? `${o.file}:${o.line}` : o.name ?? o.file))
  const out = { answer: a.hotkey, owners }
  if (a.hotkey === "takeover") {
    out.reregister = hk.features ?? []
    out.instruction =
      "Remove the product's mod+k binding and re-register everything its palette offered as assistant commands (navItems / commands), so nothing the owner used is lost."
  } else if (a.hotkey === "yield") {
    out.instruction =
      "Write yieldHotkey(event) returning true exactly when the product's own mod+k handler should win (the condition at the owners above), and pass it to AssistantProvider."
  } else if (a.hotkey === "coexist") {
    out.instruction = "The assistant opens on mod+j; confirm nothing in the product binds mod+j (search the owners' files) and tell the owner."
  }
  return out
}

/**
 * GOVERNANCE BESIDE, NEVER OVER. The rules land at .claude/ambientui/
 * CLAUDE.md; the product's own CLAUDE.md/AGENTS.md gets one pointer line.
 */
function governanceFor(profile, doors) {
  if (!doors.includes("governance")) return { install: false }
  const existing = profile.agent?.claudeMd ? "CLAUDE.md" : profile.agent?.agentsMd ? "AGENTS.md" : null
  return {
    install: true,
    rules: ".claude/ambientui/CLAUDE.md",
    pointer: existing
      ? { file: existing, line: "- ambientui: the assistant layer's working rules are in .claude/ambientui/CLAUDE.md — read them before touching components/ambient/." }
      : null,
  }
}
