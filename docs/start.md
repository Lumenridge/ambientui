---
name: ambientui-start
description: Set up ambientui in this project and guide the owner from an inspiration screenshot to a working product with the ambient layer live. Use when the owner asks to set up ambientui, start a frontend with it, or pastes ambientui.ai/start.md.
---

# ambientui, from nothing to Cmd-K

You are an AI coding agent, and this guide is addressed to you. A person has
asked you to set their project up with ambientui: an AI assistant layer that
lives above their product, plus the design system that lets you build inside
their rules. Your job is to run this whole journey and to make it feel like
one fluid move. The person should type one sentence and end up pressing
Cmd-K inside their own product, having seen ambientui work before deciding
anything about it.

Do the steps in this order. The order is the point: survey first, install
from a plan, build, prove it, and the reveal last.

**Decide as little as you can.** Most of what used to be your judgement is
now a command's output. `ambientui doctor` surveys the project and writes a
plan: which doors, which commands, where the CSS goes, which props the
provider takes, how the assistant reaches the backend. Follow the plan.
Where it and this guide disagree, the plan knows the project and wins;
where the plan is silent, this guide applies.

**How to end every message.** Whatever you just did or found, finish each
message to the person with their next action — one line, **bold**, at the
very bottom, nothing after it. A next step buried in the middle of a long
answer gets lost; the person should be able to read only your last line
and know what to do.

## 1. Survey the project (mandatory)

Run the doctor from the project's root before you change anything:

```bash
npx -y @ambient-ui/cli doctor --baseline
```

It reads the project and writes `.ambientui/profile.json` (what it found,
with evidence) and `.ambientui/plan.json` (what to do about it). With
`--baseline` it also runs the project's own typecheck, lint, tests and build
once and records what already fails, so nothing that was broken before is
later blamed on the install. If the dev server is running, add
`--url http://localhost:<port>`: it records how the product's screens look
now, and step 6 proves they did not change.

Then act on its report, in this order. **Ask the person nothing.** The
doctor DECIDES everything it can, taking the best case the survey supports,
and every decision lands in the developer notes at the end with its
alternatives. The person's job is to see the layer working; choosing
differently comes after, with a reinstall.

1. **Blockers** stop the install: no React, or React older than 18. If the
   tree has uncommitted work, stop too, and ask the person to commit or
   stash it: the install is one commit that uninstall reverts, and their
   own work must not be inside it. (No git at all is not a stop: the plan
   lists `git init` as a required step, and you run it.)
2. **Decisions** are listed with their reasons: the path (the ambient layer
   only for an existing product, so none of its screens change; the full
   architecture for a new one), the hotkey when the product already owns
   ⌘K (the assistant takes ⌘J and the product keeps ⌘K), the look, the
   rules, the theme. Tell the person in one short paragraph what you are
   about to do, as information, not as a question.
3. **Review the survey against the code — mandatory.** The doctor's checks
   are fixed patterns; you can read the code. Follow `doctor.md` (beside
   this file): confirm every low-confidence fact the plan depends on, look
   for what no fixed check can see, and correct the plan where it is wrong:

   ```bash
   npx -y @ambient-ui/cli plan --set provider.zIndex=2999 --because "the product's modals sit at 3000"
   ```

**Beyond the plan, by hand.** Where the tooling cannot do something (a
transport it could not wire, a mount point it could not find, a pattern of
the product's nothing here fits), take the closest workable path yourself
rather than stopping, keep it inside the install, and record it as you go:

```bash
npx -y @ambient-ui/cli note "Mounted in src/Shell.tsx: App renders outside the router" --kind judgement
```

Kinds: `judgement` (a choice between workable options), `manual` (done by
hand), `unavailable` (the product lacked something; say what you did
instead). The notes are how the owner learns where the install left the
happy path.

**From scratch.** No product yet: scaffold the reference environment (next
section), then run the doctor on it. It plans the full journey, including
the `/ds` page in step 5, which is mandatory on this path.

## Scaffolding, when there is no project

A Vite + React + TypeScript app with Tailwind v4 and shadcn initialised
is the reference environment:

```bash
npm create vite@latest . -- --template react-ts
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init
git init && git add -A && git commit -m "Scaffold"
```

Follow shadcn's prompts with their defaults. Any framework shadcn supports
works the same way from here.

## 2. Install from the plan

Open the install, then run it:

```bash
npx -y @ambient-ui/cli begin
npx -y @ambient-ui/cli install
```

`begin` records where the project stood. `install` runs the plan's
commands: it registers the registry and adds each door the plan chose (the
layer in the dialect this project needs: `ambient-layer`, or
`ambient-layer-tw3` on Tailwind v3; the material for the project's token
format; a scoped base for a product not built on Tailwind; one icon library
instead of five), non-interactively. It also protects the product: any of
the product's own files the shadcn CLI overwrote (its button, its input,
its `lib/utils.ts`) are put back, and files that landed outside the
project's source root are moved into it. Then it ADAPTS what landed to
this product, as the plan listed: it removes the `"use client"`
directives unless the app uses React Server Components, points the
assistant's accent at the product's own primary colour when that is a
real colour, and moves the orb's artwork to wherever the product serves
static files. The doors are the same for everyone; the adaptations are
yours. If a door is ever re-added, `npx -y @ambient-ui/cli adapt` applies
them again. Read what it prints, then look at
`git diff` on the config files it names: the shadcn CLI reformats configs
and drops comments, so restore anything that was the author's.

