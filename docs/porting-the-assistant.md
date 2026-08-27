# Installing the ambient layer in another product

This replaces the old manual porting guide. That document existed because
there was no install mechanism; it described copying four files that later
became twenty, and it referenced components that no longer exist. There is
an install mechanism now, so the honest version of this document is short.

## The one-command path

The layer ships as a shadcn registry item. In your own app:

```bash
npx shadcn add https://lumenridge.github.io/ambientui/r/ambient-layer.json
```

This writes the layer's source files into your project, in your project's
own import dialect (the registry build rewrites this repo's package imports
to `@/` aliases before publishing, so the files compile where they land).
You own the code afterward; there is no runtime dependency on this repo.

Every documented component is also installable on its own the same way,
from `/r/{name}.json`. The component's page at `/ds` shows its command.

## What you wire up

The layer renders with **zero providers**. Every value it needs has a
working default through one interface, `AmbientRuntime`
(`packages/ambient/src/ambient-runtime.tsx`), so the hook that reads it
never throws. `apps/web/bare.html` in this repo mounts the layer with no
providers at all, as proof.

The optional wiring, in order of usefulness:

1. **Styles.** Import the layer's stylesheet once (`ambient.css`, installed
   alongside the components). It carries the glass recipes and derives
   every color from your semantic roles, so the layer wears your theme
   automatically.
2. **Navigation.** Pass `navItems` to `AssistantProvider` and handle
   `onNavigate`. The palette's "Jump to" entries come from what you supply;
   the layer never imports your route table.
3. **Page context.** Call `setPageChip` from each page (and `setPageIntel`
   for what the page knows). This is what makes "fix this" mean something.
   A page that skips it still works; the assistant just knows less.
4. **Theming depth.** If your app has a Foundation-style config layer,
   implement the `AmbientRuntime` interface from it and the layer follows
   your saved theme (message presentation, stream pace, orb palette and
   speeds, motion roles). Without it, the defaults hold.

## The boundary that keeps this true

Inside this repo, the layer is a package that may import the UI package and
npm, and never the app. That rule is why the extraction works: the layer
has no hidden dependency on the product it was built inside. If you modify
your installed copy, keeping that same boundary is what keeps it portable.

## Verify the install

Mount `<Assistant />` inside `<AssistantProvider>` on any page. You should
see the resting orb; clicking it opens quick ask; asking anything opens the
panel. If your semantic roles (`--primary`, `--popover`, `--border`, and
the rest of the shadcn set) are defined, the layer is already in your
colors. If it renders gray, your roles are missing, not the layer's.
