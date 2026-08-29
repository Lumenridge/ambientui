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
import { readCatalog } from "./extract-catalog.mjs"
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


/* ------------------- deriving the per-component items ------------------- */

/**
 * WHICH FILE EXPORTS WHAT. Derived by reading the sources, never by a table
 * someone maintains — a mapping kept by hand is a mapping that goes stale the
 * first time a component moves between kits.
 */
function exportIndex() {
  const index = new Map()
  for (const f of layerFiles) {
    const text = readFileSync(resolve(ROOT, SRC, f), "utf8")
    for (const m of text.matchAll(/export (?:function|const) ([A-Z][A-Za-z0-9]*)/g)) {
      if (!index.has(m[1])) index.set(m[1], f)
    }
  }
  return index
}

/**
 * Everything a file needs from inside the layer, transitively. This is what
 * makes an alias item real: `add reasoning-panel` has to bring the stage
 * queue and the staging primitives with it, or it installs and does not
 * compile.
 */
function localClosure(entry) {
  const seen = new Set()
  const queue = [entry]
  while (queue.length) {
    const f = queue.shift()
    if (seen.has(f)) continue
    seen.add(f)
    const text = readFileSync(resolve(ROOT, SRC, f), "utf8")
    for (const m of text.matchAll(/from "\.\/([a-z-]+)"/g)) {
      const hit = layerFiles.find((x) => x.replace(/\.tsx?$/, "") === m[1])
      if (hit && !seen.has(hit)) queue.push(hit)
    }
  }
  return [...seen].sort()
}

/** The shadcn primitives a set of files actually reaches for. */
function shadcnDeps(files) {
  const deps = new Set()
  for (const f of files) {
    const text = readFileSync(resolve(ROOT, SRC, f), "utf8")
    for (const m of text.matchAll(/@ambientui\/ui\/components\/([a-z-]+)/g)) {
      deps.add(m[1] === "icon" ? url("icon") : m[1])
    }
  }
  return [...deps].sort()
}

const NPM_FOR = [
  [/from "framer-motion"/, "framer-motion"],
  [/@paper-design\/shaders-react/, "@paper-design/shaders-react"],
  [/@hugeicons\/react/, "@hugeicons/react"],
  [/@hugeicons\/core-free-icons/, "@hugeicons/core-free-icons"],
]
function npmDeps(files) {
  const deps = new Set()
  for (const f of files) {
    const text = readFileSync(resolve(ROOT, SRC, f), "utf8")
    for (const [re, name] of NPM_FOR) if (re.test(text)) deps.add(name)
  }
  return [...deps].sort()
}

const bullets = (label, list) =>
  list?.length ? `${label}\n${list.map((l) => `  \u2022 ${l}`).join("\n")}\n\n` : ""

/**
 * Documented, deliberately NOT separately installable. Every entry needs a
 * reason, and anything documented that is not here and does not resolve is a
 * BUILD FAILURE — that is the bijection: a component cannot quietly fall out
 * of the registry, and it cannot quietly appear in it undocumented either.
 */
const NOT_DISTRIBUTABLE = {
  "command-palette":
    "the palette is a surface of the Assistant, not a separate export — it ships with ambient-layer",
}

function componentItems() {
  const index = exportIndex()
  const catalog = readCatalog().filter((e) => e.vocabulary === "ambient")
  const items = []
  const orphans = []

  for (const entry of catalog) {
    // "DayDivider · MessageTime" — one documented entry covering sibling
    // components. The first that resolves names the kit; they share a file.
    const names = entry.name.split("·").map((n) => n.trim())
    const primary = names.find((n) => index.has(n))
    if (!primary) {
      orphans.push(entry)
      continue
    }
    const file = index.get(primary)
    const files = localClosure(file)
    const kitMates = [...index.entries()]
      .filter(([n, f]) => f === file && !names.includes(n))
      .map(([n]) => n)

    items.push({
      name: entry.id,
      type: "registry:ui",
      title: entry.name,
      description: entry.description,
      dependencies: npmDeps(files),
      registryDependencies: [
        url("ambient-styles"),
        // a component whose closure reaches the shader needs the shapes, or
        // it installs and renders a cold empty canvas
        ...(files.includes("orb-character.tsx") ? [url("ambient-assets")] : []),
        ...shadcnDeps(files),
      ],
      files: files.map((f) => ({
        path: stage(`${SRC}/${f}`),
        type: fileType(f),
        target: `components/ambient/${f}`,
      })),
      docs:
        bullets("WHEN TO USE", entry.whenToUse) +
        bullets("WHEN NOT TO USE", entry.whenNotToUse) +
        `${names.join(" and ")} ship${names.length > 1 ? "" : "s"} inside ${file}` +
        (kitMates.length
          ? `, alongside ${kitMates.length} sibling component${kitMates.length === 1 ? "" : "s"} (${kitMates.slice(0, 4).join(", ")}${kitMates.length > 4 ? ", …" : ""}). They share the stage queue and cannot be separated.`
          : ".") +
        `\n\n  import { ${names.join(", ")} } from "@/components/ambient/${file.replace(/\.tsx?$/, "")}"`,
      meta: { vocabulary: "ambient", kit: file },
    })
  }
  return { items, orphans }
}

