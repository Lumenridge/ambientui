# Chat stacks: the layer on the Vercel AI SDK, assistant-ui and CopilotKit

A product that already runs a chat stack keeps it. The stack's runtime, its
tools, its thread and the components the product draws its tools with all
stay. What changes is the surface: the ambient layer becomes the assistant's
UI (the orb and its states, the palette, the transcript, the approvals), and
the stack's own chat window is removed.

Each stack has an adapter that builds the [Ambient API](ambient-api.md) from
it. The adapters import nothing from the stacks; they describe the objects
they are handed structurally, so the layer takes no dependency on a library
the product may not use.

| The product runs | Adapter | Registry door | npm import |
|---|---|---|---|
| a Vercel AI SDK chat route, and no chat state in the browser | `aiSdkRoute` | `stack-ai-sdk` | `ambientui/stack-ai-sdk` |
| an AI SDK `Chat` (the object behind `useChat`) | `aiSdkChat` | `stack-ai-sdk` | `ambientui/stack-ai-sdk` |
| an assistant-ui runtime | `assistantUIThread` | `stack-assistant-ui` | `ambientui/stack-assistant-ui` |
| CopilotKit, or any AG-UI agent (LangGraph, Mastra) | `agUIAgent` | `stack-ag-ui` | `ambientui/stack-ag-ui` |

Through the registry the files land beside the layer, at
`@/components/ambient/stack-*`.

Every adapter returns the same thing, an `AmbientStack`: the handlers
`createAmbientApi` takes. Add `suggestions` and `recents` beside it when the
product has them.

```ts
const api = createAmbientApi({ ...aiSdkRoute({ api: "/api/chat" }), suggestions })
```

## What the layer does on every stack

| The person… | The layer… | The stack… |
|---|---|---|
| asks | streams the answer: reasoning, each tool call as it runs and finishes, prose, sources | runs the turn as it always does |
| is asked to approve a tool | shows the approval in the transcript, with the exact request | gets the yes or no and continues |
| is asked for something only they can give (a form, a picker) | draws the product's component for that tool, which calls `respond` | gets the output and continues |
| regenerates the last answer | keeps both versions | replaces its own last answer |
| asks again for an earlier answer (a stateless route only) | keeps both versions | answers from the history before it |
| clears the conversation | starts clean | clears its thread |
| starts a turn somewhere else in the product | shows that turn in its transcript | (nothing: the layer follows the thread) |
| presses Stop | stops, and closes an approval that was still open | cancels the run |

A server that knows the layer's grammar can also send its blocks through any
stack, under the names in `AMBIENT_DATA` (`stack-parts.ts`):
`ambient-evidence`, `ambient-artifact`, `ambient-refs`, `ambient-follow-ups`,
`ambient-effect`. On the AI SDK that is a data part (`data-ambient-follow-ups`),
on AG-UI a `CUSTOM` event with that name, on assistant-ui a `data` part.

## The product's own components

A tool the product has a component for is drawn by that component, inside
the layer's frame, where the generic tool call would be.

```tsx
<AssistantProvider api={api} toolComponents={{ searchFlights: FlightResults, pickSeat: SeatPicker }}>
```

The component receives `AmbientToolProps` (`tool-host.ts`): the tool's
`name`, `input`, `output`, a `status` (`running`, `waiting`, `done`) and
`respond(output)`. `waiting` means the call is the person's to answer;
calling `respond` gives it its output and the answer continues.

A stack with its own registry of tool components is forwarded to instead,
with `renderTool`. Return `undefined` for a tool the registry does not draw.
A named component in `toolComponents` is tried first, so a tool the stack
itself runs and draws (a CopilotKit human-in-the-loop tool) belongs to the
registry, not to `toolComponents`.

Any adapter also takes `toolBlock(call)`, to draw a call as one of the
layer's own richer blocks (a search tool as a `search` block).

## Vercel AI SDK

**A chat route.** The route is the product's
(`streamText(…).toUIMessageStreamResponse()`). The layer posts the
conversation as UI messages, with the page context beside them as `ambient`.

```ts
import { aiSdkRoute, waitForPerson } from "@/components/ambient/stack-ai-sdk"

export const ambientApi = createAmbientApi(
  aiSdkRoute({
    api: "/api/chat",
    fetch: http.fetch, // the product's own, when it wraps auth or a base path
    tools: {
      highlightRow: ({ id }) => highlight(id), // the browser runs it
      pickSeat: waitForPerson, // its component calls respond()
    },
  })
)
```

`tools` are the tools declared on the server with no `execute`. After one,
or after an approval, the assistant message is posted back whole and the
same answer continues. A call to a tool that is not in `tools` fails,
naming the tool. One answer continues at most `maxRounds` times (8 unless
set); past that the turn fails rather than ending quietly.

