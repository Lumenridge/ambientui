# Figma sync — code → Figma

**Direction:** `tokens/tokens.json` + the saved Foundation config are master.
The Figma file mirrors them.
**Target file:** set on the Foundation page (`/ds` → Foundation → Figma
connection); the file key lives in the saved config (`figmaFileUrl`) and in
`figma/tokens-figma-map.json` once verified. **No file is connected yet** — the
first sync must first build the variable collections described below.

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

| tokens.json | Figma |
|---|---|
| `foundation.accents[<saved accent>]` | **Foundation** collection · `Color/Primary`, `Color/Primary Foreground`, `Color/Ring` · modes Light / Dark |
| `foundation.grays[<saved gray>]` (applied surface set) | **Foundation** · `Color/Background`, `Color/Card`, `Color/Popover`, `Color/Muted`, `Color/Border`, `Color/Sidebar…` · modes Light / Dark |
| `foundation.accents[<accent>].ambient` | **Foundation** · `Color/Ambient Accent` · modes Light / Dark (the assistant's `--app-blue`) |
| `foundation.radius` (all five) + saved choice | **Radius** collection · `None/Small/Medium/Large/Full`, plus `Radius/Active` aliasing the saved step and derived steps (`sm…4xl` as ×0.6…×2.6 of active) |
| `scale.space` | **Ambient Scale** collection · `Space/1…10` (px) |
| `scale.text` × `foundation.scaling` (saved base) | **Ambient Scale** · `Text/1…9` (resolved px at the saved base size) |
| `foundation.scaling` (saved) | **Ambient Scale** · `Base/Font size` |

**The alias chain is the trick:** components bind to `Radius/Active` and the
Foundation colors, so switching the saved config re-themes the file without
touching a single component.

## The sync steps

Run in order. Each returns the count of mutated variables.

1. **Foundation colors** — write the saved accent's `primary` /
   `primaryForeground` / `ring` and the gray-tinted surface set into the
   Foundation collection, setting **both** Light and Dark modes. Include
   `Color/Ambient Accent` from the accent's `ambient` pair.
2. **Radius** — write all five presets and repoint `Radius/Active` (and its
   derived steps) at the saved choice.
3. **Ambient scale** — write `Space/1…10` (raw px) and `Text/1…9` resolved
   against the saved base size, plus `Base/Font size`.
4. **Typography family** — write `Typography/Font family/text` = Geist. Family
   only; weights are Figma style names and deliberately not synced.
5. **Verify** — screenshot a component page in both modes and confirm the accent,
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
  primary: probe("Foundation", "Color/Primary"),
  ambientAccent: probe("Foundation", "Color/Ambient Accent"),
  radiusActive: probe("Radius", "Radius/Active"),   // expect alias → saved step
  space4: probe("Ambient Scale", "Space/4"),        // expect 16
  text5: probe("Ambient Scale", "Text/5"),          // expect base px
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
