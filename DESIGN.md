# ambientui Design System — Source of Truth

This file is the **single source of truth for all design decisions** in ambientui.
Code implements it, Figma mirrors it, and every proposal to change the product's look
or structure starts by checking — and possibly amending — this document.

**Why this file exists.** ambientui's thesis is that AI can build product UI safely
*only inside a governance layer*: a fixed vocabulary of tokens, components, and
patterns that the AI selects from instead of inventing. That governance applies to
the AI building ambientui itself. Without this file, every generation drifts a
little — a new gray here, a 6px gap there — and after fifty edits the system is
fiction. This document is the drift boundary.

- Token values live in [`tokens/tokens.json`](tokens/tokens.json) and are implemented in
  `packages/ui/src/styles/globals.css` (static scales) and
  `apps/web/src/foundation/foundation-context.tsx` (the Foundation config engine) —
  this file explains the *rules and intent* behind them.
- The DS site (`npm run dev` → `/ds`) renders everything live: Foundation, the
  component vocabulary with playgrounds and docs.
- Change process: see **Governance** (§10).

---

## 1. Principles

1. **One design system, two vocabularies.** The product vocabulary (shadcn/ui
   components in `packages/ui`) and the ambient vocabulary (the assistant's
   surfaces) are one system driven by the same tokens. The ambient layer must
   always look like it belongs to the product it sits on.
2. **The AI selects, it does not invent.** Generated or AI-assisted UI composes
   existing components within existing tokens. A need the vocabulary cannot meet
   is a governance event (§10), never an inline improvisation.
3. **Foundation first.** Accent, gray, radius, scaling are set once, globally, in
   the Foundation config — then everything inherits. No component re-decides them.
4. **One way to do a thing.** One button system, one panel pattern, one processing
   indicator. Variation is a cost paid by every future screen and every future
   generation.
5. **Accessible by default.** Every accent carries its own paired foreground
   (light accents pair with dark text — amber gets near-black, not white); focus
   rings on everything interactive; keyboard-first Radix primitives.
6. **The system is flexible where it says it is.** Extension points are explicit:
   the Foundation config, the ambient extension tokens, the governance flow.
   Everything else is fixed on purpose.

## 2. Token architecture

```
shadcn CSS variables (--primary, --background, --radius …)   ← the base contract
        ↑ overridden by
Foundation config (accent / gray / radius / scaling)          ← one saved choice set,
                                                                compiled to one <style> tag
        + static scales in globals.css                        ← --ambient-space-1…10,
                                                                --ambient-text-1…9
        + ambient accent bridge                               ← --app-blue ties the
                                                                assistant to the accent
```

- **`tokens/tokens.json`** is the serialized master: every accent (with light/dark
  values and paired foregrounds), every gray tint, the radius set, the scaling
  presets, and the ambient scales. `foundation-context.tsx` and `globals.css` must
  agree with it — when they diverge, tokens.json wins and the code is corrected.
- **The saved Foundation config** (Save Theme on `/ds` → Foundation) selects among
  these values. Edits apply live; only Save persists. The saved config is what
  Figma Sync pushes.

### ⛔ STRICT RULE — only values that exist on a scale

Every dimension in component code MUST be a step on a defined scale. We do not
invent values.

| Property | Legal values |
|---|---|
| color | shadcn semantic tokens (`--primary`, `--muted-foreground`, `--border`, …) or ambient tokens (`--app-blue`, `--viz-*`). Never a hex, never a raw oklch in component code |
| spacing | `--ambient-space-1…10`: multipliers **0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8 × the saved spacing grid's unit** (Default 8 / Spacious 12). At the default grid: 2, 4, 8, 16, 24, 32, 40, 48, 56, 64. Tailwind: `p-ambient-3`, `gap-ambient-4`, … |
| font size | `--ambient-text-1…9`: **11, 12, 13, 14, 16, 18, 20, 24, 30** (px at 16 base, defined in rem). Tailwind: `text-ambient-5` |
| radius | one step of the full ramp **0, 2, 4, 8, 12, 16, 20, 24** (px), chosen in Foundation — reached through `--radius` and its derived steps (`rounded-md/lg/xl/…`), never as a literal |
| blur | `--ambient-blur` — the one glass blur radius (`backdrop-blur-[var(--ambient-blur)]`). Never a literal blur value |

**Why this is strict and not a preference.** Every scale step is mirrored into
Figma as a variable. A value that isn't on a scale has nowhere to land: the sync
drops it, or binds it to a same-named variable that resolves to something else.
And each off-scale value teaches the AI that off-scale values are normal — drift
compounds through generation.

