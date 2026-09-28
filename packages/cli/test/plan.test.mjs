/**
 * THE ADAPTER'S RULES, ONE CASE PER HOST SHAPE WE HAVE MET.
 *
 * Each test builds a profile by hand — the smallest one that makes the rule
 * apply — and asserts the decision. The base profile is a stock Vite +
 * Tailwind v4 + shadcn app, i.e. the reference environment; every case is a
 * deviation from it, which is exactly how the variants are defined.
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { applyOverrides, blockers, buildPlan, decisions, envFlagFor, iconLibraryFor, parseOverride, resolveAnswers, unusedIconPackages } from "../src/plan.mjs"

const ROLES = ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground", "accent", "accent-foreground", "destructive", "border", "input", "ring"]

/** A stock Vite + Tailwind v4 + shadcn product with 40 screens. */
function base() {
  return {
    repo: { appDir: ".", appDirFromRoot: ".", appCandidates: [{ dir: ".", framework: "vite", uiFiles: 40 }], alternatives: [], monorepo: null },
    packageManager: { name: "npm", version: "10.9.0", onPath: true, invoke: "npm", runner: "npx", installCmd: "npm install", runPrefix: "npm run" },
    deps: { convention: "dependencies" },
    git: { isRepo: true, clean: true, dirty: [], dirtyCount: 0, ignored: {} },
    framework: { name: "vite", configFile: "vite.config.ts", router: null, rsc: false },
    entry: { file: "src/main.tsx", rootComponent: "src/App.tsx" },
    react: { version: "19.1.0", major: 19, typesMajor: 19 },
    typescript: { present: true, strict: true, tsconfig: "tsconfig.json" },
    moduleType: "esm",
    jest: { present: false },
    styling: {
      tailwind: { version: "4.1.0", major: 4, minor: 1, source: "installed", config: null },
      entry: "src/index.css",
      directive: { kind: "v4-import", line: 1, text: '@import "tailwindcss";' },
      preflight: true,
      cssInJs: [],
      scss: { files: 0 },
      otherTailwindConsumers: [],
    },
    tokens: { format: "color", present: ROLES, missing: [], sample: { value: "oklch(1 0 0)" } },
    shadcn: {
      componentsJson: "components.json",
      uiDir: "src/components/ui",
      uiDirExists: true,
      primitives: { button: { file: "src/components/ui/button.tsx", iconSm: true, iconXs: true } },
      utils: { file: "src/lib/utils.ts", definesCn: true },
      cnPackage: false,
    },
    aliases: {
      tsconfigs: [{ file: "tsconfig.json", hasAt: true, target: "src" }],
      bundler: { kind: "vite", file: "vite.config.ts", hasAt: true },
      test: null,
      forbidsAt: [],
      srcRoot: "src",
      atResolves: true,
    },
    srcRoot: "src",
    env: { prefix: "VITE_", style: "import.meta.env", stubFlag: "VITE_AMBIENT_STUBS", read: "import.meta.env.VITE_AMBIENT_STUBS", definePluginKeys: null },
    staticDir: "public",
    bundle: { pwa: null, precacheLimit: null, coep: null },
    componentLibrary: ["radix"],
    icons: [{ id: "lucide", version: "0.500.0", legacyNames: false }],
    naming: { convention: "kebab-case" },
    darkMode: { mechanism: "html-class", signal: null, signals: [] },
    hotkeys: { owners: [], conflict: false, features: [] },
    zIndex: { max: 50, modal: null, nonModalMax: 50, outliers: [] },
    fixedBottom: [],
    i18n: null,
    network: { clients: [], wrapper: null, transports: [], auth: {} },
    ai: { kind: "none", sdk: [], provider: [], envNames: [], routes: [] },
    tests: { runners: ["vitest"], scripts: ["test"], vrt: null },
    lint: { eslint: { config: "eslint.config.js" }, agentHooks: [] },
    agent: { claudeMd: false, agentsMd: false, designMd: false },
    product: { name: "Acme" },
    scripts: {},
    existingInstall: { present: false, paths: [] },
  }
}

/** Deep-merge `over` into a fresh base profile. */
function profile(over = {}) {
  const merge = (a, b) => {
    for (const [k, v] of Object.entries(b)) {
      if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) merge(a[k], v)
      else a[k] = v
    }
    return a
  }
  return merge(base(), over)
}

