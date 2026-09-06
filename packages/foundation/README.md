# @ambient-ui/foundation

**A design system as a short menu of values, and the engine that compiles a
choice into CSS.**

Someone shows you a product and says "make it feel like that". The usual
answer is to adjust components until it looks close. Here you pick from a
short menu instead: an accent colour, a grey, a corner radius, a spacing
step, a type scale, an icon set, how motion feels. Save, and every
component on every page redraws, the [ambientui](https://www.npmjs.com/package/ambientui)
assistant included.

The menu is short on purpose. If it cannot express something, that is the
system doing its job: an AI working inside it cannot invent a colour,
because there is nowhere to put one.

```bash
npm i @ambient-ui/foundation
```

```tsx
import { FoundationProvider } from "@ambient-ui/foundation"

<FoundationProvider>{children}</FoundationProvider>
```

The provider compiles the saved configuration into one injected style tag
and persists it on save. The data half is importable on its own with no
React at all:

```ts
import { compileFoundationCss, DEFAULT_FOUNDATION } from "@ambient-ui/foundation/tokens"
```

`compileFoundationCss(config)` returns the whole theme as text. Inject it at
runtime or render it into your globals at build time; the provider is one
way to use it, not the only one.

Explore every dimension live at [ambientui.ai/ds](https://ambientui.ai/ds).
Prefer source you own? `npx shadcn add https://registry.ambientui.ai/r/foundation.json`.

MIT (c) Lumenridge
