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

import { blockers, buildPlan, envFlagFor, iconLibraryFor, questions, resolveAnswers, unusedIconPackages } from "../src/plan.mjs"

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
    // the path question is replaced by an info line
    const q = questions(pr, {})
    assert.ok(!q.questions.some((x) => x.id === "path"))
    assert.match(q.infos[0].message, /Tailwind v3/)
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

  it("an existing ⌘K owner raises the question, defaulting to coexist (mod+j)", () => {
    const pr = profile(owned)
    const q = questions(pr, {}).questions.find((x) => x.id === "hotkey")
    assert.ok(q)
    assert.deepEqual(q.options.map((o) => o.value), ["takeover", "coexist", "yield", "off"])
    assert.equal(q.default, "coexist")
    assert.match(q.prompt, /CommandBar\.tsx:152/)
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
    assert.ok(!questions(profile(), {}).questions.some((x) => x.id === "hotkey"))
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
    assert.ok(questions(pr, {}).questions.find((q) => q.id === "theme").informational)
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
  it("no React, React 17, and no git are hard stops", () => {
    assert.ok(blockers(profile({ react: null })).some((b) => b.id === "no-react"))
    assert.ok(blockers(profile({ react: { version: "17.0.2", major: 17 } })).some((b) => b.id === "react-too-old"))
    const ng = blockers(profile({ git: { isRepo: false } }))
    assert.ok(ng.some((b) => b.id === "not-git" && /git init/.test(b.fix)))
  })

  it("governance: asked when CLAUDE.md exists, installed beside it with one pointer line", () => {
    const pr = profile({ agent: { claudeMd: true } })
    assert.equal(questions(pr, {}).questions.find((q) => q.id === "governance").default, "yes")
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
