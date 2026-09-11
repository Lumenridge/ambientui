# ambientui

**An AI assistant that lives above your product instead of inside it, built
from your own design system.**

Most products add AI by finding a spot for it: a chat tab, a sparkle button,
a panel in the corner. This is the other approach. The assistant is a layer
over your product rather than a room inside it. It takes no space, it knows
what page it is on, it answers with real components instead of walls of
text, and it has no colours, fonts or motion of its own. It borrows yours.

One assistant, five shapes: the **orb** resting at the edge of the page, the
**spotlight** (Cmd-K, rebuilt for a product with AI in it), the **panel**
that stays open while you work, the **dock** pinned full height, and the
**history** over everything you have asked. You move between them by
dragging the orb.

See it running at [ambientui.ai](https://ambientui.ai).

## Two ways to take it

**As source you own** (most people; restyling it is the point):

```bash
npx shadcn add https://registry.ambientui.ai/r/ambient-layer.json
```

This lands the components plus `styles/ambient.css`, the layer's
material. Import it in your global stylesheet after the Tailwind
import (the surfaces render transparent without it):

```css
@import "tailwindcss";
@import "./styles/ambient.css";
```

**As this package** (you get fixes by bumping a version, and you cannot
change the inside):

```bash
npm i ambientui
```

The trade-off between the two is written up at
[registry vs npm](https://github.com/Lumenridge/ambientui/blob/main/docs/registry-vs-npm.md).

## Mounting it

```tsx
import { AssistantProvider, Assistant } from "ambientui"
import "ambientui/styles/ambient.css"

<AssistantProvider navItems={NAV} onNavigate={(id) => router.push(id)}>
  {children}
  <Assistant />
</AssistantProvider>
```

It needs no other providers. With none it falls back to sane defaults;
supply your own design system by wrapping it in `AmbientRuntimeProvider`
(the complete contract is `ambient-runtime.tsx`: seven values and two motion
hooks). The orb's shader shapes ship as static files under
`ambientui/assets/*`; serve them from your public root.

Requires React 19, Tailwind CSS v4 and the standard shadcn variables.
`framer-motion` is a peer dependency.

## The rest of the system

- [`@ambient-ui/foundation`](https://www.npmjs.com/package/@ambient-ui/foundation)
  is the configuration engine the assistant reads its look from.
- The full component reference is at
  [ambientui.ai/ds](https://ambientui.ai/ds).
- The design rules that govern all of it are
  [DESIGN.md](https://github.com/Lumenridge/ambientui/blob/main/DESIGN.md).

MIT (c) Lumenridge
