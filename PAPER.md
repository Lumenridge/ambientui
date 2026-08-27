# Design Architecture

**What a design system has to become before an AI can build inside it.**

This paper has two parts. Part I describes Ambient UI: an AI assistant that
lives above a product instead of inside it. Part II describes the structure
underneath it: a design system reshaped into an architecture, so interfaces
can be generated, changed, and experimented with without drifting into slop.

The two parts need each other. The assistant is the demand: an AI surface
touches every corner of a product, so it exposes every weakness in how that
product stores its design decisions. The architecture is the supply: a way of
storing those decisions so a generator, human or machine, cannot detach from
them.

Everything here was built. The repository this file lives in is the working
proof, and the failures recorded below happened in it.

---

# Part I: Ambient UI

## 1. AI does not belong inside your interface

The common way to add AI to a product is to embed it. A chat tab in the
sidebar. A sparkle button on each feature. An assistant panel that is really
just another page. Each of these treats AI as a feature among features, and
each one fragments it: the chat tab does not know what the sparkle button
did, and the panel does not know what page you were on when you opened it.

Ambient UI starts from a different claim: **the AI should not be part of the
interface at all. It should be a layer above it.**

Think of it as a presence, not a feature. Something sits above your UI and
your data layer, sees where you are, and can be spoken to from anywhere. You
do not go to it. It is already there. There is no "New Chat" page, because a
conversation is not a destination.

## 2. One presence, many shapes

A presence that is always available cannot have one fixed size. Sometimes you
want to ask a three-word question without leaving your work. Sometimes you
want a conversation open beside the work for an hour. The same presence has
to serve both, so it changes shape instead of changing identity.

The layer takes six shapes:

| Shape | What it is for |
|---|---|
| **Orb** | The resting state. Present, watching nothing, costing nothing. A small character docked to an edge of the page. |
| **Quick ask** | Click the orb and an input grows out of it. Ask without arriving anywhere; the question costs no surface and no navigation. |
| **Panel** | A floating window that persists while you work. Answers accumulate; the transcript is the point. |
| **Dock** | The panel anchored full-height to an edge. The page reflows around it instead of being covered. For work done with the assistant rather than in it. |
| **Spotlight** | The command palette, rebuilt for an AI-native product: one input that searches the product and asks the model. |
| **History** | The record of everything asked here, full screen but translucent, because the work underneath is the reason you opened it. |

These are not six features. They are one thing changing geometry to match how
much of your attention the moment deserves, and you move between them by
direct manipulation: drag the panel to the edge and it docks, drag it to the
top and it becomes the palette, close everything and the orb remains. The
shapes escalate. An orb costs nothing, a quick ask costs a glance, a panel
costs a corner of the screen, a dock costs a column. The user chooses the
cost, and nothing jumps a casual question into a committed surface.

## 3. It already knows where you are

The defining habit of embedded AI is that you re-explain your situation to it
every time. Paste the error. Describe the page. Name the file.

An ambient layer inverts this. Every page declares itself to the layer: what
it is, what is selected, what is broken. Click an issue and the issue becomes
the assistant's context. Say "fix this" and the layer knows what "this" is,
because the page told it. The context travels with you as you move, and the
current context is always visible as a small chip, so you can see exactly
what the assistant is looking at before you ask.

This is a contract, not a convenience. The layer never reaches into the
product to guess. The product states what the layer may know, through one
narrow interface, and the layer works with exactly that. A page that forgets
to declare its context is an incomplete feature, the same way a page without
a title is.

## 4. Every answer is built from components

A chat bubble full of markdown is the weakest possible form for an answer
inside a product. An answer about code should contain a diff you can apply
hunk by hunk. An answer that ran something should show the terminal and its
exit code. A researched answer should show its outline filling in and carry
numbered references you can check.

So the layer treats every response as a composed object: a sequence of
typed blocks, revealed in a fixed order. Thinking first, then each piece of
evidence as it lands, then the prose, then anything the answer produced.
The vocabulary of blocks is part of the design system: reasoning panels,
tool calls, timelines, diffs, terminals, reports, citations, follow-up
suggestions. A model fills this structure. It does not invent it. That is
the difference between an assistant whose answers belong to the product and
one that pastes a foreign document into it.

