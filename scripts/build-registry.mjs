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
import { STACK_DOORS } from "../packages/cli/src/stacks.mjs"
import { fileURLToPath } from "node:url"
import { variant } from "./variants/index.mjs"
import { ICON_LIBRARIES, iconSourceFor } from "./variants/icons.mjs"
import { scopedPreflight } from "./variants/scoped-preflight.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
// The registry's public address: a subdomain of the product's own domain,
// served by the `ambientui-registry` Worker (wrangler.jsonc). Changing hosts
// again is: change this one line (or set the env var), rebuild, commit.
const HOST =
  process.env.AMBIENTUI_REGISTRY_HOST ?? "https://registry.ambientui.ai"
const url = (name) => `${HOST}/r/${name}.json`
const STAGE = ".registry"

/**
 * --finalize <publishDir>: post-process the `shadcn build` output into a
 * deployable static site.
 *
 * Scrub first: the build inlines each file's CONTENT but keeps its `path`
 * verbatim — which is the staging directory. `.registry/...` is this repo's
 * internal layout, meaningless to a consumer and one more thing that could
 * be mistaken for a fetchable URL. The published artifact names the real
 * source instead.
 *
 * Then the publish dir gets its own front matter: `_headers` (Cloudflare
 * Pages) opens CORS on /r/* — `npx shadcn add` fetches cross-origin — and a
 * one-page index says what this host is, because a bare 404 at the root of
 * an install URL reads as a dead service.
 */
const finalizeAt = process.argv.indexOf("--finalize")
if (finalizeAt !== -1) {
  const publishDir = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    process.argv[finalizeAt + 1] ?? ""
  )
  const dir = resolve(publishDir, "r")
  let scrubbed = 0
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const p = resolve(dir, f)
    const doc = JSON.parse(readFileSync(p, "utf8"))
    // an item carries `files` at the top; the index carries them per item
    for (const holder of doc.items ?? [doc]) {
      for (const file of holder.files ?? []) {
        if (file.path?.startsWith(`${STAGE}/`)) {
          // a variant's copy names the source it was rewritten from
          file.path = file.path
            .slice(STAGE.length + 1)
            .replace(/^variants\/[^/]+\//, "")
          scrubbed++
        }
      }
    }
    writeFileSync(p, JSON.stringify(doc, null, 2) + "\n")
  }

  writeFileSync(
    resolve(publishDir, "_headers"),
    "/r/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=300\n"
  )
  writeFileSync(
    resolve(publishDir, "index.html"),
    `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ambientui registry</title>
<style>body{font:16px/1.6 system-ui;max-width:40rem;margin:4rem auto;padding:0 1.5rem;color:#111}code{background:#f3f3f3;padding:.1em .35em;border-radius:4px}@media(prefers-color-scheme:dark){body{background:#111;color:#eee}code{background:#222}}</style>
<h1>ambientui registry</h1>
<p>The shadcn registry for <a href="https://github.com/Lumenridge/ambientui">ambientui</a> —
an AI layer that inherits your design system. Register it once:</p>
<p><code>npx shadcn registry add @ambientui=${HOST}/r/{name}.json</code></p>
<p>Then take a door:</p>
<p><code>npx shadcn add @ambientui/ambient-layer</code></p>
<p>The index of everything installable is <a href="/r/registry.json">/r/registry.json</a>.</p>
`
  )
  console.log(
    `✔ finalized ${process.argv[finalizeAt + 1]} — ${scrubbed} staging paths scrubbed, _headers + index.html written`
  )
  process.exit(0)
}