const { items: perComponent, orphans } = componentItems()

/**
 * The orb's shader shapes. They are FILES, not code — the shader's loader
 * rejects data URIs — and they must land in the consumer's public root or
 * the orb renders a cold, empty canvas with no error anywhere. Shipping the
 * layer without them was a silent break of the product's own identity.
 */
const ORB_SHAPES = [
  "orb-circle.svg",
  "orb-rect.svg",
  "orb-rect-wide.svg",
  "orb-rect-tall.svg",
  "orb-rect-banner.svg",
]

const items = [
  {
    name: "ambient-assets",
    type: "registry:file",
    title: "The orb's shapes",
    description:
      "The five SVG shapes the heat shader wraps — the circle the orb wears and the rects a surface field fills. Static files, served from your public root.",
    files: ORB_SHAPES.map((f) => ({
      path: `packages/ambient/assets/${f}`,
      type: "registry:file",
      target: `public/${f}`,
    })),
    docs: "These land in public/ and are loaded by URL at runtime. If your app is served from a subpath, pass that base to the layer (assetBase on the runtime, or FoundationProvider's assetBase prop) — a root-absolute URL resolves against the domain, not your app.",
  },
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
      url("ambient-assets"),
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

items.push(...perComponent)

const unexplained = orphans.filter((o) => !(o.id in NOT_DISTRIBUTABLE))
if (unexplained.length) {
  console.error(
    "✗ documented but not resolvable to an export, and not listed as internal:\n" +
      unexplained.map((o) => `    ${o.id} (looked for ${o.name})`).join("\n") +
      "\n  Either name the export in ds-docs.tsx, or add it to NOT_DISTRIBUTABLE with a reason."
  )
  process.exit(1)
}
for (const o of orphans) console.log(`  · ${o.id}: ${NOT_DISTRIBUTABLE[o.id]}`)

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "ambientui",
  homepage: HOST,
  items,
}

// every declared path must exist, or we publish an item that 404s at install.
// `files ?? []` because an item may legitimately carry only cssVars.
for (const item of items) {
  for (const f of item.files ?? []) {
    if (!existsSync(resolve(ROOT, f.path))) {
      console.error(`✗ ${item.name}: missing file ${f.path}`)
      process.exit(1)
    }
  }
}

/**
 * FACTS THE SITE MUST NOT RETYPE. The install section needs the registry
 * host and the installable count; both were hand-written prose, which is
 * how a landing page ends up printing a dead URL or a stale number long
 * after the registry moved. Generated here, from the registry that was
 * just built, and checked by the same --check that guards registry.json.
 */
const factsTarget = resolve(ROOT, "apps/web/src/registry-facts.ts")
const facts =
  `// GENERATED by scripts/build-registry.mjs — do not edit.\n` +
  `// Run: npm run registry:build\n\n` +
  `export const REGISTRY_HOST = ${JSON.stringify(HOST)}\n` +
  `export const INSTALLABLE_COMPONENTS = ${
    items.filter((i) => i.meta?.vocabulary === "ambient").length
  }\n` +
  `export const REGISTRY_ITEMS = ${items.length}\n`

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
  const currentFacts = existsSync(factsTarget)
    ? readFileSync(factsTarget, "utf8")
    : ""
  if (currentFacts !== facts) {
    console.error(
      "✗ registry-facts.ts is stale. Run: npm run registry:build"
    )
    process.exit(1)
  }
  console.log(`✔ registry.json current (${items.length} items)`)
  process.exit(0)
}

writeFileSync(target, out)
writeFileSync(factsTarget, facts)
console.log(`✔ registry.json — ${items.length} items, host ${HOST}`)
