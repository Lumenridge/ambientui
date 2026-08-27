# ambientui — AI-native design system environment

The source of truth for design decisions is [DESIGN.md](DESIGN.md). Read it before
any UI work — it defines the tokens, the two vocabularies, the ambient layer
contract, and the governance flow. **You (the AI) work inside that governance
layer: you select from the system, you do not invent outside it.** That is the
product's thesis applied to its own construction.

## Commands

- `npm run dev` — the app at :5173 (Turborepo; the web app is `apps/web`).
  Routes: `/` home (Dev tool · Canvas views), `/ds` design system (Foundation + component vocabulary).
- `npm run typecheck` / `npm run build` / `npm run lint`
- `npm run gate` — all three plus the drift checks (registry, vendored CSS,
  governing-doc path claims). A `.githooks/pre-commit` runs it, so a
  failing gate blocks the commit (`--no-verify` to bypass deliberately). If
  hooks are not firing, run `git config core.hooksPath .githooks`.

## Hard rules (non-negotiable)

**The primary rule: a reference is a request for a CONFIGURATION.** A target
look ("make it feel like X", a screenshot) is answered by selecting
Foundation values — accent hue, gray family, radius step, spacing unit,
scaling, appearance — and saving. Never by styling components toward the
reference. If the config cannot reach the look, extend the system through
governance. (DESIGN.md §2, with the Linear precedent.)

1. **Tokens only — and the scales of record are Tailwind's.** Colors: the
   Tailwind palette, consumed through semantic roles (`--primary`,
   `--muted-foreground`, …) — never a hex or raw `--color-*` step in
   component code. Spacing: Tailwind utilities (`p-4`, `gap-2`) — never
   arbitrary values. Type: Tailwind's text scale. Radius via `--radius`
   steps. If a needed token doesn't exist, that's a governance event.
2. **Saving the theme must restyle every component — propagation is a rule.**
   Every dimension resolves from a foundation-driven variable: the spacing
   grid drives Tailwind's `--spacing` (so `p-4`/`h-9` re-densify), radius
   flows from `--radius`, type from rem × the scaling base, color from
   semantic tokens. Hardcoded px in components are propagation leaks —
   grandfathered only in the assistant's stance-era code, fix on touch, never
   add new ones. (DESIGN.md §2.)
3. **A stated pixel or colour is a request for a TOKEN, not a literal.** "16px
   padding" means `p-4`. No exact step → nearest legal step, and say which
   you picked. Full procedure: DESIGN.md §2.
4. **Sanctioned components only.** Product UI composes `packages/ui` components;
   ambient UI composes the assistant's parts. Known gaps are documented in the
   `/ds` registry (no Select/Switch/Textarea/Dialog — use the documented
   substitutes). Never re-implement a near-miss of an existing component. A
   genuinely missing primitive is added through the **shadcn CLI**, then
   documented at `/ds` before it is used (Tabs, 2026-08-22).
5. **Foundation is the single source of theme truth.** Theme changes flow through
   `packages/foundation/src/foundation-context.tsx` (one injected style tag,
   Save-to-persist). Never set theme variables ad hoc. New `--ambient-*` tokens
   must default to values derived from the base theme.
6. **Icons via `<Icon name="…">`** (`packages/ui/src/components/icon.tsx`; the app re-exports it at `components/icon.tsx`) — semantic names,
   drawn by the Foundation's configured library (Lucide/Tabler/HugeIcons/
   Phosphor/Remix). No direct icon-library imports in components, no ad-hoc
   SVGs; the assistant's direct HugeIcons usages are grandfathered, fix on
   touch. New names must be mapped in every library.
7. **Motion is a Foundation dimension — components consume MOTION ROLES,
   never literal timings.** Four roles (`--motion-micro/control/surface/
   page`); the configured character + pace decide the feel product-wide
   (DESIGN.md §5). CSS: `transition-*` utilities default to the micro
   role; explicit sites use `duration-(--motion-{role})`. Framer:
   `useMotionTransition(role)` / `useMotionSpring()`. CSS first;
   `framer-motion` (the one sanctioned library) for interruptible/
   gestural/layout/presence motion. No other animation libraries, no
   one-off keyframes in component files, no raw durations or springs.