**Consequences.** Need 12px of space? Use 8 or 16. Need a 15px label? Use 14 or 16.
Need a pill? That's a shape decision (`rounded-full`), not a new radius step.

### ⛔ A stated pixel or colour is a REQUEST FOR A TOKEN, not a literal

"Make the corners 8px", "48px padding", "a softer grey" describe the value someone
wants to **see** — not permission to hardcode. The procedure, every time:

1. **Pick the scale from the property** — spacing → ambient-space, text →
   ambient-text, corners → the radius set, color → a semantic role.
2. **Exact match → use that token.** 16px padding is `p-ambient-4`.
3. **No exact match → nearest legal step, and say so.** "20px padding" has no step;
   use `ambient-space-4` (16) or `-5` (24) and tell the user which you chose.
   Never add a step to make a stated number fit.
4. **Report the mapping back** — "8px → `--ambient-space-3`". The person asked for
   a look; they're entitled to know which rung now carries it.

For color: prefer the semantic role (`--muted-foreground`, not a gray literal).
A stated hex is a starting point — map it to the nearest role or accent and say
which. The only raw color values in the system live in `tokens/tokens.json` and
`foundation-context.tsx` (the accent/gray definitions themselves).

### ⛔ Saving the theme must restyle EVERY component — propagation is a rule, not a hope

A Foundation change that some component ignores is a bug in the system, not a
quirk of the component.

**Scaling is the base layer.** Every dimension in the system is nominal px at
the 100% base (16px) and emitted in **rem** — spacing steps, Tailwind's
`--spacing`, radius, and type all ride the root font-size the scaling preset
sets. Changing scaling re-derives the entire app; nothing is allowed to opt
out by being raw px.

On top of that base, every dimension in component code must resolve from a
foundation-driven variable —

- **spacing**: Tailwind's core `--spacing` is driven by the saved grid
  (unit ÷ 2, in rem), so `p-4`, `gap-2`, `h-9` in every component re-densify
  when the grid changes; `--ambient-space-*` carries the named steps.
- **radius**: `--radius` and its derived `sm…4xl` steps.
- **type**: rem sizes over the scaling preset's root font-size.
- **color**: semantic tokens and the accent's paired foregrounds.

**Consequence:** hardcoded px in component code (`text-[13px]`, `px-[18px]`,
fixed heights) are propagation leaks — the Foundation cannot reach them. The
assistant's stance-era `[13px]`-style values are **grandfathered debt: fix on
touch**; new code may not add any.

### ⛔ Ambient tokens derive from base tokens

Tokens the ambient layer needs that shadcn doesn't define (`--app-blue`, glow and
surface treatments) get their defaults **computed from the Foundation config** —
the accent maps into `--app-blue` per mode. A preset swap must restyle the ambient
layer with zero extra work. A new `--ambient-*` token whose default is a literal
unrelated to the base theme is a rule violation.

## 3. Typography

- One family: **Geist Variable** (`--font-sans`), loaded in `packages/ui`.
- The ramp is `--ambient-text-1…9`, keyed by number. Numbered keys cannot go out
  of order and map 1:1 onto `Typography/Font size/1…9` in Figma.
- The ramp is **rem-based**: the Foundation scaling preset sets the root font-size
  (90% → 12px … 100% → 16px … 110% → 20px), and the whole ramp follows.
- Roles: 1–2 captions and meta, 3–4 UI body and controls, 5 body/default,
  6–7 section titles, 8–9 page titles and display.

## 4. Iconography

**HugeIcons** (`@hugeicons/react` + `@hugeicons/core-free-icons`) via
`<HugeiconsIcon icon={…} />` — the only icon set. Standard sizes 14/15/16 in
controls, `strokeWidth={1.8}`. No other icon sets, no ad-hoc SVGs.

## 5. Motion

- Motion lives in **CSS**: keyframes in `apps/web/src/theme.css`
  (`ambient-shimmer`) and Tailwind `transition-*` utilities.
- **The one sanctioned shader surface** is the OrbCharacter
  (`orb-character.tsx`), implemented with `@paper-design/shaders-react`
  (the heatmap shader wrapped around a circle), because the character's
  fluid identity cannot be expressed in CSS. No other component may use
  canvas/WebGL/shader libraries without governance. There is deliberately **no animation library** in this
  codebase — drag and snap are hand-rolled pointer events.
- The beam glow was removed by decision (§12) — no glow effects, on the
  assistant or anywhere else, without governance.
