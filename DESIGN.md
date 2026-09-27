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
  `packages/foundation/src/foundation-context.tsx` (the Foundation config engine) —
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
`<Icon name="…" />` (`site:src/components/icon.tsx`); the configured
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
  `site:src/styles/theme.css` (`ambient-shimmer`) and Tailwind `transition-*`
  utilities. Framer Motion (sanctioned; see the decision log) is for what CSS can't express:
  interruptible/gestural animation, layout and presence transitions,
  springs — timed through the motion roles above.
- **The sanctioned shader surfaces** are the OrbCharacter and the ambient field (`OrbField` — the same heat engine as a surface background, one per open AI surface, mounted after the entrance). Beyond these: the OrbCharacter
  (`orb-character.tsx`), implemented with `@paper-design/shaders-react`
  (the heatmap shader wrapped around a circle), because the character's
  fluid identity cannot be expressed in CSS. Its identity springs are the
  one sanctioned exception to role-based timing (its cadence is its own
  Foundation config). No other component may use canvas/WebGL/shader
  libraries without governance.
- The beam glow was removed by decision (see the decision log) — no glow effects, on the
  assistant or anywhere else, without governance.

## 6. Component inventory — the two vocabularies

The vocabulary is documented in `packages/docs/src/catalog.ts` (the
prose) with its live demos in `site:src/components/ds/stories.tsx`, joined
by `site:src/components/ds/entries.ts` and rendered at `/ds`. **A rule is written once, where it lives** — this file names
the components and their contracts' locations; the registry holds per-component
behavior, usage, and constraints. A rule written twice will disagree with itself.

**Product vocabulary** (`packages/ui/src/components`, 14): Badge, Button, Card,
Checkbox, Collapsible, DropdownMenu, Input, Separator, Sheet, Sidebar,
Skeleton, Table, Tabs, Tooltip. Installed from the shadcn radix-nova preset; extended only through the
shadcn CLI or governance.

**Ambient vocabulary** (`packages/ambient/src`): the assistant's
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
   `setPageIntel` carries the page's live suggestions and recents, and the
   chip itself may carry an `icon` — every page is kind "page", too coarse to
   tell an editor from a colour map, and the page is the only thing that
   knows which. So the
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
  here (§6/§13), log the decision in [DECISION-LOG.md](DECISION-LOG.md).
- **No** → rebuild the use case with existing patterns.

One-off exceptions are not merged silently. Ever.

**Owed: `audit:docs`.** rg-design-proto proved that coverage must be a command,
not a memory test — a script that fails when a component lacks a registry entry,
rules, or states. ambientui does not have it yet; building it is logged debt.

## 12. Decision log

The decision log lives in its own file: [DECISION-LOG.md](DECISION-LOG.md).
Every change to the system adds a dated row there, with what was decided and
why.

**Read it in full before changing the system.** This document states the
rules; the log is the reasoning that produced them. It shows what was tried
and abandoned, which shortcuts looked reasonable and turned out to work
against the people using the product, and where the owner stepped in and
changed direction. The rules alone tell you what to do. The log tells you
what the system is for, and that is what lets you notice when a request pulls
against it, recognize an idea that has already been tried and rejected, and
explain your call instead of only making it. Read the recent rows most
closely: later decisions supersede earlier ones.

Working in a project set up through `start.md`, where only this file was
installed? Read the log at
https://github.com/Lumenridge/ambientui/blob/main/DECISION-LOG.md.

## 13. Pattern watchlist

*(Patterns spotted but not yet ruled on — triage through governance.)*

- **Foundation swatch picker** (accent/gray circles with ring selection) — used
  twice on the Foundation page; if a third use appears, promote to a component.
- **Scale ruler / type ramp preview** (Foundation → Scale) — candidate for the
  vocabulary once the Spacing page and Foundation stop being its only consumers.
- **`Reveal` scroll-entrance wrapper** — PROMOTED 2026-08-27: the overview
  became the second page wanting scroll-staged sections, tripping exactly
  the condition named here. Now `site:src/components/reveal.tsx`
  (app-shared; vocabulary promotion is the next trigger, on a consumer
  outside this app).
- **`DocDownload` row** (Playbook) — a Button handing over a governing file as
  a Blob of the same `?raw` bytes /ds renders. Kept local; promote if the /ds
  doc reader grows a download affordance too.
- **`WireframeShell` frame** (Playbook) — a dashed border-role frame with
  corner ticks and a mono uppercase tag; the article's device for framing a
  live demo as a blueprint. Kept local; promote if docs pages or /ds stories
  want the same "this part is a specimen" framing.
- **Schematic kit** (`site:src/components/home/schematic-kit.tsx`) —
  eight SVG line-work primitives (nodes, fan curves, waypoints, leader
  annotations) for presentation diagrams, all strokes semantic roles.
  PRESENTATION-ONLY by explicit charter: not vocabulary, no /ds entry, and
  any product-surface use is a governance event. Interaction layer planned.
- **`PlaybookContents` / `PlaybookNav`** (Playbook) — a grouped TOC of
  Collapsible entries whose open state follows the scroll position; fixed
  left column from lg up, in flow above the article below. Kept local; if
  /ds or a docs page wants a grouped scroll-tracking TOC, promote it (and
  note it overlaps SectionRail's job — the promotion should decide which of
  the two survives as the system's in-page nav).