/**
 * THE PUBLISHED FILES SPEAK THE CONSUMER'S DIALECT.
 *
 * In this repo the layer imports `@ambient-ui/ui/components/button` — a real
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
  [/@ambient-ui\/ui\/components\//g, "@/components/ui/"],
  [/@ambient-ui\/ui\/lib\//g, "@/lib/"],
  [/@ambient-ui\/ui\/hooks\//g, "@/hooks/"],
  // `ambientui/...` — the layer's own specifier. Anchored on the quote so
  // it can never chew into the `@ambient-ui/` rules above, and placed after
  // them so those match first. Without this, the Foundation's ambient
  // bridge would install carrying an import nothing can resolve.
  [/(from\s+")ambientui\/([a-z-]+)"/g, '$1@/components/ambient/$2"'],
  // The Foundation's three files sit beside each other HERE and land in
  // three different directories THERE (lib/, components/), so a relative
  // import that is correct in this repo resolves to nothing in a consumer's.
  // These follow the targets declared on the items below.
  [/from\s+"\.\/tokens"/g, 'from "@/lib/foundation/tokens"'],
  [/from\s+"\.\/foundation-context"/g, 'from "@/components/foundation-provider"'],
  // The bare package root — the motion hooks the patterns reach for. In a
  // consumer's project those live in the installed foundation provider, so
  // any item using this rewrite must declare the `foundation` door as a
  // registry dependency.
  [/(from\s+")@ambient-ui\/foundation(")/g, "$1@/components/foundation-provider$2"],
]

/**
 * `v` is a variant from scripts/variants (or nothing, for the reference
 * environment). A variant's copy is staged under its own directory so
 * dialects of one source do not overwrite each other.
 */
function stage(relPath, v) {
  const src = resolve(ROOT, relPath)
  let text = readFileSync(src, "utf8")
  for (const [from, to] of IMPORT_REWRITES) text = text.replace(from, to)
  // LINT DIRECTIVES NAME OUR PLUGINS, NOT THEIRS. A rule name is an error in
  // a project without that plugin, so the published copy keeps each
  // directive's reach and drops the rule names.
  text = text
    .replace(/^\/\* eslint-disable react-refresh\/[^*]*\*\/\n/m, "")
    .replace(
      /(eslint-(?:disable|enable)(?:-next-line|-line)?)\s+(?:react-hooks|react-refresh)\/[\w-]+(?:\s*--[^*\n]*)?/g,
      "$1"
    )
  if (v?.source && /\.tsx?$/.test(relPath)) text = v.source(text, relPath)
  if (v?.css && relPath.endsWith(".css")) text = v.css(text)

  // NO WORKSPACE SPECIFIER MAY SURVIVE STAGING. A rewrite rule that does
  // not exist fails silently: the file publishes, installs, and then does
  // not resolve in someone else's project — the one failure this build
  // cannot see, because it happens in a repo that is not this one. A byte
  // scan on ~40 files makes the whole class impossible rather than fixing
  // instances of it.
  const leaked = text.match(/from\s+"(@ambient-?ui\/[^"]+|ambientui\/[^"]+)"/)
  if (leaked) {
    console.error(
      `✗ ${relPath} would publish an unresolvable import: ${leaked[1]}\n` +
        `  Add a rule to IMPORT_REWRITES — the consumer has no such package.`
    )
    process.exit(1)
  }

  const staged = v ? `${STAGE}/variants/${v.id}/${relPath}` : `${STAGE}/${relPath}`
  const out = resolve(ROOT, staged)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, text)
  return staged
}


/**
 * CSS is staged differently from code. `globals.css` is written for THIS
 * repo: its `@source` globs point at our directories (meaningless to a
 * consumer, and they would silently scan nothing), and it imports a
 * vendored copy of shadcn's base — 642 lines that would double-declare
 * `:root` against the token block the consumer already has from their own
 * `shadcn init`, and fight it. What ships is the part that is ABOUT this
 * system: the runtime variables and the bridge that routes Tailwind's
 * utilities through them.
 */
const CSS_STRIPS = [
  /^@source\s+.*$/gm,
  /^@import\s+"\.\/shadcn-base\.css";$/gm,
  /^@import\s+"tailwindcss".*$/gm,
  /^@import\s+"tw-animate-css";$/gm,
  /^@import\s+"@fontsource-variable\/geist";$/gm,
  /^@custom-variant\s+.*$/gm,
  // the comment block explaining the repo's own glob depth travels with it
  /\/\* @source resolves relative to THIS FILE[\s\S]*?\*\//g,
]