## 5. A layer with no look of its own

The ambient layer ships with no palette, no type scale, and no motion of its
own. Every color it wears is a semantic role from the host's design system.
Every duration is one of the host's motion roles. Change your product's
accent and the assistant changes with it, because it was never carrying its
own.

Its identity is behavior, not decoration. One state machine drives four
states: still, listening, thinking, answer. Those states render in several
bodies at once: the orb character itself, a comet traveling the border of
whichever surface is active, the surface's background, and the small marks
that sign each answer. The user never sees four animations agreeing with
each other. They see one thing, present in several places.

Two cost rules keep this honest. Identity lives at identity scale: the full
shader where the character is the subject, a cheap CSS twin at glyph size
where it is a bullet point next to text. And only the live instance is
expensive: the newest answer wears the real character, settled answers fall
back to the twin. Cost is bounded by what is happening, not by how long the
conversation has run.

The character is also configuration. Its form factor, its colors, its speed
in each state: all of it lives in the theme, saves with the theme, and could
be swapped wholesale. The assistant's personality is a setting, which is
exactly what makes it portable across products.

## 6. Why this cannot be built the normal way

Here is the problem Part I creates. An ambient layer is fifty-plus surfaces:
messages, diffs, panels, palettes, chips, timelines. Build them the normal
way, each one styled by hand or generated by a model in the moment, and you
get fifty small opportunities for drift. The assistant would slowly stop
matching the product it sits on, which defeats the entire premise.

The layer is only possible on top of a system where drift is structurally
hard. That system is Part II.

---

# Part II: Design Architecture

## 7. Drift, or how interfaces become slop

An AI can produce a competent interface in seconds. Ask for a settings page
and you get a settings page: sensible hierarchy, reasonable spacing,
plausible colors. The output is not the problem.

The problem is that the output is *unattached*. It has a padding of 18px
because 18 looked right, a border of `#e5e5e5` because that is a common
border, a hover that fades over 200ms because 200 is a normal number. None
of those values are wrong. All of them are inventions: decisions made at the
point of generation, connected to nothing.

Do this a hundred times and you have not built a product. You have built a
hundred small, undocumented design systems that happen to sit next to each
other. It looks consistent until the day something has to change. Then you
discover that nothing was ever connected to anything, and "change the
radius" means finding every radius by hand.

This is what people mean when they say AI-built interfaces become slop you
cannot control. The slop is not bad taste. It is unattached values
accumulating faster than anyone can audit them. Human teams produce the same
thing, just slowly; AI removes the friction that used to slow it down.

Documentation does not fix it, because documentation is advice, and advice
does not constrain a generator. A model will always fill an unconstrained
space with something plausible. It cannot decline to choose. Given no legal
radius steps, it picks a number. Given no motion roles, it types a duration.

What constrains a generator is architecture.

## 8. A system lists what exists. An architecture answers change.

A design system is usually an inventory: tokens, components, guidelines, a
Figma library, a docs site. It answers *what exists*.

Design architecture answers a different question: **what happens when
something changes?** It is the structure that decides whether a decision made
once propagates everywhere it should, and whether a decision made in the
wrong place is even possible to express.

The difference is practical. In an inventory, "we're changing the corner
radius" is a migration. In an architecture, it is a value. In an inventory,
a generator has a catalogue to browse and infinite freedom between the
entries. In an architecture, the space between the entries does not exist.

## 9. The bounded configuration space

The core of the architecture is that every global design decision is a
choice from a fixed menu, not a free value.

**Adopt scales of record; do not invent them.** The scales here are
Tailwind's: the full color palette, the spacing scale, the type ramp, the
radius steps. The system never authors a parallel scale; it selects. This
makes "a stated pixel is a request for a token" enforceable: when someone
says 16px padding, there is exactly one legal answer (`p-4`). When a value
has no exact step, the rule is to take the nearest legal step and say which
one you picked, so the approximation is visible instead of silently invented.
An external scale also means the model already knows it. Nothing has to be
taught before it can be obeyed.

