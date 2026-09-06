/**
 * The orb's shader shapes belong to the LAYER (the `ambientui` package's
 * assets/, exported as `./assets/*`), so the registry can ship them to a
 * consumer's public/. This copies them into the site's public dir before
 * dev and build — one copy under version control, and the site cannot
 * drift from what it publishes.
 *
 * RESOLVED THROUGH THE PACKAGE, not the repo layout: `require.resolve`
 * finds the installed `ambientui` wherever it lives — a workspace symlink
 * today, node_modules after the repos split — so this script never encodes
 * a path into another repo.
 */
import { cpSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const from = resolve(dirname(require.resolve("ambientui/package.json")), "assets")
const to = resolve(dirname(fileURLToPath(import.meta.url)), "../public")
mkdirSync(to, { recursive: true })
cpSync(from, to, { recursive: true })
console.log("✔ orb shapes → apps/site/public")
