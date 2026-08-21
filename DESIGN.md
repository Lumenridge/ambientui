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
        + Tailwind's own scales                               ← the full color palette,
                                                                spacing × --spacing unit,
                                                                the type scale (all emitted
                                                                via theme(static))
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

### ⛔ THE PRIMARY RULE — a reference is a request for a CONFIGURATION

When anyone shows a target look — a screenshot, another product, "make it
feel like Linear" — the answer is a **Foundation configuration**, never
custom styling. Read the reference as config values: its accent hue, its
gray family, its radius step, its density (spacing unit + scaling base),
its appearance. Apply them, Save Theme, and the entire system — components,
pages, ambient layer — moves there together.

Precedent: the Linear look is `{ accent: indigo, gray: gray, radius: 4,
spacingGrid: default, scaling: 95, light }`. Five values, zero CSS.

If the configuration cannot reach the look, that is a **governance event**
(extend the system's legal values), never a CSS patch on components. This
is the layer's reason to exist: matching any look by selection keeps the
AI, the theme, and Figma in one system; matching it by overrides is drift.

### ⛔ STRICT RULE — only values that exist on a scale

Every dimension in component code MUST be a step on a defined scale. We do not
invent values.

| Property | Legal values |
|---|---|
| color | **Tailwind's color palette is the palette of record** — but components consume semantic roles only (`--primary`, `--muted-foreground`, `--border`, `--app-blue`, `--viz-*`). The Foundation maps roles to palette steps through the ROLE MAP — every semantic token's light/dark step is itself configurable in the live editor on the Foundation page (/ds → Foundation → Semantic mapping; defaults are shadcn's shape); the palette grid is documented at /ds → Colors. Never a hex, never a raw `--color-*` step in component code |
| spacing | **Tailwind's spacing scale** (`p-N`, `gap-N`, `m-N`, `h-N` — every utility is step × `--spacing`). The Foundation sets the unit (Default 4px — Tailwind's own — or Spacious 6px), emitted in rem over the base. Arbitrary values (`p-[10px]`) are violations |
| font size | **Tailwind's type scale** (`text-xs` 12 · `sm` 14 · `base` 16 · `lg` 18 · `xl` 20 · `2xl` 24 · `3xl` 30 · …, at the 100% base) — rem-based, rides the scaling preset |
| radius | one step of the full ramp **0, 2, 4, 8, 12, 16, 20, 24** (px), chosen in Foundation — reached through `--radius` and its derived steps (`rounded-md/lg/xl/…`), never as a literal |
| shadow | **Tailwind's shadow scale** (`shadow-2xs…2xl`), used as-is — documented at /ds → Shadows with per-step usage. Never a literal box-shadow |
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

1. **Pick the scale from the property** — spacing → Tailwind's spacing
   utilities, text → Tailwind's type scale, corners → the radius set,
   color → a semantic role over the Tailwind palette.
2. **Exact match → use that step.** 16px padding is `p-4` (at the default unit).
3. **No exact match → nearest legal step, and say so.** "10px padding" has no
   step; use `p-2` or `p-3` and tell the user which you chose. Never reach for
   an arbitrary value (`p-[10px]`) to make a stated number fit.
4. **Report the mapping back** — "16px → `p-4`". The person asked for a look;
   they're entitled to know which rung now carries it.

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

- **spacing**: Tailwind's core `--spacing` is driven by the saved unit
  (in rem), so `p-4`, `gap-2`, `h-9` in every component re-densify when
  the unit changes.
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
- **The family is a Foundation choice**: Geist (local) or a curated Google
  Fonts set (Inter, DM Sans, Manrope, Space Grotesk, IBM Plex Sans) —
  `--font-sans` product-wide, loaded on demand via one managed `<link>`.
- The ramp is **Tailwind's type scale** (`text-xs` … `text-4xl` and beyond),
  rem-based: the Foundation scaling preset sets the root font-size
  (90% → 12px … 100% → 16px … 110% → 20px) and the whole ramp follows.
- Roles: `xs`–`sm` captions, meta, and UI controls; `base` body;
  `lg`–`xl` section titles; `2xl`+ page titles and display.

## 4. Iconography

**The icon library is a Foundation choice** — Lucide, Tabler, HugeIcons,
Phosphor, or Remix. Components name icons **semantically** through
`<Icon name="…" />` (`apps/web/src/components/icon.tsx`); the configured
library draws them everywhere. A new icon name must be mapped in every
library or it doesn't exist. Standard sizes 14/15/16 in controls,
`strokeWidth={1.8}` where the library supports it. No direct library
imports in components, no ad-hoc SVGs. (The assistant's direct HugeIcons
usages are grandfathered — fix on touch.)

## 5. Motion

**Motion is a Foundation dimension**, configured like color and spacing and
documented live at /ds → Motion.

- **The four motion roles** — components consume a role, never a literal
  duration, easing, or spring. A stated "200ms" is a request for the
  nearest role:
  | Role | Token | Job |
  |---|---|---|
  | Micro feedback | `--motion-micro` | hover/press/focus ticks — the default for every `transition-*` utility |
  | Control state | `--motion-control` | checks, switches, selection moves |
  | Surface | `--motion-surface` | menus, popovers, sheets, tooltips entering/leaving |
  | Page | `--motion-page` | section- and page-level moves |
- **Character + pace decide what every role feels like** (Foundation →
  Motion): a character is an easing/duration/spring family (Productive /
  Smooth / Expressive); pace scales all timings together. Saving restyles
  every transition product-wide — the propagation rule applies to time.
- **Consumption seams**: CSS rides the emitted variables — Tailwind's
  default transition duration/easing map onto `--motion-micro` /
  `--motion-ease` in `globals.css`, and explicit sites name their role
  (`duration-(--motion-surface)` `ease-(--motion-ease)`). Framer Motion
  consumers use `useMotionTransition(role)` / `useMotionSpring()` from
  `foundation-context.tsx`. One-off keyframes in component files and raw
  spring configs are governance events.
- Simple motion still lives in **CSS first**: keyframes in
  `apps/web/src/theme.css` (`ambient-shimmer`) and Tailwind `transition-*`
  utilities. Framer Motion (sanctioned, §12) is for what CSS can't express:
  interruptible/gestural animation, layout and presence transitions,
  springs — timed through the motion roles above.
- **The one sanctioned shader surface** is the OrbCharacter
  (`orb-character.tsx`), implemented with `@paper-design/shaders-react`
  (the heatmap shader wrapped around a circle), because the character's
  fluid identity cannot be expressed in CSS. Its identity springs are the
  one sanctioned exception to role-based timing (its cadence is its own
  Foundation config). No other component may use canvas/WebGL/shader
  libraries without governance.
- The beam glow was removed by decision (§12) — no glow effects, on the
  assistant or anywhere else, without governance.

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
  base layer every other dimension derives from. Then: accent (all 17
  Tailwind hues + neutral, each with paired foregrounds — light hues get
  dark text), gray family (Tailwind's five — it defines every surface
  token), appearance (light/dark), radius (the full 8-step ramp), spacing
  unit (Tailwind's 4px default / 6px Spacious — drives `--spacing`).
  Customization means choosing among all legal values — never typing one
  that isn't on a ramp.
- Compiled to **one injected `<style>` tag** by `foundation-context.tsx`. No other
  runtime theme mutation exists; never set theme variables ad hoc.
- **Save semantics**: edits apply live; only **Save Theme** persists. Reload
  without saving returns to the last saved theme. The saved config is the input
  to Figma Sync.
- Appearance (light/dark) is the theme provider's `.dark` class on `<html>`.

### The role glossary — what each semantic token actually paints

The role map (edited live on the Foundation page, Semantic mapping section) is the entire color contract between
the Foundation and the UI. Each role is one visual job; changing its step
changes every place that job appears, both vocabularies at once. Aliases are
the same value under shadcn's other names — never set them independently.

| Role | Token (+ aliases) | Draws from | What changes on screen |
|---|---|---|---|
| **Action color** | `--primary` + `--sidebar-primary` | accent hue | Filled buttons, switches and checks when on, the active nav accent — the color that marks the main action. `--primary-foreground` stays paired automatically (dark text on light hues) |
| **Focus ring** | `--ring` | accent hue | The outline drawn around whichever control has keyboard focus |
| **Ambient accent** | `--app-blue` | accent hue | The assistant layer's accent — its chips, links, and highlights bridge to the brand hue through this |
| **Page background** | `--background` | gray family | The ground every screen sits on; everything else stacks above it |
| **Primary text** | `--foreground` + `--card-foreground`, `--popover-foreground`, `--sidebar-foreground` | gray family | Headings and body copy everywhere — cards, popovers, and the sidebar inherit it |
| **Raised surface** | `--card` + `--popover` | gray family | The face of anything lifted off the page — cards, popovers, menus, sheets |
| **Quiet fill** | `--muted` + `--accent`, `--sidebar-accent` | gray family | The soft wash behind hover and selected states, subtle chips, and secondary surfaces |
| **Secondary text** | `--muted-foreground` | gray family | Supporting copy — descriptions, captions, placeholders, section labels |
| **Text on quiet fill** | `--accent-foreground` + `--sidebar-accent-foreground` | gray family | Text sitting on the quiet fill — a hovered menu item's label, a selected row's text |
| **Hairline border** | `--border` + `--sidebar-border` | gray family | Every hairline — card edges, dividers, table rules |
| **Field border** | `--input` | gray family | Form-control borders at rest — inputs, selects, checkboxes |
| **Sidebar ground** | `--sidebar` | gray family | The navigation rail's tint, and the shell behind the inset content card |

This table and `ROLE_DEFS` in `foundation-context.tsx` are the same list —
the code carries each role's label and description, and the /ds editor renders
them. Adding a role means adding it in both places plus `tokens/tokens.json`;
they must not diverge.

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

| 2026-08-21 | **Tailwind became the system of record for color, spacing, and type.** The full Tailwind palette (emitted via `theme(static)`) replaces the hand-picked accents/grays: accents = all 17 hues + neutral (steps 600/500, ambient 600/400, paired foregrounds), the gray family defines every surface token (50–950 mapping); the custom `--ambient-space/text` scales are retired — spacing is Tailwind's scale × the Foundation's `--spacing` unit, type is Tailwind's text scale; /ds gained a Colors page (the full grid + the semantic mapping) and Spacing re-documents Tailwind's steps | Why maintain a parallel scale when the substrate ships one? The components already speak Tailwind — now the Foundation selects from it instead of overriding beside it. Gotcha: Tailwind v4 tree-shakes theme variables — `theme(static)` is required for the palette to exist as CSS vars |

| 2026-08-21 | **The primary rule established: a reference is a request for a configuration.** Exercise: matched the Linear look purely by config — indigo accent, gray family, radius 4, default unit, 95% scaling, light — zero component styling touched | User direction: this IS the governance layer's job. Any target look is read as Foundation values; a look the config cannot reach extends the system, never patches components |

| 2026-08-21 | **Three more Foundation dimensions**: shadows (later reverted to docs-only — see below), the icon library (Lucide/Tabler/HugeIcons/Phosphor/Remix via a semantic `<Icon name>` component), and the font (`--font-sans`: Geist local or Google Fonts loaded on demand) | User direction: every visual dimension a reference could differ on should be a config value — same propagation guarantees as color and spacing. Icons follow the same shape: semantic names, library selected once |

| 2026-08-21 | **The settings-page pattern promoted** (`components/ds/settings-kit.tsx`: SettingsTitle / SettingsSection / SettingsCard / SettingsRow — title+description left, control right, or a full-width picker zone; hairline-divided cards per topic). The Foundation page rebuilt on it; the /ds rail moved to sentence-case group labels | Reference: Linear's preferences page. Note the primary rule held for the THEME (nothing recolored); the reference's page STRUCTURE is a pattern, and patterns get promoted through governance, not improvised |
| 2026-08-21 | **Text tones became Foundation config**: primary text (gray-family step 950/900/800) and secondary text (600/500/400), driving --foreground/--card-foreground/--popover-foreground/--sidebar-foreground and --muted-foreground, with automatic dark-mode mirrors (950↔50 … 400↔500) | User request — text color is a foundation decision like everything else, and staying on the gray family's steps keeps it on-palette in both modes |

| 2026-08-21 | **Shadow config reverted to documentation**: the elevation presets (Flat/Subtle/Default/Elevated) removed — components barely vary by them, so the knob had no payoff; Tailwind's shadow scale stands as-is, documented at /ds → Shadows with per-step semantics (2xs pressed controls → 2xl takeovers) | User call: "I wanted to just document the shadows properly." A config dimension must visibly propagate to earn its place; elevation choices belong to the components that make them |

| 2026-08-21 | **The semantic mapping became a live editor** (`ROLE_DEFS` + `config.roles`): every semantic token's light/dark palette step is configurable on /ds → Colors with swatch previews and per-mode dropdowns; the Foundation's text-tone rows are quick presets over the same config; --primary-foreground stays auto-paired | User call: "this whole thing should be configurable visibly rather than just variables shown, or else the whole configurable purpose goes away." Documentation of a mapping IS the mapping's editor in this product |

| 2026-08-21 | **Inset-card canvas promoted as the app-shell layout pattern** (via the watchlist): the page ground is `bg-sidebar` (rails consume the `--sidebar` role directly, no separating borders), and the content area is a `bg-background` card — `rounded-lg border` with a `p-2` gutter (shadowless by a later decision: the shell separates by tint and hairline alone). Rail group labels use the primary text tone; items stay muted until active | User asked for Linear-style separation between sidebar and content; the watchlist question was asked and answered yes. The separation is now pure config: retint it by editing the `--sidebar` role at /ds → Colors |

| 2026-08-21 | **Every role in the map carries a human label and a plain-language description** (`RoleDef.label` / `RoleDef.description`): the /ds Colors editor leads with "Action color — filled buttons, switches…" and demotes the token name to a mono footnote; the same glossary is documented in §9 | User feedback: "it's hard to understand what the person is actually updating." A configurable mapping is only governable if the person configuring it can tell what each row does |

| 2026-08-21 | **Config-layer audit — four propagation leaks fixed.** (1) Controls sat on the top of the radius ramp (`rounded-4xl` ≈ radius × 2.6), which exceeds half a control's height from step 8 up — the browser clamps to a pill, so most of the ramp looked dead. Buttons/inputs now use `rounded-lg` (= `--radius`), badges `rounded-md`, menus `rounded-xl`/`rounded-md`, cards `rounded-2xl`; the whole ramp now visibly restyles them. (2) The semantic `<Icon>` moved into `packages/ui` (`IconLibraryProvider` fed by the Foundation) and the primitives — checkbox, dropdown, sheet, sidebar — plus the /ds registry now draw through it; before, only the Foundation-page preview strips consumed the icon config. New names `chevron-right` and `sidebar` mapped in all five libraries. (3) Dropdown menus hard-coded a `dark` class — they ignored the appearance and the role map; removed. (4) ~50 `text-[10–13px]` labels in /ds and Foundation pages didn't ride the scaling base; converted to `text-xs`/`text-sm`. Foundation text-tone previews also now show the mirrored step in dark mode | User audit request: "the save buttons are not reacting based on the config of radius… do a complete audit check across the app if the config layer is working." A config dimension that doesn't visibly propagate is indistinguishable from a broken one. Assistant's stance-era px remain grandfathered (fix on touch) |

| 2026-08-22 | **Framer Motion sanctioned as the animation library** (`framer-motion` in `apps/web`), amending the motion-is-CSS-only rule: CSS stays the default for simple transitions; Framer Motion is for interruptible/gestural motion, layout/presence transitions, and springs | Owner decision — installed at the user's direction. One library, not many: no other animation dependency without a new decision here |

| 2026-08-22 | **Orb state transitions moved to Framer Motion springs** (first consumer of the sanctioned library): each shader parameter is a spring-driven motion value retargeted on state change, replacing the hand-rolled second-order easing loop; the answer bloom is a keyframe sequence from the current value. The /ds playground gained a lifecycle seek bar — play/scrub the whole still → listening → thinking → answer journey (~3s dwell per state); `play`/`pause` added to the icon vocabulary, mapped in all five libraries | Springs carry velocity across retargets, which is exactly what the second-order loop hand-built; interruption mid-transition stays smooth for free |

| 2026-08-22 | **The role editor moved into the Foundation page** (Semantic mapping section, between Color and Shape and density); the Colors page keeps the palette grid and points there | User call: the Foundation is where ALL theme configuration lives — a config surface split across pages breaks the single-source story. `RoleEditor` is shared (colors-page exports it); Foundation embeds it without the inline save, the page footer's Save Theme commits |

| 2026-08-22 | **The motion system**: motion became a Foundation dimension — four semantic roles (`--motion-micro/control/surface/page`) driven by a configured character (Productive/Smooth/Expressive: easing + duration + spring families) and pace (Relaxed/Default/Brisk). Tailwind's default transition duration/easing map onto the micro role so every `transition-*` utility re-times on Save; explicit sites converted to `duration-(--motion-{role})`; Framer consumers use `useMotionTransition`/`useMotionSpring`. Configured at Foundation → Motion, documented at /ds → Motion | User direction: "easier for anyone to configure overall motion system across pages and components micro interaction." Same shape as the role map: components name the job, the Foundation decides the feel |

| 2026-08-22 | **Motion-role adoption audit** (user-requested): the assistant had NO transitions at all — every mode change (line/bar/panel/dock/spotlight) was a hard cut. All five surfaces now enter through the surface role via Framer (`useMotionTransition("surface")`); the orb's snap-to-anchor literal `duration-300` became the page role; a leftover `ease-linear` on the sidebar rail rejoined `--motion-ease`. Verified live: menus, buttons, and surfaces all compute their durations from the emitted `--motion-*` vars. Accepted non-role timings, each sanctioned: the orb's identity springs and answer bloom (§5 exception), the Foundation's character-preview demos (each demos its own preset by definition), and the infinite idle loops `ambient-shimmer`/`viz-pulse` (decorative cadence, not state transitions) | "The transition of the whole AI component seems to be not using it" — correct, and worse: it had none. Exit animations were completed the same day (see next entry) |

| 2026-08-22 | **Assistant exits + spring entrances**: the per-mode early returns became one `AnimatePresence` over keyed surfaces, so every mode change animates out as well as in (verified: overlay opacity interpolates 1→0 before unmount). Entrance transforms moved from the surface tween to the configured character's spring (`useMotionSpring`), with opacity on the micro tween and quick micro-fade exits — springs respond instantly instead of the tween's perceptible drift | User feedback: ⌘K "feels like it is lagging rather than being smooth" — a 300ms soft-curve tween on transforms reads as drift; a spring reads as response. Enter slow-ish and settle, exit fast is the standard asymmetry |

| 2026-08-22 | **Surface jank fixed at the source — `OrbGlyph`**: the AI's marks and avatars were full `OrbCharacter`s, so every surface open created fresh WebGL contexts + shader compiles + 60fps loops mid-entrance (measured: 2 new contexts per ⌘K). Marks ≤32px now render `OrbGlyph` — a pure-CSS twin (glass shell + accent core, zero runtime); the shader lives only on the 52px floating orb and the /ds playground, and the floating orb stays MOUNTED across mode changes (hidden, not unmounted) so closing a surface no longer recompiles it. Verified: one canvas total in any mode; a full open/close cycle shows a single ~51ms task | User: "the whole interaction of the AI still feels laggy." The lag wasn't the curve, it was work during the frames. Identity lives at identity scale; at glyph scale the anatomy is the identity |

## 13. Pattern watchlist

*(Patterns spotted but not yet ruled on — triage through governance.)*

- **Foundation swatch picker** (accent/gray circles with ring selection) — used
  twice on the Foundation page; if a third use appears, promote to a component.
- **Scale ruler / type ramp preview** (Foundation → Scale) — candidate for the
  vocabulary once the Spacing page and Foundation stop being its only consumers.
