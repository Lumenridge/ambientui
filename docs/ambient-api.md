# The Ambient API: connecting the layer to a backend

The ambient layer never makes a network request. The host app gives it one
object, built with `createAmbientApi` from the layer's `responder.ts`, and
the layer calls it:

```tsx
<AssistantProvider api={ambientApi}>…</AssistantProvider>
```

Everything behind that object belongs to the host: its HTTP client, its
server, its auth, its model, and whether it is answering from stubs or from a
real backend. The layer's job is the boundary. Every request and response is
parsed against zod schemas typed against the kits' own interfaces, so a reply
that doesn't match fails the turn with a reason instead of breaking the page.

This document covers what the contract is, which tools fit behind it, and
what it doesn't do yet.

## Names

Everything in the contract carries the `Ambient` prefix, so it reads as one
vocabulary and stands apart from the host's own types and from other
libraries (the Vercel AI SDK's `UIMessage` and `TextStreamPart`, for
example):

| Name | What it is |
|---|---|
| `AmbientQuestion` | What `ask` receives: the question, the conversation, the page context. |
| `AmbientAnswer` | A complete answer: prose, evidence, artifacts, references, follow-ups. |
| `AmbientAnswerEvent` | One piece of a streamed answer. |
| `AmbientBlock`, `AmbientReference` | The parts an answer is made of. |
| `AmbientTurn` | One earlier turn in `history`. |
| `AmbientRecent` | One row of the working history. |
| `AmbientApi`, `createAmbientApi`, `AmbientApiError` | The API the layer calls, how to build it, and how it fails. |

The zod schemas live in `responder-schemas.ts` (`ambientAnswerSchema`,
`ambientQuestionSchema`, `ambientAnswerEventSchema`, …) and the API around
them in `responder.ts`. **Where those are depends on how you installed the
layer:** through the registry they are in your project, at
`@/components/ambient/responder-schemas` and `@/components/ambient/responder`;
with `npm i ambientui` they are `ambientui/responder-schemas` and
`ambientui/responder`. (In this repo: `packages/ambient/src/`.) The examples
below use the registry paths. In the host, keep the prefix too:
`lib/ambient/api.ts`, `ambientApi`, `VITE_AMBIENT_STUBS`, and endpoints
under `/ambient/`, so anyone reading the codebase can tell which code
serves the assistant.

## The contract

`createAmbientApi` takes up to three async handlers. Only `ask` is
required.

| Handler | Receives | Returns |
|---|---|---|
| `ask(input, { signal })` | `{ question, conversationId, history, pageChip, chips }` | an `AmbientAnswer` (REST), or an async iterable of `AmbientAnswerEvent`s (a stream) |
| `suggestions(input, { signal })` | `{ pageChip }` | `string[]` |
| `recents({ signal })` | nothing | `{ text, when }[]` |

- Handlers may return anything. `createAmbientApi` validates it and
  rejects with an `AmbientApiError` naming the field that failed.
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
- The exported schemas (`ambientAnswerSchema`, `ambientQuestionSchema`,
  `ambientSuggestionsSchema`, `ambientRecentsSchema`) are the same ones the layer checks
  against. Reuse them on the server where the server is TypeScript.

## Whole answers and streamed answers

`ask` can answer in either of two ways, and the layer handles both.

**REST: a whole answer.** Resolve to an `AmbientAnswer`. The layer paces the
prose onto the screen itself.

**A stream: an answer in pieces.** Return an async iterable of `AmbientAnswerEvent`s.
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
| `{ type: "answer", answer }` | Replaces everything so far with a complete answer. |
| `{ type: "error", message }` | Fails the turn. What already arrived stays, with the reason under it. |

Send evidence before the text that rests on it; the layer renders in
arrival order. Every event is validated, so one malformed event fails the
turn with the field that was wrong.

### Transports

The layer only ever sees the iterable, so the transport is the host's
choice:

- **Server-sent events (supported now).** `answerEventsFromSSE(response)` turns a
  `text/event-stream` response into events. Each event's `data:` line is one
  `AmbientAnswerEvent` as JSON, and `data: [DONE]` or the end of the body ends the
  answer.