function stageCss(relPath, target) {
  let text = readFileSync(resolve(ROOT, relPath), "utf8")
  for (const re of CSS_STRIPS) text = text.replace(re, "")
  text = text.replace(/\n{3,}/g, "\n\n").trimStart()
  const banner =
    "/* ambientui — the Foundation's token bridge.\n" +
    "   Import AFTER `@import \"tailwindcss\"` and after your own shadcn\n" +
    "   token block: it maps Tailwind's utilities onto variables the\n" +
    "   Foundation writes at runtime. */\n\n"
  const out = resolve(ROOT, STAGE, target)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, banner + text)
  // DIRECTIVES, not mentions: a comment explaining why @source is absent
  // is not an @source. Checking the text for the word failed on this file's
  // own documentation, which is its own small lesson about assertions.
  const leaked = text.match(/^\s*(@source\b|@import\s+"\.\/shadcn-base)/m)
  if (leaked) {
    console.error(
      `✗ ${target}: repo-shaped CSS survived staging — ${leaked[1].trim()}`
    )
    process.exit(1)
  }
  return `${STAGE}/${target}`
}

/** A source file as the reference dialect would publish it (rewrites applied). */
function stagedSource(relPath) {
  return readFileSync(resolve(ROOT, stage(relPath)), "utf8")
}

/** Write already-transformed text into the stage; returns its staged path. */
function stageText(stagedRel, text) {
  const out = resolve(ROOT, STAGE, stagedRel)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, text)
  return `${STAGE}/${stagedRel}`
}

/** Tailwind v4's own preflight, scoped to the layer (variants/scoped-preflight.mjs). */
async function stagePreflight() {
  const source = readFileSync(resolve(ROOT, "node_modules/tailwindcss/preflight.css"), "utf8")
  return stageText("styles/ambient-preflight.css", await scopedPreflight(source))
}

const SRC = "packages/ambient/src"
const sourceFiles = readdirSync(resolve(ROOT, SRC))
  .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
  .sort()

/**
 * A CHAT STACK'S ADAPTER IS ITS OWN DOOR. `stack-<name>.ts` connects the
 * layer to one stack a product may already run; a product takes the door
 * for the stack it has and no other. `stack-parts.ts` is what they share,
 * and travels with each.
 */
const isStackFile = (f) => f.startsWith("stack-")
const STACK_SHARED = "stack-parts.ts"
const layerFiles = sourceFiles.filter((f) => !isStackFile(f))
const stackFiles = sourceFiles.filter((f) => isStackFile(f) && f !== STACK_SHARED)

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

/**
 * THE framer-motion A DOOR INSTALLS. Named with its range, never bare: a
 * bare name makes shadcn install whatever is latest, so a new major would
 * reach every fresh install untested. This is the major the layer is built
 * and tested on, the same one `ambientui` declares as its peer. Move both
 * together, after the layer has been run on the new major.
 */
const FRAMER_MOTION = "framer-motion@^13"