const TW3 = {
  styling: {
    tailwind: { version: "3.4.19", major: 3, minor: 4, source: "installed", config: "tailwind.config.js" },
    directive: { kind: "v3-base", line: 1, text: "@tailwind base;" },
  },
  tokens: { format: "hsl-triplet", sample: { value: "0 0% 100%" } },
}

describe("doors and css — the four dialects", () => {
  it("Tailwind v4 with colour tokens, layer only: ambient-layer, @import after tailwindcss", () => {
    const p = buildPlan(profile(), { path: "layer" })
    assert.equal(p.path, "layer")
    assert.deepEqual(p.doors, ["start", "ambient-layer", "icon-lucide"])
    assert.equal(p.css.mode, "v4-import")
    assert.equal(p.css.entry, "src/index.css")
    assert.deepEqual(p.css.lines, ['@import "./styles/ambient.css";'])
    // registry add, two doors, then removing the icon packages nothing uses
    assert.equal(p.commands.length, 5)
    assert.match(p.commands[0].run, /^npx shadcn@latest registry add "@ambientui=https:\/\/registry\.ambientui\.ai\/r\/\{name\}\.json"$/)
    assert.equal(p.commands[2].run, "npx shadcn@latest add @ambientui/ambient-layer --yes --overwrite")
    assert.deepEqual(p.blockers, [])
  })

  it("Tailwind v4 with HSL-triplet tokens: ambient-layer, THEN ambient-styles-hsl", () => {
    const p = buildPlan(profile({ tokens: { format: "hsl-triplet" } }), { path: "layer" })
    assert.deepEqual(p.doors, ["start", "ambient-layer", "ambient-styles-hsl", "icon-lucide"])
    assert.ok(p.doors.indexOf("ambient-styles-hsl") > p.doors.indexOf("ambient-layer"), "the hsl stylesheet must replace the colour one, so it comes after")
  })

  it("Tailwind v4 without shadcn tokens: ambient-tokens before the layer", () => {
    const p = buildPlan(profile({ tokens: { format: "none", present: [], missing: ROLES } }), { path: "layer" })
    assert.deepEqual(p.doors, ["start", "ambient-tokens", "ambient-layer", "icon-lucide"])
    assert.deepEqual(p.css.lines, ['@import "./styles/ambient-tokens.css";', '@import "./styles/ambient.css";'])
  })

  it("Tailwind v4 WITHOUT its global reset (theme + utilities only): scoped, into the existing stylesheet", () => {
    const p = buildPlan(
      profile({
        styling: { entry: "src/index.css", directive: { kind: "partial", text: '@import "tailwindcss/theme.css"' }, preflight: false },
        tokens: { format: "none", present: [], missing: ROLES },
      }),
      { path: "layer" }
    )
    assert.deepEqual(p.doors, ["start", "ambient-base", "ambient-layer", "icon-lucide"])
    assert.equal(p.css.mode, "scoped")
    assert.equal(p.css.create, false)
    assert.equal(p.css.entry, "src/index.css")
    assert.deepEqual(p.css.lines, [
      '@import "./styles/ambient-preflight.css" layer(base);',
      '@import "./styles/ambient-tokens.css";',
      '@import "./styles/ambient.css";',
    ])
  })

  it("Tailwind v3 without any tokens: the HSL token door comes with the tw3 door", () => {
    const p = buildPlan(profile({ ...TW3, tokens: { format: "none", present: [], missing: ROLES } }), {})
    assert.deepEqual(p.doors, ["start", "ambient-tokens-hsl", "ambient-layer-tw3", "icon-lucide"])
    assert.deepEqual(p.css.lines, ['import "./styles/ambient-tokens-hsl.css"', 'import "./styles/ambient.css"'])
  })

  it("Tailwind v3: forced layer-only, the tw3 door, the material imported from the entry file", () => {
    const pr = profile(TW3)
    const p = buildPlan(pr, {})
    assert.equal(p.path, "layer")
    assert.deepEqual(p.doors, ["start", "ambient-layer-tw3", "icon-lucide"])
    assert.equal(p.css.mode, "v3-entry-import")
    assert.equal(p.css.entryFile, "src/main.tsx")
    assert.deepEqual(p.css.lines, ['import "./styles/ambient.css"'])
    // the path is decided, not asked, and says why
    const d = decisions(pr, {}).find((x) => x.id === "path")
    assert.equal(d.chosen, "layer")
    assert.match(d.why, /Tailwind v3/)
  })

  it("Tailwind v3 with the full path requested: a blocker, and the plan stays layer-only", () => {
    const pr = profile(TW3)
    const p = buildPlan(pr, { path: "full" })
    assert.equal(p.path, "layer")
    assert.ok(p.blockers.some((b) => b.id === "full-on-tw3"))
    assert.ok(!p.doors.includes("foundation"))
  })

  it("Tailwind v3 below 3.4: a required bump step, not a blocker", () => {
    const p = buildPlan(profile({ ...TW3, styling: { ...TW3.styling, tailwind: { ...TW3.styling.tailwind, version: "3.3.5", minor: 3 } } }), {})
    assert.ok(p.requiredSteps.some((s) => s.id === "tailwind-3.4" && /tailwindcss@\^3\.4/.test(s.command)))
    assert.deepEqual(p.blockers, [])
  })

  it("no Tailwind: install v4 as a step, ambient-base + ambient-layer, CSS scoped (no global preflight)", () => {
    const p = buildPlan(
      profile({
        styling: { tailwind: null, entry: "src/index.scss", directive: null, preflight: false, cssInJs: ["@emotion/css"] },
        tokens: { format: "none", present: [], missing: ROLES },
      }),
      { path: "layer" }
    )
    assert.deepEqual(p.doors, ["start", "ambient-base", "ambient-layer", "icon-lucide"])
    assert.equal(p.css.mode, "scoped")
    assert.equal(p.css.create, true)
    assert.ok(p.css.lines.includes("@layer theme, base, components, utilities;"))
    assert.ok(p.css.lines.includes('@import "./styles/ambient-preflight.css" layer(base);'))
    assert.ok(p.css.lines.includes('@import "./styles/ambient-tokens.css";'))
    assert.ok(!p.css.lines.some((l) => /^@import "tailwindcss";/.test(l)), "never the global import")
    const step = p.requiredSteps.find((s) => s.id === "install-tailwind-v4")
    assert.match(step.command, /tailwindcss@\^4 @tailwindcss\/vite/)
    assert.equal(p.css.entryImport, 'import "./ambient-root.css"')
  })

  it("the full path on v4: foundation, layer, bridge; theme(static) replaces the plain import", () => {
    const p = buildPlan(profile(), { path: "full" })
    assert.deepEqual(p.doors, ["start", "foundation", "ambient-layer", "foundation-ambient-bridge", "governance"])
    assert.equal(p.css.lines[0], '@import "tailwindcss" theme(static);')
    assert.ok(p.css.lines.includes('@import "./styles/foundation.css";'))
  })

  it("an almost-empty project defaults to the full path; an existing product to layer", () => {
    assert.equal(resolveAnswers(profile({ repo: { appCandidates: [{ uiFiles: 1 }] } }), {}).path, "full")
    assert.equal(resolveAnswers(profile(), {}).path, "layer")
  })
})