**Roles over values.** Components never name a color; they name a job. The
role map is the complete list of jobs, about twenty of them: the action
color, the focus ring, the page background, primary text, the raised
surface, the quiet fill behind hover, hairline borders, the sidebar ground,
and so on. Each role resolves to a step on the chosen accent hue or gray
family. Roles survive change and raw values do not: `text-muted-foreground`
stays correct when the gray family changes and when the theme flips to dark.
`text-gray-400` is correct exactly once and quietly wrong forever after.
Two refinements proved important. Roles carry plain-language descriptions
("Secondary text: captions, placeholders, section labels"), because a list
of variable names only documents the system for people who already know it.
And one decision produces its consequences: picking a role's light step
derives its dark counterpart, with an explicit override still available.

**A reference is a request for a configuration.** When someone points at
another product and says "make it feel like this," the reflex is to style
toward the reference, component by component. The result looks closer and is
further away: a pile of local overrides that belong to no system. The rule
inverts it. A reference is answered by selecting configuration: which
accent, which gray, which radius step, which spacing unit, which scaling,
which motion character. If the configuration cannot reach the look, that is
not permission to hand-style. It is a governance event that either extends
the system deliberately or declines the change. A useful side effect: taste
becomes portable. A configuration is a small object you can save, diff,
share, and push to Figma. A pile of overrides is not.

**Propagation is a guarantee, not a hope.** Saving the theme must restyle
every component. Each dimension routes through the one variable the
framework already derives from: the spacing unit sets Tailwind's core
spacing variable so every padding and height re-densifies at once; scaling
sets the root font size and everything is emitted in rem; radius flows from
one variable into the derived steps; color flows from the role map; motion
flows into the default transition. A hardcoded pixel in a component is not a
style choice. It is a propagation leak, and it is treated as a defect.
Propagation also has to be verified at the pixel, not at the variable: this
system once had radius fully wired and still visually dead, because controls
consumed a derived step large enough that the browser clamped everything to
a pill. The plumbing was perfect. The selection was wrong.

**The documentation is the control surface.** A docs page that lists the
role map in a table tells you what was decided. This system renders that
table as live controls: the documentation of a mapping is the editor of that
mapping. Anything else reopens the gap between what the system says and what
it does, which is the exact gap the architecture exists to close.

The same treatment extends to dimensions systems usually leave to judgment.
Motion has roles like color has roles (micro, control, surface, page), and a
component names the role, never a duration; one configured character and
pace re-times the whole product. Translucency collapsed roughly thirty
scattered opacity tweaks into six named recipes (glass body, glass core,
hairlines on glass, two washes, scrim), each derived from a semantic role so
the role map retints them like everything else. The rule that produced: a
look that exists as a named thing is configurable; a look that exists as
scattered utilities is folklore, and folklore cannot be changed, only
re-learned.

## 10. The anatomy: what each file is for

The architecture is not an idea in this repository. It is a specific set of
files, each with one job. This section is the map.

| File | Job |
|---|---|
| `tokens/tokens.json` | The value store. Palette, roles, type, motion, shadows, translucency recipes, the Figma connection. What the system believes, as data. |
| `packages/foundation/foundation-context.tsx` | The engine. Takes the saved configuration (accent, gray, radius, spacing, scaling, motion, orb) and compiles it into one injected style tag. Save Theme is the commit point: live edits preview, only Save persists. |
| `packages/ui/` | The product vocabulary: the primitive components (buttons, inputs, sheets, tables), consuming only roles and scale utilities. |
| `packages/ambient/` | The ambient vocabulary: the assistant layer from Part I, and everything its answers are composed from. |
| `packages/ambient/ambient-runtime.tsx` | The seam. The complete list of what the layer needs from a design system, as one interface with working defaults, so the layer renders with no providers at all. The Foundation implements this interface; the layer does not know the Foundation exists. |
| `apps/web/ … /ds-docs.tsx` | The component registry: every vocabulary component with its behavior, when to use it, and when not to. Undocumented components do not exist, as far as the system is concerned. |
| `registry.json` + `scripts/` | The distribution. Generated from the registry docs by script, never written by hand, so a component cannot be installable but undocumented, or documented but uninstallable. |
| `DESIGN.md` | The constitution. The rules, the ambient layer contract, the governance procedure, and a decision log with over 160 entries recording not just what was decided but why. |
| `CLAUDE.md` | The standing orders for the AI. The hard rules it works under in every session, with the primary rule stated first. |
| `.claude/skills/` | Three roles the AI can take on demand: a design system manager (compliance, promotion, blast radius), a product design manager (which surface fits a use case), and a product copywriter (the words, including the AI-facing documentation). |
| `figma/figma-sync.md` | The contract between code and Figma. Direction, mapping, conflict rule. |
| The gate (`npm run gate`) | Enforcement. Typecheck, lint, and build across every package, plus two drift checks: the generated registry still matches its sources, and the vendored upstream stylesheet still matches upstream. A pre-commit hook runs it, so a failing gate blocks the commit. |