Then do what the plan says the CLI cannot do for you, each item as written
there:

- **Required steps** (`plan.requiredSteps`): a Tailwind 3.4 bump, the `@/`
  alias in the bundler and the test runner as well as tsconfig, and the
  like. Each names its file and its snippet.
- **The CSS** (`plan.css`). Use the shipped files; never reconstruct them
  by hand, because they ARE the propagation contract. The mode decides
  where they go:
  - `v4-import` — in the global stylesheet, after Tailwind:

    ```css
    @import "tailwindcss" theme(static);
    @import "./styles/foundation.css"; /* full path only */
    @import "./styles/ambient.css";
    ```

    `theme(static)` matters on the full path: without it Tailwind only
    emits the palette variables some class already uses, and the
    Foundation's accents resolve to nothing, with no error.
  - `v3-entry-import` — from the app's entry file, on the line after the
    global stylesheet (`import "./styles/ambient.css"`). Not an `@import`
    after the `@tailwind` directives: CSS does not allow it there, and Vite
    drops the line with only a warning.
  - `scoped` — a product not built on Tailwind gets Tailwind without its
    global reset, and the reset only inside the layer. The plan prints the
    exact lines. Never `@import "tailwindcss"` into such a product: its
    preflight restyles the product's screens.
- **Lint and tests** (`plan.lint`, `plan.tests`): exclude the vendored
  folders from the product's lint autofix before you edit anything in
  them, and add the test mocks the plan names.
- **Governance**, if the person said yes: the rules landed at
  `./.claude/ambientui/CLAUDE.md`. Add one line to the product's own
  CLAUDE.md pointing at it. Never replace their file.

This lands real source files: the layer under `components/ambient/`, and on
the full path the Foundation under `lib/foundation/` and
`components/foundation-provider.tsx`. The person owns every line. The
vendored files keep their own kebab-case names even in a PascalCase
project; say so in one line if the project's convention differs. Do not
npm-install `ambientui` as well; the two routes conflict in one repo.

**Read the rulebook — mandatory.** The `start` door installed the
constitution beside this skill: the file named DESIGN.md, in the same
folder as this SKILL.md. It is the logic every later step runs on: how a
screenshot is read as a CONFIGURATION rather than copied as styling, and
the propagation rules that make one saved value restyle every component.
Read it before you write any UI.

**Mount the layer** where the plan says (`plan.mount`), with the props it
lists (`plan.provider`):

```tsx
<FoundationProvider>{/* full path only */}
  <AssistantProvider
    productName="Invoify"      // the product's name, never "ambientui"
    navItems={NAV}
    onNavigate={goTo}
    api={ambientApi}
    hotkey="mod+k"             // as planned; false for none
    zIndex={2999}              // only if planned: above the chrome, below modals
    defaultOrbAnchor="mr"      // only if planned: clear of a fixed bottom bar
    dark={isDark}              // only if the product's theme is not .dark on <html>
    messages={translations}    // only for a product with its own i18n
  >
    <App />
    <Assistant />
  </AssistantProvider>
</FoundationProvider>
```

When the plan says so, load `Assistant` lazily and import the provider
from `@/components/ambient/assistant-context`, not from the barrel: the
barrel pulls the whole layer into whichever chunk imports it.

`navItems` is where the palette's "Jump to" goes. Each takes an icon NAME
(`icon: "home"`). For an existing product, do not add a call to every page:
write ONE small component beside the router that maps the current route to
the page chip and the page's jumps, and leaves the pages untouched. A
"page" is whatever the person thinks of as a screen: a route, a wizard
step, a mode of a single-canvas app, a tab with its own work. `PageIntel.jumps`
lists the places inside it (the wizard's steps, the editor's dialogs), and
`onJump` goes there.