describe("hotkey", () => {
  const owned = {
    hotkeys: {
      conflict: true,
      owners: [
        { kind: "dependency", name: "cmdk", file: "package.json" },
        { kind: "handler", file: "src/components/CommandBar.tsx", line: 152, text: "if (e.key === 'k' && (e.metaKey || e.ctrlKey))" },
      ],
      features: [{ file: "src/components/CommandBar.tsx", items: ["Budget", "Reports", "Settings"] }],
    },
  }

  it("an existing ⌘K owner is decided, not asked: coexist on mod+j, alternatives recorded", () => {
    const pr = profile(owned)
    const q = decisions(pr, {}).find((x) => x.id === "hotkey")
    assert.ok(q)
    assert.deepEqual(q.options.map((o) => o.value).sort(), ["coexist", "off", "takeover", "yield"])
    assert.equal(q.chosen, "coexist")
    assert.equal(q.source, "doctor")
    assert.match(q.why, /CommandBar\.tsx:152/)
    assert.equal(buildPlan(pr, {}).provider.hotkey, "mod+j")
  })

  it("takeover: the layer owns mod+k and lists the palette's features to re-register", () => {
    const p = buildPlan(profile(owned), { hotkey: "takeover" })
    assert.equal(p.provider.hotkey, "mod+k")
    assert.deepEqual(p.hotkey.reregister[0].items, ["Budget", "Reports", "Settings"])
  })

  it("coexist → mod+j; off → false; yield → mod+k plus a yieldHotkey to write", () => {
    assert.equal(buildPlan(profile(owned), { hotkey: "coexist" }).provider.hotkey, "mod+j")
    assert.equal(buildPlan(profile(owned), { hotkey: "off" }).provider.hotkey, false)
    const y = buildPlan(profile(owned), { hotkey: "yield" })
    assert.equal(y.provider.hotkey, "mod+k")
    assert.ok(y.provider.yieldHotkey)
  })

  it("no owner: no question, mod+k", () => {
    assert.ok(!decisions(profile(), {}).some((x) => x.id === "hotkey"))
    assert.equal(buildPlan(profile(), {}).provider.hotkey, "mod+k")
  })
})

