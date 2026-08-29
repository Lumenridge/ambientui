/**
 * THE COMPONENT CATALOG — what every documented component IS, in prose.
 *
 * Serializable by construction: strings and string arrays, no React, no
 * imports beyond its own type. That is what lets a static page, a Node
 * script and the registry build all read ONE source — the registry derives
 * installable items from this file (scripts/extract-catalog.mjs), so a
 * component reaches the registry BECAUSE it is documented (CLAUDE.md rule
 * 10, made mechanical).
 *
 * Its other half is stories.tsx, which holds the live JSX keyed by the same
 * ids. entries.ts joins them for /ds. Splitting them means a page can render
 * what a component is without importing framer-motion, the shader and the
 * whole ambient kit to do it — and a broken playground costs a demo, not a
 * page.
 */

export type ComponentDoc = {
  id: string
  name: string
  /** Section heading in the /ds rail; entries without one lead the list. */
  group?: string
  description: string
  behavior: string[]
  whenToUse: string[]
  whenNotToUse: string[]
}

export const SHADCN_DEFAULT_COMPONENTS: ComponentDoc[] = [
  {
    id: "badge",
    name: "Badge",
    description: "Compact status and metadata labels.",
    behavior: [
      "Variants: default, secondary, outline, destructive.",
      "Renders as a span; passes through to a link with asChild.",
      "Size is fixed — badges never grow with their container.",
    ],
    whenToUse: [
      "Status of an entity: active, pending, at risk, out of stock.",
      "Counts and short classifications inside tables and cards.",
    ],
    whenNotToUse: [
      "Interactive filtering — badges are not buttons.",
      "Long text — badges hold one or two words.",
      "Status colors outside the variant set — semantics come from variants, never custom colors.",
    ],
  },
  {
    id: "button",
    name: "Button",
    description: "The primitive for every explicit user action.",
    behavior: [
      "Variants: default, secondary, outline, ghost, destructive, link.",
      "Sizes: xs, sm, default, lg, plus icon sizes (icon-xs → icon-lg).",
      "Disabled buttons keep their variant but drop interactivity and dim.",
      "asChild renders any element (e.g. a link) with button styling.",
    ],
    whenToUse: [
      "Triggering an action: submit, save, open, confirm, create.",
      "One primary action per view; everything else is secondary, outline, or ghost.",
      "Destructive variant for irreversible actions, paired with a confirm step.",
    ],
    whenNotToUse: [
      "Navigation presented as content — use a plain link.",
      "Toggling a persistent setting — use Checkbox.",
    ],
  },
  {
    id: "card",
    name: "Card",
    description: "The basic grouping surface for related content.",
    behavior: [
      "Slots: CardHeader (title, description, action), CardContent, CardFooter.",
      "Radius, border, and background come from theme tokens.",
      "CardAction places a control in the header's top-right corner.",
    ],
    whenToUse: [
      "Grouping a coherent unit: a KPI, a settings section, an entity summary.",
      "As the container for composed/generated interface blocks.",
    ],
    whenNotToUse: [
      "Nesting cards inside cards — flatten instead.",
      "Full-page layout — cards group content, they don't structure pages.",
    ],
  },
  {
    id: "checkbox",
    name: "Checkbox",
    description: "Independent on/off choices, often several at once.",
    behavior: [
      "States: checked, unchecked, indeterminate (for select-all), disabled.",
      "Controlled via checked/onCheckedChange or uncontrolled via defaultChecked.",
      "Clicking the wrapping label toggles it.",
    ],
    whenToUse: [
      "Multi-select lists, agreements, row selection in tables.",
      "Choices that are submitted with a form rather than applied instantly.",
    ],
    whenNotToUse: [
      "Immediate setting toggles — this preset has no Switch yet; prefer a labeled checkbox until one is installed.",
      "Mutually exclusive choices — use a single-select pattern.",
    ],
  },
  {
    id: "collapsible",
    name: "Collapsible",
    description:
      "A region that folds behind its trigger — disclosure as a primitive, not a re-implementation.",
    behavior: [
      "Radix underneath: the trigger carries aria-expanded and data-state, keyboard works, and the content unmounts collapsed.",
      "Controlled or uncontrolled — pass `open` to force it (the /ds rail holds groups open while a search is live), `defaultOpen` otherwise.",
      "Style the disclosure chevron off data-state (`group-data-[state=open]/collapsible:rotate-90`) rather than tracking your own boolean.",
    ],
    whenToUse: [
      "Long indexes and secondary detail — anything worth hiding until asked for (the /ds rail's kit groups).",
      "As the fold inside other components: sidebar groups, tool-call disclosures could migrate here.",
    ],
    whenNotToUse: [
      "For a set of peer panels where one is always open — that is Tabs.",
      "To hide required content; collapsed must never mean missing.",
    ],
  },
  {
    id: "dropdown-menu",
    name: "DropdownMenu",
    description: "Contextual actions behind a trigger.",
    behavior: [
      "Opens on trigger click; closes on selection, outside click, or Esc.",
      "Supports labels, separators, groups, checkbox/radio items, and submenus.",
      "Item variant \"destructive\" styles irreversible actions.",
      "Fully keyboard navigable (arrows, type-ahead, Enter).",
    ],
    whenToUse: [
      "Row actions, overflow menus, per-entity operations.",
      "Grouping 3+ actions that don't deserve individual buttons.",
    ],
    whenNotToUse: [
      "Choosing a form value — a menu is for actions, not selection state.",
      "One or two actions — show them as buttons instead.",
    ],
  },
  {
    id: "input",
    name: "Input",
    description: "Single-line text entry.",
    behavior: [
      "Standard text input with theme-token styling for focus, invalid, and disabled states.",
      "aria-invalid switches the ring and border to the destructive tokens.",
      "Sizing is controlled by the surrounding layout, not the component.",
    ],
    whenToUse: [
      "Free-form single-line values: names, emails, search queries.",
      "Always paired with a visible label, or an aria-label for search fields.",
    ],
    whenNotToUse: [
      "Choosing from known options — use a selection control.",
      "Multi-line text — this preset has no Textarea installed yet.",
    ],
  },
  {
    id: "section-rail",
    name: "SectionRail",
    description:
      "Right-edge dash rail for jumping between page sections — an ambientui extension to the product vocabulary (promoted via the watchlist).",
    behavior: [
      "One dash per section; the active section's dash grows and shows its label. Others reveal labels on hover.",
      "Clicking a dash smooth-scrolls its section into view (native smooth scroll; sections carry scroll-mt).",
      "Active tracking follows the nearest scroll container — works inside the /ds inset card or the window.",
      "Motion rides the control role (CSS transitions on --motion-control / --motion-ease).",
      "Fixed to the right edge by default; pass className to reposition (the story renders it static).",
    ],
    whenToUse: [
      "Long single-column settings or document pages with 4+ named sections (the Foundation page).",
      "When the reader needs a sense of place plus one-click jumps without a full sidebar.",
    ],
    whenNotToUse: [
      "Pages that already have a navigation rail for their sections — one wayfinding system per page.",
      "Fewer than three sections — a rail for two items is noise.",
    ],
  },
  {
    id: "view-menu",
    name: "ViewMenu",
    description:
      "The app's destinations as a segmented pill — every view visible as an icon, the current one expanded to wear its name (an ambientui extension to the product vocabulary).",
    behavior: [
      "One pill of segments, one per destination. The segment you are ON is expanded: icon plus label. Every other collapses to its icon in a circle, so the whole set of places stays one glance and one click away without spending label-width on views you are not in.",
      "SELECTING IS EXPANDING, as one continuous move: the old label folds out, the new one grows in, and every neighbor slides to make room — pill and segments all carry layout animation on the surface spring (opacity on micro, the standard pair), so a state switch reads as the pill changing shape, never as a cut.",
      "This replaced the disclosure form (pill + drop-down list). The disclosure hid the destinations behind a burger to save room, but with a handful of views the icons cost almost nothing, and a menu that must be opened to be seen makes every switch two clicks.",
      "Collapsed segments carry a real Tooltip, not a native `title` — the name of an icon-only control is not optional. The expanded segment carries none, because it is wearing its name.",
      "The current view is marked aria-current=\"page\"; collapsed segments carry their label as aria-label, so the control reads the same to a screen reader in both states.",
      "HOME LEADS, when the app gives it one and home is not already a view. It renders as a leading icon segment: a way back is not one destination among others. The component is TOLD where home is (`home={{ label, onSelect }}`); omit the prop when home is one of the views — the same destination twice is a trap.",
      "It carries no character mark. The assistant's identity belongs to the assistant; a navigation control wearing it says the wrong thing about what it does.",
      "It is the pointer twin of the spotlight's \"Jump to\" — same destinations, reached by hand rather than ⌘K. They read the same list, so they cannot disagree.",
      "The pill wears the popover ground, not the ambient glass: it is product chrome, and only the assistant's surfaces wear the ambient material (DESIGN.md §8).",
      "APPEARANCE RIDES AT THE TRAILING EDGE in the same circle treatment, naming the step it takes. It is the one control here that is not a destination — always one press away, never expanded, so it cannot be mistaken for somewhere to be.",
    ],
    whenToUse: [
      "Switching between a small set of top-level views on a surface where permanent chrome would compete with the content.",
    ],
    whenNotToUse: [
      "Tabbed panes INSIDE a page — that is Tabs, and the relationship there is between siblings, not destinations.",
      "More than a handful of destinations, or anything needing search — that is the spotlight.",
      "As a home for settings. Appearance earns its place because it is reached without meaning to go anywhere; a second one would turn a row of destinations into a menu bar.",
    ],
  },
  {
    id: "save-reminder",
    name: "SaveReminder",
    description:
      "A save bar that rises from the bottom only while there are unsaved changes — the settings-kit's save affordance (promoted via the watchlist).",
    behavior: [
      "Hidden when everything is stored — the page carries no save chrome at rest.",
      "While open: message + Save + optional Discard. `saved` swaps the actions for a brief confirmation before it slides away.",
      "Enters on the configured character's spring, exits with a quick micro fade (AnimatePresence).",
      "Fixed bottom-center by default; pass className to reposition (the story renders it static).",
    ],
    whenToUse: [
      "Pages with explicit save semantics where edits apply live but persist on save (the Foundation page).",
      "Any form where forgetting to save loses work on reload.",
    ],
    whenNotToUse: [
      "Autosaving surfaces — a reminder for something already saved erodes trust.",
      "Modal flows with their own confirm/cancel footer.",
    ],
  },
  {
    id: "sonner",
    name: "Sonner",
    description:
      "Toast notifications — transient feedback after an action completes (saves, syncs, errors).",
    behavior: [
      "One <Toaster> outlet at the app root, themed by the appearance and dressed in the popover role (surface, text, border, radius all follow the role map).",
      "Fire with toast(\"Title\") or toast(title, { description }); variants: toast.success / toast.error / toast.promise.",
      "Toasts self-dismiss; they never require interaction and never block the page.",
      "The system's save-feedback pattern: SaveReminder dismisses on save, the toast confirms it.",
    ],
    whenToUse: [
      "Confirming a completed action the user shouldn't have to watch for — Save Theme, a finished sync.",
      "Non-blocking errors where the page state already shows the recovery path.",
    ],
    whenNotToUse: [
      "Anything requiring a decision — use a dialog-pattern surface (Sheet) instead.",
      "Persistent states (unsaved changes) — that's SaveReminder's job; a toast disappears.",
    ],
  },
  {
    id: "separator",
    name: "Separator",
    description: "Visual divider between content regions.",
    behavior: [
      "Horizontal by default; orientation=\"vertical\" for inline dividers.",
      "Purely presentational — hidden from the accessibility tree.",
    ],
    whenToUse: ["Separating sections where spacing alone is ambiguous."],
    whenNotToUse: ["Everywhere — prefer whitespace first."],
  },
  {
    id: "sheet",
    name: "Sheet",
    description: "A panel that slides in from the edge of the screen.",
    behavior: [
      "Slides from right by default; side prop accepts top/right/bottom/left.",
      "Modal: traps focus, dims the page, closes on Esc or overlay click.",
      "Slots mirror Dialog: header, title, description, footer, close.",
    ],
    whenToUse: [
      "Side tasks that keep page context visible: details, quick edit, filters.",
    ],
    whenNotToUse: [
      "Short confirmations — a sheet is too heavy; keep those inline.",
      "Primary navigation — that's the Sidebar's job.",
    ],
  },
  {
    id: "sidebar",
    name: "Sidebar",
    description:
      "The app-shell navigation rail. Structural — the real thing wraps the whole app.",
    behavior: [
      "Wraps the app in SidebarProvider; SidebarInset holds the page.",
      "Collapsible modes: offcanvas, icon, or none (static).",
      "Composed from SidebarHeader/Content/Group/Menu building blocks.",
      "State persists via cookie; ⌘B toggles it by default.",
    ],
    whenToUse: ["Primary app navigation — one per application."],
    whenNotToUse: [
      "Side content panels — use Sheet.",
      "Anything inside a page — it is an app-shell frame, not a page component.",
    ],
  },
  {
    id: "skeleton",
    name: "Skeleton",
    description: "Placeholder shape while content loads.",
    behavior: [
      "A pulsing block; shape and size come entirely from className.",
      "Mirrors the final layout so nothing jumps when content arrives.",
    ],
    whenToUse: ["Any async region with a predictable layout."],
    whenNotToUse: ["Unknown-shape content — indicate loading in context instead."],
  },
  {
    id: "table",
    name: "Table",
    description: "Rows of structured, comparable records.",
    behavior: [
      "Semantic table elements with theme styling; horizontal scroll on overflow.",
      "Rows highlight on hover and support a selected state.",
      "Numeric columns right-align; status renders as Badge.",
    ],
    whenToUse: [
      "Entity lists: components, deals, users — anything scannable by column.",
    ],
    whenNotToUse: [
      "Single records — use Card.",
      "Heterogeneous content — use a list of cards.",
    ],
  },
  {
    id: "tabs",
    name: "Tabs",
    description:
      "Peer views of one subject, switched in place — the panel changes, the page does not.",
    behavior: [
      "Radix underneath: roving focus, arrow-key navigation, and the right ARIA wiring come free. Never rebuild a tab strip from buttons.",
      "Two shapes — the default pill list for a self-contained control, and `line` for tabs that sit against a page edge.",
      "orientation=\"vertical\" turns the list into a rail; the same component, no second implementation.",
      "The tab is component state by default. Anything a user might link to or reload into should be driven from the URL instead (the home page does this with ?view=).",
    ],
    whenToUse: [
      "Peer views of ONE subject, where switching should not feel like navigating.",
      "Three to five destinations. Beyond that the list becomes a menu that happens to be horizontal.",
    ],
    whenNotToUse: [
      "For steps in a sequence — tabs claim the views are independent and equal.",
      "As primary navigation between unrelated sections; that is the app's own nav.",
      "To hide content the user must see, since only one panel is ever visible.",
    ],
  },
  {
    id: "tooltip",
    name: "Tooltip",
    description: "Hover hint naming or explaining a control.",
    behavior: [
      "Appears on hover/focus after a short delay; never traps the pointer.",
      "Positioned by side/align props with collision handling.",
      "Requires a TooltipProvider ancestor (mounted once at the app root).",
    ],
    whenToUse: ["Icon-only buttons, truncated values, shortcut hints."],
    whenNotToUse: [
      "Interactive content — tooltips are read-only.",
      "Essential information users must see — it must live on the page.",
    ],
  },
]