**Taking over the product's ⌘K** (when that was the answer): register
everything the old palette offered as commands, with `useRegisterCommands`,
which is safe to call on every render. Each command section can name its
own noun (`noun: "account"`) for the palette's counts. Then update or remove
the product's tests for the palette it replaced.

**Connect the assistant to the backend the product already has**
(`plan.transport`). The layer never makes a request of its own: it calls the
functions it is given, validates what comes back, and renders it. The first
rule is the product's own transport: the same client, the same base path,
the same auth, the same mock mode as every other feature. Never a new server
just for the assistant. [ambient-api.md](https://github.com/Lumenridge/ambientui/blob/main/docs/ambient-api.md)
has the example for each kind the doctor reports: an HTTP client with
session auth, a worker or IPC engine, an AI SDK route. Read the stub flag
the way the plan says (`plan.envFlag`), not as `VITE_` unless the plan says
`VITE_`. If the project has no API layer yet, this shape works, with the
plan's flag in place of the Vite one:

```ts
// lib/ambient/api.ts — every request the assistant makes goes through here.
import { createAmbientApi } from "@/components/ambient/responder"

import { stubs } from "./stubs"

// STUBS until the backend exists; the flag's name comes from the plan.
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

Keep three things whatever the shape: the assistant's requests go through
one place, the stub-or-server decision is made there, and stubs are the
default until a backend exists. Confirm the app still runs before moving
on.

## 3. Find the taste (full architecture only)

Do not stop to ask for it. The plan's `look` decision says where it comes
from:

- **current** (an existing product, or one with a DESIGN.md): find the
  product's own design record (a DESIGN.md, a theme file, its CSS
  variables; the doctor names what it found) and read it as the reference.
- **reference** (a new project): use whatever the person said about the
  look in their request ("calm, dense, gray-on-gray", a product they
  named). If they said nothing, start from the Foundation's defaults, and
  note it (`--kind unavailable`): the `/ds` page is where they will make it
  theirs.

Read the reference like a designer: which gray family, how saturated the
accent is and what it is reserved for, how tight the corners are, how
dense the spacing feels, whether the type runs compact or generous.

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

On an existing product, leave type scaling at 100%: any other value
rescales every rem on the page, including the screens the Foundation does
not govern. If the product bundles its fonts or cannot load third-party
resources (offline-first, strict CSP), pass `remoteFonts={false}` to
`FoundationProvider`. The product's dark mode stays the product's: the
Foundation writes a `.dark` block, and something must set the class.

Never chase the reference by styling individual components, adding hex
values, or writing one-off CSS. If the menu cannot express something, that
is the system working; stay inside it.

## 5. Build the product

Build what the person actually asked for: their pages, their views, their
data. Compose from the installed shadcn components plus the ambient layer's
vocabulary, consume semantic tokens only (`--primary`,
`--muted-foreground`, spacing utilities, the radius steps), and let the
Foundation you just configured decide how everything looks.

Give each page a context line for the assistant: `setPageChip` with what the
page is showing, so the layer knows where the person is. On a product you
build, one call per page; on an existing one, the route map from step 2.

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
   it used, and `followUps` that lead to the page's other answers. Keep
   each question next to its answer (a list of `{ ask, answer }` pairs,
   matched exactly first and loosely second), so two answers cannot
   claim the same question.
3. **Route by page.** The page's chip id travels with every request, so
   the stubs hand each question to that page's answers, and `suggestions`
   returns that page's questions. Anything unmatched gets one honest
   fallback answer: there is no sample answer for that yet.
4. **Behave like the network.** About 400 ms per request, honour the
   `AbortSignal`, and fail when asked to "simulate an error", so the
   error state can be seen before a real outage shows it:

   ```ts
   // lib/ambient/stubs/index.ts — SAMPLE ANSWERS, not a backend.
   import type { AmbientApiHandlers } from "@/components/ambient/responder"

   import { items } from "./items"
   import { users } from "./users"
   import { FALLBACK } from "./fallback"

   const PAGES = { items, users } // keyed by each page's chip id
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
   actually show or do. Plain prose: the answer's `text` renders as
   written, so `**bold**` and backticks show as characters. Keep reasoning
   short: a `reasoning` block takes its `seconds` (four when omitted), so
   declare 1 on stubs.

Cap it: 3–5 answers per page, for at most 5 pages — the ones the person
will open first. Past that, the fallback covers the rest, and you say so.

**Prove the stubs with a test, not by clicking.** Add one test, in the
runner and at the path the plan names (`plan.tests`):

```ts
import { auditAmbientApi } from "@/components/ambient/stub-audit"
import { stubs } from "@/lib/ambient/stubs"

test("every suggestion has its own answer", async () => {
  expect(await auditAmbientApi(stubs, [{ id: "items" }, { id: "users" }])).toEqual([])
})
```

It asks every suggestion on every page and fails on an empty answer, the
fallback, two questions sharing one answer, a follow-up with no answer, or
an error probe that does not fail. It runs in milliseconds, and it keeps
running every time someone edits a stub.

Each stub is also the contract the backend will meet: when the engineer
connects one, the server returns the same `AmbientAnswer` JSON, the flag
flips, and nothing on screen changes.

**The full path adds one page the person did not ask for** — mandatory from
scratch, strongly recommended for an existing product: a `/ds` page,
composed on the installed FoundationProvider, where every value from step 4
is a control — accent, gray, radius, spacing, type scaling, motion. Check
the route first: if the app already has a `/ds` route, use `/foundation`
instead (then `/design-system`), and say which you picked and why. If the
Foundation is not a page they can open, it does not exist to them.

**Then run the propagation check** on that page: change the accent, then
the gray family, then the radius, then the spacing, and watch YOUR OWN
screens each time. Every border, corner, surface, gap and piece of text
must follow. Anything that does not move is a literal you wrote, and a bug:
replace it with the token (DESIGN.md names the right one for each
dimension), and check again. When you hand over, walk the owner through the
page in a few sentences: what each control governs, that every change
propagates, and that Save is what persists it.

## 6. Verify (mandatory)

With the dev server running:

```bash
npx -y @ambient-ui/cli verify --url http://localhost:<port>
```

It checks what used to fail silently, and fails loudly instead:

- the typecheck, lint, tests and build, against the baseline from step 1
  (anything that failed before and fails the same way is PRE-EXISTING);
- that every installed file is inside the source root and none is
  gitignored, and that the product's own primitives are unchanged;
- that the material was wired: the built CSS carries the glass, and the
  roles resolve to real colours;
- in a browser: the layer mounted, the hotkey opens, closes and reopens
  the spotlight five times, a query does not survive closing, the
  spotlight is on top of the product's chrome, nothing re-renders in a
  loop, no surface says "ambientui", the orb clears the product's fixed
  UI at phone width, the layer follows the theme, and the product's own
  screens did not change.

Fix every FAIL and run it again until nothing fails. Never hand a FAIL to
the person. If a check is SKIPPED (no browser available), say which, in one
line; do not report it as passed.

Then tell the person what you wrote for the assistant, in one line, and how
to get more:

> I've added 14 sample answers across 4 pages (Items, Users, Settings,
> Dashboard). They're stubs behind `VITE_AMBIENT_STUBS`, served from
> `lib/ambient/api.ts`. If you want sample answers for more pages, or
> different questions, ask me to add them.