- **WebSocket, WebRTC data channel, gRPC (not built yet).** Each needs only
  an adapter that turns its messages into an async iterable of `AmbientAnswerEvent`s,
  the same job `answerEventsFromSSE` does for SSE. The layer and the contract
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
| Vercel AI SDK on the server (`generateObject`, `generateText`) | Yes, closely | `generateObject({ schema: ambientAnswerSchema })` makes the model produce the layer's grammar directly, and the browser validates it again with the same schema. |
| OpenAI and Anthropic SDKs, LangChain / LangGraph, Mastra, on the server | Yes | The server runs the harness and returns an `AmbientAnswer` as JSON. Model keys never reach the browser. |
| Any backend language (FastAPI, Rails, Go…) | Yes | Return the same JSON shape. Mirror the schema by hand for now (see the gaps below). |
| Vercel AI SDK UI (`useChat`) | Not needed | It manages chat state and messages in the browser, which the layer already does. Use the AI SDK on the server instead. |
| assistant-ui, CopilotKit, other chat UI kits | Out of scope | They have opinions about the presentation layer. A host could still run their backend runtimes behind its own server. |

## Use the transport the product already has

**The first rule: the assistant's requests go the way every other feature's
requests go.** The same client, the same base path, the same auth, the same
error handling, the same mock mode. Never a new server just for the
assistant, unless the product already works that way.

A transport of its own would miss the product's base path, auth and error
handling, and a separate AI server cannot read the data the product holds.

Find the product's transport before writing anything (`ambientui doctor`
reports it), then pick the matching example:

| The product talks to its backend through | Put `ask` |
|---|---|
| an HTTP client module (axios, ky, a fetch wrapper) | on that client, beside the other features' calls — [existing client](#with-the-projects-existing-http-client), [session auth](#session-auth-cookies-and-csrf) |
| TanStack Query / SWR over a client | on the client; the layer does its own request state, so no query hook |
| tRPC or a generated client | as one more procedure or operation |
| a worker, IPC, or a local engine (`send(name, args)`) | as one more handler in that engine — [local-first](#a-local-first-app-worker-or-ipc) |
| an AI SDK already (Vercel AI SDK, a provider SDK) | behind its existing route — [AI SDK routes](#a-server-route-with-the-vercel-ai-sdk-whole-answer) |
| nothing yet | the default `lib/ambient/api.ts` in start.md |

## Examples

### How it relates to the Vercel AI SDK

It works well alongside it, but it isn't the AI SDK's own protocol:

- **Server side, it fits directly.** `generateObject({ schema:
  ambientAnswerSchema })` produces an `AmbientAnswer`, and `streamText`'s
  `textStream` maps one-to-one onto `text` events (examples below).
- **The wire format is ours.** The SSE events are `AmbientAnswerEvent`s,
  not the AI SDK's UI message stream, so `toUIMessageStreamResponse()`
  can't be consumed as-is. The server maps stream parts to events, which is
  a few lines. An adapter from AI SDK stream parts is listed in the gaps
  below.
- **`useChat` isn't needed.** The layer already owns chat state.

### With the project's existing HTTP client

```ts
// lib/ambient/api.ts
import { createAmbientApi } from "@/components/ambient/responder"
import { http } from "@/lib/http" // the project's own axios instance

import { stubs } from "./stubs"

const USE_STUBS = import.meta.env.VITE_AMBIENT_STUBS !== "false"

export const ambientApi = createAmbientApi(
  USE_STUBS
    ? stubs
    : {
        ask: (input, { signal }) =>
          http.post("/ambient/ask", input, { signal }).then((r) => r.data),
        suggestions: (input, { signal }) =>
          http.post("/ambient/suggestions", input, { signal }).then((r) => r.data),
      }
)
```

### Session auth: cookies and CSRF

What a session-authenticated product's own services already do, and what
the assistant's calls must do too:

```ts
// lib/ambient/api.ts — the product's conventions, not new ones
import { createAmbientApi } from "@/components/ambient/responder"
import { csrfToken, onUnauthorized } from "@/utils/session" // the product's own

const post = (path: string) => async (body: unknown, { signal }: { signal: AbortSignal }) => {
  const res = await fetch(`/api/ambient${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
    body: JSON.stringify(body),
    signal,
  })
  if (res.status === 401) onUnauthorized()
  if (!res.ok) throw new Error(`The assistant request failed (${res.status}).`)
  return res.json()
}

