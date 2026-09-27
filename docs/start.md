---
name: ambientui-start
description: Set up ambientui in this project and guide the owner from an inspiration screenshot to a working product with the ambient layer live. Use when the owner asks to set up ambientui, start a frontend with it, or pastes ambientui.ai/start.md.
---

# ambientui, from nothing to Cmd-K

You are an AI coding agent, and this guide is addressed to you. A person has
asked you to set their project up with ambientui: an AI assistant layer that
lives above their product, plus the design system that lets you build inside
their rules. Your job is to run this whole journey and to make it feel like
one fluid move. The person should type one sentence, answer one question,
and end up pressing Cmd-K inside their own product.

Do the steps in this order. The order is the point: tools first, taste
second, build third, and the reveal last.

**How to end every message.** Whatever you just did or found, finish each
message to the person with their next action — one line, **bold**, at the
very bottom, nothing after it. A next step buried in the middle of a long
answer gets lost; the person should be able to read only your last line
and know what to do.

## 1. Find out what you are walking into (mandatory)

Look at the project before you install anything. Two situations, two
different journeys — and the fork below is not optional:

**An existing product UI.** The person already has screens they built and
styled. You MUST ask them one question before installing anything, and
wait for the answer:

> Do you want the ambient layer only — the assistant living above your
> existing screens, which stay exactly as they are — or the full design
> architecture, where the Foundation also governs your tokens, spacing,
> radius and motion from one configuration?

- **Ambient layer only:** install just the `@ambientui/ambient-layer`
  door in step 2, mount `AssistantProvider` + `Assistant`, and skip the
  taste question — the layer derives sensible defaults and their product
  keeps its own styling. Steps 3 and 4 do not apply. The assistant's API
  (step 2) and its stubs (step 5) still do: the assistant answers either
  way, and it should answer about THIS product.
- **The design architecture:** run the whole journey below. Be explicit
  that saving the Foundation will restyle their existing components that
  consume its tokens, and migrate gently — never rewrite screens they
  did not ask you to touch.

**From scratch.** No product yet: scaffold the reference environment
(next section), then run the whole journey — including the `/ds` page in
step 5, which is mandatory on this path.

## Scaffolding, when there is no project

A Vite + React + TypeScript app with Tailwind v4 and shadcn initialised
is the reference environment:

```bash
npm create vite@latest . -- --template react-ts
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init
```

Follow shadcn's prompts with their defaults. Any framework shadcn supports
works the same way from here.

## 2. Install the system

Register the registry once, then take the doors (ambient-layer only, if
that was the answer in step 1). The `start` door is how THIS guide and
its rulebook land in the repo — install it even if you are reading this
from the web, so every future session finds both:

```bash
npx shadcn@latest registry add "@ambientui=https://registry.ambientui.ai/r/{name}.json"
npx shadcn@latest add @ambientui/start
npx shadcn@latest add @ambientui/governance
npx shadcn@latest add @ambientui/foundation
npx shadcn@latest add @ambientui/ambient-layer
```

The `governance` door lands the working rules: a `CLAUDE.md` at the repo
root — the hard rules an AI follows in a governed codebase — and three
reviewer skills (design-system manager, product-design manager, copy).
They are written for the ambientui repo itself, so adapt them now, as
part of setup: rewrite their file paths and repo references to THIS
project, keep the rules. From then on they are the rules you work under
here too.

