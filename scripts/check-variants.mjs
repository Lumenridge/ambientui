#!/usr/bin/env node
/**
 * Runs the check every registry variant declares (scripts/variants/index.mjs),
 * so a new variant is covered by the gate by declaring its check, not by
 * editing package.json.
 */
import { execFileSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { AXES } from "./variants/index.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const checks = [
  ...new Set(
    Object.values(AXES).flatMap((axis) =>
      Object.values(axis.variants).map((v) => v.check).filter(Boolean)
    )
  ),
]
for (const check of checks) {
  try {
    execFileSync(process.execPath, [resolve(ROOT, check)], { cwd: ROOT, stdio: "inherit" })
  } catch {
    process.exit(1)
  }
}
