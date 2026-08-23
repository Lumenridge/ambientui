# Porting the ambientui assistant layer to another repo

> **⚠️ This document is out of date and is being replaced.**
>
> It was written when the layer was four files and a 1,054-line `assistant.tsx`.
> It is now **17 files and 8,269 lines**, the `beam.tsx` it repeatedly references
> no longer exists, and the `@/components/app-sidebar` import it tells you to
> delete is not in the tree. The general shape of the procedure still holds;
> the specifics do not.
>
> It exists at all because there is no install mechanism. That is the thing
> being fixed: a shadcn registry replaces this file with one command. Until
> then, treat the steps below as orientation, not instructions, and read the
> real import surface from `apps/web/src/components/assistant/` directly.

This describes how to lift the assistant experience — floating AI orb, glass chat
panel/dock, and the ⌘K command palette — out of this repo and mount it on a
page in a **different** repo, reusing that repo's own shadcn tokens.

The layer is deliberately self-contained: **4 source files, 3 npm dependencies,
one CSS block, and exactly two couplings to the host app.** It renders as a fixed
overlay, so it does not care what the page underneath is built from.

---

## Step 0 — Interview first (do not write code yet)

If you are an agent running this guide, **stop and ask these questions before
touching the target repo.** Do not assume a mount point.

1. **Which repo, and where is it checked out?**
2. **Which page should this mount on?** Give a route (`/settings/billing`) or a
   component file (`src/routes/Dashboard.tsx`). This is the page the assistant
   will claim as its context.
   - Mounting globally instead (app root / layout) is also valid — ask which.
3. **What is the app's routing?** React Router / Next.js App Router / TanStack /
   plain state. This decides how the palette's "Jump to" list navigates.
4. **What should the palette be able to jump to?** A list of `{ id, label,
   description }` for that app's main destinations. Without it, the palette is
   search + AI only, which is a fine first cut.
5. **Does the target repo already use shadcn/ui?** If yes, we inherit its tokens
   and touch none of them. If no, see *Tokens* below — the layer needs six CSS
   variables that shadcn normally provides.
6. **Is there a real AI endpoint, or do we keep the mock?** The prototype ships a
   fake plan + canned answer. Keeping the mock first is recommended.
7. **Dark, light, or both?** The layer is written for both, but the beam looks
   best on dark surfaces.

Record the answers. Every "adapt" section below refers back to them.

---

## Step 1 — Prerequisites

Required in the target repo:

- **React 18+** (uses `useReducer`, `useMemo`, pointer events — nothing exotic)
- **Tailwind CSS v4** with the shadcn token layer, i.e. these CSS variables
  resolve: `--popover`, `--accent`, `--border`, `--muted-foreground`,
  `--foreground`, `--background`
- **A `cn()` helper** (`clsx` + `tailwind-merge`) — shadcn's `lib/utils`

Not required, despite what the source repo does: no `TooltipProvider`, no
sidebar, no shadcn component installs. The assistant imports exactly one thing
from the design system — `cn`.

---

## Step 2 — Dependencies

```bash
npm install border-beam @hugeicons/react @hugeicons/core-free-icons
```

- `border-beam` — the animated border used by preset beam variants
- `@hugeicons/*` — every icon in the layer

If the target repo already standardises on another icon set (lucide, phosphor),
swap them at port time rather than adding a second icon library; there are 16
icon references and they are all one-line replacements.

---

## Step 3 — Copy the files

From `apps/web/src/components/assistant/` copy all four:

| File | Lines | What it is |
|---|---|---|
| `assistant-context.tsx` | 199 | Provider: mode, context chips, beam config, navigation hook |
| `assistant.tsx` | 1054 | The surfaces — orb line, panel, dock, palette, answer mode |
| `beam.tsx` | 155 | Beam renderer — package variants + our custom two-colour beam |
| `orb.tsx` | 139 | The floating draggable orb with snap anchors |

Put them anywhere the app can import from (`src/components/assistant/` is fine).

---

## Step 4 — Tokens and keyframes

Copy this block into the target repo's global stylesheet. Everything else the
layer uses comes from the host's own shadcn tokens, so **the assistant will take
on the target app's colour scheme automatically.**

```css
/* Accent — point these at the target app's brand colour */
:root {
  --app-blue: #2563eb;
  --app-blue-wash: rgba(59, 130, 246, 0.1);
  --viz-good: #0ca30c; /* the "step done" tick in the plan block */
}
.dark {
  --app-blue: #4d9aff;
  --app-blue-wash: rgba(61, 130, 246, 0.16);
}

/* Custom beam: animatable angle + its keyframes */
@property --ambient-beam-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
@keyframes ambient-beam-spin {
  to { --ambient-beam-angle: 360deg; }
}
@keyframes ambient-beam-pulse {
  0%, 100% { opacity: calc(var(--ambient-beam-strength, 1) * 0.3); }
  50% { opacity: var(--ambient-beam-strength, 1); }
}
@keyframes ambient-beam-line {
  from { transform: translateX(-100%); }
  to { transform: translateX(350%); }
}

/* Shimmering placeholder in the palette input */
.ambient-shimmer {
  color: transparent;
  background: linear-gradient(
    100deg,
    var(--muted-foreground) 42%,
    var(--foreground) 50%,
    var(--muted-foreground) 58%
  );
  background-size: 250% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  animation: ambient-shimmer 2.8s linear infinite;
}
@keyframes ambient-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -50% 0; }
}
```

`--app-blue` is the one value worth changing per app: it drives the orb star, the
avatar, selected rows, context chips, and the "Ask AI" affordances.

---

## Step 5 — Decouple the nav list (required refactor)