**A `Chat`.** When other parts of the product read the chat too, share one
`Chat` instance (`useChat({ chat })`) and hand it to the layer. Its
transport, `onToolCall` and messages stay the product's.

```ts
import { aiSdkChat } from "@/components/ambient/stack-ai-sdk"

const chat = new Chat({ transport })
export const ambientApi = createAmbientApi(aiSdkChat(() => chat))
```

The adapter needs the `Chat` instance, not the object `useChat` returns,
because that object cannot be subscribed to from outside a component. A
chat without `sendAutomaticallyWhen` is resubmitted by the adapter when a
tool output or an approval is in and the model has not answered it. It
waits `CONTINUE_GRACE_MS` for the chat to continue by itself first; a chat
whose `sendAutomaticallyWhen` is asynchronous and slower than that passes
`resubmit: false`, or both submit.

## assistant-ui

```tsx
import { assistantUIThread } from "@/components/ambient/stack-assistant-ui"

const runtime = useChatRuntime()
const api = React.useMemo(
  () => createAmbientApi(assistantUIThread(() => runtime.thread)),
  [runtime]
)
```

Mount `<AssistantRuntimeProvider>` as before, so tools registered with
`useAssistantTool` keep running. The page context travels on each run as
`runConfig.custom.ambient`. Clearing calls `thread.reset()`; a product with
a thread list passes `reset: () => runtime.threads.switchToNewThread()`.

## CopilotKit and AG-UI

Inside CopilotKit, run through CopilotKit, so its frontend tools,
human-in-the-loop tools and `useAgentContext` apply:

```tsx
import { agUIAgent } from "@/components/ambient/stack-ag-ui"

const { agent } = useAgent()
const { copilotkit } = useCopilotKit()
const api = React.useMemo(
  () =>
    createAmbientApi(
      agUIAgent(() => agent, {
        run: (agent, { resume }) => copilotkit.runAgent({ agent, resume }),
        stop: (agent) => copilotkit.stopAgent({ agent }),
      })
    ),
  [agent, copilotkit]
)
```

CopilotKit's tool renders (`useFrontendTool`, `useHumanInTheLoop`) are drawn
in the layer through `renderTool`, with `useRenderToolCall()`:

```tsx
const renderToolCall = useRenderToolCall()
const renderTool = (call: AmbientToolProps) =>
  renderToolCall({
    toolCall: { id: call.id!, type: "function", function: { name: call.name, arguments: JSON.stringify(call.input ?? {}) } },
    toolMessage: call.output === undefined ? undefined : { id: `${call.id}-result`, role: "tool", toolCallId: call.id!, content: JSON.stringify(call.output) },
  }) ?? undefined
```

A plain AG-UI agent (`new HttpAgent({ url })`) needs no options. Its
browser-side tools go in `tools`, each with a `description`, its
`parameters` and `run` (a function, or `waitForPerson`). A `run` that
throws is reported to the agent as a failed tool. An AG-UI interrupt is an
approval; it is resumed with `{ approved, reason }`, or with what
`resumePayload` returns. `maxRounds` caps the runs of one answer, as on
the AI SDK route.

## Removing the stack's own chat UI

The layer is the assistant's surface, so the stack's chat window goes:
`<Thread>` and `<AssistantModal>` (assistant-ui), `<CopilotChat>`,
`<CopilotSidebar>` and `<CopilotPopup>` (CopilotKit), a `useChat`
transcript. Keep the providers and every tool registration. Move each
component the product drew a tool with into `toolComponents`.

`ambientui doctor` finds the stack, opens its door and lists these mounts in
`plan.transport`.

## Limits

- **Regenerate redoes the thread's last answer only** on a stack that keeps
  the thread. Redoing an earlier one would drop every turn after it, so the
  layer does not offer it there.
- **Two adapters lean on something the stack does not document.**
  `aiSdkChat` follows the `Chat` through its `~registerMessagesCallback`
  and `~registerStatusCallback` methods, which the AI SDK keeps for its own
  React binding. `assistantUIThread` resubmits a stalled AI SDK runtime
  through `thread.getState().extras.chat`. A release of either stack can
  move them. The first is checked: `aiSdkChat` throws an error naming the
  missing method. The second is optional: without it a run that nothing
  continues simply ends there.

- The layer's transcript is the current branch of the stack's thread. Its
  own earlier versions of an answer stay reachable in the layer; the
  stack's other branches do not appear.
- Attachments and voice in the stack's thread are not shown.
- On assistant-ui, a run that ends on a tool result is given a moment to
  continue before the answer is treated as over.