## 7. Commit, then the reveal

Close the install:

```bash
npx -y @ambient-ui/cli end
```

It writes `AMBIENTUI-NOTES.md` into the app: what was installed, every
decision the doctor made with its alternatives, your corrections and notes,
and anything verify could not prove. When the install left the happy path,
the file recommends the owner try the layer, then uninstall and reinstall
with the right options chosen on purpose. Then it lists every file the
install added or changed since `begin`, and writes
`.ambientui/manifest.json`. Show the person the list in one line
("41 files added, 6 changed, 7 packages added"), ask before committing,
and on a yes:

```bash
npx -y @ambient-ui/cli end --commit
```

That is ONE commit, marked `Ambientui-Install: 1`, and it is what makes the
install removable later.

Then the reveal. If the notes list judgement calls, say so first, in one
line, and point at `AMBIENTUI-NOTES.md`. Then do not describe the ambient
layer. Show it: tell the person the app is running, give them the URL, and
say the hotkey the plan chose:

> Press Cmd-K.

That keystroke opens the spotlight: search over their own product, with
the assistant behind it. Tell them to drag the orb to the right edge to
dock the panel, and to the top to get the palette. Then stop. The moment
belongs to them.

## 8. Removing it, when asked

The person can remove ambientui at any time, and should know that before
you finish. Tell them in one line during the handover. When they ask:

```bash
npx -y @ambient-ui/cli uninstall
```

It reverts the install commit (git is the mechanism: nothing is restored
from a copy), then lists anything added after it that still refers to the
layer, such as a page that sets its chip, for you to remove. Reinstall the
packages afterwards with the project's package manager.

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
