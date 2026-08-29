# ambientui

**An AI assistant that lives above your product — and the design system that
lets it build inside your rules.**

Built on [shadcn/ui](https://ui.shadcn.com) and [Tailwind CSS](https://tailwindcss.com).
Installs as source you own and can edit.

```bash
npx shadcn add https://lumenridge.github.io/ambientui/r/ambient-layer.json
```

---

## The idea

AI can generate interfaces. The problem is that what it generates is
*unattached* — every value an invention, nothing answerable to anything.
Documentation doesn't fix that, because documentation is advice, and advice
does not constrain a generator. Architecture does.

So this repo is one argument, applied to itself: **a design system has to
become a bounded configuration space before an AI can safely build inside
it.** Pick the accent, the gray, the radius step, the spacing unit, the motion
character — and every surface follows, because each one resolves from that
choice rather than restating it. An AI working here cannot invent a colour.
There is nowhere to put one.

The ambient layer is what that buys you: an assistant with no palette, no type
scale and no motion of its own, composed entirely from your vocabulary, sitting
*above* your product instead of inside its component tree.

The full argument is [PAPER.md](PAPER.md). The rules it produced are
[DESIGN.md](DESIGN.md).

## What you can take

| | | |
|---|---|---|
| **The whole layer** | orb · line · panel · dock · spotlight · history | `npx shadcn add @ambientui/ambient-layer` |
| **One component** | 31 of them, each with its behavior and its boundaries | `npx shadcn add @ambientui/reasoning-panel` |
| **The rules your AI works under** | the constitution + three review roles | `npx shadcn add @ambientui/governance` |
| **A design system to build inside** | the Foundation, the token master, the Figma contract | *documented; one-command setup in progress* |

Register the namespace once and the commands stay short:

```bash
npx shadcn registry add @ambientui=https://lumenridge.github.io/ambientui/r/{name}.json
```

The layer runs with **no providers at all** — it falls back to sane defaults and
binds to a full design system when you give it one. `packages/ambient/dev/index.html` is the
proof, and it is a test we keep.

Prefer a versioned dependency to owned source? `npm i ambientui`. The docs say
plainly which to choose: the registry if you will restyle it (most people, given
the whole argument), npm if you want upgrades and will not touch it.

## What's in here

```
packages/ambient      the ambient layer            → npm: ambientui
packages/foundation   the configuration engine     → @ambientui/foundation
packages/ui           the product primitives       → @ambientui/ui
apps/web              the website, /ds reference and dev-tool demo
skills/               the governance roles an AI works under here
tokens/tokens.json    the serialized token master
figma/                the code → Figma variable contract
```

**The governing documents are the control surface**, not a description of one:

- [DESIGN.md](DESIGN.md) — the constitution: token rules, the two vocabularies,
  the ambient layer contract, and a dated decision log recording every design
  decision with its *why*.
- [CLAUDE.md](CLAUDE.md) — the hard rules an AI works under in this repo.
- [PAPER.md](PAPER.md) — the argument the repo is evidence for.

They are rendered at `/ds` from their real bytes, so the documentation cannot
drift from the rules. The registry is generated from the same component docs,
so a component is installable *because* it is documented — install one and its
when-to-use prints in your terminal.

## Running it

```bash
npm install
npm run dev          # the site at :5173
```

- `/` — the argument, built from the real running components
- `/ds` — 50 documented components, the Foundation, and the governing docs
- `/?view=devtool` — the layer inside a simulated real workspace

`npm run gate` runs typecheck, lint and build, plus the registry and vendored-CSS
drift checks. A pre-commit hook runs it, so a failing gate blocks the commit.
If hooks aren't firing: `git config core.hooksPath .githooks`.

## Contributing

The unusual thing about this repo is that its rules are written down and
enforced. Read [CLAUDE.md](CLAUDE.md) — the rules an AI works under here are the
rules you work under. New patterns go through the watchlist in DESIGN.md §13
rather than landing quietly.

## License

MIT © Lumenridge