This lands real source files in the project: the Foundation (the design
system's configuration engine) under `lib/foundation/` and
`components/foundation-provider.tsx`, and the complete ambient layer under
`components/ambient/`. The person owns every line. Do not npm-install
`ambientui` as well; the two routes conflict in one repo.

**Wire the shipped CSS — do this now, and never reconstruct it by hand.**
The doors also landed two stylesheets: `styles/foundation.css` (the bridge
that routes Tailwind's radius, transition and color utilities through the
Foundation's variables) and `styles/ambient.css` (the layer's material).
Import both in the project's global stylesheet, AFTER the
`@import "tailwindcss";` line:

```css
@import "tailwindcss";
@import "./styles/foundation.css";
@import "./styles/ambient.css";
```

Adjust the relative paths to wherever the files landed next to that
stylesheet. Do not rewrite or approximate what is inside them — a
hand-reconstructed bridge is exactly how radius ends up as
`calc(var(--radius) * 0.6)` instead of the Foundation's radius window,
and how transitions and status colors silently stop following the
configuration. The shipped files ARE the propagation contract.

The layer's orb artwork installed into the project's `public/` directory
(files named `orb-*.svg` and friends). If your framework serves static
assets from somewhere else, move them there — the orb renders blank
without them.

**Verify the install actually landed — three checks, before mounting
anything.** The shadcn CLI fails quietly when a project's alias is not
configured everywhere it looks:

1. No literal `@` directory exists at the repo root. If one appeared, the
   CLI could not resolve the `@/` alias and wrote real files into a folder
   named `@` — add `"paths": { "@/*": ["./src/*"] }` to EVERY tsconfig the
   project has (the root one included, not just `tsconfig.app.json`), move
   the folder's contents into `src/`, and re-run the failed door.
2. `lib/utils.ts` and the ui components the layer composes (button, input,
   skeleton, sidebar) exist under the source tree. A missing one is an
   unresolvable import, and the assistant crashes the moment it opens.
3. The dev server starts with zero console errors before you press Cmd-K
   yourself. Press it. If it crashes, fix it now — never hand this
   failure to the person.

**Then read the rulebook — this is mandatory, not optional.** The `start`
door installed the constitution beside this skill: the file named
DESIGN.md, in the same folder as this SKILL.md. It is the logic every later
step runs on: how a screenshot is read as a CONFIGURATION rather than
copied as styling, and the propagation rules that make one saved value
restyle every component — colors through semantic roles, spacing through
the grid, corners through the radius window, borders and surfaces from
the gray family. Read it before you write any UI. A setup built without
it produces screens where changing the theme moves some things and not
others — borders that stay put while buttons re-theme — which defeats
the entire point of the architecture.

Mount both providers at the app root now, before building anything:

```tsx
<FoundationProvider>
  <AssistantProvider navItems={NAV} onNavigate={goTo} api={ambientApi}>
    <App />
    <Assistant />
  </AssistantProvider>
</FoundationProvider>
```

`navItems` is the app's own route list; wire `onNavigate` to its router.

`api` is where the assistant's requests go. The layer never makes a
request of its own: it calls the functions it is given, validates what
comes back against its contract, and renders it. The requests go to THIS
product's server, never to ambientui.

**Fit the assistant into the API layer the project already has.** Before
writing anything, look at how the app talks to its backend: its HTTP
client (a fetch wrapper, an axios instance, a generated client), where
endpoints are declared, how base URLs, auth headers and errors are
handled, how env flags are read, and whether it already has a mock or
stub mode. The assistant's endpoints join that the way any other
feature's would: same client, same conventions, same stub mechanism if
there is one. Wrap them with `createAmbientApi`, which checks every
request and response against the layer's zod schemas, so a malformed
reply shows the failure state instead of breaking the page.

If the project has no API layer yet, this shape works — one file for
every request the assistant makes, stubs by default:

```ts
// lib/ambient/api.ts — every request the assistant makes goes through here.
import { createAmbientApi } from "@/components/ambient/responder"

import { stubs } from "./stubs"

// STUBS until the backend exists. Set VITE_AMBIENT_STUBS=false (or the
// framework's public env equivalent) to send every request to the server.
const USE_STUBS = import.meta.env.VITE_AMBIENT_STUBS !== "false"

const post =
  (path: string) =>
  async (body: unknown, { signal }: { signal: AbortSignal }) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok) throw new Error(`The assistant request failed (${res.status}).`)
    return res.json()
  }

export const ambientApi = createAmbientApi(
  USE_STUBS
    ? stubs
    : { ask: post("/ambient/ask"), suggestions: post("/ambient/suggestions") }
)
```

Whatever shape the project's own API layer gives it, keep three things:
the assistant's requests go through one place, the stub-or-server
decision is made there (the layer must never know which it is talking
to), and stubs are the default until a backend exists. Adjust the import
to where the layer landed. A backend that streams returns
`answerEventsFromSSE(response)` from `ask` instead of JSON. If the project
already uses an LLM harness or an AI SDK,
[ambient-api.md](https://github.com/Lumenridge/ambientui/blob/main/docs/ambient-api.md)
shows how it fits behind the API, and which tools don't.
Confirm the app still runs before moving on. Fix anything that broke; the
person should never see this step fail.

## 3. Ask for the taste

Now, and not before, ask the person ONE question:

> Show me something that has the feel you want. A screenshot of a product
> you admire, a link, or a few words like "calm, dense, gray-on-gray".

Wait for the answer. This is the only input the journey needs from them.

When it arrives, read the reference like a designer: which gray family,
how saturated the accent is and what it is reserved for, how tight the
corners are, how dense the spacing feels, whether the type runs compact or
generous.

## 4. Express the taste as configuration, never as styling

This is the rule the whole system is built around: **a reference is a
request for a configuration.** You translate what you saw into the
Foundation's short menu, and every component follows.

The menu lives in `lib/foundation/tokens.ts`: accent, gray family, corner
radius step, spacing scale, type scaling, motion character. Set the
defaults so they express the reference, and say what you chose and why in
one short paragraph ("Attio's calm comes from a neutral gray ramp and an
accent that only appears on actions, so: gray `slate`, accent `indigo`,
radius one step tighter").

Never chase the reference by styling individual components, adding hex
values, or writing one-off CSS. If the menu cannot express something, that
is the system working; stay inside it.

## 5. Build the product

Build what the person actually asked for: their pages, their views, their
data. Compose from the installed shadcn components plus the ambient layer's
vocabulary, consume semantic tokens only (`--primary`,
`--muted-foreground`, spacing utilities, the radius steps), and let the
Foundation you just configured decide how everything looks.

Give each page a context line for the assistant while you build it: call
`setPageChip` with what the page is showing, so the layer knows where the
person is. It is one call per page and it is what makes the assistant feel
aware later.

**Then seed the assistant's stubs — mandatory.** The layer ships no
answers of its own. Until a backend exists, the stubs are what the
assistant says, so write them the way you wrote the screens: from the
product's real material. Follow the project's own mock conventions if it
has them; otherwise use the shape below.

1. **Read what each page works with**: the types, the API client, the
   records it lists, the actions it offers. The answers use those names
   and shapes, never another product's.
2. **For each page, write 3–5 questions** a person on that page would
   really ask, each answered as an `AmbientAnswer` — prose, `evidence` (a
   records query as a `tool` block, a `search`, a short `reasoning`),
   `artifacts` where the answer produces something, `refs` to the records
   it used, and `followUps` that lead to the page's other answers. Match
   questions loosely, one pattern per intent.
3. **Route by page.** The page's `setPageChip` id travels with every
   request (with the conversation's `history`, which stubs can ignore), so the stubs hand each question to that page's answers, and
   `suggestions` returns that page's questions — every suggestion then has
   an answer. Anything unmatched gets one honest fallback answer: there is
   no sample answer for that yet.
4. **Behave like the network.** About 400 ms per request, honour the
   `AbortSignal`, and fail when asked to "simulate an error", so the
   error state can be seen before a real outage shows it:

   ```ts
   // lib/ambient/stubs/index.ts — SAMPLE ANSWERS, not a backend.
   // Turned off by VITE_AMBIENT_STUBS=false (see lib/ambient/api.ts).
   import type { AmbientApiHandlers } from "@/components/ambient/responder"

   import { items } from "./items"
   import { users } from "./users"
   import { FALLBACK } from "./fallback"

   const PAGES = { items, users } // keyed by each page's setPageChip id
   const LATENCY_MS = 400

   const settle = <T,>(value: T, signal: AbortSignal) =>
     new Promise<T>((resolve, reject) => {
       const timer = setTimeout(() => resolve(value), LATENCY_MS)
       signal.addEventListener("abort", () => {
         clearTimeout(timer)
         reject(signal.reason)
       })
     })

   export const stubs: AmbientApiHandlers = {
     ask: async ({ question, pageChip }, { signal }) => {
       if (/simulate (an )?error/i.test(question)) {
         await settle(null, signal)
         throw new Error("The assistant is unreachable right now.")
       }
       const page = PAGES[pageChip?.id as keyof typeof PAGES]
       return settle(page?.answer(question) ?? FALLBACK, signal)
     },
     suggestions: async ({ pageChip }, { signal }) =>
       settle(PAGES[pageChip?.id as keyof typeof PAGES]?.asks ?? [], signal),
   }
   ```
5. **Stay inside the product.** Answers only describe what the app can
   actually show or do. Grammar only — no styling, no colours, no markup
   inside the answers. Keep reasoning short: a `reasoning` block holds the
   answer for its `seconds` (four when omitted), so declare 1 on stubs.

Cap it: 3–5 answers per page, for at most 5 pages — the ones the person
will open first. Past that, the fallback covers the rest, and you say so.

Each stub is also the contract the backend will meet: when the engineer
connects one, the server returns the same `AmbientAnswer` JSON (a pydantic
model or zod schema on the server can mirror the layer's), the flag
flips, and nothing on screen changes.

Also build one page the person did not ask for — this is mandatory on
the from-scratch path, and strongly recommended when an existing product
adopted the full architecture: a `/ds` page, composed on the installed
FoundationProvider, where every value from step 4 is a control — accent,
gray, radius, spacing, type scaling, motion. Check the route first: if
the app already has a `/ds` route, use `/foundation` instead (then
`/design-system`), and say which you picked and why. This is where they
will make the product theirs after you hand it over, and both user tests
of this journey taught the same lesson: if the Foundation is not a page
they can open, it does not exist to them.

**Then run the propagation check — mandatory before the reveal.** On
the `/ds` page, change the accent, then the gray family, then the
radius, then the spacing, and watch YOUR OWN screens each time. Every
border, corner, surface, gap and piece of text must follow. Anything
that does not move is a literal you wrote — a hex value, a raw border
color, a typed pixel — and it is a bug: find it, replace it with the
token (DESIGN.md names the right one for each dimension), and check
again. Do not hand the project over until every control on the page
visibly re-themes everything you built. The architecture's whole claim
is one configuration, everything follows; a screen that half-follows
disproves it in front of the person you built it for.

Then take them there. When you hand the project over, walk the owner
through the page in a few sentences: what each control governs, that
every change propagates to every component, and that Save is what
persists it. Do not just mention the page exists — explain it.

**Check the stubs too — mandatory before the reveal.** Open each page
that has them, ask every suggested question, and confirm each one gets
its own answer, not the fallback. Ask "simulate an error" once and
confirm the error state appears with Retry. Then tell the person what you
wrote, in one line, and how to get more:

> I've added 14 sample answers across 4 pages (Items, Users, Settings,
> Dashboard). They're stubs behind `VITE_AMBIENT_STUBS`, served from
> `lib/ambient/api.ts`. If you want sample answers for more pages, or
> different questions, ask me to add them.

## 6. The reveal

Do not describe the ambient layer. Show it. When the build runs clean,
end with exactly this move: tell the person the app is running, give them
the URL, and say

> Press Cmd-K.

That keystroke opens the spotlight: search over their own product, with
the assistant behind it. Tell them to drag the orb to the right edge to
dock the panel, and to the top to get the palette. Then stop. The moment
belongs to them.

## Going deeper, only if asked

- Every component, with when to use it and when not:
  https://ambientui.ai/ds
- One-piece installs (just the reasoning panel, just the diff):
  `npx shadcn add @ambientui/<component>`; the list is at
  https://registry.ambientui.ai/r/registry.json
- The rules an AI works under in a governed codebase:
  `npx shadcn add @ambientui/governance`
- Every governing document, rendered on the site from the shipped
  release — the constitution at https://ambientui.ai/docs/design, the
  index of all of them at https://ambientui.ai/docs
- The full argument for why the system is shaped this way:
  https://ambientui.ai/manifesto
