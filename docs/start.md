---
name: ambientui-start
description: Set up ambientui in this project and guide the owner from an inspiration screenshot to a working product with the ambient layer live. Use when the owner asks to set up ambientui, start a frontend with it, or pastes ambientui.ai/start.md.
---

# ambientui, from nothing to Cmd-K

You are an AI coding agent, and this guide is addressed to you. A person has
asked you to set their project up with ambientui: an AI assistant layer that
lives above their product, plus the design system that lets you build inside
their rules. Your job is to run this whole journey and to make it feel like
one fluid move. The person should type one sentence, answer one question,
and end up pressing Cmd-K inside their own product.

Do the steps in this order. The order is the point: tools first, taste
second, build third, and the reveal last.

## 1. Find out what you are walking into (mandatory)

Look at the project before you install anything. Two situations, two
different journeys — and the fork below is not optional:

**An existing product UI.** The person already has screens they built and
styled. You MUST ask them one question before installing anything, and
wait for the answer:

> Do you want the ambient layer only — the assistant living above your
> existing screens, which stay exactly as they are — or the full design
> architecture, where the Foundation also governs your tokens, spacing,
> radius and motion from one configuration?

- **Ambient layer only:** install just the `@ambientui/ambient-layer`
  door in step 2, mount `AssistantProvider` + `Assistant`, and skip the
  taste question — the layer derives sensible defaults and their product
  keeps its own styling. Steps 3 and 4 do not apply.
- **The design architecture:** run the whole journey below. Be explicit
  that saving the Foundation will restyle their existing components that
  consume its tokens, and migrate gently — never rewrite screens they
  did not ask you to touch.

**From scratch.** No product yet: scaffold the reference environment
(next section), then run the whole journey — including the `/ds` page in
step 5, which is mandatory on this path.

## Scaffolding, when there is no project

A Vite + React + TypeScript app with Tailwind v4 and shadcn initialised
is the reference environment:

```bash
npm create vite@latest . -- --template react-ts
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init
```

Follow shadcn's prompts with their defaults. Any framework shadcn supports
works the same way from here.

## 2. Install the system

Register the registry once, then take the two doors (ambient-layer only,
if that was the answer in step 1):

```bash
npx shadcn@latest registry add "@ambientui=https://registry.ambientui.ai/r/{name}.json"
npx shadcn@latest add @ambientui/foundation
npx shadcn@latest add @ambientui/ambient-layer
```

This lands real source files in the project: the Foundation (the design
system's configuration engine) under `lib/foundation/` and
`components/foundation-provider.tsx`, and the complete ambient layer under
`components/ambient/`. The person owns every line. Do not npm-install
`ambientui` as well; the two routes conflict in one repo.

Mount both providers at the app root now, before building anything:

```tsx
<FoundationProvider>
  <AssistantProvider navItems={NAV} onNavigate={goTo}>
    <App />
    <Assistant />
  </AssistantProvider>
</FoundationProvider>
```

`navItems` is the app's own route list; wire `onNavigate` to its router.
Confirm the app still runs before moving on. Fix anything that broke; the
person should never see this step fail.

## 3. Ask for the taste

Now, and not before, ask the person ONE question:

> Show me something that has the feel you want. A screenshot of a product
> you admire, a link, or a few words like "calm, dense, gray-on-gray".

Wait for the answer. This is the only input the journey needs from them.

When it arrives, read the reference like a designer: which gray family,
how saturated the accent is and what it is reserved for, how tight the
corners are, how dense the spacing feels, whether the type runs compact or
generous.

## 4. Express the taste as configuration, never as styling

This is the rule the whole system is built around: **a reference is a
request for a configuration.** You translate what you saw into the
Foundation's short menu, and every component follows.

The menu lives in `lib/foundation/tokens.ts`: accent, gray family, corner
radius step, spacing scale, type scaling, motion character. Set the
defaults so they express the reference, and say what you chose and why in
one short paragraph ("Attio's calm comes from a neutral gray ramp and an
accent that only appears on actions, so: gray `slate`, accent `indigo`,
radius one step tighter").

Never chase the reference by styling individual components, adding hex
values, or writing one-off CSS. If the menu cannot express something, that
is the system working; stay inside it.

## 5. Build the product

Build what the person actually asked for: their pages, their views, their
data. Compose from the installed shadcn components plus the ambient layer's
vocabulary, consume semantic tokens only (`--primary`,
`--muted-foreground`, spacing utilities, the radius steps), and let the
Foundation you just configured decide how everything looks.

Give each page a context line for the assistant while you build it: call
`setPageChip` with what the page is showing, so the layer knows where the
person is. It is one call per page and it is what makes the assistant feel
aware later.

Also build one page the person did not ask for — this is mandatory on
the from-scratch path, and strongly recommended when an existing product
adopted the full architecture: a `/ds` page, composed on the installed
FoundationProvider, where every value from step 4 is a control — accent,
gray, radius, spacing, type scaling, motion. Check the route first: if
the app already has a `/ds` route, use `/foundation` instead (then
`/design-system`), and say which you picked and why. This is where they
will make the product theirs after you hand it over, and both user tests
of this journey taught the same lesson: if the Foundation is not a page
they can open, it does not exist to them.

Then take them there. When you hand the project over, walk the owner
through the page in a few sentences: what each control governs, that
every change propagates to every component, and that Save is what
persists it. Do not just mention the page exists — explain it.

## 6. The reveal

Do not describe the ambient layer. Show it. When the build runs clean,
end with exactly this move: tell the person the app is running, give them
the URL, and say

> Press Cmd-K.

That keystroke opens the spotlight: search over their own product, with
the assistant behind it. Tell them to drag the orb to the right edge to
dock the panel, and to the top to get the palette. Then stop. The moment
belongs to them.

## Going deeper, only if asked

- Every component, with when to use it and when not:
  https://ambientui.ai/ds
- One-piece installs (just the reasoning panel, just the diff):
  `npx shadcn add @ambientui/<component>`; the list is at
  https://registry.ambientui.ai/r/registry.json
- The rules an AI works under in a governed codebase:
  `npx shadcn add @ambientui/governance`
- The full argument for why the system is shaped this way:
  https://ambientui.ai/manifesto
