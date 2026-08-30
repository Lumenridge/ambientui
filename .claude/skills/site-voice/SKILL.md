---
name: site-voice
description: The public site's writing voice for ambientui — the home page, the install section, section headings, page metadata, and any prose a stranger reads before they have decided to care. Use when writing or revising copy on apps/site, when a page reads as insider language, or when explaining an architectural idea to someone who has never heard of it.
---

# Site Voice

You write for a stranger. Not a teammate, not someone who has read the paper,
not someone who already agrees. Someone who arrived from a link, is deciding
in about eight seconds whether this is worth their afternoon, and has never
heard the words "ambient layer" or "design architecture" in their life.

This is a different job from [product-copy](../product-copy/SKILL.md), which
writes strings inside a product for someone already using it. Use this
skill for `apps/site` prose — including the architecture page, whose
argument now lives in `architecture-content.ts` rather than in a markdown
file. Use product-copy for UI strings and the component vocabulary.

## The test

Read the sentence as someone who does not know what this is. If the sentence
only makes sense once you already agree with it, rewrite it.

The failure mode is not bad writing. It is **accurate writing aimed at
someone who already has the context.** These were all true and all wrong:

- "Ambient UI is a decluttering of enterprise software — the system of record
  keeps every pixel of its screen."
- "The Foundation is a configuration space, not a stylesheet."
- "One presence, many forms."
- "A presence that is always available cannot have one fixed size."

Each names the conclusion of an argument the reader has not been shown.

## Five moves that do the work

**1. Name the situation before you name the solution.** You cannot tell
someone you inverted something until they know what the normal version is.

> Most products add AI by finding a spot for it: a chat tab, a sparkle
> button, a panel in the corner. Ambient UI does the opposite.

**2. Lead with what the reader gets, not what the system is.** "Knows your
context" is a property. "It knows where you are" is an experience.

**3. Describe what you see, not what it is for.** A shape is easier to
picture than a purpose.

> Resting. A small character parked at the edge of the page, doing nothing
> until you call it.

**4. Explain an idea through the moment it exists for.** Abstractions land
when they arrive attached to a situation the reader has been in.

> Someone shows you a product and says "make it feel like that". The usual
> answer is to go and adjust components until it looks close. Here you pick
> from a short menu instead.

**5. Say the mechanism only after the problem.** Lead with what drifts, what
breaks, what costs an afternoon. The mechanism is the answer to a question
the reader now has.

## Sentence rules

- One idea per sentence. If it needs a semicolon, it is two sentences.
- Everyday words. "Corner radius", not "radius window". "Grey", not "gray
  family", unless the register below requires the term.
- Say "you". The reader is a person with a codebase.
- Cut the sentence that only restates the previous one at a higher altitude.
- Em dashes are house style here and stay. Committed markdown docs
  (DESIGN.md, README.md) are the opposite: no em dashes in that prose.

## What simplicity does NOT license

**The terminology register is not jargon and does not get smoothed away.**
orb · panel · dock · spotlight · history · Foundation · product vocabulary ·
ambient vocabulary. These are the names the AI composes from and the names
`/ds` documents. Renaming them on the front page to sound friendlier puts
the marketing copy and the component vocabulary out of step, which is the
drift this whole repo exists to prevent. Simple sentences, same nouns.

**Do not simplify into a claim you cannot defend.** Plain writing tempts you
toward the strongest version of a sentence. Check it first. "There was no
way to get values from code into Figma" is punchier than what shipped and
false — Figma has had a Variables REST API for years, and the first reader
to notice is exactly the design-systems engineer you are writing for. The
defensible version keeps the real novelty and gives nobody a thread to pull:
"not just writing variables, but wiring them to a short menu of choices."

**Numbers must be read, never typed.** If a count appears (components,
accents, collections), it comes from `registry.json`, `catalog.ts` or
`tokens.ts`. A hardcoded number is a promise that rots. Also ask whether the
number earns its place at all — the Foundation's tallies were accurate, live
and removed, because a stranger meeting the idea does not yet have the
question they answer.

**Only commands that run.** Every install command on the site is a door in
`scripts/verify-install.mjs`. Do not write a new one into the page.

## Working method

1. Read the current copy and say out loud what each sentence assumes.
2. Rewrite for the stranger, applying the five moves.
3. Check every proper noun against the terminology register.
4. Check every factual claim — especially any claim about what was
   previously impossible.
5. Check every number has a source in code.
6. Run `npm run gate`. The static-HTML check asserts each indexed page still
   carries its own title, description and prose, so a copy pass that
   accidentally empties a page fails the build.
