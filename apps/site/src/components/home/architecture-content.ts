/**
 * THE ARCHITECTURE PAGE, WRITTEN RATHER THAN RENDERED.
 *
 * This page used to be PAPER.md's real bytes, read at build time and cut
 * into chunks. That had one excellent property — there was no second copy
 * to fall out of step — and one bad one: the argument was written for a
 * reader who had already decided to spend half an hour, and the site's
 * front door had since been rewritten for a stranger with eight seconds.
 * The two halves of the same site no longer sounded like the same project.
 *
 * The prose lives here now, in the `site-voice` register (.claude/skills/
 * site-voice). It is shorter than the paper was and says less, on purpose:
 * a page has to be read to be useful, and the parts that only a reader
 * mid-implementation needs are in DESIGN.md, where they are enforced
 * rather than merely argued.
 *
 * SERIALISABLE, NO REACT. The renderer decides what a section looks like
 * and which live demo sits under it; this file only knows what it says.
 * Same split as catalog.ts, for the same reason.
 */

export type SectionSlot =
  | "shapes"
  | "answer"
  | "embedded"
  | "context"
  | "config"
  | "pipeline"
  | "anatomy"

export type Section = {
  id: string
  /** Numbered for the contents column, and for citing one in a review. */
  num: number
  title: string
  /** Short paragraphs. One idea each. */
  body: string[]
  /** A live demo or diagram the renderer drops in after the prose. */
  slot?: SectionSlot
}

export type Part = {
  id: string
  label: string
  title: string
  lede: string
  groups: { label: string; nums: number[] }[]
}

export const PARTS: Part[] = [
  {
    id: "part-1",
    label: "Part I",
    title: "The assistant",
    lede: "What an AI that lives above your product is, and why it cannot live inside it.",
    groups: [
      { label: "A presence, not a feature", nums: [1, 2, 3] },
      { label: "Answers made of your product", nums: [4, 5, 6] },
    ],
  },
  {
    id: "part-2",
    label: "Part II",
    title: "The architecture",
    lede: "The part underneath that keeps everything above it from drifting. Four steps, in order.",
    groups: [
      { label: "Name the problem", nums: [7, 8] },
      { label: "Bound the space", nums: [9, 10, 11] },
      { label: "Make the rules real", nums: [12, 13] },
      { label: "One store, two environments", nums: [14, 15] },
    ],
  },
]

