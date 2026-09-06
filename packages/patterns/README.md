# @ambient-ui/patterns

**Product patterns promoted out of the [ambientui](https://ambientui.ai)
website through its own governance process.**

Each of these started as app code, proved itself, and was promoted into the
system with its motion riding the Foundation's roles:

- **`ViewMenu`**: the app's destinations as one segmented pill. Every view
  stays visible as an icon; the one you are on expands to wear its name,
  and selecting is expanding, as one continuous move.
- **The settings kit** (`SaveReminder`, `SettingsSection`, `SettingsCard`,
  `SettingsRow`): the settings-page pattern, including a save bar that
  rises from the bottom only while there are unsaved changes.

```bash
npm i @ambient-ui/patterns
```

```tsx
import { ViewMenu } from "@ambient-ui/patterns/view-menu"
import { SaveReminder } from "@ambient-ui/patterns/settings-kit"
```

Peer dependencies: React 19 and `framer-motion`. The motion values come
from [`@ambient-ui/foundation`](https://www.npmjs.com/package/@ambient-ui/foundation).

Prefer source you own? Both are installable through the shadcn registry:
see [ambientui.ai/ds](https://ambientui.ai/ds) for the commands and the
full behaviour documentation.

MIT (c) Lumenridge