Notice what the list is doing. The values are one file. The compilation is
one file. The rules are readable documents that the AI actually loads. The
docs generate the distribution. And the gate makes drift a build failure
instead of a code review comment.

One more property matters: the documentation pages render the real bytes of
these files. The docs site does not paraphrase `DESIGN.md`; it displays it.
A paraphrase is a second copy, and the second copy is always the one that
rots.

### How the governance files actually load

The rules above are only real if the AI reads them, so it is worth being
concrete about the mechanism. It has two modes.

`CLAUDE.md` loads automatically at the start of every session. The AI does
not choose to read it; the tooling injects it before any work begins. That
is what makes its rules standing orders rather than suggestions.

The skills load on demand. Each skill is a markdown file that begins with a
name and a one-paragraph description, and the description is the trigger:
the tooling shows the AI the list of descriptions, and when the work at
hand matches one, the full file is pulled into context. A skill is a role
the AI puts on. The design system manager loads for a compliance review or
a promote-or-reject call. The product design manager loads when a use case
needs a surface decision. The copywriter loads for strings and for the
AI-facing component docs. The rest of the time they cost nothing.

Because they are plain files in the repository, the rules are versioned,
diffable, and reviewable in a pull request like any other code, and they
install into another repository the same way components do.

And because they are files, they rot like files. The revision of this paper
audited all three skills against the tree and found the design system
manager's motion rule still describing the system as it was before motion
roles existed, its blast-radius instruction still searching only the app
after the vocabularies had moved into packages, and the copywriter's
reference pointing at a page that had moved. All three are fixed, and the
finding is the point: the audit practice in the next section applies to the
governance layer itself, not just to the configuration it governs.

One boundary is worth stating. The same directory also holds tool
configuration (how the agent runs the app for itself) and may hold personal
aids a contributor installs for their own writing. Those are not the
project's governance, and they stay out of the repository. The governance
is exactly four documents: the constitution and the three roles.

## 11. Building without drift

Drift needs an opening: some place where an unattached value can enter the
codebase and survive. The architecture works by closing the openings one at
a time.

**Inventing a color.** There is no place to put one. Components go through
roles; roles alias palette steps; a hex in component code fails review by
rule, and the rule is written where the AI reads it.

**Inventing a dimension.** Spacing, type, and radius come from the scales of
record through their utilities. An arbitrary value like `p-[10px]` is
illegal on sight. The nearest legal step is taken instead, out loud.

**Styling toward a reference.** Answered by configuration, never by
overrides (section 9). This is the primary rule, and it is stated first in
the constitution because it is the one most often broken with good
intentions.

**Re-implementing a near miss.** Only the two vocabularies are sanctioned.
The known gaps are documented along with what to use instead, so "we needed
a Textarea and there wasn't one" has a written answer rather than an
improvised component. A genuinely missing primitive is added through the
standard tooling, documented, and only then used.

**Novelty accumulating silently.** When work produces something that matches
no existing pattern, the build stops and a question is asked: should this
become part of the system? Promote it (implement properly, document it, log
it) or reject it (rebuild with existing patterns). Either way, the decision
is recorded. This watchlist is the mechanism that keeps a one-off from
quietly becoming the fourth kind of input in the product.

