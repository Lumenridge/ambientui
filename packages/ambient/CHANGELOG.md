# ambientui

## 0.2.1

### Patch Changes

- 60f4e20: `@paper-design/shaders-react` is accepted at any 0.0.x from 0.0.80, so `npm i ambientui` no longer conflicts with a newer shaders release.

## 0.2.0

### Minor Changes

- **Breaking.** The chrome's words come from a catalog in ten languages (`messages.<locale>.ts`) and name the product (`productName`, `assistantName`), never the library; with neither set they say "the assistant". `messages` takes catalog strings (ICU MessageFormat), not functions.
- **Breaking.** `NavItem.icon` is an icon name, drawn by `<Icon>`; a HugeIcons object is still accepted.
- `AssistantProvider` takes `locale`, `hotkey` / `yieldHotkey`, `zIndex`, `dark` and `defaultOrbAnchor`. The locale is sent with every question and suggestions request.
- `setCommands` ignores identical lists, and `useRegisterCommands` registers for a component's lifetime. Commands and jumps leave the spotlight closed and empty; the hotkey opens search even mid-conversation, heard in the capture phase.
- `auditAmbientApi` tests a host's stub or real API. The root carries `data-ambient-root`, each surface `data-ambient-surface`.
- `ambient.css` declares its knobs and defaults at zero specificity, including motion roles, `--positive` and `.no-scrollbar`.

### Patch Changes

- Updated dependencies
  - @ambient-ui/ui@0.2.0

## 0.1.13

### Patch Changes

- READMEs say the wiring out loud: the registry route lands styles/ambient.css and styles/foundation.css, and both are imported into the consumer's globals after the Tailwind import, as shipped, never rebuilt by hand. The root README links the rendered governing documents at ambientui.ai/docs.

## 0.1.3

### Patch Changes

- Every package gets a real npm page: a README that says what it is and how
  to mount it, keywords, and a homepage pointing at ambientui.ai.
- Updated dependencies
  - @ambient-ui/ui@0.1.3
