# Global motion: a porting spec

This is the complete motion contract of ambientui, written for an agent (or
a person) rebuilding it in another repository. Read it BEFORE the shell
spec (`docs/ambient-shell-spec.md`): every timing in the shell resolves
through the system described here, and porting the shell without porting
this reintroduces the exact drift both specs exist to prevent.

The one sentence that governs everything: **no component states a duration,
an easing, or a spring. Components name a ROLE; one configuration decides
what every role feels like.** A stated "200ms" in a design request is a
request for the nearest role, the same way a stated pixel is a request for
a token.

---

## 1. The four roles

Every animated thing in the product does one of four jobs
(`packages/foundation/src/foundation-context.tsx`, `MOTION_ROLES`):

| Role | CSS token | Job |
|---|---|---|
| **micro** | `--motion-micro` | Hover, press, and focus feedback — the color and transform ticks on controls. The DEFAULT for every `transition-*` utility. |
| **control** | `--motion-control` | A control changing state — checks, switches, selection moving between items, one staged row landing. |
| **surface** | `--motion-surface` | Menus, popovers, sheets, tooltips, and the assistant's surfaces entering and leaving. |
| **page** | `--motion-page` | Section- and page-level moves — the largest transitions in the product. |

Choosing the role is the design decision. Everything after it is
configuration.

## 2. Character and pace: the whole feel is two choices

A **character** is an easing + duration + spring family. There are three,
and their numbers are the spec (durations in ms at 100% pace):

| Character | Ease (CSS bezier) | micro | control | surface | page | Spring |
|---|---|---|---|---|---|---|
| **Productive** (default) | `cubic-bezier(0.2, 0, 0, 1)` | 120 | 180 | 240 | 320 | stiffness 380, damping 32 |
| **Smooth** | `cubic-bezier(0.32, 0, 0.06, 1)` | 160 | 220 | 300 | 420 | stiffness 220, damping 30 |
| **Expressive** | `cubic-bezier(0.34, 1.36, 0.3, 1)` | 140 | 220 | 320 | 440 | stiffness 280, damping 20 |

Productive is motion you feel more than see. Smooth is longer, calmer
curves. Expressive has visible overshoot (note its bezier exceeds 1) and a
bouncier spring.

**Pace** scales all timings together: 80% Relaxed, 100% Default, 125%
Brisk. The math (`resolveMotion`):

```
timeScale = 100 / pace          // 125% pace → 0.8 timeScale → shorter
duration  = character.duration[role] × timeScale
spring    = { stiffness: s / timeScale², damping: d / timeScale }
```

The spring scaling is deliberate: dividing stiffness by timeScale² and
damping by timeScale re-times the spring while PRESERVING ITS DAMPING
RATIO — brisker, not bouncier. Port that formula exactly; naively scaling
only one of the two changes the character, not the speed.

Saving the theme re-times the entire product, including components written
before the motion system existed. Propagation applies to time.

## 3. How the values reach components (the two seams)

**CSS.** The compile step emits, per save:

```css
--motion-micro: 120ms;  --motion-control: 180ms;
--motion-surface: 240ms; --motion-page: 320ms;
--motion-ease: cubic-bezier(0.2, 0, 0, 1);
```

and the framework's own defaults are mapped onto them
(`packages/ui/src/styles/globals.css`):

```css
--default-transition-duration: var(--motion-micro, 150ms);
--default-transition-timing-function: var(--motion-ease, …);
```

So every bare `transition-colors` / `transition-all` in the codebase rides
the micro role WITHOUT naming it — this is what re-times components that
predate the system. Explicit sites name their role:
`duration-(--motion-surface) ease-(--motion-ease)`. The stylesheet also
carries static fallback values (the Productive character at default pace)
so the system degrades to sane motion when no compiled theme is present —
keep those fallbacks in a port; they are what makes the zero-provider
mount look right.

**Framer Motion** (the ONE sanctioned animation library). Consumers call:

```ts
useMotionTransition(role)  // → { duration, ease } for the saved character+pace
useMotionSpring()          // → { type:"spring", stiffness, damping }, time-scaled
```

CSS first, Framer only for what CSS cannot express: interruptible and
gestural animation, layout transitions, presence (enter/exit), springs.
One-off `@keyframes` in component files, raw durations, raw spring
configs, or a second animation library are all governance events, not
style choices.

## 4. Springs versus tweens (the rule with a reason)

For anything the USER triggers directly — opening the quick pill, dragging
the panel, a surface arriving — use the spring. A soft tween on transforms
reads as *drift*: the surface arriving late and sliding into place. A
spring reads as *response*, because it carries velocity and settles.

For EXITS, use the micro tween. A closing surface should get out of the
way immediately and unremarkably; a spring on an exit makes leaving feel
like an event.

The shell's standing convention (`assistant.tsx`):