describe("Next.js", () => {
  const next = {
    framework: { name: "next", configFile: "next.config.js", router: "app", rsc: true, routerDir: "app" },
    entry: { file: "app/layout.tsx", rootComponent: "contexts/Providers.tsx" },
    env: { prefix: undefined, style: undefined },
    srcRoot: ".",
    aliases: { srcRoot: "." },
    styling: { entry: "app/globals.css" },
  }

  it("env flag is NEXT_PUBLIC_, read from process.env", () => {
    const f = envFlagFor(profile(next))
    assert.equal(f.name, "NEXT_PUBLIC_AMBIENT_STUBS")
    assert.equal(f.read, "process.env.NEXT_PUBLIC_AMBIENT_STUBS")
    assert.equal(buildPlan(profile(next), {}).envFlag.name, "NEXT_PUBLIC_AMBIENT_STUBS")
  })

  it("on Tailwind v3 the material is imported from the root layout, relative to it", () => {
    const p = buildPlan(profile({ ...next, ...TW3, styling: { ...TW3.styling, entry: "app/globals.css" } }), {})
    assert.equal(p.css.mode, "v3-entry-import")
    assert.equal(p.css.entryFile, "app/layout.tsx")
    assert.deepEqual(p.css.lines, ['import "../styles/ambient.css"'])
  })

  it("mounts in the client providers component, not the server layout", () => {
    const p = buildPlan(profile(next), {})
    assert.equal(p.mount.file, "contexts/Providers.tsx")
    assert.match(p.mount.note, /use client/)
  })

  it("CRA reads REACT_APP_; webpack has no prefix", () => {
    assert.equal(envFlagFor(profile({ framework: { name: "cra" }, env: { prefix: undefined, style: undefined } })).name, "REACT_APP_AMBIENT_STUBS")
    assert.equal(envFlagFor(profile({ framework: { name: "webpack" }, env: { prefix: undefined, style: undefined } })).read, "process.env.AMBIENT_STUBS")
  })
})

describe("provider props", () => {
  it("a high host z-index sets zIndex to max + 1", () => {
    assert.equal(buildPlan(profile({ zIndex: { max: 1000, modal: null } }), {}).provider.zIndex, 1001)
  })

  it("…capped below an identified modal layer", () => {
    assert.equal(buildPlan(profile({ zIndex: { max: 10100, modal: 10050 } }), {}).provider.zIndex, 10049)
  })

  it("a z-index scale that stays below 50 leaves zIndex unset", () => {
    assert.equal(buildPlan(profile({ zIndex: { max: 40, modal: null } }), {}).provider.zIndex, undefined)
  })

  it("fixed bottom UI anchors the orb middle-right", () => {
    const p = buildPlan(profile({ fixedBottom: [{ file: "src/MobileActionBar.tsx", line: 26 }] }), {})
    assert.equal(p.provider.defaultOrbAnchor, "mr")
    assert.equal(buildPlan(profile(), {}).provider.defaultOrbAnchor, undefined)
  })

  it("dark mode that is not .dark on <html> is mirrored through the dark prop, with its signal", () => {
    const pr = profile({ darkMode: { mechanism: "container-class", signal: { note: "theme--dark", file: "src/App.tsx", line: 9 } } })
    const p = buildPlan(pr, {})
    assert.equal(p.provider.dark.mirror, "container-class")
    assert.match(p.provider.dark.signal, /theme--dark @ src\/App\.tsx:9/)
    assert.equal(decisions(pr, {}).find((q) => q.id === "theme").chosen, "mirror")
  })

  it("a PWA precache limit lazy-loads the Assistant", () => {
    const p = buildPlan(profile({ bundle: { precacheLimit: { expr: "2.3 * 1024 ** 2", bytes: 2411725, file: "vite.config.mts", line: 226 } } }), {})
    assert.equal(p.mount.lazy, true)
    assert.match(p.mount.snippet, /React\.lazy/)
  })
})