export const AMBIENT_COMPONENTS: ComponentDoc[] = [
  {
    id: "orb-character",
    name: "OrbCharacter",
    description:
      "The assistant's animated identity — an iridescent sphere whose palette derives from the theme accent, with four states covering the AI's lifecycle.",
    behavior: [
      "still — at rest with its own movement: counter-rotating swirls and a gentle breathe. Present, not demanding.",
      "listening — digesting what the user said: swirls quiet down and a soft ring repeatedly draws inward.",
      "thinking — retrieving and reasoning: fast, saturated counter-rotating churn.",
      "answer — \"found it\": one bright ring lands with a flash, then the swirls settle into a slow, confident glide. The flash replays on re-entering the state.",
      "Palette derives from --app-blue (the accent bridge) — the character re-tints with the Foundation accent, zero configuration.",
      "Rendered by the system's one sanctioned shader surface — the Paper Design heatmap shader wrapped around a circle: thermal energy flowing around the orb's edge, over a frosted-glass wrapper (--ambient-blur).",
      "Each state moves differently, not just faster: still breathes a balanced rim glow; listening draws the heat inward; thinking runs hot — high contour, grain, racing flow; answer blooms outward once and settles.",
      "State changes are transitions, never cuts — per-state weights and tempo ease continuously (~0.5s).",
      "Every state has its own configurable cadence (speed.still/listening/thinking/answer), persisted with the theme.",
      "Palette is accent-linked by default (a thermal ramp derived from the accent); uncheck accent-linked to set custom colors — they become the heat ramp, cold to hot (up to four, add/remove).",
      "State is driven through the assistant context (orbState) — the response pipeline sets it, components read it.",
      "THE PIPELINE OWNS IT WHILE A TURN IS RUNNING. thinking holds until the prose actually starts — not until the answer was composed, because the evidence blocks still have to run — then answer, then still on settle. Ambient input states (listening / still) only apply between turns; typing cannot cancel a thinking state mid-run.",
    ],
    whenToUse: [
      "As the assistant's face — the floating orb is this character at 52px.",
      "Anywhere the AI's lifecycle needs to be visible: avatars, processing surfaces.",
    ],
    whenNotToUse: [
      "As decoration on pages where no AI is present — the character means the AI is here.",
      "ONE CHARACTER PER SURFACE, in the row you speak to it: the composer mark, the quick-ask pill, and the resting orb. Not headers, not footers, not navigation. A shell that stamps the character on every bar is signing itself once per component, and the mark stops meaning \"the assistant is listening here\" and starts meaning \"logo\".",
    ],
  },
  {
    id: "streaming-text",
    name: "StreamingText",
    description:
      "Text that arrives rather than appears — the assistant writing, with a warm tail and a blurred leading edge.",
    behavior: [
      "Three zones travel with the write head: settled text in the foreground, a warm tail in the ambient accent, and a blurred edge behind a fading mask.",
      "The reveal runs on the FRAME CLOCK and derives the write head from ELAPSED TIME rather than by counting ticks. A hidden tab pauses the frame loop either way; what this buys is the recovery — coming back, the head is where the clock says it should be, not wherever a throttled timer had counted to.",
      "charsPerSecond sets the pace; the default reads as deliberate writing rather than a printer.",
      "live={false} renders the whole string settled, so a re-rendered older message never re-types itself — history is written, not replayed.",
      "A finished message RECORDS that it finished, so live={false} survives the surface changing. Dragging panel → dock remounts the transcript; without the record, position alone would say \"newest message\" and the answer would perform itself again.",
      "onSettled fires shortly after the last character, which is what returns the ambient layer to rest.",
      "Purely presentational: the characters are already in the DOM, so selection and copy give the full text at any point.",
    ],
    whenToUse: [
      "Any assistant text that is genuinely being produced as you watch.",
      "When the pace of arrival is information — a slow answer should look slow.",
    ],
    whenNotToUse: [
      "Text that is already known — faking a stream is a lie about latency.",
      "Long documents or code; use a settled block and show progress elsewhere.",
      "Product copy of any kind: this treatment says an assistant is writing.",
    ],
  },
  {
    id: "message-branches",
    name: "MessageBranches",
    description:
      "Regenerated versions of the same answer, navigable without losing your place.",
    behavior: [
      "Wired into the real transcript: MessageActions' regenerate composes the same question again and APPENDS the result, so the assistant's own answers branch exactly as this component describes.",
      "A regenerated answer does not replace its predecessor — it joins it, and the newest becomes the one you are looking at.",
      "The pager sits under the answer it belongs to, so a branch reads as a version of THIS reply rather than as a new turn.",
      "Quiet by design: ghost controls and a monospaced count, because this is navigation, not content. It hides entirely at one version.",
      "Only a freshly generated branch streams; stepping back to one you have already read shows it settled — history is written, not replayed.",
      "Arrows disable at the ends rather than wrapping, so the extent of the set is felt.",
    ],
    whenToUse: [
      "Wherever regeneration is offered — the alternative is silently destroying an answer the user might have preferred.",
      "When comparing phrasings or approaches matters more than the latest attempt.",
    ],
    whenNotToUse: [
      "Across different questions; branches are versions of one answer, not a history.",
      "For editing a sent message — that is a different object, with its own consequence disclosure.",
    ],
  },
  {
    id: "message-pair",
    name: "MessagePair",
    description:
      "The unit of a conversation: one question and the answer it produced, presented together.",
    behavior: [
      "Pairing is what makes a transcript readable — an undifferentiated list of messages is a log, not a conversation.",
      "Two presentations, one anatomy: BUBBLE gives each side a surface (the question on the accent wash, the answer on an inset card); FLAT sets both directly on the transcript, separated by alignment and tone alone.",
      "The answer streams in place: settled text in the foreground, the last words warm in the ambient accent, and the leading edge blurred behind a fading mask — a stream reads as writing rather than as text appearing.",
      "NO AUTHOR MARK on the answer: the identity lives in the shell — the orb, the live border, the surface's own brand mark — so a message never signs itself. Alignment alone says who is speaking.",
      "onSettled fires when the answer finishes, which is what returns the ambient layer (orb, borders, field) to rest.",
    ],
    whenToUse: [
      "Any assistant exchange in a conversation surface — panel, dock, or the spotlight's AI Overview.",
      "When the question needs to stay visible next to its answer, which is nearly always.",
    ],
    whenNotToUse: [
      "A one-shot answer with no question worth showing — render the answer alone.",
      "System notices or confirmations; those are toasts or an error object.",
    ],
  },
  {
    id: "reference-chips",
    name: "ReferenceChips",
    description:
      "Numbered provenance chips under an answer — what the assistant grounded its reply in.",
    behavior: [
      "Numbered in order: the page context first, then attached chips, then the kit's own sources. The number is the citation's identity in the text, so it always shows.",
      "ONE anatomy with an optional mark slot — number · mark · label — not a set of variants, so a row mixing a web source, an internal document, and an unmarked reference still reads as one list.",
      "The mark has a fixed precedence: the source's own logo, else a typed icon, else nothing. A logo that fails to load falls back to a monogram, so a dead image never leaves a hole.",
      "A logo is DATA the caller supplies — the system never invents or fetches one. Icons come from the Foundation's configured library like everywhere else.",
      "A reference with an href is a link, opens in a new tab, and says so on hover; without one it stays inert text.",
      "Renders nothing when there are no references — grounding is never implied by an empty row.",
      "Sits on the neutral glass wash (--glass-wash) so it reads as part of the answer object.",
    ],
    whenToUse: [
      "Under any composed answer that used page context or attached items.",
      "For citations — give web sources their logo and internal ones a typed icon, so provenance is recognizable before it is read.",
      "When the user needs to audit what the assistant saw — the governance habit applied to answers.",
    ],
    whenNotToUse: [
      "As navigation through the product — a reference opens its source, it is not a menu.",
      "For attaching context, which is the AI form's ContextRow.",
      "To dress up an unsourced claim: a mark makes a reference look authoritative, so never add one the answer did not actually use.",
    ],
  },
  {
    id: "shimmer-placeholder",
    name: "ShimmerPlaceholder",
    description:
      "The placeholder every AI form wears — text with a highlight travelling through it, the ambient layer's way of saying the assistant is listening before anything is typed.",
    behavior: [
      "A light band sweeps the glyphs on a 2.8s loop (ambient-shimmer in theme.css), built from a gradient clipped to the text — the letters are the mask, so nothing sits on top of them.",
      "Rendered as an overlay, not the input's own placeholder attribute: a real placeholder cannot carry a background-clipped gradient. The input keeps an aria-label, so screen readers still announce it.",
      "Shown only while the field is empty; it disappears the moment the first character lands, so it never competes with what the user is writing.",
      "The travelling highlight is the ambient accent (--app-blue), blended into the foreground on its shoulders, with secondary text as the resting tone — so the placeholder carries the assistant's own colour and re-tints when the Foundation accent changes.",
      "Every ambient form uses it — the palette's search, the panel and dock follow-ups, and the quick ask pill — which is what makes an AI input recognisable as one.",
    ],
    whenToUse: [
      "Any input that talks to the assistant, in any form factor.",
      "When a field should feel awake before it is used — the shimmer is presence, not decoration.",
    ],
    whenNotToUse: [
      "Product inputs (settings, forms, filters) — a shimmering placeholder there claims an AI is listening when none is.",
      "Fields that already have a value, or read-only text; motion on stable content is noise.",
      "As a loading indicator — the orb's states carry progress, this only carries availability.",
    ],
  },
  {
    id: "context-chip",
    // the concept and the export it actually is — the sibling convention,
    // so what you read and what you import are both on the page
name: "ContextChip · ContextChipView",
    description:
      "One attached thing the assistant can see — the chip that makes context visible instead of implied.",
    behavior: [
      "ONE anatomy everywhere: an icon tile typed by what was attached, the label, and a squared remove control. Two sizes only — default where the composer has a row of its own, compact where chips share the input's line — and a surface picks the size, never the look.",
      "The tile is typed by KIND: page → document, control → sliders, target and cell → layers, file and symbol → code, selection → type. Names from the icon vocabulary, so chips redraw with the Foundation's configured library like everything else.",
      "A chip may override that with its own `icon`. Every page is kind \"page\", which is too coarse to tell an editor from a colour map from an essay, and the page is the only thing that knows which — so /ds sends the icon of the rail row you are standing on, and the dev tool sends `code`.",
      "SPARKLES IS NEVER A CHIP ICON. In this system that mark means the assistant — its character, AskAI, the follow-up heading — and a chip is what the assistant can SEE, not the assistant. It was the page kind's icon and the component page's icon until both were caught; an icon is a word, and lending the assistant's word to a page costs that word its precision.",
      "The page's own chip arrives automatically (setPageChip); anything else is something the user attached by right-clicking an element.",
      "Every chip carries a remove control, because everything here is a decision that can be undone — including keeping the page attached.",
      "Truncates rather than wraps: a chip names its source, it does not quote it.",
      "Chips ride every AI form factor, so what the assistant can see is the same wherever you ask from.",
      "ONE ROW ABOVE THE INPUT, and everything the question is about rides in it — the page chip, attached chips, and staged attachments, in a single ChipSlider that pages with arrows. Context and attachments were two stacked rows, which read as two different kinds of thing and cost twice the height above the smallest part of the surface. They are one kind of thing: material the answer will rest on.",
      "It SCROLLS rather than wraps. Wrapping grew the composer upward as context accumulated, pushing the transcript around while the user was still writing; one scrolling row costs the same height whether it holds one chip or nine.",
      "Removing one takes it out of the next question's grounding, and the answer's references will show the difference.",
    ],
    whenToUse: [
      "Above any AI input, to show what the answer will be grounded in before it is asked.",
      "Whenever the assistant gains access to something new mid-conversation.",
    ],
    whenNotToUse: [
      "For filters or tags in product UI — this pill claims 'the assistant can see this', which is a specific promise.",
      "For results or citations after an answer — that is ReferenceChips.",
    ],
  },
  {
    id: "command-palette",
    name: "CommandPalette",
    description:
      "The assistant's spotlight mode: one input that both searches the product and asks the AI, over a glass surface with the ambient identity in its edge and background.",
    behavior: [
      "⌘K opens it from anywhere and toggles it closed; Esc clears the query first, then closes — so a mistyped search never costs the surface.",
      "One input, two intents: the query is read as a QUESTION (4+ words, a leading interrogative, or a trailing ?) or as navigation. Questions put \"Ask ambientui\" first; anything else ranks matching pages.",
      "Sections are a flat, keyboard-navigable model — Recent chats, Suggested for this page, Jump to — with ↑↓ moving across section boundaries and ↵ running the selected row.",
      "WHAT IT CAN DO IS REGISTERED BY THE APP (see CommandRegistry): components, documentation, demos and the assistant's own form factors, each with a `run` the palette calls without knowing what it means. That is the context-chip contract pointed the other way — a surface hands the layer a chip, the app hands it a command — and it is why the palette can reach a product the layer knows nothing about. The lists are DERIVED from the registry that documents them, so a command for something that does not exist is impossible to write.",
      "Matches are CAPPED PER SECTION, not overall: one cap across the whole list let the first family spend the entire budget, so forty components matching \"panel\" pushed Switch form off the end — the one command the word most obviously meant was the one you could not reach.",
      "AT REST IT SAYS WHAT IT CAN DO. Switch form shows in full because five rows are small enough and always relevant; the big families are advertised by a counted hint (\"50 components, 10 documents, 5 demos\") derived from what is actually registered. A capability nobody can see is one that does not exist as far as the user is concerned — and a hint written by hand would outlive the family it describes.",
      "WHAT IT OFFERS COMES FROM THE PAGE. setPageIntel supplies the suggestions, the recents, where \"Jump to\" goes, and the input's own invitation; pages that stay quiet get the app-wide defaults. The dev tool publishes its LIVE problem inventory there, so every suggestion is a question one of its errors deserves — and a problem that gets fixed leaves the palette, because the list is derived from workspace state rather than written twice.",
      "A page with its own workspace takes over \"Jump to\" entirely: inside the dev tool it lists open files, each subtitled with its actual problem, instead of the app's routes.",
      "The page's own context rides along as a chip in the header band; right-clicking anything on the page attaches it as another chip.",
      "A chip may carry its own `icon`: every page is kind \"page\", which is too coarse to tell an editor from a colour map, and the page is the only thing that knows which. Omitted, the kind's icon stands in. Sparkles is never one of them — in this system that mark means the assistant, and a chip is what the assistant can SEE, not the assistant itself.",
      "Asking transitions the surface in place into the AI Overview — the answer arrives where the question was asked, with a follow-up form replacing the search input.",
      "A glass-tinted scrim dims the product behind it — the scrim token with a whisper of backdrop blur — so the palette reads as the hero of the moment while the page stays legible through the veil.",
      "Ambient state is live: typing a question turns the layer to listening before send; the border and background field follow.",
      "Selection and keycaps use the neutral glass wash, not the accent — on glass, accent marks actions, not focus position.",
      "Dragging the floating panel to the top-center zone becomes this mode; dragging out of it returns to a panel.",
    ],
    whenToUse: [
      "The product's primary entry point for both finding and asking — one keystroke from anywhere.",
      "When the answer and the destination are the same question: \"where is X\" and \"what is X\" resolve in one surface.",
    ],
    whenNotToUse: [
      "A conversation the user wants to keep while working — that's the panel or dock; the palette is for a single exchange.",
      "Scoped search inside a page's own data — a local filter belongs in the page, not in the global palette.",
      "Confirming or undoing an action — use a toast or the save reminder.",
    ],
  },
  {
    id: "composer",
    group: "Messages",
    name: "Composer",
    description:
      "The one place a question is written: an optional character mark, context chips, the input, and one control.",
    behavior: [
      "ONE CONTROL, TWO MEANINGS: send while idle, Stop while an answer runs. Send only lights up once there is text — the affordance states its own availability. (An orb was tried in this slot and removed: the identity lives in the shell, and a character where a control belongs reads as decoration.)",
      "While an answer is running the same position becomes STOP — one control, two meanings, always the one that applies. Stopping mid-compose cancels cleanly; stopping mid-stream settles what has already arrived, because it was already said.",
      "Every form factor shares this anatomy: `panel` for the in-surface row (panel and dock), `quick` inside quick ask's pill — the pill supplies the glass and the height — and `inline` for a composer standing inside another object (a review thread), which brings its own frame and the smaller type size. The spotlight band is next.",
      "`mark` puts the assistant's CHARACTER at the head of the row, reacting through still / listening / thinking / answer. It is an identity mark, never the control: the send slot stays a control, which is the distinction that made the orb-as-send experiment fail.",
      "The mark DEFAULTS PER VARIANT, not per caller: `panel` carries it because it is the row that stands alone; `quick` does not, because the orb it would duplicate is the pill it sits in; `inline` does not, because it belongs to the object hosting it. Pass `mark` only to override the usual answer.",
      "`suggestion` offers what to do next as ghost text in the empty field, with Tab to accept and run it. The offer stands only while the field is empty — the moment the user types, their words win.",
      "PASTING BULK TEXT ATTACHES IT rather than filling the field (onPasteText). A stack trace dropped into a one-line input buries the question being written under material the user only meant to REFER to; it becomes a MessageAttachments row above the input, removable until the turn is sent. Short pastes stay in the field, because a short paste is almost always part of the sentence being typed.",
      "Context chips ride in compact size ahead of the input; the shimmer placeholder says the assistant is listening.",
    ],
    whenToUse: [
      "Anywhere a question is typed to the assistant — it is the only sanctioned composer.",
    ],
    whenNotToUse: [
      "For product search or filters; this control promises an AI on the other end.",
      "Never rebuild the input row inline in a surface — that is exactly the drift this extraction removes.",
    ],
  },
  {
    id: "review-comment",
    group: "Messages",
    name: "ReviewComment",
    description:
      "A teammate's note threaded into the code it is about, with the assistant reachable from inside it.",
    behavior: [
      "ANCHORED, NOT ADJACENT: the note renders under the line it questions. A review comment in a side panel makes the reader hold a line number in their head and scroll; threaded, the question and the code are one object.",
      "That anchoring is what makes the reply seam honest — \"resolve this\" has an unambiguous referent, so replying attaches the line as context and hands the work to the ambient panel rather than answering about a whole file.",
      "The reply row is the Composer's `inline` variant, not a lookalike input: one instrument everywhere a question is written.",
      "Status is STATED, not implied by color alone — a red tint is not a word, and \"Change requested\" is the difference between an opinion and a blocker.",
      "Wears the ambient glass: a thread the assistant can act on belongs to the layer's material, not the host surface's chrome.",
      "Replying HANDS THE THREAD OVER: the host closes the comment (it is the assistant's business now) and puts the line it pointed at into the working state, so the handover is visible in the code and not only in the panel that just opened. The component reports the reply; what closing and highlighting mean is the host's decision.",
      "Omit onReply and it is a read-only record, with no reply affordance offered.",
    ],
    whenToUse: [
      "Human review notes inside a diff or an editor, where the assistant may be asked to resolve them.",
      "Anywhere a comment's meaning depends on exactly which line it points at.",
    ],
    whenNotToUse: [
      "For the assistant's own output — that is the response kit; this component is for a person's words.",
      "As a general comment feed detached from code; without an anchor it is just a message list.",
    ],
  },
  {
    id: "attach-menu",
    group: "Messages",
    name: "AttachMenu · AskAI",
    description:
      "The attach gesture: right-click anything to make it context, or ask where the data is.",
    behavior: [
      "THE UNIVERSAL GESTURE of the ambient layer. Right-click any element and it becomes a ContextChip — this is how the assistant learns what you mean without you describing it.",
      "Two verbs, deliberately: Explain (attach, ask, open the panel) for the impatient path, Add to chat context (attach, say nothing) for the deliberate one. A third would make it a menu.",
      "AskAI is the inline entry point — it lives IN the row, revealed on hover, because a question asked where the thing is costs no navigation and no retyping. Requires `relative group/row` on the row.",
      "It FLOATS rather than sitting in flow: an affordance that resizes the thing being hovered makes the whole list flinch under the pointer. Revealing it costs no layout.",
      "Any click OUTSIDE, scroll, or Escape dismisses the menu: a context menu that survives the next interaction is a modal nobody asked for. Pointerdown inside it is the first half of choosing an item, so it must not dismiss — that is what made both verbs unreachable.",
      "openAt(x, y, chip) opens it without a pointer, so a guided tour can perform the gesture ON the real row rather than describe it. The user still picks the verb; nothing is executed for them.",
      "This is the whole product side of the contract. A surface hands over a chip; it never learns how an answer is rendered.",
    ],
    whenToUse: [
      "On any object a user might reasonably ask about — a row, a cell, a file, a line of code.",
      "Beside a problem or anomaly the product already surfaces; that is the moment the question exists.",
    ],
    whenNotToUse: [
      "On every element indiscriminately — if everything is attachable, the gesture stops meaning anything.",
      "As a replacement for the product's own actions; this attaches context, it does not perform work.",
    ],
  },
  {
    id: "message-actions",
    group: "Messages",
    name: "MessageActions",
    description:
      "Copy, rate, and regenerate — the quiet row under an answer, where each action confirms itself.",
    behavior: [
      "Each action confirms ITSELF rather than raising a toast: copy becomes a check for a beat, a rating stays lit. A toast for a copy is a notification about something the user is already looking at.",
      "Ratings toggle — pressing the lit thumb clears it, because a mis-tap should not become permanent signal.",
      "Copy only shows the check once the clipboard write actually resolved; a denied clipboard confirms nothing.",
      "Ghost weight throughout: these sit under every answer, so they must not compete with the answer itself.",
    ],
    whenToUse: [
      "Under any completed assistant answer.",
      "Anywhere the user's reaction is worth capturing at the moment they have it.",
    ],
    whenNotToUse: [
      "On a message still streaming — rating an unfinished answer measures patience, not quality.",
      "For destructive actions; put those behind the More control with their own confirmation.",
    ],
  },
  {
    id: "follow-up-suggestions",
    group: "Messages",
    name: "FollowUpSuggestions",
    description:
      "A titled group of next turns, offered as prompts rather than performed.",
    behavior: [
      "They are OFFERS, not actions: picking one seeds the composer's next question rather than silently running it.",
      "They stagger in on the control motion role, because they arrive after the answer settles — a row that appears all at once reads as chrome that was always there.",
      "ONE SHAPE, deliberately. A pill row was the obvious second variant and it was removed: a real follow-up is a sentence, so it wraps to two lines and needs a target the width of the surface. A pill could hold neither.",
      "Each row carries the open-arrow that says picking it goes somewhere; the heading (\"Ask more\") names the group, and label={null} drops it.",
      "Renders nothing when there are no suggestions; an empty invitation row is worse than none.",
      "It is ALSO the panel's empty state — the character opens the conversation and this card carries the offers, drawing them from the page's own suggestions (setPageIntel). An empty state that hand-rolls its own list is a second component nobody maintains, and it drifts the moment this one changes.",
    ],
    whenToUse: [
      "After an answer that opens obvious next questions — a diff to review, a test to write.",
      "In an empty conversation, as the fastest way to show what the assistant can do.",
    ],
    whenNotToUse: [
      "As navigation to product features; that is the palette's job.",
      "More than about four at a time — a menu of prompts is a decision, not a shortcut.",
    ],
  },
  {
    id: "error-state",
    group: "Messages",
    name: "ErrorState",
    description:
      "A quiet failure banner with a retry path, not a modal in your face.",
    behavior: [
      "Sits in the transcript where the answer would have been: a failed generation is a turn that did not work, not a system-level event.",
      "States what happened and offers the single move that helps. No stack traces, no error codes the user cannot act on.",
      "Wears --destructive over --destructive-wash, the system's status pair — never a bespoke red.",
      "role=\"alert\", so a failure reaches a screen reader without the user going looking for it.",
    ],
    whenToUse: [
      "A generation that stopped, timed out, or hit a limit.",
      "Any failure where retrying is genuinely the right next step.",
    ],
    whenNotToUse: [
      "For a failed tool call inside an otherwise fine answer — that is ToolFailure, which is scoped to the call.",
      "For validation or empty states; a failure claim should be reserved for actual failures.",
    ],
  },
  {
    id: "message-queue",
    group: "Messages",
    name: "MessageQueue",
    description:
      "Turns you typed while a run was in flight, stacked and cancelable until it finishes.",
    behavior: [
      "The running turn sits on a raised card with a live pulse; queued turns are muted rows beneath it — one glance separates what is happening from what is waiting.",
      "The arrow INTERRUPTS, it does not reorder: the picked turn runs now and the running one goes back to the head of the queue. A queue whose items shuffle while one is mid-answer implies the running turn can be overtaken quietly, and it cannot.",
      "It is offered only while something is actually running — with nothing to interrupt, the control would be a lie.",
      "The running row wears the shimmer, because that is the treatment this system uses for work in progress everywhere else.",
      "Rows animate with layout so promoting reorders visibly rather than teleporting.",
    ],
    whenToUse: [
      "Whenever the composer accepts input during a run — the alternative is blocking the input and making the user hold a thought.",
    ],
    whenNotToUse: [
      "As a task list; these are unsent messages, not work items.",
      "When turns cannot actually be reordered or canceled — showing controls that do nothing is worse than a plain count.",
    ],
  },
  {
    id: "reasoning-panel",
    group: "Messages",
    name: "ReasoningPanel",
    description:
      "A collapsible trace that streams reasoning steps, then settles into a summary.",
    behavior: [
      "STAGES ITS ARRIVAL: shimmer, a beat of nothing, then one step at a time. The block is complete in the data and would paint in a single frame — painting it instantly says the work was free, and robs the reader of the one thing a trace is for.",
      "staged={false} renders it settled, which is what a re-rendered older message must do: history is written, not re-thought.",
      "INSIDE A RESPONSE, BLOCKS WAIT FOR EACH OTHER: thinking finishes, then the next evidence block works, then the prose streams. The stage queue enforces the order in the shared hook, so a block inherits it by being staged at all — see DESIGN.md §8. On its own (this playground) a block has no queue and stages immediately.",
      "The counter is REAL — it ticks actual seconds while the trace is arriving, and the settled summary quotes what it measured rather than a prop. A trace that claims 'thought for 5s' when it took two is a decoration pretending to be a measurement.",
      "It runs on the block's WORKING state and freezes the moment the work stops: not while queued behind an earlier block (that is someone else's time) and not after the last item lands (a settled summary must quote a number that has stopped moving).",
      "Thinking holds to a floor (THINKING_FLOOR_MS) so an answer never appears to think for a blink and then know everything. The floor is a real wait, which is what keeps the counter a measurement.",
      "Each step's detail is WRITTEN, not revealed: it streams through the same StreamingText the answer itself uses.",
      "Opens itself while the run is live and collapses to one line when it finishes — reasoning is interesting WHILE it happens and reference material after.",
      "The settled summary states the cost in time (\"Thought for 5s\"), which is the part worth knowing at a glance.",
      "Steps are marked, not connected: they are ordered, not causally chained, and a connector would claim more than the model did.",
      "The user's own toggle wins — pass defaultOpen to opt out of the automatic behavior entirely.",
    ],
    whenToUse: [
      "Any run where thinking takes long enough that silence reads as a hang.",
      "When the reasoning is genuinely reviewable — a plan, a search strategy, a chain of constraints.",
    ],
    whenNotToUse: [
      "To pad a fast answer with theatre; a trace on a 200ms reply is a costume.",
      "For tool activity, which has its own objects (ToolCall, ToolTimeline).",
    ],
  },
  {
    id: "reasoning-effort",
    group: "Messages",
    name: "ReasoningEffort",
    description:
      "How hard to think, and how much of that budget the run actually spent.",
    behavior: [
      "The control and the meter belong together: an effort setting with no spend reading is a preference with invisible consequences.",
      "A radiogroup, not a slider — the levels are named tiers, and a continuous control would imply precision the model does not offer.",
      "The meter fills on the surface motion role, so a spend that climbs during a run reads as accumulation rather than a jump.",
      "Omit spent/budget and the meter disappears; the control alone is still valid.",
    ],
    whenToUse: [
      "Wherever the user pays for thinking — in tokens, in latency, or in both.",
      "In settings AND beside a run, so the choice can be learned from its result.",
    ],
    whenNotToUse: [
      "When effort makes no observable difference; a control with no consequence teaches the user to ignore controls.",
    ],
  },
  {
    id: "message-attachments",
    group: "Messages",
    name: "MessageAttachments",
    description:
      "What was attached, before or after sending — a pasted stack trace, an image to open, a document with its page count.",
    behavior: [
      "ONE COMPONENT FOR BOTH MOMENTS, because removability is the only honest difference: pass onRemove while the attachment is still staged in the composer, omit it once the message is sent and the attachment is a record. Two components would have drifted into two ideas of what an attachment looks like.",
      "A removable row is never also an openable one — it already contains a button, so it must not be one. While staged, removing wins.",
      "Pasted text is a `text` attachment: it is quoted material rather than a file, it says so with the quote mark, and its meta counts lines and characters so it is identifiable without being read.",
      "`compact` is the composer's density: chips in one row rather than stacked cards, because staged attachments sit beside context chips and mean the same thing. Four stacked cards pushed the input off the surface, which is the wrong trade for material you are only referring to.",
      "It is the SAME chip wherever it is drawn (AttachmentChip) inside the SAME slider (ChipSlider). The ambient layer's context row renders attachments beside the page chip in one run; `compact` here is for a composer standing alone, with no context row above it. Two components drawing an attachment is how two drawings of one thing drift apart.",
      "The row PAGES with arrows when it overflows, and carries none when it does not. A row that scrolls silently is one most people read as truncated — the arrows are the only thing separating \"there is more\" from \"that is all\".",
      "An openable attachment is a raised, bordered card; the rest sit on the quiet fill — affordance is carried by the surface, not by a hover-only cue.",
      "An image shows its thumbnail; everything else shows the icon for its kind, drawn by the configured icon library.",
      "Size and meta are formatted by the caller and shown in mono — they are facts about a file, not prose.",
    ],
    whenToUse: [
      "On a user turn that carried files, and on assistant turns that produced them.",
      "In a composer that stands alone (`compact`), for anything staged while the turn is still being written. Inside the ambient layer, the context row does this instead.",
    ],
    whenNotToUse: [
      "For links or references; those are ContextChip and ReferenceChips.",
      "As a second place to show what is already staged. ONE ROW OWNS THE STAGE: where a context row exists it draws the attachments itself, in its own slider, and the composer is handed none. Rendering them in both produced two of every chip, each with its own remove button — and later, when that was fixed by stacking them instead, two rows that read as two different kinds of thing.",
    ],
  },
  {
    id: "quote-reply",
    group: "Messages",
    name: "QuoteReply",
    description:
      "Select a phrase and a contextual edit bar attaches beneath it — describe an edit, or pick one, and watch the rewrite arrive in place.",
    behavior: [
      "ANCHORED TO THE SELECTION: the bar measures the selected range and attaches beneath its last line, centred on the whole selection — a wrapped selection still reads as one object with its bar. It pops in on the control role and repositions through requestAnimationFrame.",
      "A STATE MACHINE, not a toolbar: idle (a Describe-edits prompt plus Explain / Improve, with Shorten / Tone / Grammar unfolding inside the pill) → thinking (spinner + shimmer with the real elapsed count) → streaming (the rewrite arrives INTO the selection through StreamingText) → result (Keep / Discard / Retry).",
      "Rewriting in place requires owning the prose: pass `text` and a `rewrite` seam. Without the seam, actions only report (onAction) — which is all a surface that cannot mutate its content should get.",
      "Typing in the prompt collapses the presets to a send control; the instruction IS the action.",
      "Appears on selection and nowhere else, and only for selections inside its own content.",
      "The selection stays the SUBJECT: Keep applies the replacement to the text, Discard restores it, Retry runs the same action again.",
    ],
    whenToUse: [
      "Around long assistant answers, especially ones mixing prose and code.",
    ],
    whenNotToUse: [
      "Around user messages — quoting yourself back to the assistant is what the composer is for.",
      "Where text is short enough to reference whole; a toolbar over one sentence is friction.",
    ],
  },
  {
    id: "feedback-dialog",
    group: "Messages",
    name: "FeedbackDialog",
    description:
      "A thumbs-down that asks why, so the signal arrives with a reason attached.",
    behavior: [
      "Opens UNDER the answer it is about, not as a modal — the system has no Dialog (see the known gaps), and that constraint produced the better interaction.",
      "Every field is optional and the reasons are preset: free text is a tax on someone already doing you a favor.",
      "Reasons multi-select, because an answer can be both too long and wrong.",
      "A bare rating is a number nobody can act on; asking at the moment of the reaction is the only time the user knows the reason.",
    ],
    whenToUse: [
      "Immediately after a negative rating, in place.",
    ],
    whenNotToUse: [
      "After a positive rating — interrogating praise is how you stop receiving it.",
      "As a general support form; this is about one answer.",
    ],
  },
  {
    id: "timestamps",
    group: "Messages",
    name: "DayDivider · MessageTime",
    description:
      "Chronology in a long thread: days marked, exact times on hover.",
    behavior: [
      "A day boundary is the only moment a reader actually needs orienting — a timestamp on every message is noise.",
      "Exact times live on hover or keyboard focus (MessageTime), so precision is available without being ambient.",
      "The divider is a real separator with an accessible label, not a decorative line with text over it.",
      "MessageTime reveals inside a group-hover container, so the whole row is the target rather than the timestamp itself.",
    ],
    whenToUse: [
      "Threads that span sessions or days.",
      "Anywhere the age of an answer changes how much to trust it.",
    ],
    whenNotToUse: [
      "In a short-lived surface — quick ask, the palette — where everything happened just now.",
    ],
  },
  {
    id: "tool-call",
    group: "Tool use",
    name: "ToolCall",
    description:
      "One tool invocation with its request and result tucked behind a disclosure.",
    behavior: [
      "A TOOL CALL IS A CLAIM, AND A CLAIM MUST BE AUDITABLE: the collapsed row is the claim, the disclosure holds the evidence.",
      "The verb alone, in plain language. The exact argument is evidence, and evidence lives in the disclosure — a chip in the header duplicated the request one click away.",
      "Collapsed by default, EXCEPT on failure: a failure the user has to go looking for is a failure they will miss.",
      "Request and result are quoted verbatim in mono. Evidence is not paraphrased.",
      "With no request or result, the row stops pretending to be expandable.",
    ],
    whenToUse: [
      "Every tool invocation the user should be able to audit.",
    ],
    whenNotToUse: [
      "For several calls that went out together — that is ParallelTools, which collapses them to one row.",
      "For a whole session's activity — that is ToolTimeline.",
    ],
  },
  {
    id: "tool-timeline",
    group: "Tool use",
    name: "ToolTimeline",
    description:
      "A whole working session summarized as verbs, targets, and file stats.",
    behavior: [
      "Summarizes to \"N steps · M files changed\" — the only two questions worth answering at a glance about a long run.",
      "File stats sit at the bottom and carry +/− counts, because a change to your files is the part with consequences.",
      "Additions and removals use the status pair (--positive / --destructive), never bespoke greens and reds.",
      "Open by default: a session summary the user has to discover defeats the summary.",
      "Steps land one by one, each row growing in — the record admits it was assembled over time, and a row appearing at full height would shove the list in a single frame.",
      "Every step row is a ghost button: pass onStepSelect to make it a jump — open the file, reveal the diff — and the record reads as traversable either way.",
    ],
    whenToUse: [
      "After an agent run of more than a couple of steps.",
      "Wherever the user needs to know what was touched before they trust the result.",
    ],
    whenNotToUse: [
      "For a single call, which reads better as a ToolCall.",
      "As a progress indicator during the run — it is a record, not a spinner.",
    ],
  },
  {
    id: "terminal-block",
    group: "Tool use",
    name: "TerminalBlock",
    description:
      "Command output that streams line by line and ends with an exit status.",
    behavior: [
      "Output is quoted verbatim: monospaced, unwrapped, horizontally scrollable. Never reflowed to fit.",
      "The cursor while a run is live earns its place — it is the difference between \"still going\" and \"produced nothing\".",
      "The exit code replaces the cursor when the run ends, colored by the status pair.",
      "tone=\"ink\" presents a run as an artifact; \"paper\" keeps it on the surface it lives in, which is right inside a conversation.",
    ],
    whenToUse: [
      "Any command the assistant ran on the user's behalf.",
    ],
    whenNotToUse: [
      "For code the assistant wrote — that is CodeRunner, where the output belongs to a snippet.",
      "For long logs; link to them rather than pasting a thousand lines into a conversation.",
    ],
  },
  {
    id: "code-diff",
    group: "Tool use",
    name: "CodeDiff",
    description:
      "A unified diff with tinted additions and removals, sized for chat.",
    behavior: [
      "Read-only by design: this is the assistant showing what it changed, not asking anything.",
      "Tint carries the sign so the eye finds the change before reading it — and the sign column stays anyway, because color alone is not a signal everyone receives.",
      "Counts are derived from the lines when not given, so a diff can never advertise a total it does not contain.",
      "Uses --positive-wash and --destructive-wash: the same status tokens as every other pass/fail surface.",
    ],
    whenToUse: [
      "Whenever an answer changed code the user has not seen yet.",
    ],
    whenNotToUse: [
      "When the change still needs the user's approval — that is ReviewableDiff, where each hunk is a decision.",
      "For whole files; a diff is an argument about what changed.",
    ],
  },
  {
    id: "reviewable-diff",
    group: "Tool use",
    name: "ReviewableDiff",
    description:
      "The same diff, but each hunk is a decision: keep it, discard it, apply what survived.",
    behavior: [
      "The difference from CodeDiff is CONSEQUENCE, not appearance: here the assistant is asking permission, per hunk.",
      "Three states per hunk — kept, discarded, undecided — because defaulting undecided to either one decides for the user.",
      "It counts what is left to review and disables Apply at zero kept, so \"apply\" can never quietly mean \"apply nothing\".",
      "A discarded hunk dims rather than disappearing; you can still see what you turned down.",
    ],
    whenToUse: [
      "Any change the assistant proposes to files the user owns.",
      "Wherever partial acceptance is genuinely possible.",
    ],
    whenNotToUse: [
      "For changes already applied — showing decisions for a fait accompli is theatre.",
      "When the hunks are not independent; offering per-hunk choice on a change that only works whole invites a broken state.",
    ],
  },
  {
    id: "parallel-tools",
    group: "Tool use",
    name: "ParallelTools",
    description:
      "Calls that went out together, collapsed to one row until you want the detail.",
    behavior: [
      "Concurrency is an implementation fact — stacking five rows makes it look like five decisions.",
      "One row states the batch and its outcome; the batch reads as failed if any call inside it did.",
      "Opening it shows each call with its own timing, which is the only reason anyone opens it.",
      "Closed by default: the summary is usually the whole story.",
    ],
    whenToUse: [
      "Any fan-out — reading several files, querying several sources at once.",
    ],
    whenNotToUse: [
      "For sequential calls, where order carries meaning that a batch hides.",
      "For two calls; a batch of two is just two rows.",
    ],
  },
  {
    id: "tool-failure",
    group: "Tool use",
    name: "ToolFailure",
    description:
      "One call failed. The error, the attempt count, and a retry that doesn't restart the turn.",
    behavior: [
      "The attempt count is the honest part: \"1/3\" tells the user a retry is already policy, not a suggestion.",
      "Skip exists because a failed call is often not fatal to the answer — forcing a retry to continue is how a transient blip becomes a dead conversation.",
      "The error is quoted verbatim in mono on the destructive wash; a paraphrased error is a second bug to debug.",
      "Scoped to the call, not the turn: the surrounding answer keeps its own state.",
      "Report (onFeedback) opens the same FeedbackDialog the message actions use, inline under the failure — what went wrong from the user's side is captured at the moment they know it, in the ambient visual language rather than a detached modal.",
    ],
    whenToUse: [
      "Any tool call that failed inside an otherwise live turn.",
    ],
    whenNotToUse: [
      "When the whole generation stopped — that is ErrorState.",
      "For expected empty results; \"no matches\" is an answer, not a failure.",
    ],
  },
  {
    id: "code-runner",
    group: "Tool use",
    name: "CodeRunner",
    description:
      "A snippet with a run button, and the output it produced attached below it.",
    behavior: [
      "Attachment is the whole idea: output that floats free of the code that made it is a screenshot.",
      "Re-running replaces the result rather than appending another orphan block.",
      "Pressing play performs a run: the old output clears, the clock restarts from zero, and the result streams back in — the same arrival every time, because every run took time.",
      "The run control disables itself while running — the object states its own availability instead of relying on the user to wait.",
      "Duration sits beside the control, because how long it took is part of the result.",
    ],
    whenToUse: [
      "Executable snippets the user is meant to try, not just read.",
    ],
    whenNotToUse: [
      "For code that changes files or state — that needs a ReviewableDiff and an explicit apply.",
      "For output with no code behind it; that is a TerminalBlock.",
    ],
  },
  {
    id: "web-search",
    group: "Knowledge",
    name: "WebSearch",
    description:
      "A search query and its results landing one by one as the agent reads.",
    behavior: [
      "Showing the QUERY is the part most search UIs skip: it is the assistant's interpretation of the question, and the first place an answer goes wrong.",
      "Results stagger in because they genuinely arrive that way — the animation is reporting, not decoration.",
      "The query itself shimmers while sources are still being read: the search is the thing currently happening, and it settles to plain text when the reading ends.",
      "Each source carries its own mark (a caller-supplied logo, else the domain's initial) and its domain in mono, so provenance is recognizable before it is read.",
      "A source with an href opens in a new tab; without one it stays a record of what was read.",
    ],
    whenToUse: [
      "Any answer grounded in a live search.",
      "Whenever the user should be able to challenge WHAT was searched, not just what was found.",
    ],
    whenNotToUse: [
      "As a final bibliography — that is ReferenceChips, under the answer.",
      "For internal retrieval with no user-visible sources.",
    ],
  },
  {
    id: "inline-citation",
    group: "Knowledge",
    name: "InlineCitation",
    description:
      "Numbered references inside a sentence, each with a hover preview of its source.",
    behavior: [
      "Reference chips say the reply used these sources; a citation says THIS sentence rests on THIS one — the difference between provenance and a bibliography.",
      "The preview opens above the line, because a card below would cover the text still being read.",
      "It responds to focus as well as hover, so the preview is reachable by keyboard.",
      "The marker inverts while open — the only state it has, and enough to tell you which one you are reading.",
    ],
    whenToUse: [
      "Answers where individual claims have individual sources.",
      "Anywhere a reader may want to verify one sentence without auditing the whole reply.",
    ],
    whenNotToUse: [
      "On every sentence; a paragraph of superscripts is unreadable and reads as defensiveness.",
      "When the source does not actually support that specific claim — a citation is a promise.",
    ],
  },
  {
    id: "research-report",
    group: "Knowledge",
    name: "ResearchReport",
    description:
      "An outline that fills in section by section, each carrying the sources behind it.",
    behavior: [
      "Declaring the outline first turns waiting into reading: you can see what is coming, what is being written now, and what has landed.",
      "Each finished section carries its own source count, so depth is legible per claim rather than as one total at the end.",
      "A pending section says so — muted, with an inert mark — instead of rendering an empty confident heading.",
      "Three marks, three meanings: a check for done, a spinner for the section being written, a dot for not yet.",
    ],
    whenToUse: [
      "Long-running research where the shape of the answer is known before its content.",
      "Any deliverable a user will read in pieces rather than all at once.",
    ],
    whenNotToUse: [
      "For a conversational answer; an outline over three sentences is bureaucracy.",
      "When the sections are not known upfront — a skeleton that keeps changing is worse than none.",
    ],
  },
]
