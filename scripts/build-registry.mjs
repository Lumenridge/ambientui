#!/usr/bin/env node
/**
 * Generates registry.json, then hands it to `shadcn build`.
 *
 * THE HOST IS A VARIABLE, IN ONE PLACE. Registry URLs get copied into other
 * people's repos and into their lockfiles of habit — they are the hardest
 * thing here to change later. Every cross-item reference is built from
 * REGISTRY_HOST, so moving to a domain is one env var, not a find-and-replace
 * across published JSON.
 *
 *   node scripts/build-registry.mjs
 *   AMBIENTUI_REGISTRY_HOST=http://localhost:4000 node scripts/build-registry.mjs
 *
 * `--check` regenerates into memory and fails if the committed registry.json
 * has drifted, so a hand-edit or a stale build cannot reach the gate.
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
} from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const HOST =
  process.env.AMBIENTUI_REGISTRY_HOST ?? "https://lumenridge.github.io/ambientui"
const url = (name) => `${HOST}/r/${name}.json`

/**
 * THE PUBLISHED FILES SPEAK THE CONSUMER'S DIALECT.
 *
 * In this repo the layer imports `@ambientui/ui/components/button` — a real
 * package specifier, which is what makes the boundary enforceable by the
 * compiler. In someone else's project that package does not exist, and the
 * shadcn CLI only rewrites `@/`-prefixed aliases to their configured ones.
 * Published verbatim, every installed file fails to resolve.
 *
 * So the build stages a rewritten copy. The repo keeps its enforced package
 * boundary; the artifact speaks alias. Nothing is hand-maintained in two
 * dialects — the transform is one map, applied at build.
 */
