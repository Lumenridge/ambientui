import { Button } from "@workspace/ui/components/button"

import {
  useAssistant,
  type AssistantMode,
} from "@ambientui/ambient/assistant-context"

/**
 * The Form factors page: the ambient layer's surface model — four modes of
 * one assistant, what each is for, and how you move between them. This is
 * the contract (DESIGN.md §8), not a component gallery: the surfaces are
 * global, so the page drives the real one rather than rendering copies.
 */

const FORMS: {
  mode: AssistantMode
  name: string
  line: string
  purpose: string
  reach: string
  leaves: string
}[] = [
  {
    mode: "line",
    name: "Orb",
    line: "Present, not open.",
    purpose:
      "The resting state: the assistant is on the page, watching nothing, costing nothing. It is the only mode with no surface — the character alone, docked at one of eight anchors.",
    reach: "Where every other mode returns to. Drag it anywhere.",
    leaves: "⌘K, or drag it into a zone.",
  },
  {
    mode: "line",
    name: "Quick ask",
    line: "Ask without arriving anywhere.",
    purpose:
      "The orb's own expanded form: clicking grows an input out of the character, sharing its glass and its live border. It opens IN the zone the orb is docked to — centered on that anchor rather than hanging off the orb's edge, and clamped into the content region so a corner never pushes it off-screen. The orb keeps its side: docked right, it becomes the right end of the form and the input extends leftward. A question costs no surface, no travel, and no mode change until there is an answer to hold.",
    reach: "Clicking the orb. The character turns to listening as it opens. A history control sits BESIDE the pill rather than inside it — the pill is one object (the character and the field it grew), and a second control within it would make it two.",
    leaves:
      "Clicking the orb again, clicking anywhere else, or Esc. Asking holds the thinking here — the question stays where it was asked, the character churns in place — and hands over to the panel at the moment the answer is ready.",
  },
  {
    mode: "panel",
    name: "Panel",
    line: "A conversation you keep.",
    purpose:
      "A floating, draggable window — the only mode that persists while you work. Answers accumulate; the transcript is the point.",
    reach: "Asking anything, from any mode.",
    leaves: "Drag it: to the right edge it docks, to the top-center it becomes the palette.",
  },
  {
    mode: "dock",
    name: "Dock",
    line: "A conversation beside the work.",
    purpose:
      "The panel, anchored full-height to the edge. Same conversation, but the page reflows around it instead of being covered — for work done with the assistant rather than in it.",
    reach: "Dragging the panel into the right zone.",
    leaves: "Dragging its header detaches it back into a panel, under the cursor.",
  },
  {
    mode: "spotlight",
    name: "Spotlight",
    line: "Find or ask, from anywhere.",
    purpose:
      "The command palette: one input that searches the product and asks the AI, centered and global. Documented in full under CommandPalette.",
    reach: "⌘K anywhere, or dragging the panel to the top-center zone.",
    leaves: "⌘K or Esc; asking transforms it in place into the answer view.",
  },
  {
    mode: "history",
    name: "History",
    line: "The record, not an exchange.",
    purpose:
      "The only mode that takes the whole screen, because it is the only one that is not about a single answer. The other four are sized to how much attention one exchange deserves; this one answers a different question — what have I asked here — and that is the question that legitimately wants the room. It stays translucent over the product rather than navigating away, because the work you were doing is the reason you opened the record. The conversation you are currently having appears in the list too, marked open and shimmering while it runs: a record that omitted the session on screen would be the strangest possible omission. Picking any row opens it IN PLACE — the record is somewhere you can work, not a launcher that ejects you — and asks the question again rather than restoring a transcript, which is what the layer can honestly offer today.",
    reach: "The history control, offered wherever a conversation lives: beside the quick-ask pill, in the panel header, and in the spotlight's answer view.",
    leaves: "Close or Esc goes all the way to rest — dropping a full-screen surface into a floating panel would leave two things open when the user asked to put one away. The header also offers the panel and the dock, for keeping the conversation while putting the record down.",
  },
]

