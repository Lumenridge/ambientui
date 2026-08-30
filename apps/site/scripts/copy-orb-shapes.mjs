/**
 * The orb's shader shapes belong to the LAYER (packages/ambient/assets), so
 * the registry can ship them to a consumer's public/. This copies them into
 * the site's public dir before dev and build — one copy under version
 * control, and the site cannot drift from what it publishes.
 *
 * The Vite app does the same thing with a plugin (apps/web/vite.config.ts);
 * Next has no equivalent hook, so it runs as a pre-step.
 */
import { cpSync, mkdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const from = resolve(here, "../../../packages/ambient/assets")
const to = resolve(here, "../public")
mkdirSync(to, { recursive: true })
cpSync(from, to, { recursive: true })
console.log("✔ orb shapes → apps/site/public")
