# ambientui

**An AI-native interface layer, built inside a governance layer.**

ambientui is a working environment for a simple thesis: AI can build and evolve
product UI safely only when it composes from a governed system — a fixed
vocabulary of tokens, components, and patterns — instead of inventing outside
it. This repo is that thesis applied to its own construction: one design
system, two vocabularies, and an ambient assistant that lives on top.

## What's inside

**The governance layer** — the drift boundary the whole project builds within:

- [`DESIGN.md`](DESIGN.md) — the constitution: token rules ("a stated pixel is
  a request for a token"), the ambient layer contract, the propagation rule
  ("saving the theme must restyle every component"), governance flow, and a
  decision log recording every design decision with its why.
- [`CLAUDE.md`](CLAUDE.md) — the AI-facing distillation: the hard rules an
  agent works under in this repo.
- [`tokens/tokens.json`](tokens/tokens.json) — the serialized master of the
  token system.
- [`figma/`](figma/figma-sync.md) — the code → Figma sync contract: variables
  only, idempotent, code wins on conflict.
- [`.claude/skills/`](.claude/skills/) — governance roles: `ds-manager` guards
  the system, `product-design-manager` guards the product, `product-copy`
  guards the words.

**The Foundation** (`/ds` → Foundation) — the project's global design config
and single source of truth. Scaling is the base layer: every dimension in the
system — type, spacing, radius — is nominal px at the 100% base and emitted in
rem, so one base-size choice re-derives the entire app. On top of it: accents
with paired foregrounds, gray tints, the full radius ramp, and a selectable
spacing grid that drives Tailwind's core `--spacing` — changing it re-densifies
every component. Edits apply live; **Save Theme** commits.

**The design system** (`/ds`) — a three-pane browser (list · canvas · Inspect
rail): the product vocabulary (shadcn/ui components with live stories,
behavior docs, when-to-use / when-not-to guidance, and interactive playgrounds
whose controls render in the Inspect rail) and the ambient vocabulary. The
documentation doubles as the vocabulary the AI layer reasons over — including
honest gaps, so nothing composes components that don't exist.

**The assistant** — one surface, five modes (orb · bar · panel · dock ·
spotlight), where drag is the mode switcher and pages declare their context
via chips. Its face is the **OrbCharacter**: a heatmap shader wrapped around a
frosted-glass sphere with an accent core, expressing the AI's lifecycle
through four state reactions — *still* (its own calm movement), *listening*
(heat drawn inward), *thinking* (hot, racing), *answer* (a one-shot outward
bloom) — with second-order-smoothed transitions, and per-state speeds and
palette configurable on its `/ds` page, saved with the theme. The response
pipeline seam in `send()` is deliberately empty: the next layer composes
answers from the vocabulary.

## Development

```bash
npm install
npm run dev        # the app at :5173 — / canvas, /ds design system
npm run typecheck
npm run build
```

Turborepo monorepo: `apps/web` (Vite + React 19 + Tailwind v4) and
`packages/ui` (the shadcn component library and global tokens).

## The flow this repo demonstrates

```
Project setup → Foundation (global design config) → Components & tokens
      → Build product → Sync to Figma
```

…with the ambient layer inheriting every decision automatically, because it is
built from the same tokens as everything else. Start with the system. Make it
yours. Then give AI the same vocabulary your product already speaks.