export const SECTIONS: Section[] = [
  {
    id: "s-1",
    num: 1,
    title: "AI does not belong inside your interface",
    body: [
      "The usual way to add AI to a product is to find it a spot. A chat tab in the sidebar. A sparkle button on each feature. An assistant page that is really just another page.",
      "Each of those treats AI as one more feature, and each one splits it up. The chat tab does not know what the sparkle button did. The panel does not know which page you were on when you opened it. You end up with five entrances that share no memory and no context.",
      "The claim here is that the placement is the mistake, not the model. The assistant should not be part of the interface. It should be a layer above it: something that sits over your product, can see where you are, and can be spoken to from anywhere. There is no “new chat” page, because a conversation is not a destination.",
    ],
    slot: "embedded",
  },
  {
    id: "s-2",
    num: 2,
    title: "One assistant, five shapes",
    body: [
      "Something always available cannot be one fixed size. Sometimes you want to ask a three-word question without leaving your work. Sometimes you want a conversation open beside you for an hour.",
      "So it changes shape instead of changing identity. An orb resting at the edge. A quick ask that grows out of it. A panel that stays open while you work. A dock pinned full-height, with the page making room. A spotlight for ⌘K. A history of everything asked here.",
      "You move between them by dragging. Pull the panel to the edge and it docks. Pull it to the top and it becomes the palette. Close everything and the orb is still there. The shapes cost you different amounts of screen, and you are the one choosing what to spend.",
    ],
    slot: "shapes",
  },
  {
    id: "s-3",
    num: 3,
    title: "It already knows where you are",
    body: [
      "The habit that gives embedded AI away is that you explain your situation to it every time. Paste the error. Describe the page. Name the file.",
      "Here each page declares itself instead. Click an issue and that issue becomes the assistant's context. Say “fix this” and it knows what “this” is, because the page said so. What it is looking at stays visible as a small chip, so you can check before you ask.",
      "This is a contract, not a convenience. The assistant never reaches into your product to guess. The page states what it may know, through one narrow call, and the assistant works with exactly that. A page that forgets to declare itself is an unfinished page, the same way a page without a title is.",
    ],
    slot: "context",
  },
  {
    id: "s-4",
    num: 4,
    title: "Answers made of your product",
    body: [
      "A chat bubble full of markdown is the weakest thing an answer inside a product can be. An answer about code should contain a diff you can apply, hunk by hunk. An answer that ran something should show the terminal and its exit code. A researched answer should carry references you can click.",
      "So a response is not text. It is a sequence of typed blocks, revealed in a fixed order: thinking, then each piece of evidence as it lands, then the prose, then whatever the answer produced.",
      "The diff is the case that matters most. Every hunk has keep, discard, and a third state — undecided — so the assistant cannot quietly decide something you never looked at. A model fills this structure in. It does not invent it.",
    ],
    slot: "answer",
  },
  {
    id: "s-5",
    num: 5,
    title: "It has no look of its own",
    body: [
      "The assistant ships with no palette, no type scale and no motion. Every colour it wears is a role from your design system. Every duration is one of your motion roles. Change your accent and it changes with you, because it was never carrying its own.",
      "Its identity is behaviour instead. One state machine drives four states — still, listening, thinking, answering — and those states show up in several places at once: the character itself, a comet travelling the border of whichever surface is live, the surface's own background.",
      "Two rules keep that affordable. Detail lives where you can see it: the full shader where the character is the subject, a cheap CSS twin at bullet-point size. And only the newest answer is expensive; settled ones fall back to the twin. What it costs depends on what is happening, not on how long you have been talking.",
    ],
  },
  {
    id: "s-6",
    num: 6,
    title: "Why this needs an architecture underneath",
    body: [
      "Here is the problem Part I creates. The assistant is fifty-odd surfaces: messages, diffs, panels, palettes, chips, timelines.",
      "Build those the normal way — each one styled by hand, or generated by a model in the moment — and you get fifty chances to drift. The assistant would slowly stop matching the product it sits on, which defeats the whole point of it borrowing your design system.",
      "It is only possible on top of something where drifting is structurally hard. That is the rest of this page.",
    ],
  },
  {
    id: "s-7",
    num: 7,
    title: "How interfaces fall apart",
    body: [
      "Ask an AI for a settings page and you get a settings page. Sensible hierarchy, reasonable spacing, plausible colours. The output is not the problem.",
      "The problem is that the output is unattached. It has 18px of padding because 18 looked right. A border of #e5e5e5 because that is a common border. A 200ms hover because 200 is a normal number. None of those values are wrong. All of them are inventions, decided at the moment of generation and connected to nothing.",
      "Do that a hundred times and you have not built a product. You have built a hundred small undocumented design systems sitting next to each other. It looks fine until the day something has to change, and then you find nothing was ever attached to anything.",
      "Documentation does not fix this, because documentation is advice, and a generator cannot be advised. Give a model no legal radius steps and it will pick a number. Give it no motion roles and it will type a duration. It cannot decline to choose.",
    ],
  },
  {
    id: "s-8",
    num: 8,
    title: "A system lists what you have. An architecture answers change.",
    body: [
      "A design system is usually an inventory: tokens, components, guidelines, a Figma library, a docs site. It tells you what exists.",
      "Design architecture answers a different question — what happens when something changes? It decides whether a decision made once reaches everywhere it should, and whether a decision made in the wrong place is even possible to write down.",
      "The difference shows up the moment you need it. In an inventory, “we are changing the corner radius” is a migration. In an architecture, it is a value. In an inventory, a generator has a catalogue to browse and total freedom between the entries. In an architecture, the space between the entries does not exist.",
      "If you want to know which one you have, grep your components for hex colours, arbitrary values like p-[10px], and raw durations. That count is your drift.",
    ],
  },
  {
    id: "s-9",
    num: 9,
    title: "The Foundation is a short menu",
    body: [
      "Every global design decision here is a choice from a fixed list, not a free value. That list has one home, and setting it up is the first real act of adopting any of this.",
      "It holds the handful of decisions everything else is derived from: an accent colour, a grey family, a corner radius, a spacing unit, a type scale, an icon set, a motion character. Half the work is done right here, before a single screen is designed, because every later decision either resolves against this or invents something the system cannot see.",
      "Two things make the menu worth trusting. It is short — what it cannot express is not a gap, it is the point. And it is not authored: the scales are Tailwind's, taken as they are, so “16px of padding” has exactly one legal answer and no argument.",
    ],
    slot: "config",
  },
  {
    id: "s-10",
    num: 10,
    title: "Components name a job, not a colour",
    body: [
      "Nothing in the product names a colour. It names a job. There are about twenty jobs: the action colour, the focus ring, the page background, primary text, the raised surface, the quiet fill behind a hover, hairline borders.",
      "This is not indirection for its own sake. Jobs survive change and raw values do not. “A softer grey for that caption” written as text-muted-foreground stays correct when the grey family changes, when the theme flips to dark, when the accent moves. The same instruction written as text-gray-400 is correct exactly once.",
      "Two details mattered more than expected. The jobs need plain descriptions, not just names — “secondary text: descriptions, captions, placeholders” documents the system for someone deciding, where --muted-foreground only documents it for someone who already knows. And picking a colour for light mode derives its dark counterpart, so one judgement produces both halves.",
    ],
  },
  {
    id: "s-11",
    num: 11,
    title: "“Make it feel like that” is a configuration",
    body: [
      "This is the rule that changes how working with an AI actually goes, and the one most likely to be rejected on first hearing.",
      "Someone points at another product and says make it feel like this. The reflex is to style toward it: adjust this padding, that border, this shade of grey. The result looks closer and is further away — a pile of local overrides belonging to no system.",
      "So the answer is always a configuration instead. Which accent, which grey, which radius step, which spacing unit, which motion character. If the menu cannot reach the look, that is not permission to hand-style. It is a decision to either extend the system deliberately or decline the change.",
      "It holds up under pressure. Matching a reference-grade command palette here meant deepening one glass recipe, adding one translucency token and correcting a selection colour: three changes that improved every surface at once, instead of one bespoke palette that improved nothing else. A side effect worth having is that taste becomes portable — a configuration is a small object you can save, diff, share and push to Figma. A pile of overrides is not.",
    ],
  },
  {
    id: "s-12",
    num: 12,
    title: "Propagation is a promise you have to check",
    body: [
      "A configuration layer is only real if changing it visibly changes the product. That sounds obvious and is routinely untrue, because propagation is easy to claim and slow to verify.",
      "The move is to route each dimension through the variable the framework already derives from. The spacing unit sets Tailwind's spacing variable, so every padding and height re-densifies at once. Scaling sets the root font size, and everything is in rem, so one choice re-derives type, spacing and radius together. A hardcoded pixel in a component is not a style choice. It is a leak, and it is treated as a defect.",
      "Two failures sharpened this. A shadow control was built, looked reasonable, and moved almost nothing on screen, because elevation is chosen per surface by meaning rather than set globally — the right response was to delete the knob and document the scale. And radius was fully wired and still looked dead, because controls consumed the largest step, which for a control-height element exceeds half its height, so the browser clamped it to a pill. The plumbing was perfect and the selection was wrong.",
      "The lesson from both: verify propagation at the pixel, not at the variable.",
    ],
  },
  {
    id: "s-13",
    num: 13,
    title: "Rules the AI reads, and a gate that means them",
    body: [
      "Rules on a docs page are folklore. The AI here loads its constitution at the start of every session — it does not choose to, the tooling injects it before any work begins — and it can pull on three roles on demand: a design system manager, a product design manager, a copywriter.",
      "Because those are plain files in the repository, they are versioned, diffable and reviewable in a pull request like any other code. They also rot like files: an audit of them found the design-system role still describing motion as it was before motion roles existed. The rules need the same auditing as the configuration they govern.",
      "Then the build enforces what the documents claim. Typecheck, lint and build across every package, plus drift checks: the generated registry still matches its sources, the vendored stylesheet still matches upstream, every path a governing document cites still exists, every documented component still has a demo. A pre-commit hook runs it, so a failing gate blocks the commit.",
      "That is the whole difference between a rule and a mechanism. A rule the generator never reads is advice. A rule the build enforces is architecture.",
    ],
    slot: "anatomy",
  },
  {
    id: "s-14",
    num: 14,
    title: "One store of values, two environments",
    body: [
      "Everything above describes one environment. There are two: your codebase and your Figma file, used by different people, drifting apart from the day they are created. The usual relationship between them is a screenshot and an apology.",
      "Here they are two projections of the same data. The palette and the scales are Tailwind's on both sides, held verbatim. The Foundation holds no numbers at all — only aliases pointing into those scales, chosen by the saved configuration. Components on both sides bind the aliases.",
      "That chain is the whole trick. Change one alias and the app re-themes and the Figma library re-themes, without touching a component in either place. The sync writes variables and never draws; code is the master; running it twice is safe; and anything it would overwrite is listed before it does.",
      "The proof is small and complete: changing this system's accent from one hue to another was six alias edits. Both environments re-themed. Zero components were touched.",
    ],
    slot: "pipeline",
  },
  {
    id: "s-15",
    num: 15,
    title: "What you can take",
    body: [
      "None of the moves need this stack. Name external scales and select from them instead of authoring your own. Give every dimension named jobs and forbid literals in components. Answer references with configuration. Route each dimension through the variable your framework already derives from, and check it at the pixel. Make the documentation of a mapping the editor of that mapping. Extend the model to motion and translucency, which are not exceptions. Keep code and design tooling as projections of one store. Record decisions with their reasoning, including the failures.",
      "And treat the AI as a contributor working inside a structured system, never as a generator filling a blank page. That framing is faster, because composition is cheap once the dimensional decisions are made, and safer, because the model spends its fluency on which components and which layout rather than on inventing values.",
      "A design system tells you what exists. A design architecture tells you what happens when something changes. That is the only property that matters once interfaces are no longer built entirely by hand — and it is what an assistant, an experimenting design team and a generating model all turn out to need. Not a bigger catalogue. A smaller space of legal moves.",
    ],
  },
]

