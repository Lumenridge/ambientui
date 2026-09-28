/**
 * THE SURVEY AGAINST REAL FILES — the committed fixtures, plus three hosts
 * written to a temp dir in the shapes the real installs met (a Next.js app
 * router product, a Yarn-berry monorepo with a ⌘K palette, a webpack app
 * with no `@/` alias). `survey()` is called as a function: it reads, it
 * never writes, so nothing lands in the fixtures.
 *
 * The fixtures have no node_modules on purpose: versions come from the
 * declared ranges, which is what a fresh clone looks like.
 */
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { after, describe, it } from "node:test"
import { fileURLToPath } from "node:url"

import { buildPlan } from "../src/plan.mjs"
import { survey } from "../src/survey/index.mjs"

const FIXTURES = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures")
const temps = []
after(() => {
  for (const t of temps) rmSync(t, { recursive: true, force: true })
})

/** Write a project from a { path: content } map; optionally commit it. */
function project(files, { git = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ambientui-cli-"))
  temps.push(dir)
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true })
    writeFileSync(join(dir, p), typeof c === "string" ? c : JSON.stringify(c, null, 2))
  }
  if (git) {
    const g = (...a) => execFileSync("git", a, { cwd: dir, stdio: "ignore" })
    g("init", "-q")
    g("add", "-A")
    g("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "base")
  }
  return dir
}

const ev = (p, key) => p.evidence[key]?.[0]

describe("fixtures/consumer — Tailwind v4, colour tokens", () => {
  const p = survey(join(FIXTURES, "consumer"))

  it("reads the stack from the declared ranges", () => {
    assert.equal(p.framework.name, "vite")
    assert.equal(p.react.major, 19)
    assert.equal(p.react.source, "declared")
    assert.equal(p.styling.tailwind.major, 4)
    assert.equal(p.styling.tailwind.source, "declared")
    assert.equal(p.confidence.tailwind.level, "medium", "a declared range is not an installed version")
  })

  it("finds the CSS entry, the directive, and colour tokens with every role", () => {
    assert.equal(p.styling.entry, "src/index.css")
    assert.equal(p.styling.directive.kind, "v4-import")
    assert.equal(p.styling.preflight, true)
    assert.equal(p.tokens.format, "color")
    assert.deepEqual(p.tokens.missing, [])
    assert.equal(ev(p, "tokens").file, "src/index.css")
    assert.ok(ev(p, "tokens").line > 1)
  })

  it("resolves @/ everywhere and the source root", () => {
    assert.equal(p.srcRoot, "src")
    assert.equal(p.aliases.atResolves, true)
    assert.equal(p.aliases.bundler.hasAt, true)
    assert.equal(p.shadcn.utils.file, "src/lib/utils.ts")
    assert.equal(p.shadcn.utils.definesCn, true)
    assert.equal(p.entry.file, "src/main.tsx")
    assert.equal(p.env.stubFlag, "VITE_AMBIENT_STUBS")
    assert.equal(p.darkMode.mechanism, "html-class")
  })

  it("every printed fact carries evidence", () => {
    for (const k of ["repo.appDir", "framework", "react", "styling.tailwind", "styling.cssEntry", "tokens", "hotkeys", "zIndex", "network", "ai", "darkMode"]) {
      assert.ok(p.evidence[k]?.length, `no evidence for ${k}`)
    }
  })

  it("plans the plain v4 layer door when the owner picks layer", () => {
    const plan = buildPlan(p, { path: "layer" })
    assert.deepEqual(plan.doors, ["start", "ambient-layer", "icon-hugeicons"])
    assert.equal(plan.css.mode, "v4-import")
    assert.deepEqual(plan.css.lines, ['@import "./styles/ambient.css";'])
  })
})

