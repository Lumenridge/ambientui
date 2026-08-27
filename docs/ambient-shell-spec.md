# The ambient shell: a porting spec

This document is the complete behavior contract of the ambient layer,
written so an AI agent (or a person) in a different repository can rebuild
the shell faithfully without reading this repo's source. Everything here is
derived from the source, not from intention; file references point at where
each behavior lives.

Read it in order once. The single most important sentence: **the shell is
one assistant with one conversation state, changing geometry — never five
features.** Every porting mistake traces back to forgetting that.

---

## 1. The state model

One React context (`packages/ambient/src/assistant-context.tsx`) owns
everything. There is exactly one conversation, one mode, one orb state.

```ts
type AssistantMode = "line" | "panel" | "dock" | "spotlight" | "history"
type OrbAnchor = "tl" | "tc" | "tr" | "ml" | "mr" | "bl" | "bc" | "br"
type OrbState = "still" | "listening" | "thinking" | "answer"
```

- `mode` — which geometry is on screen. `"line"` covers two visual forms:
  the resting orb and the quick-ask pill (the orb's own expanded form).
  They are one mode because they are one object.
- `orbAnchor` — where the orb rests: eight positions on the window edges
  (corners, edge midpoints). Default `"bc"` (bottom center). The user can
  drag the orb anywhere; on release it snaps to the nearest anchor.
- `orbState` — the identity's mood, driven by the response pipeline, never
  set decoratively. It renders simultaneously in every body the identity
  has (section 8).
- Messages, queued instructions, attachments, and chips live in the
  Assistant component's state and survive every mode change. Switching
  geometry must never lose or reset the conversation.

### The context API a host talks to

| Member | What it does |
|---|---|
| `setPageChip(chip \| null)` | The page declares what it IS. Replaced on navigation or selection. One chip; kinds: `page · control · target · cell · file · symbol · selection`, plus an optional icon name when the kind is too coarse. |
| `setPageIntel(intel \| null)` | What the page knows: live `suggestions` (a healed problem leaves the list), `recents`, `jumps` + `onJump` (a page with its own workspace offers its files instead of app routes), `askPlaceholder`, and optional section labels. |
| `chips / addChip / removeChip` | Explicit user context (right-click → Add to context). De-duplicated by id. |
| `explain(chip)` | Right-click → Explain: attaches the chip AND opens the assistant with a seeded prompt about it. |
| `seedPrompt(text, autoSend?, immediate?)` | Hand a prompt to the next surface. `autoSend` asks it on arrival; `immediate` skips the thinking beat, for a surface that already showed one. Consumed exactly once via `consumeSeededPrompt / consumeAutoSend / consumeImmediate`. |
| `setCommands(cmds)` | Everything ⌘K can DO, registered by the app: `{id, section, label, desc?, keywords?, icon?, run}`. The layer renders and calls; it never learns what a command means. |
| `navItems` (provider prop) | Where the host can go, for "Jump to". The layer is TOLD, never imports a route table. `icon` is typed `unknown` on purpose: forwarded to the host's own Icon so no icon library leaks into the contract. |
| `navigate?(id)` | Wired by the app (provider `onNavigate`). |
| `announceEffect(effect)` | A settled answer announces a workspace effect; surfaces that own product state subscribe and decide what it means. The layer only relays. |

---

## 2. The six shapes and how each one works

### 2.1 Orb (rest)

A 52px character docked at the current anchor, wearing a glass-core shell.
Present, watching nothing, costing nothing. It is the only form with no
surface. Where every other mode returns to.

- Click → quick ask opens; the character turns to `listening`.
- Drag → moves freely; on release, snaps to the nearest of the 8 anchors.
  A drag that moved suppresses the click (no accidental open).

### 2.2 Quick ask (the orb's expanded form)

Clicking grows a 420px pill out of the character. They share the glass and
the live border: one object, not a popover next to a button.

- **Placement**: opening does not relocate the assistant. The pill centers
  on the anchor the orb is docked to, clamped into the content region so a
  corner anchor never pushes it off-screen. The orb keeps its side: docked
  right, it becomes the right end and the input extends leftward
  (`growsLeft`).
- **Contents**: the shimmer ghost (section 9) shows the page's first
  suggestion when the field is empty; Tab accepts it and sends. A history
  control sits BESIDE the pill, never inside it — the pill is one object,
  and a second control within it would make it two. The history button is
  sized to the orb (52px round) so the two round objects read as one kind
  of thing, and it clears past the pill's full width.
- **Closing**: clicking the orb again, clicking anywhere else, or Esc.
- **The handoff** (`orb.tsx → sendQuick`): asking holds the thinking HERE.
  The question stays where it was asked; `orbState` goes `thinking`; the
  character churns in place for ~1.1s. Then `seedPrompt(text, autoSend:
  true, immediate: true)` and `setMode("panel")`. The panel arrives already
  answering, without replaying a thinking beat the user has just watched.
  This is the single most characteristic behavior in the shell; port it
  exactly.

### 2.3 Panel (a conversation you keep)

A floating 420-wide glass window: header · transcript · composer footer.
The only mode that persists while you work.

**Header** (the drag handle IS the form switcher):
- The title is the SESSION'S SUBJECT — the first question asked — never a
  product name. It shimmers while the instruction it names is running.
- Hovering the header fades the title out and reveals a drag-dots glyph
  centered: the affordance appears where the hand already is.
- Controls (right side): `History` (→ history), `Minimize` (× → line).
  Deliberately only two: dock and spotlight are reached by DRAGGING, so the
  header does not duplicate them as buttons.

**Dragging the panel** (`assistant.tsx` ~255):
- Position clamps to `x ∈ [8, innerWidth − 200]`, `y ∈ [8, innerHeight − 80]`.
- Two hot zones, shown as translucent scrim overlays only while dragging:
  - **Dock zone**: `clientX > innerWidth − 140` (right edge strip).
  - **Spotlight zone**: `clientY < 180` AND within 320px of horizontal
    center (top-center area).
- Releasing inside a zone switches mode; releasing elsewhere just moves it.
- Implementation warning, learned the hard way: the current hot zone must
  live in a REF read at pointer-up. Re-subscribing listeners when the zone
  changes lets a release land between subscriptions and run a stale
  closure — an intermittent, unreproducible dead drop.

**Composer footer** (shared by panel and dock, `border-t` on glass-border):
1. **Context row**: an "Attach context" chip for the current page (its
   icon tile on the ambient accent wash; click pins/unpins the page as
   context), then the user's explicit chips (removable), then pasted
   attachments as compact chips — one horizontally scrolling row, because
   stacked attachments push the input off the surface.
2. **Message queue** (only while something is queued): the running
   instruction plus the stack behind it, each cancellable.
3. **The composer**: shimmer-ghost field, a `+` attach control, and the
   send control. Send is the round primary arrow; while an answer runs it
   becomes Stop; typing while busy turns send into QUEUE — the instruction
   stacks behind the running turn instead of interrupting it. Enter sends,
   Esc closes, a bulk paste becomes an attachment chip instead of text.

### 2.4 Dock (the panel, parked)

**The dock is not a second component.** Panel and dock render the SAME
surface element; only the container differs: `fixed top-2 right-2 bottom-2,
w-[420px], rounded-2xl` with a left shadow. Inset on the spacing grid and
rounded, because the dock is a surface the layer put there, not a pane
welded to the window edge. The host page reflows around it rather than
being covered.

- Enter: drag the panel into the right-edge zone.
- Leave: dragging the dock's header DETACHES it into a floating panel under
  the cursor, in the same gesture — grab, and it is a panel again, still
  dragging.
- Header and footer: identical to the panel (History, Minimize, same
  composer). Same conversation, obviously — it is the same element.

### 2.5 Spotlight (find or ask)

The command palette, centered and global, over a scrim.

- **Open/close**: ⌘K anywhere toggles it. From spotlight, ⌘K (and Esc)
  return to the PANEL if a conversation exists, otherwise to rest — the
  palette never discards a conversation by closing.
- **Esc is two-stage**: with a query typed, first Esc clears the query;
  second Esc closes.
- **One input, two jobs**: it searches the product AND asks the model. The
  list shows: an "Ask" row (using `pageIntel.askPlaceholder` when the page
  provided one), the page's live suggestions, recents, "Jump to" built
  from `pageIntel.jumps` (a page's own workspace) or the host's `navItems`,
  and every registered command grouped by its section. Enter runs the
  selection; asking transforms the palette IN PLACE into the answer view.
- **Answer view controls** (top-right, four): `History`, `Dock it`,
  `Open in chat window` (→ panel), `Back to search` (×) — which clears the
  conversation and returns to the palette list. Note the × here means
  "back", not "minimize"; the palette is the surface's rest state.

### 2.6 History (the record)

The only full-screen mode, because it is the only one not about a single
answer. It answers "what have I asked here?", and that question is the one
that legitimately wants the room.

- **Material**: translucent over the product (`ambient-scrim`, popover at
  82%, heavier blur) — the work underneath stays visible as ground,
  because it is the reason the record was opened. The identity's heat
  field runs at screen strength behind a heavy frost.
- **Header**: "History · N conversations", then `Open in chat window`,
  `Dock it`, `Close history` (×). The first two exist to KEEP the
  conversation while putting the record away.
- **The record**: composed from the sanctioned Sidebar primitive (a new
  mode is a new geometry, never new parts), grouped by day. The
  conversation currently on screen appears in the list too, marked open
  and shimmering while it runs — a record that omitted the session on
  screen would be the strangest possible omission.
- **Opening a row**: opens IN PLACE — the record is somewhere you can
  work, not a launcher that ejects you — and re-asks the question (a
  seeded prompt), which is what the layer can honestly offer rather than
  pretending to restore a transcript.
- **Closing goes all the way to rest** (`line`), by both the × and Esc.
  Dropping a full-screen surface into a floating panel would leave two
  things open when the user asked to put one away.

---

## 3. The transition map

| From | Gesture | To |
|---|---|---|
| Orb | click | Quick ask |
| Orb | drag + release | Orb (nearest anchor) |
| Quick ask | click orb / click outside / Esc | Orb |
| Quick ask | Enter (or Tab-accept) | thinking in place ~1.1s → Panel, already answering |
| Quick ask | history button beside the pill | History |
| Anywhere | ⌘K | Spotlight |
| Spotlight | ⌘K / Esc (empty query) | Panel if messages exist, else Orb |
| Spotlight | Esc (query typed) | Spotlight, query cleared |
| Spotlight | Enter on the Ask row | Spotlight answer view, in place |
| Spotlight answer | × (Back to search) | Spotlight list, conversation cleared |
| Spotlight answer | Open in chat window / Dock it / History | Panel / Dock / History |
| Panel | drag into right-edge zone (x > w−140) | Dock |
| Panel | drag into top-center zone (y < 180, ±320 of center) | Spotlight |
| Panel | History / Minimize | History / Orb |
| Dock | drag header | Panel, under the cursor, still dragging |
| Dock | History / Minimize | History / Orb |
| History | row click | History, the question re-asked in place |
| History | Open in chat window / Dock it | Panel / Dock |
| History | × / Esc | Orb (all the way to rest) |
| Anywhere | Esc (not covered above) | Panel if in spotlight with messages, else Orb |

---

## 4. The answer contract

Every response is a composed object of typed blocks, and **the order of
arrival is enforced by a stage queue, never by a block scheduling itself**
(`stage-queue.ts`, `use-staged-reveal.ts`):

1. Thinking (the reasoning panel, with elapsed time),
2. each evidence block as it lands (tool calls, searches, diffs,
   terminals, timelines — the vocabulary),
3. the prose (streamed at the runtime's `streamCharsPerSecond`),
4. artifacts and follow-up suggestions.

Only the NEWEST answer streams; settled answers render finished. History
is written, not replayed. Regenerating appends a branch — a pager under
the answer keeps every version reachable (`1 / 3`), and only the newest
branch streams. Message actions on a settled answer: copy, approve,
reject (mutually exclusive pair), regenerate.

The model seam: a `composeResponse` function produces the block objects. A
real model replaces that FUNCTION; nothing ever replaces the objects.

---

## 5. What the host must provide, and what has defaults

**Required** (the shell will not look right without them):
- The shadcn semantic roles on `:root`/`.dark` (`--primary`, `--popover`,
  `--border`, `--muted`, `--accent`, `--foreground`…). Every color in the
  layer derives from these. If the shell renders gray, the roles are
  missing, not the shell.
- The layer's stylesheet (`ambient.css`) imported once.
- `<AssistantProvider>` wrapping `<Assistant />`, mounted once, above the
  app's pages.

**Optional, with working defaults** — the layer renders with ZERO
providers because every value it needs flows through one interface,
`AmbientRuntime` (`ambient-runtime.tsx`): message presentation
(bubble/flat), stream pace, orb palette and per-state speeds, and the two
motion hooks. A host with a theming engine implements that interface; a
host without one gets the defaults. The hook never throws.

**Optional wiring, in order of value**: `navItems` + `onNavigate` (the
palette's Jump-to), `setPageChip` per page, `setPageIntel` for live
suggestions, `setCommands` for palette actions, right-click →
`explain`/`addChip` on things worth attaching.

**Dependency boundary**: the layer imports the UI package and npm — never
app code. Keep that rule in the port or the shell stops being liftable.

---

## 6. The icon inventory

Icons resolve through the host's semantic `<Icon name>` (drawn by whatever
library the host configured). Names the shell uses and what each means:

| Name | Where | Meaning |
|---|---|---|
| `history` | panel/dock header, beside quick ask, spotlight answer | open the record |
| `sidebar` | history + spotlight answer ("Dock it") | park it beside the work |
| `close` | context chips, queue rows, error dismiss | remove this one thing |
| `plus` | composer attach, "Attach context" chip | add context |
| `arrow-up` | composer send | send (round, primary) |
| `stop` | composer while busy | stop the running answer |
| `sparkles` | spotlight Ask row, reasoning affordances | this row talks to the model |
| `search` | spotlight input | the other half of its job |
| `check` / `alert` | tool results | succeeded / failed |
| `replay` | message actions, retries | regenerate / try again |
| `thumbs-down` (+ up) | message actions | the judgement pair, mutually exclusive |
| `chevron-left/right` | branch pager | move between versions |
| `arrow-up-right` | links out | leaves this surface |

Three glyphs are currently direct HugeIcons imports (grandfathered, fix on
touch): picture-in-picture ("Open in chat window"), cancel (every ×), and
the header drag-dots. In a port, map them into the semantic vocabulary
instead of copying the exception.

**One character per surface**: the orb mark appears ONLY where the user
speaks to the assistant — the resting orb, the quick-ask end, the composer
send, the spotlight search, History's open row. Never in headers, footers,
or chrome. The moment it appears in chrome it stops being a signal and
becomes a logo.

---

## 7. The material

One glass recipe for every AI surface — never a one-off blur:

| Token | Recipe | Used for |
|---|---|---|
| `--glass-fill` | popover 55% + blur(48px) saturate(1.5) | panel, dock, pill, spotlight body |
| `--glass-core` | popover 60% | orb / glyph shells |
| `--glass-border` | border 70% | hairlines on glass |
| `--glass-wash` | foreground 9% | neutral fills ON glass: selection, keycaps, the composer field |
| `--wash` / `--wash-strong` | accent 40% / 60% | quiet fills at rest / hover-active |
| `--scrim` | background 50% | drag-zone covers |
| `--glass-scrim` | popover 82%, blur ×1.6 | History's full-screen cover |
| `--glass-veil` family | popover 62/48/92% | frost between a heat field and content, at panel / stage / full-screen strength |
| `--positive-wash` / `--destructive-wash` | positive/destructive 12% | diff rows, run results |

All are derived from semantic roles (`color-mix`), so the host's theme
retints them. Do not bake the results.

**The live border**: active AI surfaces wear a conic comet sweeping the
perimeter on the ambient accent, keyed by `data-orb-state` — the orb's
states projected onto the surface's edge (listening, thinking, and answer
each pace it differently). CSS gotcha that cost a real bug: `-webkit-mask`
resets `mask-composite`; write the webkit pair first, then the standard
pair, or the ring becomes a full-surface fill. No glow effects anywhere —
the beam was removed deliberately; do not reintroduce one.

**The ghost** (`ShimmerPlaceholder`): every ambient input's placeholder —
a travelling accent highlight across the glyphs on a ~2.8s loop, rendered
as an overlay (a native placeholder cannot carry a background-clipped
gradient; the input keeps an `aria-label`). It shows only while the field
is empty, and it is BOUNDED BY THE FIELD: one line, ellipsized, never
wrapping. That bound is a scar, not a nicety — unbounded, a long
suggestion wrapped inside the 52px pill the day the type base changed.

**Motion**: components consume the four motion roles (micro / control /
surface / page), never literal durations. Springs for user-triggered
movement (they carry velocity), tweens for exits. The quick pill, panel
drag, and mode changes all ride the surface role.

---

## 8. The identity

One state machine, four states, several bodies rendering it at once: the
orb character (a shader at 52px, a cheap CSS twin at glyph size), the live
border comet, the surface's own background field, and the marks signing
each answer. The user sees one thing present in several places, never four
animations agreeing.

Cost rules: full fidelity only where the character is the subject; only
the LIVE instance is expensive (the newest answer wears the shader,
settled answers fall back to the twin). States: `still` at rest,
`listening` when a field opens, `thinking` while composing (set by the
quick handoff and the pipeline), `answer` as a one-shot bloom when prose
lands, then back to still.

---

## 9. Porting acceptance checklist

Port is done when every line below is true:

- [ ] Mounts with no providers and renders the resting orb in the host's colors.
- [ ] Orb drags anywhere and snaps to 8 anchors; a moved drag does not open quick ask.
- [ ] Quick ask opens centered on the orb's anchor, clamped on-screen, orb keeping its side; Tab accepts the page's suggestion.
- [ ] Sending from quick ask thinks in place (~1s) then hands to the panel already answering — no second thinking beat.
- [ ] Panel drags by its header; right-edge drop docks, top-center drop becomes spotlight; zones render only while dragging; fast flicks never dead-drop.
- [ ] Dock is the same conversation; dragging its header detaches to a panel under the cursor mid-gesture.
- [ ] ⌘K toggles spotlight from anywhere; Esc clears the query first; closing spotlight with messages lands on the panel, never discards.
- [ ] Spotlight answers in place; × there means back-to-search and clears.
- [ ] History covers the screen translucently, lists the running session marked open, re-asks on row click, and closes all the way to rest on × and Esc.
- [ ] Mode changes never lose messages, queue, chips, or attachments.
- [ ] Typing while busy queues instead of interrupting; queued items are cancellable.
- [ ] Answers arrive thinking → evidence → prose → artifacts; only the newest streams; regenerate appends a reachable branch.
- [ ] Every ghost is one line and ellipsizes; nothing wraps when the host's root font size changes.
- [ ] The orb mark appears only where the user speaks to the assistant.
- [ ] Changing the host's accent retints every surface, wash, and the live border with zero shell edits.