- One-off `@keyframes` in a component file are a governance event.

## 6. Component inventory — the two vocabularies

The vocabulary is documented in `apps/web/src/components/ds/ds-docs.tsx` and
rendered at `/ds`. **A rule is written once, where it lives** — this file names
the components and their contracts' locations; the registry holds per-component
behavior, usage, and constraints. A rule written twice will disagree with itself.

**Product vocabulary** (`packages/ui/src/components`, 12): Badge, Button, Card,
Checkbox, DropdownMenu, Input, Separator, Sheet, Sidebar, Skeleton, Table,
Tooltip. Installed from the shadcn radix-nova preset; extended only through the
shadcn CLI or governance.

**Ambient vocabulary** (`apps/web/src/components/assistant`): the assistant —
orb (line), bar, panel, dock, spotlight — and the **OrbCharacter**, the
assistant's animated identity (documented at `/ds` → Ambient vocabulary).
See §8 for its contract.

**Known gaps** (the registry documents these so the AI cannot compose what does
not exist): no Select (use DropdownMenu), no Switch (use a labeled Checkbox),
no Textarea, no Dialog (use Sheet or the spotlight).

Every component has: a registry entry (summary, behavior, when to use, when not
to), stories, and — where the prop surface warrants — a playground whose controls
render in the `/ds` Inspect rail.

## 7. Layout standards

- The app is a **desktop-app shell**: the document never scrolls; panes scroll
  internally (`theme.css`).
- `/ds` is the sanctioned three-pane frame: component list rail (240px) · canvas ·
  Inspect rail (288px, controls only). New pages that need a different pane
  arrangement go through governance first.
- The canvas (`/`) is deliberately bare — it is the host page the ambient layer
  sits on.
- Pages declare themselves to the assistant via `setPageChip` on mount and
  selection change, and clear it on unmount. A page that doesn't is invisible to
  the ambient layer — that's a bug, not a choice.

## 8. The Ambient Layer contract — the five things that must not drift

1. **One surface, five modes**: `line` (orb) · `bar` · `panel` · `dock` ·
   `spotlight`. New modes are governance events.
2. **Drag is the mode switcher.** Panel header drags; right-edge hot zone docks;
   top-center hot zone opens spotlight; the dock tears off into a panel in one
   gesture. ⌘K toggles spotlight; Esc clears, then closes.
3. **Context is ambient.** The page chip arrives from the page (`setPageChip`),
   user chips attach explicitly; the user never re-explains where they are.
   Conversations keep their context.
4. **No glows.** The beam was removed; nothing glows without governance.
   The orb's face is the **OrbCharacter** — four states (still / listening /
   thinking / answer) driven through `orbState` in the assistant context.
   The response pipeline sets the state; components only read it. The
   character's palette derives from the accent bridge; it renders via the
   system's one sanctioned WebGL shader (§5).
5. **The response kit seam.** `send()` appends the user message and stops — the
   canned plan/answer machinery was deliberately removed. Responses will be
   composed from the component vocabulary (plan → streamed progress → composed
   answer). Do not reintroduce mock responses outside that kit.

## 9. Theming — the Foundation config

- Foundation lives at `/ds` → Foundation. **Scaling comes first** — it is the
  base layer every other dimension derives from. Then: accent (7, each with
  paired light/dark foregrounds), gray tint (4), appearance (light/dark),
  radius (the full 8-step ramp), spacing grid (Default 8px / Spacious 12px —
  resolves the whole ambient-space scale). Customization means choosing among
  all legal values — never typing one that isn't on a ramp.
- Compiled to **one injected `<style>` tag** by `foundation-context.tsx`. No other
  runtime theme mutation exists; never set theme variables ad hoc.
- **Save semantics**: edits apply live; only **Save Theme** persists. Reload
  without saving returns to the last saved theme. The saved config is the input
  to Figma Sync.
- Appearance (light/dark) is the theme provider's `.dark` class on `<html>`.

## 10. Figma sync

Direction: **code → Figma, variables only, agent-driven.** The connected file
(set on the Foundation page) mirrors `tokens/tokens.json` + the saved Foundation
config. Procedure, mapping, drift check, and the code-wins conflict rule:
[`figma/figma-sync.md`](figma/figma-sync.md). Components are never written by the
sync; the alias structure means one accent change propagates through the file.

## 11. Governance — how design decisions are made

Two roles (Claude skills in `.claude/skills/`) gate changes:

- **ds-manager** — guards the system: token/component/layout compliance,
  promote vs reject, impact analysis, keeps this file and Figma in sync.
