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
| radius | **Tailwind's radius scale** — none/xs/sm/md/lg/xl/2xl/3xl/4xl (0, 2, 4, 6, 8, 12, 16, 24, 32 px). Foundation picks one step; it becomes `--radius` (and `rounded-lg`) and the named steps slide with it as a window on the SAME ramp. Reached through `--radius` and `rounded-*`, never as a literal |
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
- **The sanctioned shader surfaces** are the OrbCharacter and the ambient field (`OrbField` — the same heat engine as a surface background, one per open AI surface, mounted after the entrance). Beyond these: the OrbCharacter
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

**Product vocabulary** (`packages/ui/src/components`, 14): Badge, Button, Card,
Checkbox, Collapsible, DropdownMenu, Input, Separator, Sheet, Sidebar,
Skeleton, Table, Tabs, Tooltip. Installed from the shadcn radix-nova preset; extended only through the
shadcn CLI or governance.

**Ambient vocabulary** (`apps/web/src/components/assistant`): the assistant's
four surfaces — orb (line), panel, dock, spotlight — plus the objects a
conversation is made of, in four groups at `/ds` → Ambient vocabulary:

- *Core*: **OrbCharacter** (the animated identity), **StreamingText**,
  **MessagePair**, **MessageBranches**, **ReferenceChips**,
  **ShimmerPlaceholder**, **ContextChip**, **CommandPalette**.
- *Messages* (`message-kit.tsx`): **MessageActions**, **FollowUpSuggestions**,
  **ErrorState**, **MessageQueue**, **ReasoningPanel**, **ReasoningEffort**,
  **MessageAttachments**, **QuoteReply**, **FeedbackDialog**, **ReviewComment**,
  **DayDivider** · **MessageTime**.
- *Tool use* (`tool-kit.tsx`): **ToolCall**, **ToolTimeline**,
  **TerminalBlock**, **CodeDiff**, **ReviewableDiff**, **ParallelTools**,
  **ToolFailure**, **CodeRunner**.
- *Knowledge* (`knowledge-kit.tsx`): **WebSearch**, **InlineCitation**,
  **ResearchReport**.
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
- A page that knows more says more, through `setPageIntel`: the questions worth
  asking here, the working history this surface would have, where "Jump to"
  should go, and the words the palette uses to offer them. The layer renders it
  and keeps its generic defaults for pages that stay quiet.

## 8. The Ambient Layer contract — the seven things that must not drift

1. **One surface, five modes**: `line` (orb, which expands in place into
   quick ask) · `panel` · `dock` · `spotlight` · `history`. New modes are
   governance events; extend an existing form before adding one. The first
   four are sized to how much attention one EXCHANGE deserves. `history` is
   the exception and the reason the rule survived it: it is not about an
   exchange at all but about the record of them, which is why it is the only
   mode that takes the whole screen — and it is still translucent over the
   product, because the work is the reason you opened the record. A new mode
   is a new GEOMETRY, never new parts: history composes the sanctioned
   Sidebar, the same transcript and the same Composer as every other mode.
2. **Drag is the mode switcher.** Panel header drags; right-edge hot zone docks;
   top-center hot zone opens spotlight; the dock tears off into a panel in one
   gesture. ⌘K toggles spotlight; Esc clears, then closes.
3. **An answer arrives in ORDER, never all at once.** Thinking finishes, then
   the next evidence block works, then the prose streams, then artifacts land.
   Enforced in `useStagedReveal` via the stage queue (`stage-queue.ts`), never
   per block: a staged block claims its slot by being staged at all, so there
   is nothing to remember and nothing to opt out of by accident. A block
   outside a response (a /ds playground) has no queue and stages on its own.
4. **Context is ambient.** The page chip arrives from the page (`setPageChip`),
   user chips attach explicitly; the user never re-explains where they are.
   Conversations keep their context. What the palette OFFERS is context too:
   `setPageIntel` carries the page's live suggestions and recents, so the
   spotlight opens onto this environment's real work rather than a generic
   menu. The dev tool publishes its problem inventory there — every suggestion
   is a question one of its errors deserves, and a fixed problem leaves the
   palette the moment it heals.
5. **Nothing inside an ambient surface is opaque, and the veil always sits
   over the field.** Every mode wears the layer's material: a glass recipe,
   the heat field behind it, and a translucent layer ON TOP of that field.
   `renderField(place)` names the three combinations that mean anything —
   `panel` (low presence, full frost: atmosphere behind content), `ground`
   (full presence, thin veil: the field IS the wallpaper, as on the canvas),
   and `screen` (full presence, the heavier `.ambient-screen-frost`: a
   full-screen surface, where the field carries a whole window and the veil
   has to be weighted for a full-presence shader — the panel's frost is tuned
   for a field at low presence and leaves a stage-strength one glowing
   through the content). ONE veil per surface, owned by the surface: never
   one per bar, which makes each bar a solid pane and still leaves the
   content unveiled — but an overlaying BAR still carries its own, because
   the surface's veil covers the field while the bar's covers the content
   scrolling behind it, which is painted above that veil and out of its
   reach. Two jobs, two layers; confusing them removes the bar's ground and
   the transcript passes straight through the composer. And the field is
   scoped to the CONVERSATION, not the
   window: run behind the record and the chrome it lights lists, which are
   read rather than felt, and a shader under text is noise. The field is the
   ground an answer arrives on, so it covers exactly that. A place, not two
   knobs, because every wrong combination
   has been built at least once — full presence under the thin veil leaves
   the shader raw, which is the ground's recipe applied where it does not
   belong. A pane
   WITHIN a surface uses the layer's wash, never a product ground:
   `bg-sidebar` on history's rail read correctly as a navigable pane and
   punched a solid hole through the field and the work behind it, which is
   the one thing every surface of this layer exists to keep.
6. **No glows.** The beam was removed; nothing glows without governance.
   The orb's face is the **OrbCharacter** — four states (still / listening /
   thinking / answer) driven through `orbState` in the assistant context.
   The response pipeline sets the state; components only read it. The
   character's palette derives from the accent bridge; it renders via the
   system's one sanctioned WebGL shader (§5).
