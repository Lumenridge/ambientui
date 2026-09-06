# @ambient-ui/docs

**The [ambientui](https://ambientui.ai) system's account of itself, as a
versioned package.**

Two things ship here:

- **The component catalog** (`@ambient-ui/docs/catalog`): what every
  documented component is, in serializable prose. Summary, behaviour, when
  to use, when not to. No React, no imports; a Node script can read it as
  easily as a page can render it.
- **Content snapshots** (`@ambient-ui/docs/content/*`): the governing
  documents (DESIGN.md, the specs, the Figma contract) and the registry
  index, copied from the repository at build time, so a consumer renders
  the release it depends on rather than whatever the repo's HEAD says.

This is how the [ambientui website](https://github.com/Lumenridge/ambientui-site)
stays honest across repositories: it imports this package, and its build
fails if its demos fall out of step with the catalog a new release ships.

```bash
npm i @ambient-ui/docs
```

```ts
import { AMBIENT_COMPONENTS, SHADCN_DEFAULT_COMPONENTS } from "@ambient-ui/docs"
```

You probably only need this package if you are building tooling or
documentation around ambientui. The human-readable reference is at
[ambientui.ai/ds](https://ambientui.ai/ds).

MIT (c) Lumenridge