- **product-design-manager** — guards the product: right surface for the use
  case, flow consistency, UX heuristics, pushes back on one-off patterns.
- **product-copy** — guards the words: microcopy, errors, empty states, voice.

**Pattern watchlist protocol (always on).** When any work produces UI that
doesn't match an existing pattern — a new component shape, a new layout
structure, a divergent interaction — the assistant must STOP and ask: *"This
looks like a new pattern — should it become part of the design system?"*

- **Yes** → implement in the proper vocabulary, document in the registry and
  here (§6/§13), log the decision (§12).
- **No** → rebuild the use case with existing patterns.

One-off exceptions are not merged silently. Ever.

**Owed: `audit:docs`.** rg-design-proto proved that coverage must be a command,
not a memory test — a script that fails when a component lacks a registry entry,
rules, or states. ambientui does not have it yet; building it is logged debt.

## 12. Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-08-21 | ambientui = **one design system, two vocabularies** (product + ambient), both driven by the same tokens | The ambient layer must inherit any product theme instead of being a second design system bolted on |
| 2026-08-21 | Base = the stance-proto assistant architecture (five-mode surface, drag-as-mode-switch, beam), SaaS interface removed, all branding renamed | The interaction model was proven there; the product around it was not the product |
| 2026-08-21 | Palette nav decoupled from any app sidebar into `src/nav.ts` | The assistant must not know about any particular product interface |
| 2026-08-21 | Mock response machinery deleted from the assistant; `send()` ends at the response-kit seam | The response kit will compose real vocabulary components; canned answers teach the wrong pattern |
| 2026-08-21 | Foundation config layer: accent/gray/appearance/radius/scaling compiled to one style tag; **Save Theme** persists (live edits don't) | Global decisions are set once and inherited; save semantics make the committed theme explicit — it is also the Figma Sync input |
| 2026-08-21 | Accent → `--app-blue` bridge | The assistant's accents must follow the product accent with zero configuration |
| 2026-08-21 | Ambient scale: spacing on an 8px grid from 2px (`--ambient-space-1…10`, px), type ramp `--ambient-text-1…9` (rem) | shadcn defines no scale of record; px spacing keeps the grid, rem text follows the scaling preset |
| 2026-08-21 | Scaling presets map to concrete base px (100% = 16, 95% = 14, …) | "95%" alone is not a design decision; a base size is |
| 2026-08-21 | Radius steps spread to 0/4/10/16/24 | 4/7.2/12 were indistinguishable in the picker and in components |
| 2026-08-21 | Every accent carries a paired foreground; amber pairs with near-black | White on amber fails WCAG; the token pair decides on-accent text, never the component |
| 2026-08-21 | Inspect rail is the third pane of `/ds`; playground controls portal into it | Configuration is a surface, not an inline box — and the rail is the seam the ambient inspect state will later take over |
| 2026-08-21 | Choice controls in the Inspect rail are dropdowns (DropdownMenu), not chip rows | User decision; also respects the vocabulary — no Select exists, so the menu is the selection surface |
| 2026-08-21 | Foundation exposes the FULL legal space: radius ramp 0–24 (8 steps) and a selectable spacing grid (Compact 4 / Default 8 / Spacious 12) whose unit resolves `--ambient-space-1…10`; the Spacing page re-derives from the saved grid | Complete customization within governance — users choose among every legal value instead of five picks, and never type an off-ramp number |
| 2026-08-21 | **Propagation rule**: the spacing grid drives Tailwind's core `--spacing` (unit ÷ 2, rem), so every utility-based dimension in every component follows a Foundation change; hardcoded px are propagation leaks (assistant's stance-era values grandfathered, fix on touch) | User report: saving the theme didn't visibly update components — the grid only reached `--ambient-space-*`, which the shadcn components don't use. A theme system that some components ignore is not a theme system |
| 2026-08-21 | **Scaling is the base layer**: spacing steps, `--spacing`, and radius are all emitted in rem over the scaling preset's root font-size (nominal px at the 100% base) | The whole app configures on top of one base size — scaling must re-derive everything together, not just text |
| 2026-08-21 | Scaling moved to the top of Foundation as the first decision; the 4px Compact grid removed (saved configs migrate to Default) | The base layer is set before what derives from it; a 2px --spacing collapses real interfaces — Compact didn't survive contact with actual components |
| 2026-08-21 | **The AI beam removed completely** — component, Beam Lab, config state/endpoint, keyframes, and the border-beam dependency | User decision. The orb and avatars stand without a glow; engagement signaling is a question for the response kit, not a permanent halo |
| 2026-08-21 | **OrbCharacter shipped** — the assistant's animated identity, four states: still (own movement) / listening (inward drift, digesting) / thinking (fast churn, retrieving) / answer (one-shot ring + flash — "found it"). Configurable at /ds → Ambient vocabulary; state drivable via orbState in the assistant context | The AI needs a face whose motion IS its status — reference: the user's iridescent-orb video. States map 1:1 onto the response lifecycle the kit will drive |
| 2026-08-21 | **Orb transitions became second-order**: every shader parameter runs two-stage exponential smoothing (target → intermediate → value) at 60fps with per-parameter time constants (flow speed 0.7s, glows 0.5s, contour 0.45s, wave angle 0.85s) — S-curved, velocity-continuous; the previous 12fps prop throttle and single-stage easing produced visible stepping | "Very very smooth" is a spec: changes must lean in and settle out, and nothing may step |
| 2026-08-21 | **The character became the assistant's mark everywhere**: panel/dock header, spotlight input avatar, palette avatar rows, AI Overview header, and the bar all render the OrbCharacter (via one AssistantMark component reading orbState + the saved orb config) — the sparkle icons retired from ambient surfaces; palette list-row icons stay static (a shader context per row would exhaust WebGL contexts) | One assistant, one face — every surface it owns shows its state, live |
| 2026-08-21 | **Orb re-implemented on the Paper Design heatmap shader** (user direction, shaders.paper.design/heatmap): the shader wraps a circle so heat flows around the orb's edge; per-state MOVEMENT via shader params — still: calm balanced rim; listening: heat drawn inward (innerGlow 0.8, waves angled in); thinking: hot racing edge (contour 0.92, noise, 2.2× flow); answer: one-shot outward bloom decaying ~1.4s. All params ease continuously; per-state speeds + palette (accent-linked thermal ramp or custom cold→hot stops) persist with the theme. Deps: @paper-design/shaders-react added by decision. Gotchas: the shape must be a DARK fill on transparent, served as a real file (data URIs rejected by the loader); pass stable props, not per-frame image objects; the frost-glass interior comes from ALPHA in the ramp's cold end (#RRGGBBAA is honored) + transparent colorBack over the backdrop-blur wrapper — never an opaque cold color | Third styling school for the character (vortex → pearl → thermal); the orb reactions remain the invariant |
| 2026-08-21 | **Orb restyled as a pearl** (new reference studied): milky luminous core, ALL color at the boundary as thin-film iridescence drifting around the rim, interference micro-bands, bottom under-glow, soft-focus — no hard speculars. The reaction principles carry over: listening draws the film inward, thinking races and tightens it with core wisps, answer blooms one ring outward; transitions stay eased; custom colors become the iridescence stops | User direction with a second reference — the character's school changed from vortex-glass to bubble-pearl; the state semantics (the "orb reactions") are the invariant, the styling is the variable |
| 2026-08-21 | **Orb glass + full configurability**: the dark body became frosted glass (translucent, page blurred behind via the new `--ambient-blur` token); state changes became continuous transitions (eased weights + tempo, never a cut); per-state speeds and the palette are user-configurable on the /ds page and persist with Save Theme — accent-linked by default, or custom crest/body/tail/streak colors (1-4, add/remove) with the accent link off | User asks: glass over opaque black, blur as a managed token, colors beyond (or without) the accent, transitions, per-state speed config. The character is itself a governed, themeable component — configuration over hardcoding is the product's own thesis |
| 2026-08-21 | **OrbCharacter re-rendered as a WebGL fragment shader** (studied against the reference video frame by frame, then corrected against a still): the structure is ONE dominant spiral arm — phase = angle − k·radius, organically bent by slow low-frequency wobble — silver crest folding into accent body and deep tail around a dark core, fine comb teeth along the arm's edges, chromatic fringing per channel, fresnel rim + specular crescent. The one sanctioned shader surface; CSS-gradient version retired | fbm blobs read as marble, not the reference; the reference is a spiral-phase field. Bug learned: never loseContext() in a React cleanup — StrictMode remounts get the dead context back from getContext forever |

## 13. Pattern watchlist

*(Patterns spotted but not yet ruled on — triage through governance.)*

- **Foundation swatch picker** (accent/gray circles with ring selection) — used
  twice on the Foundation page; if a third use appears, promote to a component.
- **Scale ruler / type ramp preview** (Foundation → Scale) — candidate for the
  vocabulary once the Spacing page and Foundation stop being its only consumers.
