# Design Architecture

**What a design system has to become before an AI can build inside it.**

---

## 1. The problem is not generation

An AI can produce a competent interface in seconds. Ask for a settings page and
you get a settings page: sensible hierarchy, reasonable spacing, plausible
colors. The output is not the problem.

The problem is that the output is *unattached*. It has a padding of `18px`
because 18 looked right, a border that is `#e5e5e5` because that is a common
border, a hover state that fades over `200ms` because 200 is a normal number.
None of those values are wrong. All of them are **inventions** — decisions made
at the point of generation, disconnected from every other decision in the
product.

Do this a hundred times and you have not built a product. You have built a
hundred small, undocumented design systems that happen to sit next to each
other. The interface looks consistent until the day something has to change,
and then it becomes clear that nothing was ever connected to anything.

This failure mode is not specific to AI. Human teams produce it too, slowly.
AI simply removes the friction that used to slow it down — and in doing so,
exposes the real gap: most design systems are documentation, and documentation
is advice. Advice does not constrain a generator.

What constrains a generator is **architecture**.

## 2. Design system versus design architecture

A design system is usually understood as an inventory: tokens, components,
guidelines, a Figma library, a docs site. It answers *what exists*.

Design architecture answers a different question: **what happens when something
changes?** It is the structure that determines whether a decision made once
propagates everywhere it should, and whether a decision made in the wrong place
is even possible to express.

The distinction is practical. In an inventory-shaped system, "we're changing
the corner radius" is a migration. In an architecture-shaped system, it is a
value. In an inventory-shaped system, an AI composing a screen has a catalogue
to browse and infinite freedom in between the catalogue entries. In an
architecture-shaped system, the space between the entries does not exist.

Everything below comes from building one — a working environment, not a
proposal — and from watching where it held and where it silently failed.

## 3. Five structural moves

### 3.1 Adopt scales of record; do not invent them

The first instinct when building a system is to author its scales: a custom
spacing ramp, a bespoke type scale, a house palette with clever names. This is
almost always wasted, and worse, it is *fragile* — a hand-authored scale has no
external validation and no ecosystem.

The alternative is to name an existing scale as the scale of record and select
from it. In this environment, the scales of record are Tailwind's: the full
color palette, the spacing scale, the type ramp, the shadow steps. The design
system does not invent alternatives. It **selects**.

This has a consequence that seems minor and is not: it makes "a stated pixel is
a request for a token" enforceable. When someone says "16px padding", there is
exactly one legal answer (`p-4`) and no negotiation. When a value has no exact
step, the rule is to take the nearest legal step and *say which one you picked*
— surfacing the approximation instead of silently inventing precision.

The scale being external also means the AI already knows it. There is no
translation layer between what the model has seen a million times and what this
system permits.

### 3.2 Roles over values

Components must never name a color. They name a **job**.

A role map is the complete list of those jobs — in this system, twelve of them:
the action color, the focus ring, the page background, primary text, the raised
surface, the quiet fill behind hover and selection, secondary text, hairline
borders, field borders, the sidebar ground, and so on. Each role resolves to a
configurable step on the accent hue or the gray family.

The value of this is not indirection for its own sake. It is that **roles
survive change and raw values do not.** "A softer grey for that caption" is
`text-muted-foreground`, and it stays correct when the gray family changes from
zinc to slate, when the theme flips to dark, when the accent moves from blue to
violet. The same instruction expressed as `text-gray-400` is correct exactly
once, and quietly wrong forever after.

Two refinements mattered more than expected:

**Roles need plain-language descriptions, not just names.** A configuration
surface listing `--muted-foreground` is documentation for someone who already
knows. Listing "Secondary text — supporting copy: descriptions, captions,
placeholders, section labels" is documentation for someone deciding. The
descriptions live in the role definitions themselves, so the code and the
editor cannot drift apart.

**One decision should produce its consequences.** Light and dark are both
first-class, but they are not two independent decisions. Picking a role's light
step derives its dark counterpart automatically — gray roles mirror across the
scale, accent roles preserve their designed offset — while an explicit dark
pick still overrides. The person configuring makes one judgment; the system
handles the symmetry. Customization stays one click away without being the
default path.

### 3.3 A reference is a request for a configuration

