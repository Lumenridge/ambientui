# @ambient-ui/ui

## 0.2.0

### Minor Changes

- The deterministic setup. The layer takes `productName`, `messages`, `hotkey`/`yieldHotkey`, `zIndex`, `dark` and `defaultOrbAnchor`; registering commands can no longer loop (`useRegisterCommands`); commands and jumps leave the spotlight closed and empty; the hotkey opens search even mid-conversation; `NavItem.icon` is an icon name; `auditAmbientApi` tests a host's stubs. The chrome no longer says "ambientui": it says `productName`, or "the assistant". Icon adapters accept React 18's types. The Foundation maps `--secondary`, only sets the root font size when scaling is not 100%, and takes `remoteFonts`. The install pipeline that uses all of this is the new `@ambient-ui/cli`.

## 0.1.3

### Patch Changes

- Every package gets a real npm page: a README that says what it is and how
  to mount it, keywords, and a homepage pointing at ambientui.ai.
