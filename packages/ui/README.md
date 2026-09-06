# @ambient-ui/ui

**The product vocabulary of [ambientui](https://ambientui.ai): shadcn/ui
primitives on the radix-nova preset, plus the pieces ambientui adds.**

These are the buttons, inputs, sheets and tables the ambient layer composes
its answers from. They consume semantic tokens (`--primary`,
`--muted-foreground`, the radius window, the motion roles), so a
[Foundation](https://www.npmjs.com/package/@ambient-ui/foundation)
configuration restyles all of them at once.

Two additions worth knowing about:

- **`Icon`**: one semantic name, drawn by whichever icon library the design
  system is configured to use (Lucide, Tabler, HugeIcons, Phosphor or
  Remix). Components name what an icon means; the library is a
  configuration choice, not a per-component import.
- **`SectionRail`**: a right-edge dash rail for jumping between the named
  sections of a long page.

```bash
npm i @ambient-ui/ui
```

```tsx
import { Button } from "@ambient-ui/ui/components/button"
import { Icon } from "@ambient-ui/ui/components/icon"
```

Most people take these as source through shadcn instead: the primitives
from shadcn's own registry, the additions from
[registry.ambientui.ai](https://registry.ambientui.ai). The full reference,
with when to use and when not to for every component, is at
[ambientui.ai/ds](https://ambientui.ai/ds).

MIT (c) Lumenridge