export const ambientApi = createAmbientApi({
  ask: post("/ask"),
  suggestions: post("/suggestions"),
})
```

### A local-first app: worker or IPC

When the UI talks to a local engine rather than a server, `ask` is one more
message to that engine, and the engine answers from the data it already
holds. It reaches a model through whatever outbound path the product
already has (its sync server, a user-supplied key), or stays on stubs.

```ts
// lib/ambient/api.ts — a local engine reached through send(name, args)
import { createAmbientApi } from "@/components/ambient/responder"
import { send } from "@/platform/engine" // the product's own

export const ambientApi = createAmbientApi({
  ask: (input) => send("ambient-ask", input),
  suggestions: (input) => send("ambient-suggestions", input),
})

// and inside the engine, beside its other handlers:
// handlers["ambient-ask"] = async (input) => answerFromData(input)
```

`send` here takes no `AbortSignal`, so Stop ends the turn on screen while
the engine finishes in the background. That is acceptable; a transport
that can cancel should.

### A streaming endpoint (SSE)

```ts
// lib/ambient/api.ts — streaming variant
import { createAmbientApi, answerEventsFromSSE } from "@/components/ambient/responder"

export const ambientApi = createAmbientApi({
  ask: async (input, { signal }) =>
    answerEventsFromSSE(
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
// app/api/ambient/ask/route.ts (Next.js)
import { anthropic } from "@ai-sdk/anthropic"
import { generateObject } from "ai"
// registry install; with `npm i ambientui`, import from "ambientui/responder-schemas"
import { ambientQuestionSchema, ambientAnswerSchema } from "@/components/ambient/responder-schemas"

export async function POST(req: Request) {
  const input = ambientQuestionSchema.parse(await req.json())
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-5"),
    schema: ambientAnswerSchema,
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
// app/api/ambient/ask/stream/route.ts (Next.js)
import { anthropic } from "@ai-sdk/anthropic"
import { streamText } from "ai"
import { ambientQuestionSchema, type AmbientAnswerEvent } from "@/components/ambient/responder-schemas"

export async function POST(req: Request) {
  const input = ambientQuestionSchema.parse(await req.json())
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
  const send = (event: AmbientAnswerEvent | "[DONE]") =>
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
Schema (see the gaps below), mirror `AmbientAnswer` in pydantic by hand from the
schemas in `responder-schemas.ts`. The browser still validates every reply, so drift
shows up as a clear error, not a broken page.

## Gaps, and what we plan to do

| Gap | Effect today | Plan |
|---|---|---|
| **No WebSocket, WebRTC or gRPC adapters.** Only SSE ships a helper. | A host on another transport writes the small adapter itself (messages → async iterable of `AmbientAnswerEvent`s). | Add adapters when a host needs one. The contract doesn't change. |
| **Evidence blocks keep their staged timing.** Each block type has a built-in reveal (a tool call holds about 2 s, a reasoning block 4 s unless it declares `seconds`), designed for demos that had no real work behind them. | With a real backend, and especially a stream, that timing adds seconds after the work is already done. | Open design decision: let a host choose staged or immediate evidence, likely as a runtime setting. |
| **Tool calls need translating.** Model tool calls and results are not answer blocks by themselves. | The host maps them to `tool`, `parallel`, `reasoning` or `search` blocks, or events. | `generateObject` with `ambientAnswerSchema` does it for whole answers. A helper for AI SDK stream parts could follow. |
| **No human-in-the-loop step.** Answers are one-way; `effect` only announces what happened. | A backend can't pause for the person to approve an action. | A later contract addition if hosts need it. |
| **No JSON Schema export.** The schemas exist only as zod. | Non-JS servers mirror the shape by hand. | Export `z.toJSONSchema(ambientAnswerSchema)` so any backend can generate its models from it. |

Resolved: conversation history (`history` and `conversationId` on every
`ask`) and streaming (async iterable of `AmbientAnswerEvent`s, with SSE supported).