describe("fixtures/consumer-tw3 — Tailwind v3, HSL triplets", () => {
  const p = survey(join(FIXTURES, "consumer-tw3"))

  it("reads Tailwind 3.4 with its config, @tailwind base, and HSL-triplet tokens", () => {
    assert.equal(p.styling.tailwind.major, 3)
    assert.equal(p.styling.tailwind.minor, 4)
    assert.equal(p.styling.tailwind.config, "tailwind.config.js")
    assert.equal(p.styling.directive.kind, "v3-base")
    assert.equal(p.tokens.format, "hsl-triplet")
    assert.equal(p.tokens.sample.value, "0 0% 100%")
    assert.match(ev(p, "darkMode").note, /darkMode/)
  })

  it("plans the tw3 door, imported from the entry file", () => {
    const plan = buildPlan(p, {})
    assert.equal(plan.path, "layer")
    assert.deepEqual(plan.doors, ["start", "ambient-layer-tw3", "icon-hugeicons"])
    assert.equal(plan.css.mode, "v3-entry-import")
    assert.equal(plan.css.entryFile, "src/main.tsx")
    assert.deepEqual(plan.css.lines, ['import "./styles/ambient.css"'])
  })
})

describe("fixtures/consumer-bare — Tailwind v4 without its reset, no shadcn", () => {
  const p = survey(join(FIXTURES, "consumer-bare"))

  it("sees the partial import (no preflight) and no tokens", () => {
    assert.equal(p.styling.tailwind.major, 4)
    assert.equal(p.styling.directive.kind, "partial")
    assert.equal(p.styling.preflight, false)
    assert.equal(p.tokens.format, "none")
  })

  it("plans ambient-base + scoped CSS into the existing stylesheet", () => {
    const plan = buildPlan(p, { path: "layer" })
    assert.deepEqual(plan.doors, ["start", "ambient-base", "ambient-layer", "icon-hugeicons"])
    assert.equal(plan.css.mode, "scoped")
    assert.equal(plan.css.create, false)
  })
})

describe("a Next.js app-router product (Invoify's shape)", () => {
  const dir = project({
    "package.json": {
      name: "invoicer",
      scripts: { dev: "next dev", build: "next build", lint: "next lint" },
      dependencies: { next: "15.3.8", react: "18.2.0", "react-dom": "18.2.0", "next-intl": "^4.1.0", "lucide-react": "^0.279.0", "@radix-ui/react-dialog": "^1.1.15", tailwindcss: "3.3.5" },
      devDependencies: { "@types/react": "^18.2.22", typescript: "5.2.2" },
    },
    "next.config.js": "module.exports = {}\n",
    "tsconfig.json": { compilerOptions: { strict: true, paths: { "@/*": ["./*"] } }, include: ["**/*.ts", "**/*.tsx"] },
    "tailwind.config.js": 'module.exports = { darkMode: ["class"], content: ["./app/**/*.tsx"] }\n',
    "components.json": { style: "default", tailwind: { config: "tailwind.config.js", css: "app/globals.css" }, aliases: { ui: "@/components/ui", utils: "@/lib/utils" } },
    "app/globals.css": "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n@layer base {\n  :root {\n    --background: 240 25% 98%;\n    --popover: 0 0% 100%;\n    --primary: 248 78% 60%;\n  }\n}\n",
    "app/[locale]/layout.tsx": 'import "@/app/globals.css"\nimport Providers from "@/contexts/Providers"\n\nexport const metadata = { title: "Invoicer | Free invoice generator" }\n\nexport default function Layout({ children }) {\n  return <html><body><Providers>{children}</Providers></body></html>\n}\n',
    "contexts/Providers.tsx": '"use client"\nexport default function Providers({ children }) { return <>{children}</> }\n',
    "app/components/MobileActionBar.tsx": 'export const Bar = () => <div className="fixed inset-x-0 bottom-0 z-[60] md:hidden">…</div>\n',
    "i18n/locales/en.json": "{}",
    "i18n/locales/ar.json": "{}",
    "i18n/locales/he.json": "{}",
    "i18n/locales/de.json": "{}",
  })
  const p = survey(dir)

  it("detects the app router, its layout, and the client providers to mount in", () => {
    assert.equal(p.framework.name, "next")
    assert.equal(p.framework.router, "app")
    assert.equal(p.framework.rsc, true)
    assert.equal(p.entry.file, "app/[locale]/layout.tsx")
    assert.equal(p.entry.rootComponent, "contexts/Providers.tsx")
  })

  it("Tailwind 3.3 with HSL triplets; NEXT_PUBLIC_ env; RTL locales; the fixed bar; lucide's old names", () => {
    assert.equal(p.styling.tailwind.minor, 3)
    assert.equal(p.tokens.format, "hsl-triplet")
    assert.equal(p.env.stubFlag, "NEXT_PUBLIC_AMBIENT_STUBS")
    assert.equal(p.env.read, "process.env.NEXT_PUBLIC_AMBIENT_STUBS")
    assert.equal(p.i18n.lib, "next-intl")
    assert.deepEqual(p.i18n.rtl, ["ar", "he"])
    assert.equal(p.fixedBottom[0].file, "app/components/MobileActionBar.tsx")
    assert.equal(p.zIndex.max, 60)
    assert.equal(p.icons[0].legacyNames, true)
    assert.equal(p.product.name, "Invoicer")
  })

  it("plans the 3.4 bump, the tw3 door from the layout, zIndex and the mr anchor", () => {
    const plan = buildPlan(p, {})
    assert.ok(plan.requiredSteps.some((s) => s.id === "tailwind-3.4"))
    assert.deepEqual(plan.doors, ["start", "ambient-layer-tw3", "icon-hugeicons"])
    assert.equal(plan.css.entryFile, "app/[locale]/layout.tsx")
    assert.deepEqual(plan.css.lines, ['import "../../styles/ambient.css"'])
    assert.equal(plan.provider.zIndex, 61)
    assert.equal(plan.provider.defaultOrbAnchor, "mr")
    assert.equal(plan.mount.file, "contexts/Providers.tsx")
    assert.ok(plan.i18n.rtl)
  })
})

