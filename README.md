# ambientui

**An AI-native interface layer, built inside a governance layer.**

ambientui is a working environment for a simple thesis: AI can build and evolve
product UI safely only when it composes from a governed system — a fixed
vocabulary of tokens, components, and patterns — instead of inventing outside
it. This repo is that thesis applied to its own construction: one design
system, two vocabularies, and an ambient assistant that lives on top.

The primary rule, and the reason the rest holds together: **a reference is a
request for a configuration.** "Make it feel like X" is answered by selecting
Foundation values — accent, gray family, radius, spacing unit, scaling, motion
character — never by styling components toward the reference. If the config
can't reach the look, the system is extended through governance.

## What's inside

**The governance layer** — the drift boundary the whole project builds within:

- [`DESIGN.md`](DESIGN.md) — the constitution: the primary rule, token rules
  ("a stated pixel is a request for a token"), the role glossary, the motion
  system, the ambient layer contract, the propagation rule ("saving the theme
  must restyle every component"), and a decision log recording every design
  decision with its why.
- [`CLAUDE.md`](CLAUDE.md) — the AI-facing distillation: the hard rules an
  agent works under in this repo.
- [`tokens/tokens.json`](tokens/tokens.json) — the serialized master of the
  token system.
- [`figma/`](figma/figma-sync.md) — the code → Figma sync contract: variables
  only, idempotent, code wins on conflict.
- [`.claude/skills/`](.claude/skills/) — governance roles: `ds-manager` guards
  the system, `product-design-manager` guards the product, `product-copy`
  guards the words.

**The scales of record are Tailwind's.** Colors are Tailwind's full palette,
spacing its scale, type its ramp, elevation its shadows. The Foundation doesn't
invent scales — it *selects* from them, and components consume the selection
through semantic roles.

### The Foundation

`/ds` → Foundation is the project's global design config and single source of
truth. Every dimension resolves from it, and **Save Theme** is the only thing
that commits — edits apply live, reloading returns to the last saved theme.

- **Scaling is the base layer.** Every dimension is nominal px at the 100% base
  and emitted in rem, so one base-size choice re-derives the entire app.
- **The role map** — the whole color contract, visible and editable: each
  semantic token (`--primary`, `--background`, `--muted`, `--sidebar`, …) is one
  visual job with a plain-language description and a configurable palette step.
  Pick the light step and the dark one derives automatically; set dark yourself
  to override.
- **Shape and density** — the full radius ramp, and a spacing unit that drives
  Tailwind's core `--spacing`, so changing it re-densifies every component.
- **Motion as a dimension** — see below.
- **Icons and type** — five icon libraries (Lucide, Tabler, HugeIcons, Phosphor,
  Remix) drawn through semantic `<Icon name>`, and a font choice that loads
  Google families on demand.
- **Reset** returns every dimension to system defaults, live, before you commit.

### The motion system

Motion is a Foundation dimension like color and spacing. Components consume
**motion roles** — never literal timings:

| Role | Job |
|---|---|
| `--motion-micro` | hover, press, focus — the default for every `transition-*` utility |
| `--motion-control` | control state changes: checks, switches, selection |
| `--motion-surface` | menus, popovers, sheets entering and leaving |
| `--motion-page` | section- and page-level moves |

A configured **character** (Productive / Smooth / Expressive — easing, duration,
and spring families) and **pace** decide what every role feels like, product-wide,
on Save. CSS rides the emitted variables; Framer Motion consumers use
`useMotionTransition(role)` / `useMotionSpring()`.

### The design system

`/ds` is a three-pane browser (list · canvas · Inspect rail). Foundations —
Colors, Spacing, Shadows, Motion — document the scales of record. The product
vocabulary (shadcn/ui) and the ambient vocabulary each carry live stories,
behavior docs, when-to-use / when-not-to guidance, and interactive playgrounds
whose controls render in the Inspect rail. The documentation doubles as the
vocabulary the AI layer reasons over — including honest gaps, so nothing
composes components that don't exist.

### The assistant

One surface, five modes (orb · bar · panel · dock · spotlight), where drag is
the mode switcher and pages declare their context via chips.

Its face is the **OrbCharacter**: a heatmap shader wrapped around a
frosted-glass sphere, expressing the AI's lifecycle through four states —
*still*, *listening* (heat drawn inward), *thinking* (hot, churning), *answer*
(a one-shot outward bloom) — with spring transitions on the configured motion
character, and per-state speeds and palette configurable on its `/ds` page.

That identity runs through the whole ambient layer, all driven by one state:

- **The live border** — a conic comet on every AI surface's edge, carrying the
  same state characters (listening reverses inward, thinking adds a
  counter-rotating comet, answer blooms then settles).
- **The heat field** — the shader as a surface *background*, behind a frost
  veil, so the glass itself is made of the identity.
- **Marks** — the real character wherever the assistant signs its name at the
  SHELL level (the floating orb, a surface's brand row); messages themselves
  carry no mark — the identity is the surface's, not each reply's.

**The response kit** composes answers as objects rather than paragraphs:
`ResponseBlock` (streamed text, evidence and artifact blocks, settle handoff) and
`ReferenceChips` (what the answer was grounded in). The composer is canned —
wiring a model in replaces `composeResponse`, never the objects or the states.
The full pipeline is real: typing a question turns the layer to *listening*,
send to *thinking*, streaming to *answer*, completion back to *still*.

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
