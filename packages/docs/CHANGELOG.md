# @ambient-ui/docs

## 0.3.1

### Patch Changes

- The registry doors install `framer-motion@^13`, the major the layer is built and tested on, instead of whatever is latest; the peer range stays `^13`. The docs package now carries the install's fixed outro in `start.md`.

## 0.3.0

### Minor Changes

- The layer runs on a product's chat stack. Adapters build the Ambient API from the Vercel AI SDK (`aiSdkRoute`, `aiSdkChat`), assistant-ui (`assistantUIThread`) and CopilotKit or any AG-UI agent (`agUIAgent`), each its own import (`ambientui/stack-ai-sdk`, `ambientui/stack-assistant-ui`, `ambientui/stack-ag-ui`) and registry door. The Ambient API gains `respond`, `reset` and `conversation`, and `regenerate` on a question; a block may carry an `id` and be replaced in place. New in the tool kit: `ToolApproval`; `ToolCall` takes the product's own component for a tool as children, given through `toolComponents` or `renderTool` on `AssistantProvider`. `ambientui doctor` detects the stack and plans its door.

## 0.2.0

### Minor Changes

- start.md runs the install through `@ambient-ui/cli`: doctor, the agent's review (`doctor.md`), install from the plan, verify, and one revertible commit with developer notes.
- ambient-api.md starts from the host's own transport, with session-auth and local-engine examples.

## 0.1.13

### Patch Changes

- READMEs say the wiring out loud: the registry route lands styles/ambient.css and styles/foundation.css, and both are imported into the consumer's globals after the Tailwind import, as shipped, never rebuilt by hand. The root README links the rendered governing documents at ambientui.ai/docs.

## 0.1.12

### Patch Changes

- start.md: verify the install landed before mounting (no literal `@` directory from a failed alias resolution, lib/utils and the ui deps present, Cmd-K pressed by the agent before handover), and link the rendered governing documents at ambientui.ai/docs.

## 0.1.11

### Patch Changes

- start.md: wire the shipped stylesheets explicitly (import foundation.css and ambient.css into globals after tailwindcss), keep orb assets in the framework's static directory, and end every message to the owner with their next action in bold at the bottom.

## 0.1.10

### Patch Changes

- start.md installs the whole thing: step 2 now takes four doors - start (the skill with the constitution DESIGN.md beside it, mandatory reading before any UI), governance (the working rules, adapted to the host repo as part of setup), foundation and ambient-layer - and a mandatory propagation check gates the reveal: every control on the /ds page must visibly re-theme everything built, or the literal that broke it gets found and fixed first.

## 0.1.6

### Patch Changes

- start.md gains two mandatory behaviors: an existing product UI gets one question before anything installs (the ambient layer only, or the full design architecture), and the from-scratch path must build the /ds Foundation settings page (checking the route for conflicts) and walk the owner through it at handover. The going-deeper link follows the argument to ambientui.ai/manifesto.

## 0.1.5

### Patch Changes

- start.md now has the agent build a /foundation settings page during the
  build step, so the owner has somewhere real to turn the dials afterward.

## 0.1.4

### Patch Changes

- The content set gains start.md: the guided setup written for the AI agent
  doing the work, from install to the Cmd-K reveal.

## 0.1.3

### Patch Changes

- Every package gets a real npm page: a README that says what it is and how
  to mount it, keywords, and a homepage pointing at ambientui.ai.

## 0.1.2

### Patch Changes

- The content snapshots pick up the root-document refresh: live links to
  ambientui.ai and a Running it section shaped like the library this repo
  became.

## 0.1.1

### Patch Changes

- The content snapshots catch up with the first publish: the packaged README
  and registry-vs-npm no longer hedge about a release that has since shipped,
  and the registry.json snapshot carries the live registry host.
