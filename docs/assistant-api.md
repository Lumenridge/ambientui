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

| Handler | Receives | Resolves to |
|---|---|---|
| `ask(input, { signal })` | `{ question, pageChip, chips }` | a `KitResponse` |
| `suggestions(input, { signal })` | `{ pageChip }` | `string[]` |
| `recents({ signal })` | nothing | `{ text, when }[]` |

- Handlers may return anything. `createAssistantApi` validates it and
  rejects with an `AssistantApiError` naming the field that failed.
- `signal` is aborted when the person presses Stop, a newer question
  replaces this one, or the layer unmounts. Pass it to the HTTP client so
  the request is actually cancelled.
- `pageChip` is what the page declared with `setPageChip`. Route on its
  `id` to answer per page.
- The exported schemas (`kitResponseSchema`, `askInputSchema`,
  `suggestionsSchema`, `recentsSchema`) are the same ones the layer checks
  against. Reuse them on the server where the server is TypeScript.

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

### A server route with the Vercel AI SDK

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
    system: "You answer questions about this product. Cite the records you used in refs.",
    prompt: `Page: ${input.pageChip?.label ?? "unknown"}\nQuestion: ${input.question}`,
    abortSignal: req.signal,
  })
  return Response.json(object)
}
```

### A non-TypeScript backend

A FastAPI endpoint returns the same JSON. Until the schema is exported as JSON
Schema (see the gaps below), mirror `KitResponse` in pydantic by hand from the
schemas in `responder.ts`. The browser still validates every reply, so drift
shows up as a clear error, not a broken page.

## Gaps, and what we plan to do

| Gap | Effect today | Plan |
|---|---|---|
| **No conversation history in `ask`.** The request carries the question and page context only: no prior turns, no thread id. | A real chat backend answers every question without context. Stubs don't care. | Add `conversationId` and prior turns (question and answer text) to `askInputSchema`. Small, but a breaking change once hosts depend on it, so do it early. |
| **No streaming.** `ask` resolves to a finished answer, and the layer paces the text onto the screen itself. | With `streamText` or any SSE/token stream, the host must buffer the whole reply first. It works, but loses first-token speed. | Let `ask` also return a stream of answer events (text deltas, evidence blocks, done), plus a small adapter from AI SDK stream parts. |
| **Tool calls need translating.** Model tool calls and results are not answer blocks by themselves. | The host maps them to `tool`, `parallel`, `reasoning` or `search` blocks. | `generateObject` with `kitResponseSchema` already does this. A helper for streamed tool parts comes with streaming. |
| **No human-in-the-loop step.** Answers are one-way; `effect` only announces what happened. | A backend can't pause for the person to approve an action. | A later contract addition if hosts need it. |
| **No JSON Schema export.** The schemas exist only as zod. | Non-JS servers mirror the shape by hand. | Export `z.toJSONSchema(kitResponseSchema)` so any backend can generate its models from it. |