describe("monorepo", () => {
  it("commands run in the app package; every path is prefixed with it", () => {
    const p = buildPlan(
      profile({
        repo: { appDir: "packages/desktop-client", appDirFromRoot: "packages/desktop-client", monorepo: ["workspaces"], appCandidates: [{ dir: "packages/desktop-client", uiFiles: 900 }] },
        styling: { entry: "packages/desktop-client/src/styles/globals.css" },
        entry: { file: "packages/desktop-client/src/index.tsx", rootComponent: "packages/desktop-client/src/components/App.tsx" },
        aliases: { tsconfigs: [{ file: "packages/desktop-client/tsconfig.json", hasAt: false }], bundler: { kind: "vite", file: "packages/desktop-client/vite.config.mts", hasAt: false } },
      }),
      { path: "layer" }
    )
    assert.equal(p.appDir, "packages/desktop-client")
    assert.ok(p.commands.every((c) => c.cwd === "packages/desktop-client"))
    assert.deepEqual(p.css.lines, ['@import "./ambient.css";'])
    assert.equal(p.mount.layerDir, "packages/desktop-client/src/components/ambient")
    const ts = p.aliasEdits.find((e) => e.where === "tsconfig")
    assert.match(ts.snippet, /"@\/\*": \["\.\/src\/\*"\]/)
    assert.ok(p.aliasEdits.some((e) => e.where === "bundler"))
    assert.equal(p.lint.exclude[0], "packages/desktop-client/src/components/ambient/**")
  })

  it("a package manager that is not on PATH is warned about, with how to invoke it", () => {
    const p = buildPlan(profile({ packageManager: { name: "yarn", onPath: false, invoke: "node .yarn/releases/yarn-4.17.1.cjs", runner: "npx" } }), {})
    assert.ok(p.warnings.some((w) => /yarn is not on PATH.*node \.yarn\/releases/.test(w)))
  })
})

describe("blockers and purity", () => {
  it("no React and React 17 are hard stops; no git is a step the agent takes, not a stop", () => {
    assert.ok(blockers(profile({ react: null })).some((b) => b.id === "no-react"))
    assert.ok(blockers(profile({ react: { version: "17.0.2", major: 17 } })).some((b) => b.id === "react-too-old"))
    const pr = profile({ git: { isRepo: false } })
    assert.deepEqual(blockers(pr), [])
    assert.ok(buildPlan(pr, {}).requiredSteps.some((r) => r.id === "git-init"))
  })

  it("governance: decided when CLAUDE.md exists, installed beside it with one pointer line", () => {
    const pr = profile({ agent: { claudeMd: true } })
    assert.equal(decisions(pr, {}).find((q) => q.id === "governance").chosen, "yes")
    const p = buildPlan(pr, {})
    assert.ok(p.doors.includes("governance"))
    assert.equal(p.governance.rules, ".claude/ambientui/CLAUDE.md")
    assert.equal(p.governance.pointer.file, "CLAUDE.md")
    assert.ok(!buildPlan(pr, { governance: "no" }).doors.includes("governance"))
  })

  it("the registry host is overridable", () => {
    const p = buildPlan(profile(), {}, { registry: "http://localhost:4321/" })
    assert.match(p.commands[0].run, /"@ambientui=http:\/\/localhost:4321\/r\/\{name\}\.json"/)
  })

  it("is a pure function: the profile is not mutated, and the same input gives the same plan", () => {
    const deepFreeze = (o) => {
      Object.freeze(o)
      for (const v of Object.values(o)) if (v && typeof v === "object" && !Object.isFrozen(v)) deepFreeze(v)
      return o
    }
    const pr = deepFreeze(profile({ fixedBottom: [{ file: "x", line: 1 }], zIndex: { max: 999, modal: null } }))
    const a = buildPlan(pr, { path: "layer" })
    const b = buildPlan(pr, { path: "layer" })
    assert.deepEqual(a, b)
  })

  it("a button without icon-sm/icon-xs gets an additive required step on the v4 layer path", () => {
    const p = buildPlan(profile({ shadcn: { primitives: { button: { file: "src/components/ui/button.tsx", iconSm: false, iconXs: false } } } }), { path: "layer" })
    assert.ok(p.requiredSteps.some((s) => s.id === "button-sizes"))
  })

  it("a CommonJS Jest gets a mock for the ESM-only orb", () => {
    const p = buildPlan(profile({ tests: { runners: ["jest"] }, jest: { present: true, cjs: true } }), {})
    assert.equal(p.tests.runner, "jest")
    assert.match(p.tests.mocks[0].mock, /orb-character/)
  })
})