This is the rule that changes how AI collaboration works, and it is the one
most likely to be rejected on first hearing.

When someone points at another product — a screenshot, a link, "make it feel
like this" — the reflex is to style toward the reference. Adjust this
component's padding, that component's border, this shade of gray. The result
looks closer and *is* further away: a set of local overrides that no longer
belong to any system.

The rule inverts it. A reference is a request for a **configuration**: which
accent, which gray family, which radius step, which spacing unit, which
scaling, which motion character. The answer to "make it feel like Linear" is a
saved config — indigo accent, gray family, 4px radius, default grid, 95%
scaling — not a diff across twenty components. If the configuration cannot
reach the look, that is not permission to hand-style; it is a governance event
that either extends the system deliberately or declines the change.

In practice this held even for demanding references. Matching a
reference-grade command palette meant deepening a glass recipe, adding one
translucency token, and correcting a selection color from accent to neutral —
three system-level changes that improved every AI surface at once, rather than
one bespoke palette that improved nothing else.

The rule also produces a useful side effect: it makes taste **portable**. The
configuration is a small, inspectable object. It can be saved, diffed, shared,
and pushed to Figma. A pile of component-level overrides cannot.

### 3.4 Propagation is a guarantee, not a hope

A configuration layer is only real if changing it visibly changes the product.
This sounds obvious and is routinely violated, because propagation is easy to
*claim* and hard to *verify*.

The architectural move is to route each dimension through the single variable
that the entire framework already derives from:

- The spacing unit sets Tailwind's core `--spacing`, so every `p-4`, `gap-2`,
  and `h-9` in every component re-densifies at once.
- Scaling sets the root font size, and every dimension is emitted in rem, so
  one base-size choice re-derives type, spacing, and radius together.
- Radius flows from `--radius` into the derived steps components actually use.
- Color flows from the role map into every semantic token and its aliases.
- Motion — see below — flows into the default transition duration and easing,
  so utilities that were written before the motion system existed still obey it.

The rule that governs all of this: **saving the theme must restyle every
component.** A hardcoded pixel in a component is not a style choice; it is a
propagation leak, and it is treated as a defect.

Two discoveries sharpened this into something stronger.

The first: **a configuration dimension that does not visibly propagate is
indistinguishable from a broken one.** A shadow/elevation control was built,
looked reasonable, and moved almost nothing on screen, because elevation is
chosen per surface by meaning rather than set globally. The correct response
was not to make the knob louder — it was to delete the knob and document the
scale instead. Not every dimension deserves to be configurable. The test is
whether changing it produces a visible, system-wide consequence.

The second, from the same period: propagation can be **defeated by
saturation.** Radius was fully wired — config to `--radius` to derived steps to
components — and yet most of the ramp appeared dead. The cause was that
controls consumed the largest derived step, which for a control-height element
exceeds half its height, so the browser clamps it to a pill. Steps 8 through 24
all rendered identically. The plumbing was perfect; the *selection* was wrong.
Propagation must be verified at the pixel, not at the variable.

### 3.5 The documentation is the control surface

The last move is the smallest change in code and the largest change in posture.

A system that documents its role map with a table of variable names is telling
you what it decided. A system that renders that table as **live dropdowns with
swatches** lets you decide. Same information, opposite relationship.

Once the mapping became editable in place, a second question answered itself:
where should it live? Initially in the color documentation, next to the palette
— logical, and wrong. All theme decisions belong on one surface, or the "single
source of truth" is a claim rather than a place. The editor moved into the
Foundation page, and the color page kept the palette reference and a pointer.

The principle generalizes: **in this kind of product, documentation of a
mapping is the mapping's editor.** Anything else re-introduces the gap between
what the system says and what the system does — which is precisely the gap the
architecture exists to close.

## 4. Extending the model to things systems usually leave out

Color and spacing are the conventional scope. Two dimensions that are usually
left to individual judgment turned out to be structurally identical, and both
benefited from the same treatment.

### Motion

Most systems specify motion as guidance: "use 200ms for small transitions." An
AI, or a hurried human, reads that as a number to type.

Treated as architecture, motion has roles exactly like color has roles. Four of
them proved sufficient: **micro** (hover, press, focus — the default for every
transition utility), **control** (checks, switches, selection moving),
**surface** (menus, popovers, sheets entering and leaving), and **page**
(section- and page-level moves). Components name the role. They never state a
duration.