describe("a Yarn-berry monorepo with a ⌘K palette (Actual's shape)", () => {
  const dir = project({
    "package.json": { name: "money", private: true, workspaces: { packages: ["packages/*"] }, packageManager: "yarn@4.17.1" },
    ".yarnrc.yml": "nodeLinker: node-modules\nyarnPath: .yarn/releases/yarn-4.17.1.cjs\n",
    "yarn.lock": "__metadata:\n  version: 8\n",
    "packages/web/package.json": {
      name: "@money/web",
      scripts: { start: "cross-env PORT=3001 vite", build: "vite build", test: "vitest --run", typecheck: "tsc -b" },
      imports: { "#components/*": "./src/components/*.tsx" },
      devDependencies: { react: "19.2.7", "react-dom": "19.2.7", vite: "^8.1.5", vitest: "^5.0.0", cmdk: "^1.1.1", "@emotion/css": "^11.13.5", "vite-plugin-pwa": "^1.3.0" },
    },
    "packages/web/vite.config.mts": "export default defineConfig({\n  envPrefix: 'REACT_APP_',\n  plugins: [VitePWA({ workbox: { maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 } })],\n  test: { environment: 'jsdom' },\n})\n",
    "packages/web/index.html": '<title>Money</title><script type="module" src="/src/index.tsx"></script>',
    "packages/web/tsconfig.json": { compilerOptions: {}, include: ["src/**/*.tsx"] },
    "packages/web/src/index.tsx": 'import { App } from "./components/App"\ncreateRoot(el).render(<App />)\n',
    "packages/web/src/components/App.tsx": "export function App() { return <div style={{ zIndex: 10000 }} /> }\n",
    "packages/web/src/components/CommandBar.tsx":
      "export function CommandBar() {\n  useEffect(() => {\n    const h = (e) => {\n      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) setOpen(true)\n    }\n  })\n  const items = [{ id: 'budget', name: t('Budget') }, { id: 'reports', name: t('Reports') }]\n}\n",
    "packages/web/src/budget/Budget.tsx": "import { send } from 'loot/client'\n",
    "packages/web/src/budget/A.tsx": "import { send } from 'loot/client'\n",
    "packages/web/src/budget/B.tsx": "import { send } from 'loot/client'\n",
    "packages/web/src/budget/C.tsx": "import { send } from 'loot/client'\n",
    "packages/web/src/budget/D.tsx": "import { send } from 'loot/client'\n",
    "packages/docs/package.json": { name: "docs", dependencies: { react: "19.0.0" } },
  })
  const p = survey(dir)

  it("picks the app package and reads yarn berry through its bundled release", () => {
    assert.equal(p.repo.appDirFromRoot, "packages/web")
    assert.deepEqual(p.repo.monorepo, ["workspaces"])
    assert.equal(p.packageManager.name, "yarn")
    assert.equal(p.packageManager.version, "4.17.1")
    assert.equal(p.packageManager.berry, true)
    assert.equal(p.packageManager.yarnPath, ".yarn/releases/yarn-4.17.1.cjs")
    assert.equal(p.deps.convention, "devDependencies-only")
  })

  it("finds the ⌘K owner with file:line and the palette's entries", () => {
    assert.equal(p.hotkeys.conflict, true)
    assert.ok(p.hotkeys.owners.some((o) => o.kind === "dependency" && o.name === "cmdk"))
    const h = p.hotkeys.owners.find((o) => o.kind === "handler")
    assert.equal(h.file, "packages/web/src/components/CommandBar.tsx")
    assert.equal(h.line, 4)
    assert.deepEqual(p.hotkeys.features[0].items, ["Budget", "Reports"])
  })

  it("REACT_APP_ under Vite, # imports, emotion, PWA limit, the send() bridge, no @/", () => {
    assert.equal(p.env.stubFlag, "REACT_APP_AMBIENT_STUBS")
    assert.equal(p.env.read, "import.meta.env.REACT_APP_AMBIENT_STUBS")
    assert.equal(p.aliases.subpathImports, true)
    assert.deepEqual(p.styling.cssInJs, ["@emotion/css"])
    assert.equal(p.bundle.precacheLimit.bytes, 10 * 1024 * 1024)
    assert.equal(p.network.transports[0].kind, "send-bridge")
    assert.equal(p.aliases.atResolves, false)
    assert.equal(p.scripts.port, 3001)
    assert.equal(p.entry.rootComponent, "packages/web/src/components/App.tsx")
  })

  it("plans: commands in the package, coexist on mod+j, worker-ipc, lazy mount, alias edits", () => {
    const plan = buildPlan(p, {})
    assert.ok(plan.commands.every((c) => c.cwd === "packages/web"))
    assert.equal(plan.provider.hotkey, "mod+j")
    assert.equal(plan.transport.kind, "worker-ipc")
    assert.equal(plan.mount.lazy, true)
    assert.equal(plan.provider.zIndex, 10001)
    assert.ok(plan.aliasEdits.some((e) => e.where === "tsconfig" && e.file === "packages/web/tsconfig.json"))
    assert.ok(plan.aliasEdits.some((e) => e.where === "bundler"))
    assert.equal(plan.aliasEdits.filter((e) => e.file === "packages/web/vite.config.mts").length, 1, "the vitest block reads the vite config: one edit, not two")
  })
})