const IMPORT_REWRITES = [
  [/@ambientui\/ui\/components\//g, "@/components/ui/"],
  [/@ambientui\/ui\/lib\//g, "@/lib/"],
  [/@ambientui\/ui\/hooks\//g, "@/hooks/"],
]

const STAGE = ".registry"

function stage(relPath) {
  const src = resolve(ROOT, relPath)
  let text = readFileSync(src, "utf8")
  for (const [from, to] of IMPORT_REWRITES) text = text.replace(from, to)
  const out = resolve(ROOT, STAGE, relPath)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, text)
  return `${STAGE}/${relPath}`
}

const SRC = "packages/ambient/src"
const layerFiles = readdirSync(resolve(ROOT, SRC))
  .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
  .sort()

// one file, one type: hooks are hooks, plain .ts is lib, .tsx is a component
const fileType = (f) =>
  f.startsWith("use-")
    ? "registry:hook"
    : f.endsWith(".ts")
      ? "registry:lib"
      : "registry:component"

rmSync(resolve(ROOT, STAGE), { recursive: true, force: true })

const items = [
  {
    name: "ambient-styles",
    type: "registry:file",
    title: "Ambient material",
    description:
      "The glass recipes, translucency tokens, live border, glyph breath and stream edge that every ambient surface wears.",
    files: [
      {
        path: stage(`${SRC}/ambient.css`),
        type: "registry:file",
        target: "styles/ambient.css",
      },
    ],
    cssVars: {
      light: {
        "ambient-blur": "48px",
        "ambient-accent": "#2563eb",
        "ambient-accent-wash": "rgba(59, 130, 246, 0.1)",
      },
      dark: {
        "ambient-accent": "#4d9aff",
        "ambient-accent-wash": "rgba(61, 130, 246, 0.16)",
      },
    },
    docs: 'Add `@import "./styles/ambient.css";` to your globals.css, after `@import "tailwindcss"` and after your shadcn token block. Requires Tailwind v4 and the standard shadcn variables. --ambient-accent is the one value worth retuning per app: it drives the live border, the stream\'s leading edge and the shimmering placeholder.',
  },
  {
    name: "ambient-layer",
    type: "registry:block",
    title: "The ambient layer",
    description:
      "The complete AI assistant surface — orb, line, panel, dock, spotlight and history. It renders above your product rather than inside its component tree.",
    dependencies: [
      "framer-motion",
      "@paper-design/shaders-react",
      "@hugeicons/react",
      "@hugeicons/core-free-icons",
    ],
    registryDependencies: [
      url("ambient-styles"),
      url("icon"),
      "button",
      "input",
      "skeleton",
      "sidebar",
    ],
    files: layerFiles.map((f) => ({
      path: stage(`${SRC}/${f}`),
      type: fileType(f),
      target: `components/ambient/${f}`,
    })),
    docs: 'Import the material once: `@import "./styles/ambient.css";` in your globals.css. Then mount the layer at the root of your app:\n\n  <AssistantProvider navItems={NAV} onNavigate={(id) => router.push(id)}>\n    {children}\n    <Assistant />\n  </AssistantProvider>\n\nIt needs no other providers — it falls back to DEFAULT_AMBIENT_RUNTIME. Supply your own design system by wrapping it in AmbientRuntimeProvider. This copies ~8,300 lines you will own and can edit; prefer `npm i ambientui` if you want an upgrade path instead.',
  },
  {
    name: "icon",
    type: "registry:ui",
    title: "Icon",
    description:
      "One semantic name, drawn by whichever icon library the design system is configured to use. Components name what an icon MEANS; the library is a Foundation choice, not a per-component import.",
    dependencies: [
      "lucide-react",
      "@tabler/icons-react",
      "@phosphor-icons/react",
      "@remixicon/react",
      "@hugeicons/react",
      "@hugeicons/core-free-icons",
    ],
    files: [
      {
        path: stage("packages/ui/src/components/icon.tsx"),
        type: "registry:ui",
        target: "components/ui/icon.tsx",
      },
      {
        path: stage("packages/ui/src/lib/icon-library.ts"),
        type: "registry:lib",
        target: "lib/icon-library.ts",
      },
    ],
    docs: "Every name is mapped in all five libraries, so switching library redraws the whole product and never leaves a hole. That is why all five are dependencies: they are named ESM exports, so the bundle cost is near zero — the cost is install size. Wrap your app in IconLibraryProvider to choose one; it defaults to hugeicons.",
  },
  {
    name: "governance",
    type: "registry:file",
    title: "The governance layer for your AI",
    description:
      "The rules an AI agent works under in this system: the constitution's hard rules, plus three review roles — design-system manager, product-design manager, and copy.",
    files: [
      { path: "CLAUDE.md", type: "registry:file", target: "~/CLAUDE.md" },
      ...[
        "ds-manager/SKILL",
        "product-design-manager/SKILL",
        "product-copy/SKILL",
        "product-copy/REFERENCE",
      ].map((p) => ({
        path: `.claude/skills/${p}.md`,
        type: "registry:file",
        target: `~/.claude/skills/${p}.md`,
      })),
    ],
    docs: "These files are written for THIS repo and reference its paths. Read them and adapt the paths to your own before relying on them — an unedited copy will point an agent at directories you do not have.",
  },
]

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "ambientui",
  homepage: HOST,
  items,
}

// every declared path must exist, or we publish an item that 404s at install
for (const item of items) {
  for (const f of item.files) {
    if (!existsSync(resolve(ROOT, f.path))) {
      console.error(`✗ ${item.name}: missing file ${f.path}`)
      process.exit(1)
    }
  }
}

const out = JSON.stringify(registry, null, 2) + "\n"
const target = resolve(ROOT, "registry.json")

if (process.argv.includes("--check")) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : ""
  if (current !== out) {
    console.error(
      "✗ registry.json is stale or hand-edited. Run: npm run registry:build"
    )
    process.exit(1)
  }
  console.log(`✔ registry.json current (${items.length} items)`)
  process.exit(0)
}

writeFileSync(target, out)
console.log(`✔ registry.json — ${items.length} items, host ${HOST}`)
