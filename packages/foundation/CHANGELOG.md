# @ambient-ui/foundation

## 0.2.0

### Minor Changes

- The deterministic setup. The layer takes `productName`, `messages`, `hotkey`/`yieldHotkey`, `zIndex`, `dark` and `defaultOrbAnchor`; registering commands can no longer loop (`useRegisterCommands`); commands and jumps leave the spotlight closed and empty; the hotkey opens search even mid-conversation; `NavItem.icon` is an icon name; `auditAmbientApi` tests a host's stubs. The chrome no longer says "ambientui": it says `productName`, or "the assistant". Icon adapters accept React 18's types. The Foundation maps `--secondary`, only sets the root font size when scaling is not 100%, and takes `remoteFonts`. The install pipeline that uses all of this is the new `@ambient-ui/cli`.

### Patch Changes

- Updated dependencies
  - ambientui@0.2.0
  - @ambient-ui/ui@0.2.0

## 0.1.13

### Patch Changes

- READMEs say the wiring out loud: the registry route lands styles/ambient.css and styles/foundation.css, and both are imported into the consumer's globals after the Tailwind import, as shipped, never rebuilt by hand. The root README links the rendered governing documents at ambientui.ai/docs.
- Updated dependencies
  - ambientui@0.1.13

## 0.1.9

### Patch Changes

- The saved theme is adopted in a pre-paint layout effect instead of the first render's initializer. The hydrating render now matches the server's default-theme HTML, ending the hydration failure every visitor with a saved theme hit on every page load - and the theme still lands before the browser paints, so the no-flash guarantee holds.

## 0.1.8

### Patch Changes

- Remix Icon becomes the default icon library. The five libraries remain equal choices on the Foundation page; only the out-of-the-box pick changes.

## 0.1.7

### Patch Changes

- The compiled theme now derives --ambient-accent and --ambient-accent-wash from the configured accent (rule 5: ambient tokens default to values derived from the base theme). The layer's surfaces and the orb's accent-linked heat ramp retheme with the accent instead of staying the static blue.

## 0.1.3

### Patch Changes

- Every package gets a real npm page: a README that says what it is and how
  to mount it, keywords, and a homepage pointing at ambientui.ai.
- Updated dependencies
  - ambientui@0.1.3
  - @ambient-ui/ui@0.1.3
