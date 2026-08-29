# Contributing

ambientui is a governed codebase. The rules are not conventions to absorb
over time; they are written down, and a gate enforces most of them. Read
[DESIGN.md](DESIGN.md) before touching UI. It is the constitution: the
tokens, the two vocabularies, the ambient layer contract, and a decision
log that explains why things are the way they are.

## Setup

```bash
npm install
git config core.hooksPath .githooks
npm run dev
```

The app runs at `localhost:5173`. The pre-commit hook runs the same gate
as CI, so a failing gate blocks the commit. That is intentional.

## The gate

```bash
npm run gate
```

Typecheck, lint, and build across every package, plus three drift checks:
the committed `registry.json` still matches what the sources generate, the
vendored shadcn stylesheet still matches upstream, and every path a
governing document cites still exists. If you change anything under
`packages/`, run `npm run registry:build` and commit the result.

## The rules that will actually affect your patch

1. Tokens only. Colors through semantic roles, spacing through Tailwind
   utilities, radius through `--radius` steps. A raw hex or an arbitrary
   value like `p-[10px]` fails review.
2. Sanctioned components only. Product UI composes `packages/ui`; ambient
   UI composes `packages/ambient`. Do not re-implement a near-miss of an
   existing component.
3. Motion rides the four roles (`micro`, `control`, `surface`, `page`).
   No raw durations, no new keyframes in component files, no animation
   libraries beyond framer-motion.
4. The ambient layer is a package. It may import `@ambientui/ui` and npm,
   never app code. Every global it touches (window size, document ids,
   focus scroll) is a way to escape an embedding frame; the decision log
   records the family of bugs this caused.
5. Every vocabulary component is documented in
   `apps/site/src/lib/catalog.ts` (the prose) and demonstrated in
   `apps/site/src/components/ds/stories.tsx`. Undocumented components do
   not exist, and documented ones without a demo fail the gate.

## Proposing a change to the system itself

A new token, a new component, a new pattern: these are governance events,
not patches. Open an issue describing the need and the surfaces that want
it. If it lands, the change updates `tokens/tokens.json`, the registry,
and the DESIGN.md decision log together. A pull request that changes
system behavior without a decision log row is incomplete.

## Pull requests

Keep them small and legible. Say what changed and why in the description.
The gate must be green. If a screenshot shows the change better than
prose, include one.