export function FormFactorsPage() {
  const { mode, setMode } = useAssistant()

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <h1 className="text-xl font-semibold">Form factors</h1>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        One assistant, a handful of surfaces. The ambient layer is not five features —
        it is a single presence that changes shape to match how much of your
        attention the moment deserves, from a resting orb to a full command
        palette. Every mode shares one state, one identity, and one context;
        only the geometry changes.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            The forms
          </div>
          <div className="border-border divide-border bg-card divide-y rounded-xl border">
            {FORMS.map((f) => (
              <div key={f.name} className="px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{f.name}</span>
                    <span className="text-muted-foreground text-xs italic">
                      {f.line}
                    </span>
                  </div>
                  {f.name === "Quick ask" ? (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      click the orb
                    </span>
                  ) : (
                    <Button
                      size="xs"
                      variant={mode === f.mode ? "secondary" : "outline"}
                      onClick={() => setMode(f.mode)}
                    >
                      {mode === f.mode ? "Current" : "Switch"}
                    </Button>
                  )}
                </div>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  {f.purpose}
                </p>
                <div className="text-muted-foreground/80 mt-2 flex flex-col gap-0.5 text-xs">
                  <div>
                    <span className="font-medium">Reached by</span> — {f.reach}
                  </div>
                  <div>
                    <span className="font-medium">Leaves by</span> — {f.leaves}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            Switching here drives the real assistant — these are global
            surfaces, so the page shows you the actual thing rather than a
            picture of it.
          </p>
        </section>

        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Drag is the mode switcher
          </div>
          <div className="text-muted-foreground flex flex-col gap-2 text-sm leading-relaxed">
            <p>
              There is no mode menu, and there should never be one. Moving the
              surface <em>is</em> choosing its form: drag the panel to the
              right edge to dock it, to the top-center to become the palette,
              anywhere else to float. Zones appear only while dragging, so the
              affordance exists exactly when it is relevant.
            </p>
            <p>
              This is the ambient layer's core interaction claim:{" "}
              <strong className="text-foreground">
                the user positions the assistant, and the position states the
                intent.
              </strong>{" "}
              Docking says "stay beside my work." Centering says "I'm asking
              one thing." Dropping it loose says "keep this conversation, out
              of my way."
            </p>
          </div>
        </section>

        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Where a form opens
          </div>
          <div className="text-muted-foreground flex flex-col gap-2 text-sm leading-relaxed">
            <p>
              <strong className="text-foreground">
                Opening never relocates the assistant.
              </strong>{" "}
              A form appears where the user last put it: quick ask opens in
              the orb's own zone, the panel opens where it was left, the dock
              stays on its edge. Only the palette is deliberately global,
              because it is summoned by a key rather than by touching a
              surface.
            </p>
            <p>
              Within its zone, a form <em>centers on the anchor</em> rather
              than hanging off the object that opened it, and clamps into the
              content region — so a corner-docked orb still produces a form
              that reads as placed, not as spilling off the edge.
            </p>
            <p>
              Direction follows the side: an assistant docked right opens
              leftward and vice versa. The character stays put; the surface
              grows away from the nearest edge.
            </p>
          </div>
        </section>

        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            What every form shares
          </div>
          <div className="text-muted-foreground flex flex-col gap-2 text-sm leading-relaxed">
            <p>
              <strong className="text-foreground">One conversation.</strong>{" "}
              Modes are geometry, not sessions — asking in the bar, continuing
              in the panel, and docking it are one thread throughout.
            </p>
            <p>
              <strong className="text-foreground">One context.</strong> Pages
              declare what they are about, and the current page rides along as
              a chip in whichever surface is open; right-clicking anything
              attaches it as another.
            </p>
            <p>
              <strong className="text-foreground">One identity.</strong> The
              orb's four states drive every surface at once — the character,
              the comet in the border, the heat field behind the glass, and the
              marks that sign each answer.
            </p>
            <p>
              <strong className="text-foreground">One glass.</strong> Every
              surface wears the same recipe (see Translucency), and no ambient
              surface defines its own blur or tint.
            </p>
            <p>
              <strong className="text-foreground">One set of objects.</strong>{" "}
              Whatever the form, an exchange renders as a MessagePair —
              UserMessage above, the answer below, its text arriving through
              StreamingText and its grounding shown as ReferenceChips. A form
              factor decides where the conversation sits and how big it is; it
              never decides what a message looks like.
            </p>
          </div>
        </section>

        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            The contract
          </div>
          <div className="text-muted-foreground flex flex-col gap-2 text-sm leading-relaxed">
            <p>
              These are the whole surface vocabulary of the ambient layer
              (DESIGN.md §8). Another one is a governance event, not a
              feature: if a use case doesn't fit, the question is which
              existing form it belongs to, and only then whether the
              vocabulary should grow.
            </p>
            <p>
              <strong className="text-foreground">Quick ask is the orb's
              state, not a sixth mode.</strong> The machine still has five
              modes; hovering expands the resting form in place rather than
              switching to a new one. That is the rule for growth here —
              extend a form before adding one, and only add when the new
              surface would have its own lifecycle.
            </p>
            <p>
              Two standing prohibitions, both from decisions already made: no
              glow effects on any ambient surface, and no mode may introduce a
              blur, tint, or motion timing of its own — glass comes from the
              recipe, timing from the motion roles.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