describe("one icon library on the layer-only path", () => {
  it("uses the product's own library and removes the ones the full icon item brought", () => {
    const p = buildPlan(profile({ icons: [{ id: "lucide", pkg: "lucide-react", version: "0.460.0" }] }), { path: "layer" })
    assert.ok(p.doors.includes("icon-lucide"))
    const remove = p.commands.find((c) => /uninstall|remove/.test(c.run))
    assert.equal(remove.run, "npm uninstall @tabler/icons-react @phosphor-icons/react @remixicon/react")
  })
  it("keeps shadcn's icon library, which its primitives import directly", () => {
    const p = buildPlan(profile({ icons: [] }), { path: "layer" })
    assert.ok(p.doors.includes("icon-hugeicons"))
    const remove = p.commands.find((c) => /uninstall|remove/.test(c.run))
    assert.ok(!remove.run.includes("lucide-react"), remove.run)
  })
  it("never removes a package the product already had", () => {
    const icons = [
      { id: "tabler", pkg: "@tabler/icons-react", version: "3.0.0" },
      { id: "remixicon", pkg: "@remixicon/react", version: "4.0.0" },
    ]
    assert.equal(iconLibraryFor({ icons }), "tabler")
    assert.deepEqual(unusedIconPackages({ icons }, "tabler"), ["@phosphor-icons/react"])
    assert.deepEqual(unusedIconPackages({ icons, shadcn: { iconLibrary: "tabler" } }, "tabler"), ["lucide-react", "@phosphor-icons/react"])
  })
  it("falls back to HugeIcons for a library the registry lacks, or lucide before 0.300", () => {
    assert.equal(iconLibraryFor({ icons: [{ id: "heroicons", pkg: "@heroicons/react" }] }), "hugeicons")
    assert.equal(iconLibraryFor({ icons: [{ id: "lucide", pkg: "lucide-react", legacyNames: true }] }), "hugeicons")
  })
  it("keeps all five on the full path, where the Foundation switches libraries", () => {
    const p = buildPlan(profile(), { path: "full" })
    assert.ok(!p.doors.some((d) => d.startsWith("icon-")))
  })
})