What a role *feels* like is then one configuration: a **character** (an easing,
duration, and spring family — Productive, Smooth, Expressive) and a **pace**
that scales all timings together. Saving re-times the entire product, including
components written before the system existed, because the framework's default
transition duration and easing were mapped onto the micro role.

The audit that followed the build was instructive: the assistant — the most
animated part of the product — had **no transitions at all.** Every mode change
was a hard cut. Nobody had noticed, because there was no rule that made its
absence visible. A motion system does not only standardize motion; it makes
missing motion legible.

Two further lessons came from making it feel right, and both are about
mechanism rather than taste:

- A soft tween on transforms reads as *drift* — the surface arriving late and
  sliding into place. A spring reads as *response*. For anything the user
  triggers directly, springs carry velocity and settle; tweens lag.
- Perceived lag is often not the curve at all. A surface that felt sluggish
  turned out to be compiling WebGL shaders during its entrance frames. The
  animation was correct; the frames were busy. **Motion quality is bounded by
  what else is happening in those frames** — a scheduling problem wearing a
  design problem's clothes.

### Translucency

Glass, washes, scrims, and hairline tints are typically expressed inline, per
component, as opacity modifiers: `/40` here, `/70` there, an ad-hoc color mix in
a third place. Roughly thirty such expressions had accumulated in this
codebase — every one a small, invisible design decision.

Collapsed into tokens, thirty decisions became six: the glass body, the glass
core, hairlines on glass, the neutral wash for fills *on* glass, the quiet
accent wash, and the scrim. All derived from semantic roles, so the role map
retints them like everything else.

The general rule this produced: **a look that exists as a class is
configurable; a look that exists as scattered utilities is folklore.** Folklore
cannot be changed, only re-learned.

## 5. Identity as a system, not an asset

The most AI-specific part of this environment is the assistant's presence, and
it produced the most transferable idea.

The obvious way to give an AI a face is to make a mascot: an animated object
that sits in a corner. The architectural way is to treat identity as **a state
machine with multiple bodies.**

One machine drives four states — still, listening, thinking, answer — and those
states render simultaneously as: the orb character itself; a comet traveling
each AI surface's border; the surface's *background*, so the glass is made of
the identity; and the marks that sign each answer. The user never sees four
animations agreeing with each other. They see one thing, present in several
places.

Two constraints made this survivable, and both are cost decisions expressed as
design decisions:

**Identity lives at identity scale.** Full fidelity (a shader) at 52px where
the character is the subject; a pure-CSS twin at 20px where it is a bullet
point next to text. The twin shares the anatomy — same glass shell, same core,
same state pacing — and costs nothing. The rule that came out of it: at glyph
scale, the anatomy *is* the identity. Detail nobody can see is not detail; it
is expense.

**Only the live instance is expensive.** In a conversation, the newest answer
wears the real character; settled answers fall back to the twin. Cost is
bounded by what is happening, not by how long the user has been talking.

## 6. Config layers rot, so audit them

The most durable finding of this build is not a principle. It is a practice.

A configuration layer decays *silently*, because each individual failure is
invisible: the knob still turns, the code still compiles, the page still looks
fine. An audit of this system's config layer — a deliberate sweep, not a bug
report — found four separate dimensions that were partially or entirely
disconnected:

- **Radius** was wired but saturated (above).
- **The icon library** choice compiled and persisted correctly, but only the
  Foundation page's own preview strips consumed it. Every primitive in the
  component library imported icons directly. The knob turned and moved almost
  nothing.
- **Dropdown menus** carried a hardcoded dark class from an upstream preset, so
  they ignored both the appearance setting and the role map — in a system whose
  central claim is that the role map governs color.
- **Roughly fifty type sizes** were expressed as arbitrary pixel values, which
  meant they did not ride the scaling base — the one dimension declared to be
  the base layer of everything.

None of these were noticed by using the product. All of them were found by
asking one question of each dimension: *does changing this visibly change
everything it claims to change?*

That question deserves to be a scheduled practice, not an instinct. A config
layer that is never audited is a config layer that is slowly becoming
decoration.

## 7. What actually breaks