8. **The ambient layer contract (DESIGN.md §8) must not drift**: five modes
   (line · panel · dock · spotlight · history),
   drag-as-mode-switch, page context via `setPageChip` (and what the page
   knows via `setPageIntel`), and the response kit (v0, `response-kit.tsx`)
   fills the `send()` seam with composed answer objects — a model replaces
   `composeResponse`, never the objects. **One character per surface**: the
   orb/OrbCharacter mark belongs in the row where the user speaks to the
   assistant (composer mark, quick-ask pill) and in the resting orb — never
   in headers, footers, navigation or product chrome. **An answer arrives in order**:
   thinking, then each evidence block, then the prose, then artifacts —
   enforced by the stage queue inside `useStagedReveal`, never by a block
   scheduling itself. **Nothing inside an ambient surface is opaque** — every
   mode wears the glass and the heat field, and a pane within one uses the
   layer's wash, never a product ground. The beam glow was removed — do not
   reintroduce glows.
9. **Any Inspect-rail change raises the save reminder.** The rail has one
   commit affordance and nothing in it changes silently. This is enforced in
   the primitives — `ControlRow` and `ChoiceControl` call the Foundation's
   `touch()` — never in individual playgrounds, so a new playground inherits
   the rule instead of remembering it. The `action` prop on `ControlRow` is
   the only exemption, and only for a row that fires a one-shot action and
   sets no value. Discard remounts rail state (`generation`), so throwing
   away edits works for playground props too.
10. **Every vocabulary component is documented** in
   `apps/web/src/components/ds/ds-docs.tsx` (summary, behavior, when to use,
   when not to; playground where the prop surface warrants it). Undocumented
   components don't exist as far as the AI vocabulary is concerned.

## Pattern watchlist protocol (always on)

When a request produces UI that doesn't match existing patterns — a new component
shape, a new layout structure, a divergent interaction — STOP and ask the user:
*"This looks like a new pattern — should it become part of the design system?"*
On yes: implement in the proper vocabulary, document in the registry, update
DESIGN.md (§6/§13) and the decision log (§12). On no: rebuild with existing
patterns. Use the `ds-manager` skill for system impact and
`product-design-manager` for UX judgment.

## Skills

- **`ds-manager`** — system impact: token/component/layout compliance,
  promote-or-reject, blast radius of token changes.
- **`product-design-manager`** — UX judgment: right surface for the use case
  (page vs sheet vs spotlight vs panel), flow consistency.
- **`product-copy`** — UI copy, microcopy, errors, empty states, voice. Its
  `REFERENCE.md` records what context is and isn't available; unfilled
  placeholders mean "not available", not "invent it".

## Figma sync (code → Figma)

`tokens/tokens.json` + the saved Foundation config are master; the connected
Figma file (set on the Foundation page) mirrors them. Only **variables** are
written — never components. Procedure, mapping, drift check, and the code-wins
conflict rule: [figma/figma-sync.md](figma/figma-sync.md). Load the `figma-use`
skill before any `use_figma` write.

## Architecture notes

- Monorepo: `apps/web` (Vite + React 19 + Tailwind v4) + `packages/ui` (the
  shadcn radix-nova preset; global tokens in `src/styles/globals.css`).
- Foundation engine: `packages/foundation/src/foundation-context.tsx` — accents
  (with paired foregrounds), gray tints, radius set, scaling→base-px presets;
  compiled to `#ambientui-foundation` style tag; persisted on Save under
  `ambientui-foundation`.
- Ambient layer: `packages/ambient/src/` (context, surfaces, orb,
  orb-character — the animated identity with states still/listening/thinking/
  answer, driven via `orbState` in the context). **It is a package, not app
  code: it may import `@ambientui/ui` and npm, never `@/`.** Its material is
  `packages/ambient/src/ambient.css`; the app's own shell tokens are
  `apps/web/src/theme.css`, `viz.css`.
- What the layer needs from a design system is stated in
  `packages/ambient/src/ambient-runtime.tsx` — seven values and two motion
  hooks, with real defaults, so it renders with no providers at all
  (`apps/web/bare.html` proves it). `FoundationProvider` implements that
  interface; the layer does not know the Foundation exists.
- Sections/routing: `src/nav.ts` + path mapping in `App.tsx` (`/`, `/ds`).
  The palette's Jump-to is **supplied** to `AssistantProvider` as `navItems` —
  the layer never imports the app's route table.
- Component registry (docs + playgrounds): `apps/web/src/components/ds/ds-docs.tsx`;
  the `/ds` page renders it and portals playground controls into the Inspect rail.