/** Reading time, from the words actually on the page. */
export const READING_MINUTES = Math.max(
  1,
  Math.round(
    SECTIONS.reduce((n, s) => n + s.body.join(" ").split(/\s+/).length, 0) / 200
  )
)

/**
 * THE ANATOMY — what each file in this repo is for.
 *
 * It was a markdown table inside the paper, parsed back out at render
 * time. Written directly now: the same twelve rows, minus a parser that
 * existed only because the source was prose.
 */
export type AnatomyRow = { title: string; path: string; job: string }

export const ANATOMY: AnatomyRow[] = [
  { title: "The value store", path: "tokens/tokens.json", job: "Palette, roles, type, motion, shadows, translucency recipes, the Figma connection. What the system believes, as data." },
  { title: "The configuration space", path: "packages/foundation/src/tokens.ts", job: "Every dimension and the function that compiles it to CSS. No React, no imports — a consumer can take the space without the machinery." },
  { title: "The engine", path: "packages/foundation/src/foundation-context.tsx", job: "Holds the saved configuration and compiles it into one injected style tag. Live edits preview; only Save persists." },
  { title: "The product vocabulary", path: "packages/ui/", job: "Buttons, inputs, sheets, tables. They consume roles and scale utilities, never values." },
  { title: "The ambient vocabulary", path: "packages/ambient/", job: "The assistant, and everything its answers are composed from." },
  { title: "The seam", path: "packages/ambient/src/ambient-runtime.tsx", job: "The complete list of what the assistant needs from a design system, with working defaults, so it renders with no providers at all. The Foundation implements it; the assistant does not know the Foundation exists." },
  { title: "The component registry", path: "apps/site/src/lib/catalog.ts", job: "Every component with its behaviour, when to use it, and when not to. Undocumented components do not exist as far as the system is concerned." },
  { title: "The distribution", path: "registry.json", job: "Generated from the docs by script, never written by hand, so a component cannot be installable but undocumented." },
  { title: "The constitution", path: "DESIGN.md", job: "The rules, the contracts, the governance procedure, and a decision log recording not just what was decided but why." },
  { title: "The standing orders", path: "CLAUDE.md", job: "The hard rules an AI works under here, loaded at the start of every session." },
  { title: "The roles", path: ".claude/skills/", job: "Roles the AI can take on demand: design system manager, product design manager, copywriter, site voice." },
  { title: "The enforcement", path: "npm run gate", job: "Typecheck, lint and build across every package, plus the drift checks. A pre-commit hook runs it, so a failing gate blocks the commit." },
]