Three failures during this build were not design failures at all. They are
worth recording because they are the failure modes that *specifically* attack
propagation, and they are easy to misdiagnose as styling problems.

**Cascade layers beat specificity.** A component class was added that set
`position: relative` so a decorative ring could anchor to it. The stylesheet
containing it is unlayered; the framework's utilities live in a cascade layer.
Unlayered rules win over layered ones *at any specificity* — so that one
innocuous declaration silently overrode `.fixed` on every surface wearing the
class, and a docked panel quietly detached from the viewport. Lowering
specificity did not help, because specificity was never the mechanism. The fix
was to stop declaring position at all and let each consumer bring its own.

The general form: **a design system's own CSS can outrank the framework it is
built on, in ways that no component-level reading will reveal.**

**Color tokens are not strings.** The identity's color resolver normalized any
CSS color to hex by assigning it to a canvas and reading it back — a common
trick. Modern palette variables are `oklch()`, which canvas echoes back
verbatim rather than converting. The hex parse produced `NaN`, and the shader
rendered gray. Every color in the system was correct; the bridge between the
token layer and the rendering layer was not. Anything that consumes tokens
outside CSS — canvas, WebGL, a chart library, an export — needs a resolver that
handles the *actual* syntax the tokens are written in.

**Interaction state must not live in a re-subscribing closure.** A drag-to-dock
gesture re-subscribed its pointer listeners each time the hovered zone changed,
so a release that landed between subscriptions ran a stale closure and did
nothing. Intermittent, unreproducible by clicking carefully, and entirely
structural.

The theme connecting all three: the interesting failures in a design
architecture are not in the design. They are in the seams — between the system
and its framework, between tokens and non-CSS renderers, between state and the
handlers that read it.

## 8. Why this makes AI collaboration work

Everything above is good practice for a human team. For an AI collaborator it
is the difference between usable and unusable output, for a specific reason:
**an AI will always fill an unconstrained space with something plausible.** It
cannot decline to choose. Given no legal radius steps, it will pick a number.
Given no motion roles, it will type a duration. Given no role map, it will
reach for a gray.

An architecture that leaves no unconstrained spaces converts that behavior from
a liability into an asset. The model's fluency gets spent on *composition* —
which components, which layout, which copy — while every dimensional decision
resolves to a value the system already made.

Three practices carry this in the environment built here:

- **A written constitution the agent works under**, distinguishing hard rules
  from guidance, with the primary rule stated first.
- **A decision log that records the why**, not just the what. Every entry in
  this system's log names the decision and the reasoning — often quoting the
  moment the decision was demanded. It is institutional memory that survives
  the end of a conversation, and it is the only reason a later change does not
  quietly undo an earlier one.
- **A pattern watchlist.** When work produces something that does not match an
  existing pattern, the agent stops and asks whether it should become part of
  the system. On yes: implement in the proper vocabulary, document it, log it.
  On no: rebuild with existing patterns. This is the mechanism that keeps
  novelty from accumulating as debt — and it is what turned a one-off page rail
  into a documented component, and what kept a filled input pill from becoming
  the fourth kind of input in the product.

The result is not an AI that designs. It is an AI that **composes from a system
whose decisions have already been made** — and a human who spends their
attention on the decisions worth making.

## 9. What this argues for

Design systems are converging on the wrong artifact. The component library and
the documentation site are outputs; the architecture is what determines whether
those outputs stay true a year later, and whether a generator can be trusted
inside them.

The moves are portable, and none of them require this stack:

1. Name external scales of record and select from them.
2. Give every dimension semantic roles; forbid literals in components.
3. Answer references with configuration, never with local styling.
4. Route each dimension through the variable the framework already derives
   from, and verify propagation at the pixel.
5. Make the documentation of a mapping the editor of that mapping.
6. Extend the model to motion, translucency, and identity — they are not
   exceptions.
7. Audit the config layer on a schedule, because it rots silently.
8. Record decisions with their reasoning, and stop when a new pattern appears.

A design system tells you what exists. A design architecture tells you what
happens when something changes — and that is the only property that matters
once the interface is no longer built entirely by hand.

---

*This paper describes [ambientui](https://github.com/Lumenridge/ambientai), a
working environment built to test its own thesis. Every principle here was
either proved or corrected in the process of building it; the failures are
included because they were the most informative part.*