describe("a webpack app with a backend beside it and no @/ (tududi's shape)", () => {
  const dir = project({
    "package.json": {
      name: "tasks",
      scripts: { test: "cd backend && jest", "frontend:test": "jest", build: "webpack", start: "webpack serve" },
      devDependencies: { react: "^18.3.1", "react-dom": "^18.3.1", webpack: "^5", tailwindcss: "^3.4.13", jest: "^29", "ts-jest": "^29", "react-i18next": "^15" },
    },
    "webpack.config.js":
      "module.exports = {\n  entry: './frontend/index.tsx',\n  devServer: { port: frontendPort },\n  plugins: [\n    new webpack.DefinePlugin(\n      Object.fromEntries(Object.entries({\n        TASKS_BASE_PATH: process.env.TASKS_BASE_PATH || '',\n      }).map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)]))\n    ),\n  ],\n}\nconst frontendPort = parseInt(process.env.FRONTEND_PORT || '8080', 10)\n",
    "jest.config.js": "module.exports = { preset: 'ts-jest' }\n",
    "tsconfig.json": { compilerOptions: { strict: false }, include: ["frontend/**/*"] },
    "tailwind.config.js": "module.exports = { darkMode: 'class' }\n",
    "frontend/index.tsx": "import './styles/tailwind.css'\nimport App from './App'\nroot.render(<ToastProvider><App /></ToastProvider>)\nimport { ToastProvider } from './Toast'\n",
    "frontend/App.tsx": "document.documentElement.classList.add('dark')\n",
    "frontend/Toast.tsx": "export const ToastProvider = ({ children }) => children\n",
    "frontend/styles/tailwind.css": "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n",
    "frontend/utils/areasService.ts": "export const a = () => fetch(getApiPath('areas'), { credentials: 'include' })\nexport const b = () => fetch(getApiPath('b'))\nexport const c = () => fetch(getApiPath('c'))\n",
    "frontend/config/paths.ts": "export function getApiPath(p) { return `/api/${p}` }\n",
    "backend/app.js": "const OpenAI = require('openai')\n",
  })
  const p = survey(dir)

  it("the source root is the entry's directory; the frontend test script, not the backend's", () => {
    assert.equal(p.framework.name, "webpack")
    assert.equal(p.entry.file, "frontend/index.tsx")
    assert.equal(p.entry.rootComponent, "frontend/App.tsx", "App, not the ToastProvider that wraps it")
    assert.equal(p.srcRoot, "frontend")
    assert.equal(p.confidence.srcRoot.level, "medium")
    assert.equal(p.scripts.test.name, "frontend:test")
    assert.equal(p.scripts.port, 8080)
  })

  it("webpack DefinePlugin keys give the env flag; the fetch helper is named", () => {
    assert.deepEqual(p.env.definePluginKeys, ["TASKS_BASE_PATH"])
    assert.equal(p.env.stubFlag, "AMBIENT_STUBS")
    assert.equal(p.env.read, "process.env.AMBIENT_STUBS")
    assert.equal(p.network.helper.name, "getApiPath")
    assert.equal(p.network.helper.file, "frontend/config/paths.ts")
    assert.ok(p.network.auth.credentialsInclude)
    assert.equal(p.jest.cjs, true)
    assert.equal(p.tokens.format, "none")
  })

  it("plans the alias edits, the DefinePlugin step, the v3 token door and the jest mock", () => {
    const plan = buildPlan(p, {})
    assert.deepEqual(plan.doors, ["start", "ambient-tokens-hsl", "ambient-layer-tw3", "icon-hugeicons"])
    assert.ok(plan.requiredSteps.some((s) => s.id === "define-stub-flag"))
    assert.ok(plan.requiredSteps.some((s) => s.id === "components-json"))
    const ts = plan.aliasEdits.find((e) => e.where === "tsconfig")
    assert.match(ts.snippet, /\.\/frontend\/\*/)
    assert.equal(plan.css.entryFile, "frontend/index.tsx")
    assert.ok(plan.tests.mocks.length)
  })
})

describe("no git", () => {
  it("is a blocker with the git init instruction", () => {
    const dir = project({ "package.json": { dependencies: { react: "^19.0.0" } }, "vite.config.ts": "" }, { git: false })
    const p = survey(dir)
    const plan = buildPlan(p, {})
    assert.ok(plan.blockers.some((b) => b.id === "not-git" && /git init/.test(b.fix)))
  })
})
