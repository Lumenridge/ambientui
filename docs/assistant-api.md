# The assistant API: connecting the layer to a backend

The ambient layer never makes a network request. The host app gives it one
object, built with `createAssistantApi` from
`packages/ambient/src/responder.ts`, and the layer calls it:

```tsx
<AssistantProvider api={assistantApi}>…</AssistantProvider>
```

Everything behind that object belongs to the host: its HTTP client, its
server, its auth, its model, and whether it is answering from stubs or from a
real backend. The layer's job is the boundary. Every request and response is
parsed against zod schemas typed against the kits' own interfaces, so a reply
that doesn't match fails the turn with a reason instead of breaking the page.

This document covers what the contract is, which tools fit behind it, and
what it doesn't do yet.

## The contract

`createAssistantApi` takes up to three async handlers. Only `ask` is
required.

| Handler | Receives | Returns |
|---|---|---|
| `ask(input, { signal })` | `{ question, conversationId, history, pageChip, chips }` | a `KitResponse` (REST), or an async iterable of `AskEvent`s (a stream) |
| `suggestions(input, { signal })` | `{ pageChip }` | `string[]` |
| `recents({ signal })` | nothing | `{ text, when }[]` |

- Handlers may return anything. `createAssistantApi` validates it and
  rejects with an `AssistantApiError` naming the field that failed.
- `history` is every earlier turn of the conversation, oldest first, as
  `{ role: "user" | "assistant", text }`. An answer is sent as its prose, and
  a turn that failed before saying anything is left out. A stateless
  backend can pass it straight to the model.
- `conversationId` stays the same until the person clears the
  conversation. A backend that keeps its own threads can key on it and
  ignore `history`.
- `signal` is aborted when the person presses Stop, a newer question
  replaces this one, or the layer unmounts. Pass it to the HTTP client so
  the request is actually cancelled.
- `pageChip` is what the page declared with `setPageChip`. Route on its
  `id` to answer per page.
- The exported schemas (`kitResponseSchema`, `askInputSchema`,
  `suggestionsSchema`, `recentsSchema`) are the same ones the layer checks
  against. Reuse them on the server where the server is TypeScript.

## Whole answers and streamed answers

`ask` can answer in either of two ways, and the layer handles both.

**REST: a whole answer.** Resolve to a `KitResponse`. The layer paces the
prose onto the screen itself.

**A stream: an answer in pieces.** Return an async iterable of `AskEvent`s.
The layer shows each piece as it arrives: blocks appear, the prose follows
the text as it comes in, and nothing settles until the stream ends.

| Event | Effect |
|---|---|
| `{ type: "evidence", block }` | Adds a block above the prose (reasoning, tool call, search…). |
| `{ type: "text", delta }` | Appends to the prose. |
| `{ type: "artifact", block }` | Adds a block below the prose (diff, terminal, report…). |
| `{ type: "refs", refs }` | Adds references. |
| `{ type: "followUps", followUps }` | Sets the offered next questions. |
| `{ type: "effect", effect }` | Names the workspace effect announced on settle. |
| `{ type: "response", response }` | Replaces everything so far with a complete answer. |
| `{ type: "error", message }` | Fails the turn. What already arrived stays, with the reason under it. |

Send evidence before the text that rests on it; the layer renders in
arrival order. Every event is validated, so one malformed event fails the
turn with the field that was wrong.

### Transports

The layer only ever sees the iterable, so the transport is the host's
choice:

- **Server-sent events (supported now).** `eventsFromSSE(response)` turns a
  `text/event-stream` response into events. Each event's `data:` line is one
  `AskEvent` as JSON, and `data: [DONE]` or the end of the body ends the
  answer.
- **WebSocket, WebRTC data channel, gRPC (not built yet).** Each needs only
  an adapter that turns its messages into an async iterable of `AskEvent`s,
  the same job `eventsFromSSE` does for SSE. The layer and the contract
  don't change. We'll add adapters when a host needs one.

A host can expose both a REST and a streaming endpoint and choose per
environment or per request. Stubs usually answer whole; a production
server usually streams.

## Who this is for

The layer is the presentation. It works with any tool that produces data and
leaves the UI to us. A tool that brings its own chat UI, or opinions about
how answers look, overlaps with the layer and is out of scope.

| Tool | Fits? | How |
|---|---|---|
| `fetch`, axios, ky, generated clients (openapi-ts, orval), tRPC | Yes | A handler is any async function. All of them accept an `AbortSignal`, so Stop cancels the request. |
| TanStack Query, SWR | Yes | Call the query client inside a handler (`queryClient.fetchQuery`). Caching stays in the host. |
| Vercel AI SDK on the server (`generateObject`, `generateText`) | Yes, closely | `generateObject({ schema: kitResponseSchema })` makes the model produce the layer's grammar directly, and the browser validates it again with the same schema. |
| OpenAI and Anthropic SDKs, LangChain / LangGraph, Mastra, on the server | Yes | The server runs the harness and returns a `KitResponse` as JSON. Model keys never reach the browser. |
| Any backend language (FastAPI, Rails, Go…) | Yes | Return the same JSON shape. Mirror the schema by hand for now (see the gaps below). |
| Vercel AI SDK UI (`useChat`) | Not needed | It manages chat state and messages in the browser, which the layer already does. Use the AI SDK on the server instead. |
| assistant-ui, CopilotKit, other chat UI kits | Out of scope | They have opinions about the presentation layer. A host could still run their backend runtimes behind its own server. |