const NPM_FOR = [
  [/from "framer-motion"/, FRAMER_MOTION],
  [/@paper-design\/shaders-react/, "@paper-design/shaders-react"],
  [/@hugeicons\/react/, "@hugeicons/react"],
  [/@hugeicons\/core-free-icons/, "@hugeicons/core-free-icons"],
  [/from "zod"/, "zod"],
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

/** Shared by every dialect of the material, so the knobs cannot drift. */
// Not --ambient-blur: ambient.css declares it, and as a cssVar the shadcn
// CLI would define it as itself in the product's @theme inline block.
const AMBIENT_CSS_VARS = {
  light: {
    "ambient-accent": "#2563eb",
    "ambient-accent-wash": "rgba(59, 130, 246, 0.1)",
  },
  dark: {
    "ambient-accent": "#4d9aff",
    "ambient-accent-wash": "rgba(61, 130, 246, 0.16)",
  },
}

/** Shared by every dialect of the layer door. */
const LAYER_NPM = [
  FRAMER_MOTION,
  "@paper-design/shaders-react",
  "@hugeicons/react",
  "@hugeicons/core-free-icons",
  "zod",
]
const LAYER_PRIMITIVES = ["button", "input", "skeleton", "sidebar"]
/** npm packages a bundled primitive brings with it. */
const BUNDLE_NPM = { button: ["radix-ui", "class-variance-authority"] }
const TW3 = variant("styling", "tailwind-v3")

const items = [
  {
    name: "foundation-tokens",
    type: "registry:lib",
    title: "The configuration space",
    description:
      "Every dimension the design system can vary — accents, grays, the radius window, the spacing grid, scaling, the role map, motion characters, fonts, icon libraries — and the compiler that turns a config into CSS. Data and one pure function; no React.",
    dependencies: [],
    registryDependencies: [],
    files: [
      {
        path: stage("packages/foundation/src/tokens.ts"),
        type: "registry:lib",
        target: "lib/foundation/tokens.ts",
      },
    ],
    docs: "compileFoundationCss(config) returns the whole theme as text. Inject it into a <style> tag at runtime, or render it into your globals at build time — the provider is one way to use this, not the only one.\n\n  import { compileFoundationCss, DEFAULT_FOUNDATION } from \"@/lib/foundation/tokens\"",
    meta: { door: "foundation", layer: "data" },
  },
  {
    name: "foundation-theme",
    type: "registry:file",
    title: "The token bridge",
    description:
      "The runtime variables the Foundation drives — the radius window and the motion roles — and the @theme block that routes Tailwind's utilities through them.",
    files: [
      {
        path: stageCss(
          "packages/ui/src/styles/globals.css",
          "styles/foundation.css"
        ),
        type: "registry:file",
        target: "styles/foundation.css",
      },
    ],
    cssVars: {
      light: {
        "radius-window-xs": "0.125rem",
        "radius-window-sm": "0.25rem",
        "radius-window-md": "0.375rem",
        "radius-window-lg": "0.5rem",
        "radius-window-xl": "0.75rem",
        "radius-window-2xl": "1rem",
        "radius-window-3xl": "1.5rem",
        "radius-window-4xl": "2rem",
        "motion-micro": "120ms",
        "motion-control": "180ms",
        "motion-surface": "240ms",
        "motion-page": "320ms",
        "motion-ease": "cubic-bezier(0.2, 0, 0, 1)",
      },
    },
    docs: 'Add `@import "./styles/foundation.css";` to your globals.css, AFTER `@import "tailwindcss"` and after your own shadcn token block. It does not ship shadcn\'s base — run `npx shadcn init` first and keep yours.',
    meta: { door: "foundation", layer: "css" },
  },
  {
    name: "foundation",
    type: "registry:block",
    title: "The Foundation",
    description:
      "The design system as a bounded configuration space: pick the accent, the gray, the radius step, the spacing unit, the motion character, and every surface follows. Saving is the commit point.",
    dependencies: [],
    registryDependencies: [
      url("foundation-tokens"),
      url("foundation-theme"),
      url("icon"),
    ],
    files: [
      {
        path: stage("packages/foundation/src/foundation-context.tsx"),
        type: "registry:component",
        target: "components/foundation-provider.tsx",
      },
    ],
    docs: "Wrap your app:\n\n  <FoundationProvider>{children}</FoundationProvider>\n\nIt compiles the config into a <style id=\"ambientui-foundation\"> tag and persists it under \"ambientui-foundation\". It does NOT mount an assistant — if you took the ambient layer too, add foundation-ambient-bridge.",
    meta: { door: "foundation", layer: "runtime" },
  },
  {
    name: "foundation-ambient-bridge",
    type: "registry:component",
    title: "Foundation → ambient layer",
    description:
      "Binds the ambient layer's motion, palette and stream pace to your Foundation config, so the assistant has no values of its own.",
    dependencies: [],
    registryDependencies: [url("foundation"), url("ambient-layer")],
    files: [
      {
        path: stage("packages/foundation/src/ambient-bridge.tsx"),
        type: "registry:component",
        target: "components/foundation-ambient-bridge.tsx",
      },
    ],
    docs: "Only needed if you took BOTH doors. Mount it inside FoundationProvider:\n\n  <FoundationProvider>\n    <FoundationAmbientBridge>{children}</FoundationAmbientBridge>\n  </FoundationProvider>",
    meta: { door: "foundation", layer: "bridge" },
  },
  {
    name: "ambient-assets",
    type: "registry:file",
    title: "The orb's shapes",
    description:
      "The five SVG shapes the heat shader wraps — the circle the orb wears and the rects a surface field fills. Static files, served from your public root.",
    files: ORB_SHAPES.map((f) => ({
      path: `packages/ambient/assets/${f}`,
      type: "registry:file",
      target: `~/public/${f}`,
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
        path: stage(`${SRC}/styles/ambient.css`),
        type: "registry:file",
        target: "styles/ambient.css",
      },
    ],
    cssVars: AMBIENT_CSS_VARS,
    docs: 'Add `@import "./styles/ambient.css";` to your globals.css, after `@import "tailwindcss"` and after your shadcn token block. Requires Tailwind v4 and the standard shadcn variables. --ambient-accent is the one value worth retuning per app: it drives the live border, the stream\'s leading edge and the shimmering placeholder.',
  },
  {
    name: "ambient-layer",
    type: "registry:block",
    title: "The ambient layer",
    description:
      "The complete AI assistant surface — orb, line, panel, dock, spotlight and history. It renders above your product rather than inside its component tree.",
    dependencies: LAYER_NPM,
    registryDependencies: [
      url("ambient-styles"),
      url("ambient-assets"),
      url("icon"),
      ...LAYER_PRIMITIVES,
    ],
    files: layerFiles.map((f) => ({
      path: stage(`${SRC}/${f}`),
      type: fileType(f),
      target: `components/ambient/${f}`,
    })),
    docs: 'Import the material once: `@import "./styles/ambient.css";` in your globals.css. Then mount the layer at the root of your app:\n\n  <AssistantProvider navItems={NAV} onNavigate={(id) => router.push(id)}>\n    {children}\n    <Assistant />\n  </AssistantProvider>\n\nIt needs no other providers — it falls back to DEFAULT_AMBIENT_RUNTIME. Supply your own design system by wrapping it in AmbientRuntimeProvider. This copies ~8,300 lines you will own and can edit — owning the source is the point; prefer `npm i ambientui` if you want an upgrade path instead.',
  },
  /**
   * THE TAILWIND v3 DOOR. The same layer, rewritten for Tailwind 3.4+
   * (scripts/variants/tailwind-v3.mjs), so adopting the assistant never
   * forces a Tailwind upgrade on a product. Its material is the HSL-triplet
   * stylesheet, shadcn's v3 token format.
   *
   * Layer only: the Foundation drives Tailwind through v4's @theme and has no
   * v3 form.
   */
  {
    name: "ambient-styles-hsl",
    type: "registry:file",
    title: "Ambient material (HSL-triplet tokens)",
    description:
      "The ambient material for a project whose shadcn tokens are HSL triplets (--popover: 0 0% 100%), which is shadcn's Tailwind v3 format. Same file as ambient-styles, with every standard role read through hsl().",
    files: [
      {
        path: stage(`${SRC}/styles/ambient.css`, variant("tokens", "hsl-triplet")),
        type: "registry:file",
        target: "styles/ambient.css",
      },
    ],
    cssVars: AMBIENT_CSS_VARS,
    docs: 'Take this instead of ambient-styles when your tokens look like `--popover: 0 0% 100%`: ambient.css mixes the roles inside color-mix(), and a bare triplet there is not a colour, so every surface renders transparent with no error. On Tailwind v4, `@import "./styles/ambient.css";` after `@import "tailwindcss"`. On Tailwind v3, import it from your entry file on the line after your global stylesheet (`import "./styles/ambient.css"`).',
    meta: { base: "ambient-styles", variant: { tokens: "hsl-triplet" } },
  },
  {
    name: "ambient-layer-tw3",
    type: "registry:block",
    title: "The ambient layer (Tailwind v3)",
    description:
      "The complete AI assistant surface, rewritten for Tailwind 3.4+ so the product keeps its Tailwind version. Same components, same props, same contract as ambient-layer.",
    dependencies: [...LAYER_NPM, ...TW3.bundles.flatMap((b) => BUNDLE_NPM[b])],
    registryDependencies: [
      url("ambient-styles-hsl"),
      url("ambient-assets"),
      url("icon"),
      ...LAYER_PRIMITIVES.filter((p) => !TW3.bundles.includes(p)),
    ],
    files: [
      ...layerFiles.map((f) => ({
        path: stage(`${SRC}/${f}`, TW3),
        type: fileType(f),
        target: `components/ambient/${f}`,
      })),
      ...TW3.bundles.map((b) => ({
        path: stage(`packages/ui/src/components/${b}.tsx`, TW3),
        type: "registry:component",
        target: `components/ambient/ui/${b}.tsx`,
      })),
    ],
    docs: 'For a project on Tailwind 3.4 or later that is not moving to v4. Import the material from your entry file, on the line after your global stylesheet:\n\n  import "./index.css"\n  import "./styles/ambient.css"\n\nThen mount it exactly as ambient-layer:\n\n  <AssistantProvider navItems={NAV} onNavigate={(id) => router.push(id)}>\n    {children}\n    <Assistant />\n  </AssistantProvider>\n\nYour tailwind.config must include the installed files in `content` (components/ambient/**) and map the standard shadcn colours as hsl(var(--x)), which `shadcn init` for v3 already does. The door ships its own button (components/ambient/ui/button.tsx) and never replaces yours. Layer only: the Foundation needs Tailwind v4.',
    meta: { base: "ambient-layer", variant: { styling: "tailwind-v3", tokens: "hsl-triplet" } },
  },
  ...stackFiles.map((f) => {
    const name = f.replace(/\.ts$/, "")
    const about = STACK_DOORS[name]
    if (!about) throw new Error(`${f} has no entry in STACK_DOORS (packages/cli/src/stacks.mjs)`)
    return {
      name,
      type: "registry:lib",
      title: about.title,
      description: about.description,
      files: [f, STACK_SHARED].map((file) => ({
        path: stage(`${SRC}/${file}`),
        type: "registry:lib",
        target: `components/ambient/${file}`,
      })),
      docs: about.docs,
    }
  }),
  /**
   * THE BASE FOR A PRODUCT WITHOUT shadcn OR TAILWIND. What the layer
   * assumes a shadcn project has, shipped as items instead of a `shadcn init`
   * that would rewrite the product's stylesheet.
   */
  {
    name: "ambient-utils",
    type: "registry:lib",
    title: "The class helper",
    description:
      "`cn`, the class-merging helper every layer and shadcn file imports from @/lib/utils. For a product that has not run `shadcn init`.",
    dependencies: ["clsx", "tailwind-merge"],
    files: [
      {
        path: stage("packages/ui/src/lib/utils.ts"),
        type: "registry:lib",
        target: "lib/utils.ts",
      },
    ],
    docs: "Only for a product without lib/utils.ts. If yours has one, keep it: the layer needs only a `cn` export there.",
  },
  {
    name: "ambient-tokens",
    type: "registry:file",
    title: "Standard roles (Tailwind v4)",
    description:
      "The standard shadcn colour roles at zero specificity, with the @theme mapping Tailwind v4 needs, for a product on Tailwind without shadcn. Any role the product defines wins.",
    registryDependencies: [url("ambient-utils")],
    files: [
      {
        path: stage(`${SRC}/styles/ambient-tokens.css`),
        type: "registry:file",
        target: "styles/ambient-tokens.css",
      },
    ],
    docs: 'Import before the material: `@import "./styles/ambient-tokens.css";` then `@import "./styles/ambient.css";`, both after `@import "tailwindcss"`. Map the roles onto your own palette when you want the layer to match the product.',
  },
  {
    name: "ambient-tokens-hsl",
    type: "registry:file",
    title: "Standard roles (Tailwind v3)",
    description:
      "The standard shadcn colour roles as HSL channels at zero specificity, for a product on Tailwind v3 without shadcn. Your tailwind.config must map them as hsl(var(--x)).",
    registryDependencies: [url("ambient-utils")],
    files: [
      {
        path: stage(`${SRC}/styles/ambient-tokens-hsl.css`),
        type: "registry:file",
        target: "styles/ambient-tokens-hsl.css",
      },
    ],
    docs: 'Import it from your entry file before the material: `import "./styles/ambient-tokens-hsl.css"` then `import "./styles/ambient.css"`. Add the colour mapping `shadcn init` writes for v3 to tailwind.config (border, input, ring, background, foreground, and primary/secondary/destructive/muted/accent/popover/card with foregrounds, each `hsl(var(--name))`).',
  },
  {
    name: "ambient-base",
    type: "registry:file",
    title: "The base for a product without Tailwind",
    description:
      "Tailwind's preflight confined to the ambient layer (.ambient-scope), so a product styled another way keeps every screen exactly as it was. Brings the standard roles and the class helper.",
    registryDependencies: [url("ambient-tokens")],
    files: [
      {
        path: await stagePreflight(),
        type: "registry:file",
        target: "styles/ambient-preflight.css",
      },
    ],
    docs: 'Install Tailwind v4 WITHOUT its global preflight. In your global stylesheet:\n\n  @layer theme, base, components, utilities;\n  @import "tailwindcss/theme.css" layer(theme);\n  @import "./styles/ambient-preflight.css" layer(base);\n  @import "tailwindcss/utilities.css" layer(utilities);\n  @import "./styles/ambient-tokens.css";\n  @import "./styles/ambient.css";\n\n`@import "tailwindcss"` would bring the global reset, which restyles a product not built on it.',
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
  /**
   * ONE ICON LIBRARY (scripts/variants/icons.mjs): icon.tsx cut to the
   * library the product already uses. The full `icon` stays the layer's
   * dependency, so a manual install keeps working; the install plan adds the
   * matching one of these LAST and removes the other four packages.
   */
  ...Object.entries(ICON_LIBRARIES).map(([lib, meta]) => ({
    name: `icon-${lib}`,
    type: "registry:ui",
    title: `Icon (${lib} only)`,
    description: `The Icon component drawing every name with ${lib} alone, for a product that already uses it and never switches libraries.`,
    dependencies: [...new Set([...meta.packages, "@hugeicons/react", "@hugeicons/core-free-icons"])],
    files: [
      {
        path: stageText(
          `variants/icon-${lib}/packages/ui/src/components/icon.tsx`,
          iconSourceFor(lib, stagedSource("packages/ui/src/components/icon.tsx"))
        ),
        type: "registry:ui",
        target: "components/ui/icon.tsx",
      },
      {
        path: stage("packages/ui/src/lib/icon-library.ts"),
        type: "registry:lib",
        target: "lib/icon-library.ts",
      },
    ],
    docs: `Replaces components/ui/icon.tsx. Install it after the layer; the other icon packages the full \`icon\` brought can then be removed. The layer's own few HugeIcons marks keep that package.`,
    meta: { base: "icon", variant: { icons: lib } },
  })),
  {
    name: "start",
    type: "registry:file",
    title: "From nothing to Cmd-K",
    description:
      "The guided setup, written for the AI agent doing the work: install the system, ask the owner for one inspiration reference, express it as Foundation configuration, build the product, and end with the spotlight open. Installs as a skill WITH the constitution beside it - DESIGN.md is the logic the journey runs on (a reference is a request for a configuration; every dimension derives from tokens), and a setup that skips it produces screens whose borders and corners do not follow the theme.",
    files: [
      {
        path: "docs/start.md",
        type: "registry:file",
        target: "~/.claude/skills/ambientui-start/SKILL.md",
      },
      // THE CONSTITUTION RIDES WITH THE SKILL (owner's strict guideline,
      // 2026-09-12): the guide's steps only work because DESIGN.md
      // defines them - the reference->configuration procedure and the
      // propagation rules. Shipping the skill without it produced setups
      // where the docs' logic never reached the agent, and the built
      // product's borders did not re-theme.
      {
        path: "DESIGN.md",
        type: "registry:file",
        target: "~/.claude/skills/ambientui-start/DESIGN.md",
      },
      // how the agent checks the doctor's heuristic survey against the code
      {
        path: "docs/doctor.md",
        type: "registry:file",
        target: "~/.claude/skills/ambientui-start/doctor.md",
      },
    ],
    docs: "Also readable without installing anything: tell your agent to read https://ambientui.ai/start.md and set the project up. The installed copy makes the guidance part of the repo, so any future session finds it - and DESIGN.md lands beside the skill, because the journey's rules live there.",
  },
  {
    name: "governance",
    type: "registry:file",
    title: "The governance layer for your AI",
    description:
      "The rules an AI agent works under in this system: the constitution's hard rules, plus three review roles — design-system manager, product-design manager, and copy.",
    files: [
      // NOT the product's CLAUDE.md, which it must not replace. start.md has
      // the agent add one pointer line to it.
      { path: "CLAUDE.md", type: "registry:file", target: "~/.claude/ambientui/CLAUDE.md" },
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

/**
 * PROMOTED PRODUCT PATTERNS — ambientui extensions to the product
 * vocabulary (SectionRail, ViewMenu, the settings kit). Unlike the ambient
 * vocabulary these do not share one source directory, so they are listed by
 * hand — but their prose still comes from the catalog, because an item whose
 * description drifts from its documentation is two sources of truth.
 */
const productDocs = new Map(
  readCatalog()
    .filter((e) => e.vocabulary === "product")
    .map((e) => [e.id, e])
)

function productItem(id, { file, target, dependencies = [], registryDependencies = [], exportsNames }) {
  const entry = productDocs.get(id)
  if (!entry) {
    console.error(`✗ ${id}: promoted pattern is not documented in the catalog`)
    process.exit(1)
  }
  return {
    name: id,
    type: "registry:ui",
    title: entry.name,
    description: entry.description,
    dependencies,
    registryDependencies,
    files: [{ path: stage(file), type: "registry:ui", target }],
    docs:
      bullets("WHEN TO USE", entry.whenToUse) +
      bullets("WHEN NOT TO USE", entry.whenNotToUse) +
      `  import { ${exportsNames.join(", ")} } from "@/${target.replace(/\.tsx?$/, "")}"`,
    meta: { vocabulary: "product" },
  }
}

items.push(
  productItem("section-rail", {
    file: "packages/ui/src/components/section-rail.tsx",
    target: "components/ui/section-rail.tsx",
    exportsNames: ["SectionRail"],
  }),
  productItem("view-menu", {
    file: "packages/patterns/src/view-menu.tsx",
    target: "components/ui/view-menu.tsx",
    dependencies: [FRAMER_MOTION],
    // the motion hooks rewrite to @/components/foundation-provider, so the
    // foundation door is not optional here
    registryDependencies: [url("foundation"), url("icon"), "button", "tooltip"],
    exportsNames: ["ViewMenu"],
  }),
  productItem("save-reminder", {
    file: "packages/patterns/src/settings-kit.tsx",
    target: "components/ui/settings-kit.tsx",
    dependencies: [FRAMER_MOTION],
    registryDependencies: [url("foundation"), "button"],
    exportsNames: ["SaveReminder"],
  })
)

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
