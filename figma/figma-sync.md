# Figma sync — code → Figma

**Direction:** `tokens/tokens.json` + the saved Foundation config are master.
The Figma file mirrors them.
**Target file:** set on the Foundation page (`/ds` → Foundation → Figma
connection); the file key lives in the saved config (`figmaFileUrl`) and in
`tokens/tokens.json` (`figma.fileKey`). **First sync ran 2026-08-22** into
`DxCX3RUqjzefoUc9eOV8hr`; the latest (accent blue, scaling 100%) ran
2026-08-24. The file holds four collections: Palette (244, primitives
verbatim) · Foundation (42, Light/Dark, aliases only) · Tailwind Primitives
(120, nominal scales) · Typography (1).

**Primitives are nominal; the Foundation is nothing but aliases.** Two
primitive collections hold the scales verbatim — **Palette** (Tailwind's colour
ramps) and **Tailwind Primitives** (border radius, gap, padding, opacity,
max-w, font size, at Tailwind's own values). They never bend to the config.
**Foundation** holds no numbers at all: every token points at the primitive the
saved config selected, so re-pointing one alias re-themes the file exactly as
changing the config re-themes the app.

The scaling preset is recorded as `Scale/Root font size` + `Scale/Factor`
(95% → 14px, 0.875) rather than multiplied into every value. Figma therefore
shows the design values a designer reasons about, and the runtime multiplier
stays visible instead of hiding inside a pile of 3.5s and 10.5s.

The agent applies `sync-payload.json` with `use_figma` (load the `figma-use`
skill first). Every step is **idempotent** — re-running is safe.

---

## Why variables, not components

We never write components — only variables. Components in the file bind their
fills, radii, gaps, and type to these variables, so one accent change in code
propagates through every component page automatically. Writing components would
fight that architecture instead of using it; it is also how the sync stays safe
to re-run.

## The collection model

The palette of record is **Tailwind's** — so the file gets it verbatim as a
primitive collection, and the Foundation aliases into it. That alias chain is
what makes one hue/family change re-theme every component page.

| tokens.json | Figma |
|---|---|
| `palette` (Tailwind, verbatim) | **Palette** collection · `{Family}/{50…950}` — the saved accent hue + gray family at minimum, ideally all families |
| `foundation.roles.map` (accent roles, resolved through the saved config's `roles` overrides) | **Foundation** · `Color/Primary`, `Color/Primary Foreground`, `Color/Ring`, `Color/Ambient Accent` · modes Light / Dark — each an ALIAS into Palette (`{hue}/600`, `{hue}/500`, `{hue}/400`) |
| `foundation.roles.map` (gray roles, resolved the same way) | **Foundation** · `Color/Background`, `Color/Card`, `Color/Muted`, `Color/Border`, `Color/Sidebar…` · modes Light / Dark — aliases into the gray family's steps |
| Tailwind's radius / spacing / type / opacity / max-w scales | **Tailwind Primitives** · `border radius/rounded-*`, `gap/gap-*`, `padding/p-*`, `opacity/*`, `max-w/*`, `font size/text-*` — nominal, verbatim |
| `foundation.radius` (saved) | **Foundation** · `Radius/Active` + the window `xs…4xl`, each an ALIAS at `border radius/rounded-*` — the chosen step becomes `lg` and its neighbours are the adjacent Tailwind values |
| `foundation.spacingUnits` (saved) | **Foundation** · `Spacing/Unit` → `gap/gap-1` |
| `type.rampAtBase` | **Foundation** · `Type/xs…4xl` → `font size/text-*`, plus `Scale/Root font size` and `Scale/Factor` from the saved scaling |

**The alias chain is the trick:** components bind to `Radius/Active` and the
Foundation colors, so switching the saved config re-themes the file without
touching a single component.

## The sync steps

Run in order. Each returns the count of mutated variables.

1. **Palette** — write the Tailwind ramps (at minimum the saved accent hue
   and gray family, steps 50…950) into the Palette collection. Resolve the
   values from the live CSS variables (`--color-{family}-{step}`), since
   Tailwind is their source of truth.
2. **Foundation aliases** — point `Color/Primary` / `Foreground` / `Ring` /
   `Ambient Accent` and the full surface set at the Palette steps per the
   tokens.json mapping, setting **both** Light and Dark modes.
3. **Radius** — write all steps and repoint `Radius/Active` (and its
   derived steps) at the saved choice.
4. **Spacing + Type** — write the Tailwind steps resolved against the saved
   unit and base size, plus `Unit` and `Base/Font size`.
5. **Typography family** — write `Typography/Font family/text` = Geist. Family
   only; weights are Figma style names and deliberately not synced.
6. **Verify** — screenshot a component page in both modes and confirm the accent,
   surfaces, and type scale.

> **Preload fonts before ANY variable write — not just font-family writes.**
> Writing a variable re-renders every text node that depends on it, and an
> unloaded font throws mid-sync. Load the file's fonts (and every font on the
> current page via `getStyledTextSegments(['fontName'])`) first, each
> `loadFontAsync` wrapped in try/catch. This failure mode is inherited knowledge
> — it has happened in practice.

## Deliberately NOT synced (and why)

- **Live edits that aren't saved.** The sync reads the *saved* Foundation config
  only. Save Theme is the commit point; unsaved exploration never reaches Figma.
- **Font weights** — Figma wants style name strings ("Regular", "Medium"), not
  numeric weights; forcing a mapping produces unresolvable styles.
- **Component structure** — never written, ever. Hand-authored ambientui
  components in the file (orb, panel, spotlight representations) are
  created manually following the file's conventions, bind to Foundation
  variables, and are additive only.

## Drift check (read-only)

Run any time to see whether Figma still matches the payload:

```js
// use_figma, read-only
const collections = await figma.variables.getLocalVariableCollectionsAsync()
const all = await figma.variables.getLocalVariablesAsync()
const byId = new Map(all.map(v => [v.id, v]))
const probe = (collName, varName) => {
  const c = collections.find(c => c.name === collName)
  if (!c) return "MISSING COLLECTION"
  const v = all.find(x => x.variableCollectionId === c.id && x.name === varName)
  const val = v?.valuesByMode[c.modes[0].modeId]
  return val?.type === "VARIABLE_ALIAS" ? byId.get(val.id)?.name : val
}
return {
  primary: probe("Foundation", "Color/Primary"),    // expect alias → Palette {hue}/600
  ambientAccent: probe("Foundation", "Color/Ambient Accent"),
  radiusActive: probe("Foundation", "Radius/Active"), // expect alias → saved step
  spacingUnit: probe("Foundation", "Spacing/Unit"),    // expect alias → gap/gap-1
  rootFontSize: probe("Foundation", "Scale/Root font size"), // expect saved base px
}
```

Compare against `figma/sync-payload.json`. Any mismatch means someone edited
Figma directly — **code wins**: re-run the sync, and report what was overwritten
first.

## Conflict rule

If a Figma variable was hand-edited and diverges from the payload, code wins —
but list every overwritten value to the user *before* applying, so an
intentional Figma exploration can be promoted into `tokens/tokens.json` (and the
Foundation config) instead of being destroyed.