**Forgetting why.** The decision log records the reasoning, not just the
outcome, including the failures. It is institutional memory that survives
the end of any conversation, and it is the only reason a later change does
not silently undo an earlier one. Several entries in this repository's log
document the AI's own mistakes, because a rule written from one failure
predicts only that failure; the log is where rules get sharpened into
mechanisms.

**Rules drifting from behavior.** Generated artifacts are checked against
their sources on every commit. The registry cannot be hand-edited into
divergence; the vendored stylesheet cannot silently fall behind upstream;
the docs render real bytes. Where drift is possible, the gate makes it red.

**The generator itself.** The AI is not asked to generate a design system.
It is asked to update an existing, structured one, and that framing changes
everything: it is faster, because composition is cheap when every
dimensional decision is already made, and it is safer, because the model's
fluency is spent on which components and which layout rather than on
inventing values. The constitution, the skills, and the watchlist make the
AI a governed contributor with a role, not a free generator with a catalog.

One practice holds all of this together: **audit the configuration layer on
a schedule, because it rots silently.** Every individual failure is
invisible. The knob still turns, the code still compiles, the page still
looks fine. A deliberate sweep of this system found four dimensions
partially or fully disconnected: a radius ramp defeated by saturation, an
icon-library setting that only its own preview consumed, menus carrying a
hardcoded dark class from an upstream preset, and some fifty type sizes
written in raw pixels that ignored the scaling base. None were noticed by
using the product. All were found by asking one question of each dimension:
does changing this visibly change everything it claims to change?

## 12. The data layer: one token pipeline from code to Figma

Everything above describes one environment. The last piece of the
architecture is that there are two: the codebase and the Figma file, used by
different people, historically drifting apart from the day they are created.
The standard relationship between them is a screenshot and an apology.

The architecture treats them as two projections of the same data.

The pipeline has three layers, identical on both sides:

```
primitives            semantic roles              components
(the scales of        (aliases into the           (bind roles only,
record, verbatim,     primitives, chosen           never primitives)
never bend to         by the saved config)
the config)
```

In code: the palette and scales are Tailwind's, the roles are CSS variables
compiled from the saved configuration, and components consume only the
roles. In Figma: a Palette collection holds the same ramps verbatim, a
primitives collection holds the same nominal scales, and the Foundation
collection holds no numbers at all, only aliases pointing into the
primitives. Components in the Figma library bind the Foundation variables,
exactly as components in code consume the CSS roles.

The sync between them follows four rules:

**Code is master.** The token file and the saved configuration are the
source; Figma mirrors them. The sync is idempotent, so re-running it is
always safe.

**Variables only, never components.** The sync writes what things point at.
It never draws. Components on both sides bind the variables, which is what
makes one change propagate through both environments without touching a
single component.

**Derived values stay derived.** Translucency recipes are a role at an
opacity, so in Figma they are a bound paint at that opacity, not a new baked
variable. Baking the result would freeze the recipe and break retinting. The
general rule: before adding a token, ask whether the value is primitive or
derived. A derived value belongs in the thing that consumes it, pointing at
the primitive it derives from.

**Conflicts are surfaced, not steamrolled.** If a Figma variable was
hand-edited away from the payload, code wins, but every overwrite is listed
before it is applied, so a designer's deliberate exploration can be promoted
into the token file instead of destroyed. Divergence is also checkable at
any time by a read-only drift audit, which is the kind of governance an
agent can run on a schedule.

The proof this works is small and complete. Changing this system's accent
from one hue to another was six alias edits: three roles, two modes each.
The entire application re-themed. The entire Figma library re-themed. Zero
components were touched in either environment.

## 13. What one source of truth actually buys

The point of the pipeline is not tidiness. It changes how three groups work.

**Design gets a live experiment ground.** A designer works in the Figma
library against the same variables the product runs on. Swapping the accent,
the gray family, or the radius in Figma previews a real, reachable state of
the product, not a fiction. An exploration that works gets promoted into the
token file, and then it is simply true everywhere.

**Engineering stops re-implementing intent.** There is no translation step
where a mock's values get eyeballed into code, because the mock and the code
already share their values. A handoff becomes "the config changed," which is
a diff, not a meeting.