## Examples

### With the project's existing HTTP client

```ts
// lib/assistant/api.ts
import { createAssistantApi } from "@/components/ambient/responder"
import { http } from "@/lib/http" // the project's own axios instance

import { stubs } from "./stubs"

const USE_STUBS = import.meta.env.VITE_ASSISTANT_STUBS !== "false"

export const assistantApi = createAssistantApi(
  USE_STUBS
    ? stubs
    : {
        ask: (input, { signal }) =>
          http.post("/assistant/ask", input, { signal }).then((r) => r.data),
        suggestions: (input, { signal }) =>
          http.post("/assistant/suggestions", input, { signal }).then((r) => r.data),
      }
)
```

### A streaming endpoint (SSE)

```ts
// lib/assistant/api.ts — streaming variant
import { createAssistantApi, eventsFromSSE } from "@/components/ambient/responder"

export const assistantApi = createAssistantApi({
  ask: async (input, { signal }) =>
    eventsFromSSE(
      await fetch(`${import.meta.env.VITE_API_URL}/assistant/ask/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal,
      })
    ),
})
```

### A server route with the Vercel AI SDK, whole answer

```ts
// app/api/assistant/ask/route.ts (Next.js)
import { anthropic } from "@ai-sdk/anthropic"
import { generateObject } from "ai"
import { askInputSchema, kitResponseSchema } from "ambientui/responder"

export async function POST(req: Request) {
  const input = askInputSchema.parse(await req.json())
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-5"),
    schema: kitResponseSchema,
    system: `You answer questions about this product. The person is on: ${input.pageChip?.label ?? "an unknown page"}. Cite the records you used in refs.`,
    messages: [
      ...input.history.map((turn) => ({ role: turn.role, content: turn.text })),
      { role: "user", content: input.question },
    ],
    abortSignal: req.signal,
  })
  return Response.json(object)
}
```

### A server route with the Vercel AI SDK, streamed over SSE

```ts
// app/api/assistant/ask/stream/route.ts (Next.js)
import { anthropic } from "@ai-sdk/anthropic"
import { streamText } from "ai"
import { askInputSchema, type AskEvent } from "ambientui/responder"

export async function POST(req: Request) {
  const input = askInputSchema.parse(await req.json())
  const result = streamText({
    model: anthropic("claude-sonnet-5"),
    system: `You answer questions about this product. The person is on: ${input.pageChip?.label ?? "an unknown page"}.`,
    messages: [
      ...input.history.map((turn) => ({ role: turn.role, content: turn.text })),
      { role: "user", content: input.question },
    ],
    abortSignal: req.signal,
  })
  const encoder = new TextEncoder()
  const send = (event: AskEvent | "[DONE]") =>
    encoder.encode(`data: ${typeof event === "string" ? event : JSON.stringify(event)}\n\n`)
  const body = new ReadableStream({
    async start(controller) {
      for await (const delta of result.textStream)
        controller.enqueue(send({ type: "text", delta }))
      controller.enqueue(send("[DONE]"))
      controller.close()
    },
  })
  return new Response(body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  })
}
```

Tool calls in the stream (`result.fullStream`) map to `evidence` events the
same way: a tool call and its result become a `tool` block.

### A non-TypeScript backend

A FastAPI endpoint returns the same JSON. Until the schema is exported as JSON
Schema (see the gaps below), mirror `KitResponse` in pydantic by hand from the
schemas in `responder.ts`. The browser still validates every reply, so drift
shows up as a clear error, not a broken page.

## Gaps, and what we plan to do

| Gap | Effect today | Plan |
|---|---|---|
| **No WebSocket, WebRTC or gRPC adapters.** Only SSE ships a helper. | A host on another transport writes the small adapter itself (messages → async iterable of `AskEvent`s). | Add adapters when a host needs one. The contract doesn't change. |
| **Evidence blocks keep their staged timing.** Each block type has a built-in reveal (a tool call holds about 2 s, a reasoning block 4 s unless it declares `seconds`), designed for demos that had no real work behind them. | With a real backend, and especially a stream, that timing adds seconds after the work is already done. | Open design decision: let a host choose staged or immediate evidence, likely as a runtime setting. |
| **Tool calls need translating.** Model tool calls and results are not answer blocks by themselves. | The host maps them to `tool`, `parallel`, `reasoning` or `search` blocks, or events. | `generateObject` with `kitResponseSchema` does it for whole answers. A helper for AI SDK stream parts could follow. |
| **No human-in-the-loop step.** Answers are one-way; `effect` only announces what happened. | A backend can't pause for the person to approve an action. | A later contract addition if hosts need it. |
| **No JSON Schema export.** The schemas exist only as zod. | Non-JS servers mirror the shape by hand. | Export `z.toJSONSchema(kitResponseSchema)` so any backend can generate its models from it. |

Resolved: conversation history (`history` and `conversationId` on every
`ask`) and streaming (async iterable of `AskEvent`s, with SSE supported).