```ts
const microT  = useMotionTransition("micro")
const enterT  = { ...surfaceSpring, opacity: microT }  // spring the geometry,
                                                       // tween the fade
exit: { …, transition: microT }
```

Enter = spring on position/scale with opacity riding a micro tween (a
spring on opacity looks like flicker). Exit = micro tween. Every surface
in the shell (pill, panel, dock, spotlight, history) uses exactly this
pair; port it as the default enter/exit for any new surface.

## 5. The identity's own clock (the one sanctioned exception)

The orb character's cadence is NOT on the role system — its springs and
per-state speeds are their own Foundation config, because the identity's
rhythm is an identity decision, not a transition. Per-state speed
multipliers (default): still 1.0 · listening 0.8 · thinking 2.8 ·
answer 0.5. The orb is also the sanctioned shader surface (with its heat
field); nothing else may use canvas/WebGL without governance.

The identity's states also pace fixed CSS loops
(`packages/ambient/src/styles/ambient.css`), keyed by `data-orb-state` on the
surface or glyph — these are deliberate literals, part of the identity,
not the role system:

| Loop | still | listening | thinking | answer |
|---|---|---|---|---|
| Live border comet (`ambient-border-spin`) | 14s | 10s, reversed | 3.2s, plus a 2.4s counter-comet | one-shot bloom (`ambient-border-bloom`) |
| Glyph core breathe | 4s | 2.4s | 1s | 1.8s |
| Glyph orbit | 3.6s | 2.2s, reversed | (faster) | — |

The pattern to keep: **listening reverses direction** (taking something
in), **thinking runs hot** (~4× faster, with a counter-rotation), and
**answer is a one-shot** that decays back to still. The shimmer ghost's
travelling highlight loops at ~2.8s.

## 6. The arrival choreography (staged reveal)

Answers are not animated in; they ARRIVE, block by block, in an enforced
order (thinking → evidence → prose → artifacts). Two primitives do all of
it:

- `useStagedReveal(count, { delay, interval, enabled, replay })` — after
  `delay` ms, items land one every `interval` ms. The stage queue gates
  blocks so nothing schedules itself.
- `StagedItem` — one item landing: `opacity 0→1` and `height 0→auto` on
  the CONTROL role, with a 6px y-settle on an inner div. Height animates
  because the row below is what the eye is resting on — a row appearing at
  full height shoves everything under it in one frame, and that jump reads
  as jank no matter how the row fades. Outer div owns the reveal (height +
  clip), inner div owns layout, so flex rows never fight the overflow
  clip. Subtle on purpose: this is reporting, not choreography.

The cadence constants, per component (delay before the first item /
interval between items, ms) — these encode how each kind of work actually
arrives, so port them as a set:

| Component | delay | interval | Why this cadence |
|---|---|---|---|
| Diff rows (CodeDiff, ReviewableDiff) | 1800–2000 | 140 | a patch lands as lines, quickly |
| Terminal output | 1600 | 700 | a process prints at process speed |
| Tool timeline steps | 2000 | 900 | one action at a time, readable |
| Parallel tool returns | 600 | 260 | went out together, come back close |
| Web search sources | 1800 | 700 | read one at a time |
| Research report sections | 2000 | 1400 | sections are written, slowly |
| Single tool result | 2200 | — | one thing, after real work |

Prose streams at the runtime's `streamCharsPerSecond` (default 60) — a
Foundation dimension, never a per-instance prop. While anything is
arriving, the surface shows elapsed seconds (a live counter), never a
count of what is planned; the thing being worked on wears the shimmer
(`ambient-shimmer` on its label), not a spinner. The quick-ask handoff
holds a fixed ~1100ms thinking beat in place before the panel takes over —
the one hand-tuned beat in the shell, sized to feel like consideration
rather than latency.

## 7. What must be true after the port (acceptance)

- [ ] No literal duration, easing, `@keyframes`, or spring config in any
      component file; roles only. (Grep for `duration-[0-9]`, `ms]`,
      `stiffness:` outside the motion engine.)
- [ ] Changing character or pace and saving visibly re-times hover ticks,
      menus, surface entries, and page moves at once — including
      components that never name a role.
- [ ] Bare `transition-*` utilities ride micro; the fallbacks render sane
      motion with no theme mounted.
- [ ] Surfaces enter on the spring with tweened opacity, and exit on the
      micro tween. Nothing user-triggered arrives on a soft tween.
- [ ] Pace preserves bounce: 125% is faster, not springier (damping ratio
      unchanged).
- [ ] Answer blocks land via the staged system in order, rows animating
      height + opacity on the control role; nothing appears at full height
      in one frame.
- [ ] The orb's states pace the border, glyph, and character together;
      listening reverses, thinking runs hot, answer blooms once.
- [ ] One perceptual check with the profiler open: a surface that "feels
      slow" on entry is usually doing WORK in those frames (shader
      compilation was the real culprit here once), not wearing the wrong
      curve. Motion quality is bounded by what else happens in the frame.