**The product gets speed.** Because the whole look is configuration, a new
product on this infrastructure starts from a fork: clone the repository,
duplicate the Figma file, connect them, set the brand's accent, gray, type,
and spacing, and begin composing with a full vocabulary from day one. The
same system produces fifty different interfaces, because the differences
between them are configuration, and experimentation costs a save instead of
a sprint.

That is the honest meaning of "one source of truth." Not one team's file
that the others defer to, but one value store that every environment
projects: the running product, the Figma library, and the documentation are
three views of the same data, and none of them can drift alone.

## 14. Where it breaks anyway

Three failures from this build are worth recording, because they attack
propagation specifically and are easy to misdiagnose as styling problems.

**Cascade layers beat specificity.** One component class set
`position: relative` in an unlayered stylesheet. The framework's utilities
live in a cascade layer, and unlayered rules win at any specificity, so that
one declaration silently overrode `fixed` positioning on every surface
wearing the class, and a docked panel detached from the viewport. The fix
was to stop declaring position and let each consumer bring its own. A design
system's own CSS can outrank the framework it is built on, in ways no
component-level reading will reveal.

**Color tokens are not strings.** The identity's color resolver normalized
colors through a canvas element, a common trick. Modern palette variables
are `oklch()`, which canvas echoes back verbatim instead of converting. The
parse produced NaN and the shader rendered gray, while every token in the
system was correct. Anything that consumes tokens outside CSS (canvas,
WebGL, charts, exports) needs a resolver that handles the actual syntax the
tokens are written in.

**Interaction state must not live in a re-subscribing closure.** A
drag-to-dock gesture re-subscribed its pointer listeners whenever the
hovered zone changed, so a release landing between subscriptions ran a stale
closure and did nothing. Intermittent, unreproducible by careful clicking,
and entirely structural.

The theme across all three: the interesting failures in a design
architecture are not in the design. They are in the seams, between the
system and its framework, between tokens and non-CSS renderers, between
state and the handlers that read it.

## 15. Take it

The environment is packaged so you can take exactly as much as you want:

- **One component.** Every documented component is individually installable
  from the registry, with its dependencies, as source you own.
- **The ambient layer.** The whole assistant from Part I, installed into
  your own app, inheriting your design system through the runtime seam.
- **The full infrastructure.** Clone the repository, duplicate the Figma
  file, connect them, configure, and build. This is the design-architecture
  starter: the engine, the vocabularies, the docs, and the governance.
- **The governance alone.** The constitution and the skill files install on
  their own, because the discipline that keeps a generator inside a system
  is useful even in a codebase that shares nothing else with this one.

MIT licensed. Built on shadcn/ui and Tailwind CSS, deliberately: the point
was never a new ecosystem, but a demonstration of what the existing one
becomes when it is treated as architecture.

## 16. What this argues for

The moves are portable, and none of them require this stack:

1. Name external scales of record and select from them.
2. Give every dimension semantic roles; forbid literals in components.
3. Answer references with configuration, never with local styling.
4. Route each dimension through the variable the framework already derives
   from, and verify propagation at the pixel.
5. Make the documentation of a mapping the editor of that mapping.
6. Extend the model to motion, translucency, and identity. They are not
   exceptions.
7. Keep code and design tooling as projections of one value store, synced by
   rule, with conflicts surfaced rather than steamrolled.
8. Record decisions with their reasoning, stop when a new pattern appears,
   and audit the configuration layer on a schedule, because it rots
   silently.
9. Treat the AI as a governed contributor updating a structured system,
   never as a generator filling a blank page.

A design system tells you what exists. A design architecture tells you what
happens when something changes. That is the only property that matters once
the interface is no longer built entirely by hand, and it is what an ambient
layer, an experimenting design team, and a generating model all turn out to
need: not a bigger catalog, but a smaller space of legal moves.

---

*This paper describes [ambientui](https://github.com/Lumenridge/ambientui),
a working environment built to test its own thesis. Every principle here was
either proved or corrected in the process of building it; the failures are
included because they were the most informative part.*
