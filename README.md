![The ambientui overview: the wordmark filled with the assistant's own heat
shader, with a product dashboard rising up behind the lower half of the
name](.github/assets/hero.png)

# ambientui

**An AI assistant that lives above your product, and the design system that
lets it build inside your rules.**

Built on [shadcn/ui](https://ui.shadcn.com) and [Tailwind CSS](https://tailwindcss.com).
Installs as source you own and can edit.

Starting a product from scratch? Paste one line into your coding agent and
it runs the whole journey, from install to asking you for an inspiration
screenshot to the moment it tells you to press Cmd-K:

```
Read https://ambientui.ai/start.md and set this project up by following it.
```

Or take the layer on its own:

```bash
npx shadcn add https://registry.ambientui.ai/r/ambient-layer.json
```

[See it running](https://ambientui.ai)

---

## What it is

Most products add AI by finding a spot for it: a tab, a sidebar, a widget in
the corner. This is the other approach. The assistant is a layer over your
product rather than a room inside it.

**It takes no space.** Your screens are already full. There is no chat tab to
add and no column to give up. The assistant opens when you ask for it and goes
away when you are done.

**It knows where you are.** Each page tells the assistant what you are looking
at. Ask about "this invoice" and it knows which one. You never paste a
screenshot or explain your screen first.

**It answers with real things.** Not a wall of text. A code change you can
apply. A command with its output. Links into your own data. Made from the same
components as the rest of your product.

**It looks like your product.** The assistant has no colours, fonts or motion
of its own. It borrows yours. Change your theme and it changes with it.

## One assistant, five shapes

The layer is not five features. It is one presence that changes shape to match
how much of your attention the moment deserves.

| | |
|---|---|
| **Orb** | Resting. A small character parked at the edge of the page, doing nothing until you call it. |
| **Spotlight** | One box that searches your product and asks the assistant. It is ⌘K, rebuilt for a product that has AI in it. |
| **Panel** | A conversation that stays open while you work. Answers stack up, so you can look back at what you asked. |
| **Dock** | The panel pinned to one side, full height. Your page makes room for it instead of hiding behind it. |
| **History** | Everything you have asked here. It fills the screen but stays see-through, because the work underneath is why you opened it. |

You move between them by dragging the orb. Drop it at the right edge and it
docks; drop it at the top and it becomes the palette.

## Change one value

The assistant looks like your product because it has nothing of its own to
look like. Underneath it is the Foundation: a short menu of values that
everything else reads from. An accent colour, a grey, a corner radius, a
spacing step, a type scale, an icon set, how motion feels.

Pick a different accent or a tighter spacing step, and every component on
every page redraws, the assistant included. Save, and it is your theme.

The menu is short on purpose. If it cannot express something, that is the
system doing its job: an AI working here cannot invent a colour, because there
is nowhere to put one. That is the whole argument, and the reason the
assistant can be trusted to build.

The long version is the [architecture page](https://ambientui.ai/architecture).
The rules it produced are [DESIGN.md](DESIGN.md).

## What you can take

Two tracks. The first gives you things that render; the second gives you the
thing that decides what rendering looks like.

**Take the components.** The parts you can see. They land in your repo as code
you own.

| | | |
|---|---|---|
| **The whole ambient layer** | The orb, the spotlight, the panel, the dock and the history, plus the wiring that lets a page tell it where you are. | `npx shadcn add @ambientui/ambient-layer` |
| **One component** | Just the piece you need: the reasoning panel, the tool timeline, the diff. 31 to choose from, each documented with what it is and is not for. | `npx shadcn add @ambientui/reasoning-panel` |

**Adopt the architecture.** The part that decides how everything looks.

| | | |
|---|---|---|
| **A design system to build inside** | The Foundation: the short menu of values everything else reads from. You can take this on its own, with no assistant attached. | `npx shadcn add @ambientui/foundation` |
| **The rules your AI works under** | The rules your AI reads before it writes anything, and three reviewer roles it can take on. This is the part nobody else ships. | `npx shadcn add @ambientui/governance` |

Register the namespace once and the commands stay short:

```bash
npx shadcn registry add @ambientui=https://registry.ambientui.ai/r/{name}.json
```

31 installable of 50 documented. The other 19 are shadcn's own primitives,
which you already have or can take from shadcn directly, plus one surface that
ships inside the layer rather than on its own. The counts come from
`registry.json` and the catalog, never from this sentence.

Every command above is executed against a scratch project by
`npm run verify:install` before it is allowed on the site or in this table.

The layer runs with **no providers at all**. It falls back to sane defaults and
binds to a full design system when you give it one.
`packages/ambient/dev/index.html` is the proof, and it is a test we keep.

Prefer a versioned dependency to owned source? `npm i ambientui`, and
`@ambient-ui/foundation` for the configuration engine on its own. The docs
say plainly which to choose: the registry if you will restyle it (most
people, given the whole argument), npm if you want upgrades and will not
touch it.

## What's in here

```
packages/ambient      the ambient layer            → npm: ambientui
packages/foundation   the configuration engine     → @ambient-ui/foundation
packages/ui           the product primitives       → @ambient-ui/ui
packages/patterns     promoted product patterns    → @ambient-ui/patterns
packages/docs         the catalog + governing docs → @ambient-ui/docs
(the website lives in its own repo: github.com/Lumenridge/ambientui-site)
docs/                 the reader-facing guides, including registry vs npm
scripts/              the registry build and every drift check the gate runs
fixtures/consumer     a scratch project the install commands are proved against
tokens/tokens.json    the serialized token master
figma/                the code → Figma variable contract
```

**The governing documents are the control surface**, not a description of one:

- [DESIGN.md](DESIGN.md) is the constitution: token rules, the two
  vocabularies, the ambient layer contract, and a dated decision log recording
  every design decision with its *why*.
- [CLAUDE.md](CLAUDE.md) holds the hard rules an AI works under in this repo.

The `/ds` reference links to them on GitHub rather than re-rendering them, so
there is one copy of each and no chance of a stale mirror. The registry is
generated from the same component docs, so a component is installable
*because* it is documented. Install one and its when-to-use prints in your
terminal.

## Running it

This repo is the library. The website that shows it all running lives at
[ambientui.ai](https://ambientui.ai), from its own repo,
[ambientui-site](https://github.com/Lumenridge/ambientui-site).

```bash
npm install
npm run build            # every package
npm run gate             # typecheck, lint, build, and the drift checks
npm run verify:install   # every install command, run against a scratch project
npm run registry:build   # the deployable registry (registry-dist/)
```

The gate proves this repo is internally consistent, and a pre-commit hook runs
it, so a failing gate blocks the commit. `verify:install` proves something the
gate cannot: that a door still works in a project that is not this one. It is
minutes rather than seconds, so it runs on demand, in CI on registry changes,
and nightly, because shadcn, Tailwind and Radix move underneath us. If hooks
aren't firing: `git config core.hooksPath .githooks`.

## Contributing

The unusual thing about this repo is that its rules are written down and
enforced. Read [CLAUDE.md](CLAUDE.md): the rules an AI works under here are the
rules you work under. New patterns go through the watchlist in DESIGN.md §13
rather than landing quietly.

## License

MIT © Lumenridge
