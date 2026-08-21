# ambientui — AI-native design system environment

The source of truth for design decisions is [DESIGN.md](DESIGN.md). Read it before
any UI work — it defines the tokens, the two vocabularies, the ambient layer
contract, and the governance flow. **You (the AI) work inside that governance
layer: you select from the system, you do not invent outside it.** That is the
product's thesis applied to its own construction.

## Commands

- `npm run dev` — the app at :5173 (Turborepo; the web app is `apps/web`).
  Routes: `/` canvas, `/ds` design system (Foundation + component vocabulary).
- `npm run typecheck` / `npm run build` / `npm run lint`

## Hard rules (non-negotiable)

1. **Tokens only.** No hex colors, no raw px spacing/radius/font-size in component
   code — shadcn semantic tokens, `--ambient-space-1…10`, `--ambient-text-1…9`,
   radius via `--radius` steps. If a needed token doesn't exist, that's a
   governance event, not a hardcode.
2. **Saving the theme must restyle every component — propagation is a rule.**
   Every dimension resolves from a foundation-driven variable: the spacing
   grid drives Tailwind's `--spacing` (so `p-4`/`h-9` re-densify), radius
   flows from `--radius`, type from rem × the scaling base, color from
   semantic tokens. Hardcoded px in components are propagation leaks —
   grandfathered only in the assistant's stance-era code, fix on touch, never
   add new ones. (DESIGN.md §2.)
3. **A stated pixel or colour is a request for a TOKEN, not a literal.** "16px
   padding" means `p-ambient-4`. No exact step → nearest legal step, and say
   which you picked. Full procedure: DESIGN.md §2.
4. **Sanctioned components only.** Product UI composes `packages/ui` components;
   ambient UI composes the assistant's parts. Known gaps are documented in the
   `/ds` registry (no Select/Switch/Textarea/Dialog — use the documented
   substitutes). Never re-implement a near-miss of an existing component.
5. **Foundation is the single source of theme truth.** Theme changes flow through
   `apps/web/src/foundation/foundation-context.tsx` (one injected style tag,
   Save-to-persist). Never set theme variables ad hoc. New `--ambient-*` tokens
   must default to values derived from the base theme.
6. **Icons: HugeIcons only** via `<HugeiconsIcon>`. No other sets, no ad-hoc SVGs.
7. **Motion is CSS** — keyframes in `theme.css` + Tailwind transitions. No
   animation libraries; no one-off keyframes in component files.
8. **The ambient layer contract (DESIGN.md §8) must not drift**: five modes,
   drag-as-mode-switch, page context via `setPageChip`, and the response-kit
   seam in `send()` stays empty until the kit exists. The beam glow was
   removed — do not reintroduce glows.
9. **Every vocabulary component is documented** in
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
- Foundation engine: `apps/web/src/foundation/foundation-context.tsx` — accents
  (with paired foregrounds), gray tints, radius set, scaling→base-px presets;
  compiled to `#ambientui-foundation` style tag; persisted on Save under
  `ambientui-foundation`.
- Assistant: `apps/web/src/components/assistant/` (context, surfaces, orb,
  orb-character — the animated identity with states still/listening/thinking/
  answer, driven via `orbState` in the context). App tokens and keyframes:
  `apps/web/src/theme.css`, `viz.css`.
- Sections/routing: `src/nav.ts` + path mapping in `App.tsx` (`/`, `/ds`);
  the palette's Jump-to builds from `nav.ts`.
- Component registry (docs + playgrounds): `apps/web/src/components/ds/ds-docs.tsx`;
  the `/ds` page renders it and portals playground controls into the Inspect rail.
