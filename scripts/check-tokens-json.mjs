#!/usr/bin/env node
/**
 * `tokens/tokens.json` DESCRIBES THE CODE, SO IT MUST AGREE WITH THE CODE.
 *
 * The file is the serialized token master: what Figma syncs from, what the
 * governing documents cite, and the only machine-readable statement of the
 * configuration space. It carried a `$comment` asking humans not to let it
 * diverge from `tokens.ts`, which is a rule with nobody enforcing it — and
 * it HAD diverged: the code shipped 18 accents and this file listed 17.
 *
 * WHY A CHECK AND NOT A GENERATOR. Most of this file is prose that exists
 * nowhere in the code: why the radius ramp is Tailwind's, what each motion
 * role is for, which steps were retired and why, the Figma sync state.
 * Generating it would delete the reason it is worth reading. So the VALUES
 * are checked against `tokens.ts` and the prose is left to people.
 *
 * It reads the built `dist/tokens.js` rather than parsing the source: that
 * module is pure data with no imports at all, which is exactly what makes
 * importing it safe here and is itself worth preserving.
 */
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const t = await import(
  new URL("../packages/foundation/dist/tokens.js", import.meta.url).href
)
const json = JSON.parse(readFileSync(resolve(ROOT, "tokens/tokens.json"), "utf8"))

const problems = []
const eq = (what, code, file) => {
  const a = JSON.stringify(code)
  const b = JSON.stringify(file)
  if (a !== b) problems.push(`${what}\n      code: ${a}\n      json: ${b}`)
}

// The lists a consumer configures from. Order is meaningful — it is the
// order the Foundation page presents them in.
eq("palette.chromatic", t.ACCENTS.map((a) => a.id), json.palette.chromatic)
eq("palette.grays", t.GRAYS.map((g) => g.id), json.palette.grays)
eq("fonts.options", t.FONTS.map((f) => f.id), json.fonts.options)
eq("icons.libraries", t.ICON_LIBRARIES.map((i) => i.id), json.icons.libraries)
eq("foundation.radius.steps", t.RADIUS_STEPS, json.foundation.radius.steps)
// RADIUS_SCALE is the named ramp; RADIUS_NAMES is the shorter WINDOW of
// names that slides across it, so zipping the two is not the same thing.
eq(
  "foundation.radius.scale",
  Object.fromEntries(t.RADIUS_SCALE.map((r) => [r.name, r.px])),
  json.foundation.radius.scale
)
eq(
  "foundation.scaling",
  Object.fromEntries(t.SCALINGS.map((s) => [String(s.pct), `${s.base}px`])),
  Object.fromEntries(
    Object.entries(json.foundation.scaling).filter(([k]) => !k.startsWith("$"))
  )
)
eq(
  "foundation.spacingUnits",
  t.SPACING_GRIDS.map((g) => g.unit),
  Object.entries(json.foundation.spacingUnits)
    .filter(([k]) => !k.startsWith("$"))
    .map(([, v]) => v.unit)
)
// Every role the code defines must be described here. The JSON may carry
// MORE variables than the code enumerates (--motion-ease is Tailwind's
// easing, documented alongside them), and that is not drift.
for (const { role } of t.MOTION_ROLES) {
  if (!(`--motion-${role}` in json.motion.roles))
    problems.push(`motion.roles is missing --motion-${role}`)
}
eq(
  "motion.characters",
  t.MOTION_CHARACTERS.map((c) => c.id),
  Object.keys(json.motion.characters).filter((k) => !k.startsWith("$"))
)
eq(
  "motion.paces",
  t.MOTION_PACES.map((p) => p.pct),
  Object.keys(json.motion.paces)
    .filter((k) => !k.startsWith("$"))
    .map(Number)
)

// Defaults are a claim about what a fresh install looks like.
eq("icons.default", t.DEFAULT_FOUNDATION.icons, json.icons.default)
eq("fonts.default", t.DEFAULT_FOUNDATION.font, json.fonts.default)
// The config stores an INDEX into the ramp; the JSON records the px it
// lands on, which is the number a reader can act on.
eq(
  "foundation.radius.default",
  t.RADIUS_STEPS[t.DEFAULT_FOUNDATION.radius],
  json.foundation.radius.default
)

// Every path this file claims to be implemented by must exist. The markdown
// path checker cannot see this one — it only reads .md.
for (const p of json.meta.implementedBy ?? []) {
  try {
    readFileSync(resolve(ROOT, p))
  } catch {
    problems.push(`meta.implementedBy names a path that does not exist: ${p}`)
  }
}

if (problems.length) {
  console.error("\n✗ tokens.json has drifted from tokens.ts:")
  for (const p of problems) console.error(`    ${p}`)
  console.error(
    "\n  The JSON is the serialized master and the code is what runs." +
      "\n  Update whichever one is wrong; they are not allowed to disagree."
  )
  process.exit(1)
}

console.log(
  `✔ tokens.json agrees with tokens.ts (${t.ACCENTS.length} accents, ` +
    `${t.GRAYS.length} grays, ${t.RADIUS_STEPS.length} radius steps, ` +
    `${t.MOTION_CHARACTERS.length} motion characters)`
)