7. **The response kit seam.** `send()` appends the user message and stops — the
   canned plan/answer machinery was deliberately removed. Responses will be
   composed from the component vocabulary (plan → streamed progress → composed
   answer). Do not reintroduce mock responses outside that kit.

## 9. Theming — the Foundation config

- Foundation lives at `/ds` → Foundation. **Scaling comes first** — it is the
  base layer every other dimension derives from. Then: accent (all 17
  Tailwind hues + neutral, each with paired foregrounds — light hues get
  dark text), gray family (Tailwind's five — it defines every surface
  token), appearance (light/dark), radius (Tailwind's 9-step scale), spacing
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
**Light is the design decision**: picking a role's light step derives the
dark one automatically (`deriveDark` — gray roles mirror across the scale,
accent roles keep their default offset, and each role's designed deviation
from the pure mirror is preserved). Setting dark explicitly overrides,
until the next light pick re-derives.

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

| 2026-08-22 | **Dark derives from light in the role map** (`deriveDark`): picking a light step auto-derives the dark one — gray roles mirror across the scale, accent roles keep their default offset, per-role deviations preserved; explicitly picking dark overrides until the next light pick. The Semantic mapping section gained a light/dark test toggle beside the description | User call: "the user shouldn't be thinking so much to figure out basic stuff" — one decision (light), one derived consequence (dark), explicit override one click away |

| 2026-08-22 | **One glass recipe for the ambient layer** (`.ambient-glass` in theme.css): popover tint at 80% over `blur(var(--ambient-blur)) saturate(1.15)`; --ambient-blur unified at 24px. All AI surfaces wear it — the panel/dock chrome's one-off `bg-popover/80 backdrop-blur-2xl` and the solid spotlight card and bar input row all converged on the class | User call: the frost belongs to the whole AI layer, not one surface. A glass look that exists as a class is configurable; one that exists as scattered utilities is folklore |

| 2026-08-22 | **Translucency tokens + SectionRail + sticky save.** (1) Every alpha collected into six tokens in theme.css (`--glass-fill/core/border`, `--wash`, `--wash-strong`, `--scrim`) — ~30 scattered `/40`-`/80` modifiers and inline color-mix recipes swept onto them; they derive from semantic roles so the role map retints them. (2) **SectionRail promoted into the product vocabulary** (user-commissioned, from a story-rail reference): right-edge dash rail, active dash grows with its label, click smooth-scrolls; motion on the control role; documented in the /ds registry; the Foundation page wears it across its seven sections. (3) The Foundation's Save Theme/Reset footer is sticky at the card bottom | Translucency was folklore spread across ~30 call sites; now it is six decisions. The rail keeps a long config page navigable without a second sidebar |

| 2026-08-22 | **SaveReminder extracted into the settings-kit** as the pattern's save affordance: `open`/`saved` + `onSave`/`onDiscard` with configurable copy; spring entrance, micro-fade exit; documented in the /ds registry with an interactive story. The Foundation page is its first consumer | The reminder replaced the sticky footer one turn earlier; a pattern used once is a one-off, extracted it is vocabulary — "turn this into a component for future purposes" |

| 2026-08-22 | **Sonner joins the vocabulary as the toast layer**: one `<Toaster>` at the app root, dressed in the popover role (surface/text/border/radius follow the role map) and themed by the appearance. The save-feedback pattern is now: SaveReminder dismisses immediately on save, the toast confirms — the reminder no longer holds a "saved" confirmation state (prop removed). Documented in the /ds registry | User call: confirmation is transient feedback, not reminder chrome. Reminder = persistent state, toast = completed event — each surface does one job |

| 2026-08-22 | **Raycast-level glass for the command palette** (reference answered as configuration + recipe tuning, per THE PRIMARY RULE): `--glass-fill` deepened to popover 65%, `--ambient-blur` 24→48px, saturation 1.15→1.5 — one recipe change upgraded every AI surface. New `--glass-wash` token (foreground 9%) for neutral fills ON glass: palette selection/hover moved off the accent wash onto it, plus Raycast-style keycap chips (`PaletteKey`) in the footer; palette card corners on the 2xl ramp step, input on text-base | User: "same level and same glass effect… super important." Selection on glass is neutral in every reference-grade palette — accent is for actions, not focus position |

| 2026-08-22 | **Raycast pass 2 + the live border.** Palette refinements toward the reference: neutral icons (accent reserved for actions), sentence-case section labels, rows on text-sm, context chips merged into the input band (one hairline), Raycast footer anatomy (brand left — OrbGlyph + name — primary action + toggle right), glass fill deepened to popover 55%. **The live border**: the orb's states projected onto every AI surface's border — `.ambient-live-border`, a conic comet on `--app-blue` masked to a 1.5px ring, driven by `data-orb-state` (still 14s/0.4 → listening 7s/0.65 → thinking 1.6s/1 → answer 3.5s/0.85). Pure CSS in theme.css — a WebGL border per surface would repeat the cost the OrbGlyph decision removed | User: "bring all the states of the Orb in the border." The orb is the identity; when a surface is open the identity lives in its edge |

| 2026-08-22 | **The response kit, v0** (user-commissioned — "let's start building the response kit"): `response-kit.tsx` fills the `send()` seam with composed answer OBJECTS — `ResponseBlock` (OrbGlyph author mark + frame-clock streamed text + settle callback) and `ReferenceChips` (numbered, on `--glass-wash`); `composeResponse` is a canned, context-grounded composer a model will replace. The full ambient pipeline is real: typing a question turns the state to LISTENING (the "Ask ambientui" activation), send → THINKING, streaming → ANSWER, completion → STILL — orb and live borders ride it. Live-border fixes: the ring mask moved to the border-box/padding-box exclude technique (the old one leaked the conic across the panel), zero-alpha stops pinned to the accent hue, still-state presence raised to 0.55. Streaming runs on the frame clock, not setInterval (timers throttle in hidden tabs) | The kit's contract: a model replaces the composer, never the objects or the states |

| 2026-08-22 | **The heat field behind the glass** (`OrbField`): the orb's shader — same engine, same states, extracted into a shared `useHeatEngine` hook — now renders as the BACKGROUND of AI surfaces, behind a dedicated frost layer (`.ambient-field-frost` on the new `--glass-veil` token) so the heat glows through the translucency. Wrapped around a rounded-rect shape (`/orb-rect.svg`); one field per open surface, mounted 400ms after the entrance (the shader compile can never jank the spring) and faded in on the surface role. §5's sanctioned shader surfaces widened to include it | User's idea: "bring the shader as background with all the states behind the translucency." The identity isn't a mascot in the corner — the surface itself is made of it |

| 2026-08-22 | **Quick ask — the orb's expanded form** (user-commissioned): clicking the orb grows an input out of the character, sharing its glass and opening toward screen center; the character turns to *listening* as it opens; clicking the orb again, clicking outside, or Esc closes it; the thinking beat is held IN the pill and the panel takes over when the answer is ready (`seedPrompt(text, autoSend, immediate)`), and asking seeds the panel with `seedPrompt(text, autoSend)` so the panel arrives already answering. Implemented as the orb's own state, NOT a sixth mode — the machine still has five. Documented at /ds → Form factors | The growth rule this sets: extend an existing form before adding one; add a mode only when the new surface would have its own lifecycle |

| 2026-08-22 | **The bar mode was removed** (user-commissioned), taking the contract from five modes to four: `line` · `panel` · `dock` · `spotlight`. Quick ask supersedes it — a bottom-edge input that carried its own glass was the same job (one question, no surface) done further from the user's hand and with a second set of chrome. Its removal also retired the `bare` and `showKbd` props on the form row: `bare` existed only to distinguish the bar's self-glass from in-surface rows, so with the bar gone every AI form is in-surface and the row has one shape | The growth rule cuts both ways: a form that duplicates another's job at a worse distance is removed, not kept for symmetry |
| 2026-08-22 | **MessageBranches** (user-commissioned): regenerated answers join their predecessor rather than replacing it, and a quiet pager under the answer keeps every version reachable. The newest branch becomes the one you are looking at; stepping back shows settled text, because history is written, not replayed. Arrows disable at the ends instead of wrapping. Composed entirely from existing primitives — ghost icon `Button`s, `<Icon>`, `ResponseBlock` — and the `chevron-left` name was added across all five icon libraries to serve it | Regeneration that overwrites is a silent destructive act: the user may have preferred the answer the model just discarded. The pager is navigation, not content, so it is the quietest object in the transcript |
| 2026-08-22 | **Any Inspect-rail change raises the save reminder** (user-commissioned, stated as a rule): `dirty` is now "the config differs from the saved theme OR a rail control was touched". Enforced in the rail's primitives — `ControlRow` and `ChoiceControl` call `touch()` — never in the playgrounds; `ControlRow action` exempts one-shot action rows only. Discard bumps a `generation` that remounts rail state, so it reverts playground props as well as config | A rule that each new playground has to remember is a habit, not a rule. Enforcing it in the primitive means the next component written cannot silently drop a user's edit |
| 2026-08-22 | **One context chip, not one per surface**: the palette's bordered icon-tile chip and the composer's small blue pill were two implementations of the same object. Unified into `ContextChipView` with two sizes (`default`, `compact`); the pill is deleted, and the `/ds` story now renders the real component | The registry documented the pill while the product showed the chip — documentation that shows an approximation of a component is worse than none, because it teaches the AI layer a shape that does not exist |
| 2026-08-22 | **Reference chips carry a source mark** (user-commissioned, for citations): one anatomy — number · mark · label — with the mark slot filled in a fixed precedence (the source's own `logo`, else a typed `icon`, else nothing), and an optional `href` that makes the chip a link. A logo that fails to load falls back to a monogram. Four icon names (`document`, `link`, `globe`, `code`) were mapped across all five libraries to serve typed sources | A slot with a precedence keeps one object; a set of variants would have produced three chips that look like three kinds of claim. The logo is DATA the caller supplies — a design system that fetched favicons would be inventing provenance, and a mark makes a reference look authoritative, so it must never be added to a source the answer did not use |
| 2026-08-22 | **The status pair**: the system had `--destructive` alone, which forced every positive signal (a passing test, an added diff line) to invent a green. Added `--positive` (Tailwind emerald 600/500, the palette of record) plus `--positive-wash` / `--destructive-wash` translucency tokens | A single-sided status vocabulary guarantees drift: the moment a component needs "good", it hardcodes one. Status is now a pair, and every pass/fail surface — diffs, tool marks, terminal exits, report sections — reads from it |
| 2026-08-22 | **The conversation vocabulary tripled** (user-commissioned, from the assistant-ui element list): 21 components in three kits — `message-kit` (actions, follow-ups, error state, queue, reasoning panel + effort, attachments, quote reply, feedback, timestamps), `tool-kit` (tool call, timeline, terminal, code diff, reviewable diff, parallel tools, tool failure, code runner), `knowledge-kit` (web search, inline citation, research report). All composed from existing primitives — Button, Input, Icon, tokens, motion roles — with no new dependency and no bespoke color. Ten icon names added across all five libraries. The `/ds` ambient rail now groups entries (`ComponentEntry.group`) because a flat list of 29 stopped being navigable | Two rules did the design work. **A tool call is a claim, and a claim must be auditable** — the collapsed row is the claim, the disclosure is the evidence, and failures open by default because a failure you have to find is a failure you miss. **Provenance is shown, never implied** — the search query is visible because it is where an answer first goes wrong, and a citation binds a source to the SENTENCE it supports rather than to the reply |
| 2026-08-22 | **The home surface became three views** (user-commissioned): `canvas` (the presentation ground, unchanged and still the default), `layer` (what an ambient layer is and what follows from it), and `devtool` (a code-review product with the assistant docked beside it, composed entirely from documented components). The view lives in the URL as `?view=`, and each one declares its own page chip, so the assistant knows which is open. **Tabs** was installed through the shadcn CLI — the sanctioned path — and documented at /ds before use | The dev-tool view is the argument's proof: if the vocabulary is real, a product using the ambient layer should be assemblable from it without one bespoke object. It was — the editor shell is tokens, and every object in the conversation column is a registry entry |
| 2026-08-22 | **An answer is a composed object with a grammar, not a paragraph** (user-commissioned): `KitResponse` now carries `evidence` (reasoning, parallel calls, tool calls, searches — above the prose, because it is what the answer rests on), `artifacts` (a reviewable diff, a test run, a session timeline — below it, because they are consequences), `followUps`, and one place that maps a block to a component (`KitBlockView`). `composeResponse` shapes the blocks from the ATTACHED CONTEXT: a file earns tool calls and a diff, a page earns a search and citations. The real transcript now renders `MessageBranches`, so regenerate appends a version, and follow-ups ask the next question | The seam only proves something if the objects reach the real surfaces. A model wiring in emits blocks; every form factor already knows how to render them, and no surface renders a block itself |
| 2026-08-22 | **The attach gesture became real** (`AttachMenu`, `AskAI`, `useAttachMenu`): right-click anything → Explain with AI / Add to chat context, plus an inline "Ask AI" revealed on row hover. The capability existed in the context (`explain`, `addChip`) but no product surface had ever used it. Chip kinds gained `file`, `symbol`, `selection` | The product side of the ambient contract is three calls — declare the page, offer to ask at the data, let anything become context. Until a surface actually made them, the layer was a demo of itself |
| 2026-08-22 | **The dev tool tab is a full-screen editor with no prose on it** (user-commissioned, second revision): a task rail ("ready for review"), file tabs, a gutter, a problem strip, and a status bar — and the docked assistant as the right column, with the work reflowing to `pe-[420px]` instead of being covered. The explanatory copy is gone: a product that has to describe its own AI integration does not have one | The tab has to be a product, not a diagram of one. Removing the prose is what forces the integration to carry the argument by itself — if the entry points are not discoverable in the UI, no paragraph above it will save them |
| 2026-08-22 | **The dev tool tab was rebuilt as a real editor** (user-commissioned; the first version was a static conversation card beside a fake editor, which showed the components but not the integration). It now drives the GLOBAL assistant: the open file is the page chip, every file row and code line is attachable, the problem strip carries an inline Ask AI, and selecting code attaches the selection | A composition demo proves the components exist. A product proves the layer works. The rewrite also caught a real bug: the seed effect reached `send` through a ref refreshed by a LATER effect, so a prompt seeded in the same click as `addChip` composed against the previous chip list — an explain-this-file answer came back generic |
| 2026-08-22 | **Radius comes from Tailwind, like every other scale** (user-commissioned): the ramp was `0/2/4/8/12/16/20/24` — 20 is on no scale, 6 and 32 were missing — and worse, `globals.css` defined the NAMED steps as multiples of the pick (`--radius-xl: calc(var(--radius) * 1.4)`), so `rounded-xl` in this app was not Tailwind's `xl` at all. Now the scale is Tailwind's verbatim and the Foundation slides a WINDOW along it: the chosen step becomes `--radius`/`rounded-lg` and the neighbours are the adjacent Tailwind values, clamped at the ends. At the default (8 = lg) the emitted map is Tailwind's own, unchanged | The rule was already written — the scales of record are Tailwind's — and radius was the one dimension quietly exempt from it. A picker offering 20px taught a value no utility could express, and multiplied steps meant `rounded-2xl` drifted further from the scale the more the base moved |
| 2026-08-22 | **Evidence blocks stage their arrival** (user-commissioned): one shared primitive (`staging.tsx` — `useStagedReveal`, `StageSkeleton`, `StagedItem`) gives ReasoningPanel, ParallelTools, WebSearch and ResearchReport the same three beats — shimmer on the ambient accent, a hold, then items one at a time on the control motion role. `staged={false}` renders settled | These blocks are complete in the data and would paint in one frame. Painting them instantly is a small lie — it says the work was free — and it robs the reader of the one thing the block is for, which is watching the assistant think. It lives in ONE place so four blocks cannot drift into four ideas of what waiting looks like |
| 2026-08-22 | **FollowUpSuggestions' list variant became a titled group** (user-commissioned, against a reference): rows with real padding that wrap to two lines, hairline dividers, a heading, and an open-arrow per row — instead of full-width `xs` buttons that could not hold a sentence. `arrow-up-right` mapped across all five icon libraries | Pills and rows are not one object at two sizes: a pill is an afterthought you can ignore, a row is a question you are meant to read. The old list was a pill stretched to full width, which gave it neither |
| 2026-08-22 | **Every block that took time shows that it took time** (user-commissioned, stated repeatedly until it became a rule): all ten evidence/artifact blocks — ReasoningPanel, ParallelTools, WebSearch, ResearchReport, ToolCall, ToolTimeline, TerminalBlock, CodeDiff, ReviewableDiff, CodeRunner — stage through one shared vocabulary: shimmer on the ambient accent with a MEASURED elapsed count (`useElapsedSeconds`, not a prop), then content arriving progressively (`useStagedReveal`), with written text landing through `StreamingText`. `staged={false}` renders settled. Kit type moved off arbitrary px onto Tailwind's text scale and kit controls off `xs` onto `sm`, so both follow the Foundation | The counter is measured because a trace that claims "thought for 5s" when it took two is a decoration pretending to be a measurement. Arbitrary px was quietly exempt from the propagation rule — the one rule the system exists to keep |
| 2026-08-22 | **QuoteReply became a selection-anchored edit bar** (user-commissioned, against a reference): the bar measures the selection and attaches beneath its last line, centred on the whole selection; a state machine idle → thinking (shimmer + real count) → streaming (the rewrite arrives INTO the selection) → result (Keep / Discard / Retry). Owning the prose is a prop (`text` + a `rewrite` seam); without the seam actions only report. One found bug worth recording: pressing a control collapses the selection, whose `selectionchange` would unmount the bar before the click lands — the bar preventDefaults pointerdown on itself | An edit offered where the text is, in the state it is actually in, is the difference between a toolbar and an editor. And the pointerdown guard is the kind of invariant that dies silently if it is not written down |
| 2026-08-22 | **MessageQueue's arrow interrupts, ReasoningEffort collapses**: the queue's ↑ sends a turn NOW and re-queues the running one (a queue that shuffles mid-answer implies the running turn can be overtaken quietly); the effort control lives behind a ghost trigger stating the current level, because it is a setting, not a status | Both are honesty fixes: controls should say what they actually do to the running work |
| 2026-08-22 | **Messages no longer carry the orb** (user-commissioned): `ResponseBlock` drops its per-answer OrbCharacter/OrbGlyph author mark. The identity lives in the SHELL — the floating orb, the live border, the heat field, a surface's brand row — and its behaviour during an answer is the shell's to perform | A mark on every message repeated the shell's signature once per reply; in a long transcript the identity became wallpaper. One signature per surface, alignment says who is speaking |
| 2026-08-22 | **The Composer is a component; send↔stop is one control** (user-commissioned, revised once): the input row was extracted from the surfaces into `composer.tsx` — context chips · input · one control that is Send while idle (lit only when there is text) and STOP while an answer runs (cancel mid-compose; settle mid-stream). The orb was tried in the send slot and REMOVED on sight: the identity already lives in the shell, and a character where a control belongs read as decoration, not affordance. `variant` now covers `panel` and `quick` (quick ask's pill hands its input band to the same component); the spotlight band is the remaining variant. `ToolCall` also lost its inline argument chip — the exact argument is evidence, and evidence lives in the disclosure | A control whose meaning flips with the moment is honest only if it lives in ONE place — three hand-rolled input rows would each drift their own way. And the orb lesson is worth keeping: identity marks and controls are different species, even at the same size |
| 2026-08-22 | **The dev tool became a scenario simulation** (user-commissioned, from a written brief): `composeResponse` is now a SCENARIO ROUTER — intent detected from the question plus the attached context decides which blocks compose the answer (fix → reviewable diff; explain → light prose + refs; refactor → reasoning + parallel reads + two diffs + typecheck + timeline; run → failing terminal + failure with recovery follow-ups; fix-automatically → the same workflow continued; generate/compact → registry-grounded diffs; make-component → creation timeline through registry/vocabulary/Figma; token change → propagation timeline; figma sync → agentic steps; research → search + report with sources). The grammar gained `failure` and `report` kinds. FOLLOW-UPS ARE THE SEAMS: picking one hands the next intent back through the router, so scenarios chain — research → implement, run → fail → fix → tests → component → Figma | The brief's goal, kept literally: demonstrate the vocabulary by making the user do real work. A few minutes of natural use walks nearly the whole library because the seams between scenarios are the suggestions, not a menu |
| 2026-08-22 | **The queue is real**: sending while the agent is busy ENQUEUES (visible MessageQueue above the composer, editable, drains on settle); the composer gains a third state — busy WITH text shows a queue affordance beside Stop. An explicit Stop does not auto-drain: stopping means stop, and the next turn is sent deliberately. Thumbs-down now opens FeedbackDialog in place | Queue-on-send is what separates an agent from request/response chat; and a queue that keeps flowing after the user said stop would be the assistant overruling them |
| 2026-08-22 | **The Journey rail + the reactive workspace** (user-commissioned): the dev tool's rail gains a Journey — ten numbered steps that drive the REAL assistant through the scenarios (attach the prescribed chip, ask the real question; the refactor step queues a second instruction mid-run to demonstrate the queue). Nothing is played back. And the workspace now RECEIVES the work: `KitResponse.effect` names what an answer did ("fix-composer"), the assistant relays it on settle through `announceEffect`, and the editor responds — the error line pulses on the quiet wash while the AI works (status bar: "AI is working on composer.tsx:4…"), then the source swaps to the fixed version, the wavy underline and problem strip clear, changed lines wear the positive wash, and the task/file rails flip to done | A simulation where the product never changes is a chat demo next to a screenshot. The effect channel keeps the layers honest: the assistant relays a NAME and the workspace decides what changing means — the layer still knows nothing about editors |
| 2026-08-22 | **The problem inventory — frontend and backend** (user-commissioned): the workspace now carries five real errors across six files — two frontend (draft state lost in composer.tsx, an effect-without-deps render loop in thread-list.tsx) and three backend (an unawaited-promise 500 in api/messages.ts, a heartbeat-less SSE stream that proxies drop at 30s in api/stream.ts, an N+1 query at 340ms p95 in db/drafts.ts). A Problems panel lists them all with source badges; server/db files wear badges in the rail. Each has a router scenario with domain-true evidence (server log, curl transcript, EXPLAIN ANALYZE, subscription-leak metric) and its own effect — files heal INDIVIDUALLY, effects accumulate, and the problem count only goes down honestly. The Journey regrouped into Frontend errors / Backend errors / Agent workflows / Build & ship, and steps now SPOTLIGHT: open the file, ring the line, then ask | An inventory of one error is an anecdote; five across both halves of the stack is an environment. And the spotlight is what makes a guided step feel like guidance rather than a button that does something elsewhere |
| 2026-08-23 | **The /ds rail eats its own cooking** (user-commissioned): the design-system page's hand-rolled sidebar — ad-hoc headings and ~250 lines of repeated button markup — was rebuilt on the sanctioned **Sidebar** component (`collapsible="none"` embeds it as a static column; SidebarGroup/GroupLabel/Menu/MenuButton carry the structure, `isActive` carries selection). The kit groups (Messages / Tool use / Knowledge) keep their accent labels via `SidebarGroupLabel className="text-primary"` | The registry documents Sidebar as a vocabulary component while the page listing it drew its own — the exact near-miss rule 4 forbids. 54 nav rows now restyle from one component |
| 2026-08-23 | **The /ds rail, evolved to the Sidebar's full anatomy** (user-commissioned, against the shadcn/studio reference): brand header (OrbGlyph + name on a `size="lg"` menu button), a `SidebarInput` search that filters every list and holds the folds open while querying, icons on the page-level rows (three new names — palette, ruler, layers — mapped across all five libraries), the kit groups as **Collapsible** sections with live counts, and the assistant in the `SidebarFooter` ("Ask ambientui ⌘K" → spotlight). Collapsible was installed through the shadcn CLI and documented before use | The rail is now the component's whole vocabulary demonstrated in situ — header, input, groups, folds, badges, footer — which is what a design-system page's own chrome should be |
| 2026-08-23 | **The radius propagation leak, found by a question**: the user asked whether a `rounded-xl` in the sidebar followed the Foundation. It did not — nothing `rounded-*` did. The radius steps sat as LITERALS inside `@theme inline`, and inline bakes whatever is written there into every utility (`.rounded-xl { border-radius: 0.75rem }`); the old shadcn `calc(var(--radius)…)` had survived inlining precisely because it referenced a runtime var, and the "verbatim values" rewrite silently lost that property. Fixed by routing the theme entries through runtime tokens (`--radius-xs: var(--radius-window-xs)`), defaults = Tailwind's ramp verbatim, and the Foundation re-emits `--radius-window-*` from `radiusWindow`. Verified live: picking 2xl moves a sidebar row from 7px to 21px, and `.rounded-xl` now compiles to `var(--radius-window-xl)` | The propagation rule has a compiler-level failure mode: `@theme inline` freezes literals. The invariant worth writing down — anything in `@theme inline` that the Foundation must drive has to be a var() reference, never a value. Also removed the kit-group icons in the rail; group chevrons now use the app's one disclosure pattern (right closed, down open) |
| 2026-08-23 | **The evidence blocks learn to move like one system**: StagedItem — the one primitive every staged block lands through — now animates height alongside opacity, because a row that appears at full height shoves the list in a single frame and reads as jank regardless of its own fade. The staging hook gained a `replay` key so a block can perform its arrival again (CodeRunner's play now runs: output clears, the clock restarts, the result streams back). WebSearch's query shimmers while sources are read. ToolTimeline's steps became content-hugging ghost Buttons with an `onStepSelect` jump seam; ToolFailure gained `onFeedback`, opening the same inline FeedbackDialog the message actions use. The /ds rail flattened to one row size (`default`) | Smoothness fixes belong in the shared primitive, never per block — one edit moved every staged component at once, which is the reason StagedItem exists. And a failure is a moment the user knows exactly what went wrong: capture feedback there, in the ambient language, not in a detached modal |
| 2026-08-23 | **The palette learns where it is**: the spotlight's Recent chats and Suggested prompts were canvas-era constants shown everywhere, so opening ⌘K inside the dev environment offered to "summarize what's on this canvas" while five real errors sat unfixed two panes away. Added `setPageIntel` alongside `setPageChip` — the same announce-from-the-page shape — and the dev tool now publishes its LIVE problem inventory as the suggestions (each already phrased as the question the scenario router recognizes), plus a plausible dev working history. A healed problem leaves the palette. With everything fixed it offers the run / refactor / research scenarios instead | Intelligence in an ambient layer is not a better model in the answer — it is the surface knowing what is true right now before it is asked. The suggestions being DERIVED from workspace state (not a second hardcoded list) is what makes it hold: there is no way for the palette to promise a problem the editor has already fixed |
| 2026-08-23 | **One answer, one sequence** — and the palette becomes the workspace's. Every staged block ran a private timer, so a reasoning panel, a tool call and the answer text all raced: the sentence explaining the work appeared while the work was still visibly spinning. Added `stage-queue.ts` — blocks claim a slot in mount order inside `useStagedReveal` and hold at their shimmer until every earlier block has finished; `ResponseBlock` owns the queue and the prose does not mount until it settles. Elapsed counters gate on the turn (a queued block must not quote someone else's seconds), and `KitBlockView` now passes `staged={live}`, which also fixed settled history replaying its evidence. Separately the dev tool took over "Jump to" (its files, each subtitled with its actual problem), gained a **Fix all** suggestion whose `fix-all` effect heals the whole inventory in one run, and got its own ask-line and section labels via `PageIntel` | The ordering rule had to live in the primitive, not in the blocks — the previous behavior was not a bug in any one component, it was the absence of anyone owning the sequence. The copy lesson is the same shape: "Open chat with page context" named a surface the system does not have (it is the **panel**), which is exactly the drift the terminology register exists to catch |
| 2026-08-23 | **The dev tool becomes a change under review, and the shell stops contradicting itself.** From a reference: the workspace now names the change it is (id, branch, +/−), the editor shows the pending diff with signed gutters, and a teammate's note threads under the line it questions — **ReviewComment**, a new pattern, whose reply row is the Composer's new `inline` variant and whose reply hands the work to the panel with that line attached. The view switcher became **ViewMenu**, a disclosure that morphs pill→card (a tab strip spends room permanently on a surface whose argument is that chrome should get out of the way). The rail hides on `]` with a visible control beside it, and every strip scrolls instead of squeezing. Three shell bugs fixed: the input-watching effect was overwriting the pipeline's `thinking` state the instant send cleared the field; a settled answer re-streamed whenever the surface changed (panel→dock remounts) — messages now record `settled`; and the thinking counter never froze because its flag was `staged`, true forever. Thinking now holds a real floor (`THINKING_FLOOR_MS`, 15s) and the orb stays in `thinking` until the prose actually starts (`onAnswerStart`), not until the answer was merely composed | Three of these were the same class of bug: **two things owning one piece of state, with no rule about which wins**. The ambient effect and the response pipeline both drove the orb; position and history both decided `live`; `staged` was standing in for `working`. The fix each time was to name the owner. And the reference decomposed exactly as §2 predicts — most of it was configuration and existing vocabulary, with one genuinely new component that went through governance rather than being styled in place |
| 2026-08-23 | **The dev tool goes responsive, and the stream's comment stops lying.** The rail hides on `]` with a visible control beside it (a shortcut nobody can discover is not an affordance), auto-hides below `lg` where it would cover the work, and floats over rather than squeezing; every strip — header, file tabs, problems — scrolls internally so the page itself never overflows at 375px. Also: `StreamingText`'s comment claimed the frame clock survives a hidden tab. It does not — `requestAnimationFrame` is paused there, which is exactly what made an answer appear to stall during headless testing. What the frame clock actually buys is RECOVERY: the write head derives from elapsed time, so returning to the tab puts it where the clock says, rather than wherever a throttled timer had counted to. Comment corrected to say the true thing | A comment that overstates a guarantee is worse than no comment: it sent me hunting a product bug that was an artifact of the test harness. The rule the codebase already follows elsewhere — state the constraint, not the reassurance |
| 2026-08-23 | **The panel's empty state stops being a second component.** It hand-rolled its own list of suggestion buttons — a near-miss of `FollowUpSuggestions` that would drift the moment the real one changed (rule 4's "never re-implement a near-miss", violated by the layer's own surface). It now opens with the character, states what it can actually see by naming the page chip, and hands the offers to `FollowUpSuggestions`, drawing them from `setPageIntel` so the panel and the palette propose the same work. The `Composer`'s `mark` also moved from an opt-in prop to a per-variant default, after the /ds playground showed a composer with no character — the one place the component is meant to be understood was showing the least representative version of it. Arbitrary px on the touched lines went onto Tailwind's scale | Both are the same failure: a decision that should belong to the component was left to whoever used it. A default the caller must remember is a default that will be forgotten, and the registry is where you find out |
| 2026-08-23 | **Pasted material is context, not the question** — and the landing page is built from the thing it argues for. Pasting bulk text into the composer now attaches it instead of filling the field: a stack trace dropped into a one-line input buries the sentence being written under material the user only meant to REFER to. `MessageAttachments` absorbed the staged case rather than a second component being written for it — `onRemove` present while staged, absent once sent, because removability is the only honest difference between the two moments — and gained a `text` kind for quoted material that is not a file. The ambient-layer page was rebuilt as a long-form explainer (concept → four shapes → ⌘K → context → answers → the system) whose every answer illustration is a live component rendered settled, with an exit to the registry and the repo. The orb's lifecycle playback no longer opens on a three-second hold in the state it was already resting in: a run plays the TRANSITIONS, so pressing play moves | The attachment case is the same lesson as the empty state two rows up: the near-miss component you are about to write is usually the one you already have, one prop away. And a page that argued for building the assistant from the product's own system, then illustrated itself with screenshots, would have been arguing against itself — so the illustrations had to be the components, which also means they cannot rot |
| 2026-08-23 | **The governing documents join /ds, rendered from their real bytes** — DESIGN.md, CLAUDE.md, PAPER.md, README, the Figma and porting procedures, and the four skill files, imported with Vite's `?raw` into a ~200-line renderer that composes the sanctioned Table. A hand-written summary of the rules at /ds would have been a second source of truth, and the second one is always the one that rots; a markdown library would have been a new dependency for one page. `notes/` is deliberately excluded — gitignored provenance is not part of the system's public account of itself. Also: **ONE CHARACTER PER SURFACE, in the row you speak to it.** The orb left the AI Overview header (which now names the session, like the panel), the palette footer, and the view menu; it remains in the composer's mark, the quick-ask pill and the resting orb itself. Appearance switching moved into the view menu, stating what it will do rather than what is true | A shell that stamps its character on every bar is signing itself once per component. The mark means "the assistant is listening HERE", so it belongs where you type and nowhere else — the moment it appears in chrome it stops being a signal and becomes a logo |
| 2026-08-23 | **A fifth mode: `history`** — full-screen, translucent, the record of what has been asked here beside a live transcript and composer. Adding a mode is the governance event §8 names, and the test it has to pass is whether the new thing is a new GEOMETRY or a new set of parts: this is the former, composing the sanctioned Sidebar with the same transcript and Composer every other mode uses. It earns the whole screen by not being about a single exchange — the other four are sized to how much attention one answer deserves, and "what have I asked here" is a different question. It stays translucent rather than navigating away, because the work is the reason you opened the record, and Esc returns you to the conversation rather than to rest. Picking a past conversation asks it again rather than restoring a transcript; the docs say so plainly instead of implying a persistence the layer does not have. New icon `history`, mapped across all five libraries | The honest limit is the interesting part. A history surface that pretended to restore transcripts would have been one mock away, and it would have been the kind of lie the response kit exists to avoid — so the record offers what it can actually do, and says which that is |
| 2026-08-23 | **Progressive edge blur: built, then removed** — history's bars briefly traded their borders for a layered backdrop-blur falloff (three masked layers, because one has a visible seam where its mask ends). It worked and was still wrong: on a full-screen surface it competed with the scrim behind it for the same job, and a border says where a bar ends more cheaply and more quietly. Reverted. What replaced it is the thing the blur was reaching for: the composer now OVERLAYS the transcript on the layer's own glass, so the answer visibly moves underneath it — a bar the content cannot pass behind has nothing to be translucent about. Full-screen also earned its own translucency step, `--glass-scrim` / `.ambient-scrim`: heavier fill and stronger blur than the panel's glass, because a surface that covers the product has to carry its own legibility, while staying translucent so the work stays visible as ground. Kept from the same batch: the readable-column cap moved off the shared transcript onto the surface that needs it | Two lessons. The cap was the second time this session a constraint got attached to the wrong owner — the composer's `mark` was the first — so ask of any prop like that: whose problem is this? And the blur is the second effect built then cut for competing with something that already worked; the beam glow was the precedent, and the pattern is that an effect solving a problem another layer already solves reads as noise no matter how well it is made |
| 2026-08-23 | **⌘K becomes the way around the whole system** — components, documentation, demos and the assistant's own forms, all reachable by typing. The commands are registered by the APP (`command-registry.tsx`) and merely rendered by the layer: the context-chip contract pointed the other way, which is what lets the palette reach a product the layer knows nothing about. Lists are derived from the registries that already document those things, so a command for something that does not exist cannot be written. Two fixes the build surfaced: matches are capped PER SECTION, because one cap across the whole list let forty components matching "panel" push Switch form off the end — the command the word most obviously meant was the one you could not reach; and the resting palette now states its own capabilities, with Switch form shown whole and the big families advertised by a counted hint derived from what is registered. Also: /ds selections live in the URL (`?c=`), and the governing documents render there from their real bytes via `?raw` | The feature had been built and still was not real, because at rest the palette advertised none of it — a capability nobody can see does not exist as far as the user is concerned. Worth generalising: shipping a command surface means shipping its discoverability, and the hint has to be derived, or it will outlive the thing it describes |
| 2026-08-23 | **History wears the layer's material, and the rule is written down.** The one full-screen surface had the scrim but no heat field — the loudest possible place to drop the identity. Getting it right took three wrong combinations, which is why `renderField` now takes a PLACE (`panel` / `ground` / `screen`) rather than two knobs: the panel recipe read flat at full-screen scale, the thin stage veil alone left the field invisible, and full presence under that same thin veil left the shader raw with no translucency over it at all. `screen` is full presence under the full frost — the field carries a whole window and the veil still sits on top. The rail's `bg-sidebar` went the same way: it read correctly as a navigable pane and punched a solid hole through the field and the work behind it. §8 gains the rule. Also: staged attachments render as compact chips in one scrolling row, and the Composer is now their ONLY owner — ContextRow was rendering them too, so every staged item appeared twice with two remove buttons for one thing | Third time this session for the same class of bug: two components rendering one thing with no rule about which owns it (the composer's `mark`, the readable-column cap, now attachments). The tell is a prop threaded to two places "so either can show it"; the fix is to name the owner, which is whoever creates the thing. And when a knob has been set wrong in every possible way, it should not be a knob — name the combinations that mean something |
| 2026-08-23 | **One veil per surface, weighted for the field under it.** Veiling each chrome bar individually was the wrong fix and lasted one commit: it made the header, rail and composer read as solid panes inside a translucent surface, and it left the CONTENT area — the largest part — still glowing, because that was the one region carrying a single veil over a full-presence shader. The veil belongs to the surface and its weight must match the field's strength: `place="screen"` uses `.ambient-screen-frost` (84%) where the panel's 62% was tuned for a field at low presence. The bars carry a border and nothing else. `.ambient-clear` (blur, no fill) was deleted rather than left lying around — one user, and once that user needed a veil, a fill-less recipe was only ever going to be picked wrongly again. Separately: the `+` moved into the composer beside Send, making the Composer the single owner of attaching as well as of attachments and the paste that creates them; the compact attachment row pages with arrows when it overflows | Symptom-chasing produced the wrong layer twice — first veiling each bar, then finding the content area was the actual gap. The question that skips both: which element OWNS covering this field? One surface, one veil. And a variant that exists to omit something will be reached for by someone who does not know what the omission costs — deleting `ambient-clear` beat documenting when not to use it |
| 2026-08-23 | **The field is scoped to the conversation, and the screen veil goes to 92%.** Run across the whole full-screen surface, the shader lit the record rail and the chrome as well — both of them lists, which are read rather than felt, and a shader under text is noise. Bounded to the conversation column it does the job it is for: the ground an answer arrives on. Verified against the layout rather than by eye — the field's box starts at the rail's right edge and below the header, so it cannot reach either. The veil went 62 → 84 → 92% over three passes: the panel's weight is tuned for a field at low presence, and at full presence anything lighter reads as weather rather than as ground | Two different questions kept getting confused: how STRONG the veil is, and how FAR the field reaches. Darkening was never going to fix a field that was simply in the wrong places, and scoping was never going to fix a veil tuned for a different strength. Worth asking explicitly the next time a surface looks wrong: is this the wrong amount, or the wrong extent? |
| 2026-08-23 | **An overlaying bar veils the content, not the field.** Removing the composer bar's frost (to stop it double-veiling the surface) took away the only thing standing between the input and the transcript scrolling behind it — the answer read straight through the composer. The surface's veil covers the FIELD; a bar's veil covers the CONTENT moving behind it, which is painted above the surface veil and cannot be reached by it. Both were called "the veil", which is how one got deleted to fix the other | The one-veil-per-surface rule was right and I over-applied it. A rule about who owns a layer still has to survive the question "owns it against WHAT?" — same word, two backgrounds, opposite answers |
| 2026-08-23 | **Sparkles stops meaning two things.** Context chips wore the sparkles mark for the `page` kind, and so did the "Attach context" button — but in this system sparkles means the ASSISTANT: its mark, AskAI, the follow-up heading. A context chip is not the assistant; it is the thing the assistant can see, so it wears the icon of the thing. The whole `chipKindIcon` map moved onto sanctioned `IconName`s at the same time (rule 6, fix-on-touch), which removed the last direct HugeIcons usage from that path. `MessageAttachments` is documented for what it now is: one component, two densities, with a compact story showing the staged row and its paging, and a whenNotToUse recording that the Composer owns staged attachments alone | An icon is a word. Using the assistant's word for a page meant the layer was signing something it did not author, which is the same error as the orb appearing in headers — the mark belongs to one idea, and every borrowing of it costs that idea a little precision |

## 13. Pattern watchlist

*(Patterns spotted but not yet ruled on — triage through governance.)*

- **Foundation swatch picker** (accent/gray circles with ring selection) — used
  twice on the Foundation page; if a third use appears, promote to a component.
- **Scale ruler / type ramp preview** (Foundation → Scale) — candidate for the
  vocabulary once the Spacing page and Foundation stop being its only consumers.