In the source repo, `assistant.tsx` imports the app's nav directly:

```ts
import { sections } from "@/components/app-sidebar"   // ← delete this
```

Replace it with a provider prop so the layer carries no knowledge of the host.

**In `assistant-context.tsx`** — add to the state type, the provider props, and
the memo:

```ts
export type NavItem = {
  id: string
  label: string
  description?: string
  icon?: unknown // hugeicons IconSvgObject, or your icon type
}

// AssistantState
navItems: NavItem[]

// AssistantProvider props
{ children, onNavigate, navItems = [] }: {
  children: React.ReactNode
  onNavigate?: (id: string) => void
  navItems?: NavItem[]
}

// value memo
navItems,
```

**In `assistant.tsx`** — pull it from context and drop the import:

```ts
const { /* …existing… */ navItems } = useAssistant()
```

Then replace the three `sections` references (the `navItems(sections)` call, the
filtered search variant, and the `typeof sections` annotation) with the
context-provided `navItems`. If the answer to interview Q4 was "nothing yet",
pass `[]` and the palette simply shows recents, prompts, and Ask AI.

---

## Step 6 — Mount it on the chosen page

Two lines at the app root — the provider high enough to survive navigation, and
`<Assistant />` as the last child so it overlays everything:

```tsx
import { AssistantProvider } from "@/components/assistant/assistant-context"
import { Assistant } from "@/components/assistant/assistant"

<AssistantProvider
  navItems={APP_NAV}
  onNavigate={(id) => router.push(id)}   // adapt to the app's router
>
  {children}
  <Assistant />
</AssistantProvider>
```

Router adaptation for Q3:

- **React Router** — `const nav = useNavigate()` → `onNavigate={(id) => nav(id)}`
- **Next.js App Router** — `const router = useRouter()` → `router.push(id)`; the
  provider file needs `"use client"` at the top, as do the other three files
- **State-driven** (like the source repo) — `onNavigate={(id) => setActive(id)}`

### Telling the assistant what the page is

This is the part that makes it feel context-aware. On the page named in Q2:

```tsx
const { setPageChip } = useAssistant()

useEffect(() => {
  setPageChip({
    id: "page",
    kind: "page",
    label: `Billing · ${plan.name}`,   // whatever names this view + selection
  })
  return () => setPageChip(null)
}, [plan.name, setPageChip])
```

That label is what appears in the attached context chip in both the chat and the
palette. Re-run the effect whenever the page's selection changes so the chip
tracks it.

### Optional: per-element context

To reproduce the right-click and hover affordances on the target page's rows:

```tsx
const { explain, addChip } = useAssistant()

// hover pill or context menu item
explain({ id: `row-${row.id}`, kind: "control", label: row.name })
// → opens the chat with the row attached and "Explain {label}" pre-filled

addChip({ id: `row-${row.id}`, kind: "target", label: row.name })
// → attaches silently
```

`kind` only selects the chip's icon; extend the `chipKindIcon` map in
`assistant.tsx` for domain-appropriate icons.

---

## Step 7 — Adapt the content

Three constants at the top of `assistant.tsx` are placeholders and should be
rewritten for the target domain:

- `RECENT_CHATS` — mocked history; swap for real recents when available
- `SUGGESTED_PROMPTS` — the page-aware questions shown in the palette's
  "Suggested for this page" section and the chat's empty state
- `MOCK_ANSWER` / `MOCK_TABLE` / `PLAN` — the fake response

The `send()` function is where a real backend goes. Its shape already matches a
streaming agent: push the user message, emit plan steps as they arrive, then
append the assistant message. Replace the `setTimeout` chain with the real
stream and the UI needs no other change.

`looksLikeQuestion()` decides when the palette flips from search into AI mode
(ends with `?`, ≥4 words, or starts with a question word). Tune or replace with a
real intent call.

---

## Step 8 — Optional: the beam config page

`beam-lab.tsx` plus the `/__beam-config` Vite middleware in `vite.config.ts` let
you tune the beam live and persist it. **Skip both when porting** — the layer
falls back to `defaultBeamConfig` and works fine. Port them only if the target
app wants the same tuning surface; the endpoint is Vite-specific and would need
rewriting for Next.js.

---

## Verification checklist

Run through these in the target app:

- [ ] Orb appears bottom-centre; drags and snaps to the 8 edge anchors
- [ ] Clicking the orb opens the chat panel
- [ ] ⌘K opens the palette; ⌘K again closes it
- [ ] ↑/↓ move selection, Enter runs it, Esc clears the query then closes
- [ ] Typing a question (≥4 words or `?`) flips to AI mode — avatar and shell
      beam activate
- [ ] The context chip names the page from Q2, and its ✕ detaches it
- [ ] Dragging the chat header shows the snap zones; dropping right docks it
- [ ] Dragging the dock's header tears it back into a floating panel
- [ ] Both light and dark render correctly (the layer uses host tokens, so a
      wrong `--app-blue` is usually the culprit)

## Known gotchas

- **Radius**: the source repo runs `--radius: 0.25rem`. The layer uses
  `rounded-lg` / `rounded-xl`, which derive from the host's radius — expect
  softer corners in an app with a larger radius. That is correct behaviour.
- **`overflow-hidden` clips shadows**: the panel's floating shadow lives on the
  *outer* wrapper, not the glass surface. Keep it there.
- **Beam intensity**: the palette shell passes `{...beam, size: "md"}`. It was
  deliberately reverted from a stronger variant — leave it unless asked.
- **Drag state in refs**: pointer handlers read drag state from refs, not
  closures. Fast flicks broke when it was state. Keep the refs.