describe("adaptations — the doors stay generic, the landed files fit the product", () => {
  it("reads a colour as chromatic or neutral in every format a product writes", async () => {
    const { isChromatic } = await import("../src/adapt.mjs")
    assert.equal(isChromatic("oklch(0.546 0.245 262.881)"), true)
    assert.equal(isChromatic("oklch(0.205 0 0)"), false)
    assert.equal(isChromatic("221.2 83.2% 53.3%"), true)
    assert.equal(isChromatic("0 0% 9%"), false)
    assert.equal(isChromatic("#6965db"), true)
    assert.equal(isChromatic("#171717"), false)
    assert.equal(isChromatic("var(--color-purple-600)"), true)
    assert.equal(isChromatic("var(--color-zinc-900)"), false)
    assert.equal(isChromatic("var(--brand)"), null)
  })
  it("strips \"use client\" except in a React Server Components app", () => {
    const vite = buildPlan(profile(), { path: "layer" })
    assert.ok(vite.adapt.some((a) => a.id === "strip-use-client"))
    const next = buildPlan(profile({ framework: { name: "next", router: "app", rsc: true } }), { path: "layer" })
    assert.ok(!next.adapt.some((a) => a.id === "strip-use-client"))
  })
  it("points the accent at a chromatic primary, through hsl() for triplets", () => {
    const blue = buildPlan(profile({ tokens: { primary: { file: "src/index.css", line: 9, value: "oklch(0.546 0.245 262.881)" } } }), { path: "layer" })
    assert.equal(blue.adapt.find((a) => a.id === "accent").value, "var(--primary)")
    const tw3 = buildPlan(profile({ tokens: { format: "hsl-triplet", primary: { file: "src/index.css", line: 9, value: "221.2 83.2% 53.3%" } } }), { path: "layer" })
    assert.equal(tw3.adapt.find((a) => a.id === "accent").value, "hsl(var(--primary))")
  })
  it("keeps the blue for a neutral primary, and leaves the accent to the Foundation on the full path", () => {
    const gray = buildPlan(profile({ tokens: { primary: { file: "src/index.css", line: 9, value: "oklch(0.205 0 0)" } } }), { path: "layer" })
    assert.equal(gray.adapt.find((a) => a.id === "accent").skip, true)
    const full = buildPlan(profile({ tokens: { primary: { file: "src/index.css", line: 9, value: "oklch(0.546 0.245 262.881)" } } }), { path: "full" })
    assert.ok(!full.adapt.some((a) => a.id === "accent"))
  })
  it("moves the orb's artwork only when the product serves static files elsewhere", () => {
    assert.ok(!buildPlan(profile(), { path: "layer" }).adapt.some((a) => a.id === "orb-assets"))
    const ex = buildPlan(profile({ staticDir: "../public" }), { path: "layer" })
    assert.equal(ex.adapt.find((a) => a.id === "orb-assets").to, "../public")
  })
})

describe("the agent's corrections and the owner's choices", () => {
  it("--set overrides a planned value, keeps the reason, and parses JSON values", () => {
    const o = parseOverride("provider.zIndex=2999", "CaptureHost sits at 10100; the modal guess was wrong")
    assert.equal(o.value, 2999)
    const p = applyOverrides(buildPlan(profile(), {}), [o, parseOverride("mount.file=src/Layout.tsx", "App renders before the router")])
    assert.equal(p.provider.zIndex, 2999)
    assert.equal(p.mount.file, "src/Layout.tsx")
    assert.equal(p.overrides.length, 2)
  })
  it("an owner's explicit choice beats the doctor's decision, and says so", () => {
    const d = decisions(profile({ hotkeys: { conflict: true, owners: [{ kind: "dependency", name: "cmdk" }] } }), { hotkey: "takeover" }).find((x) => x.id === "hotkey")
    assert.equal(d.chosen, "takeover")
    assert.equal(d.source, "owner")
  })
})

describe("AMBIENTUI-NOTES.md", () => {
  it("says happy path when nothing strayed, and recommends a considered reinstall when something did", async () => {
    const { notesMarkdown } = await import("../src/notes.mjs")
    const plan = buildPlan(profile(), {})
    const happy = notesMarkdown({ plan, notes: [], productName: "Shop" })
    assert.match(happy, /happy path/)
    assert.doesNotMatch(happy, /We recommend you try it, then uninstall/)
    const off = notesMarkdown({ plan, notes: [{ kind: "manual", text: "wired the transport by hand: the app has no fetch helper" }], productName: "Shop" })
    assert.match(off, /judgement calls/)
    assert.match(off, /## Done by hand\n\n- wired the transport by hand/)
    assert.match(off, /We recommend you try it, then uninstall it/)
  })
})

describe("language", () => {
  it("an i18n product gets its locale source and the catalog to copy; English-only products get neither", () => {
    const p = buildPlan(profile({ i18n: { lib: "next-intl", locales: ["en", "de", "ar", "he"], count: 4, rtl: ["ar", "he"] } }), {})
    assert.match(p.i18n.locale, /useLocale\(\)/)
    assert.match(p.i18n.translate, /de, ar, he/)
    assert.match(p.i18n.translate, /messages\.en\.ts/)
    assert.ok(p.i18n.rtl)
    assert.equal(buildPlan(profile(), {}).i18n, null)
  })
})
