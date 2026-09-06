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

## 1. Make sure there is a project

If you are already inside a React project with Tailwind CSS v4, continue.

If not, scaffold one first and say so briefly. A Vite + React + TypeScript
app with Tailwind v4 and shadcn initialised is the reference environment:

```bash
npm create vite@latest . -- --template react-ts
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init
```

Follow shadcn's prompts with their defaults. Any framework shadcn supports
works the same way from here.

## 2. Install the system

Register the registry once, then take the two doors:

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
  https://ambientui.ai/architecture
