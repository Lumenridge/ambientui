import { Icon, type IconName } from "@workspace/ui/components/icon"

/**
 * THE IDEOLOGY TAB — what an ambient layer is, and what follows from it.
 *
 * This page states the argument the rest of the repo is evidence for. It is
 * written as prose rather than a feature list on purpose: the claim is about
 * where AI belongs in an interface, and a grid of feature cards would say
 * nothing a screenshot doesn't.
 */

const PRINCIPLES: {
  icon: IconName
  title: string
  line: string
  body: string
}[] = [
  {
    icon: "sparkles",
    title: "A presence, not a page",
    line: "The assistant is somewhere, not somewhere else.",
    body: "Sending a user to a chat page to ask about the thing they were just looking at costs them the thing they were just looking at. The ambient layer sits above the product and keeps its place — the question is asked where the work is.",
  },
  {
    icon: "sidebar",
    title: "One presence, four shapes",
    line: "Modes are geometry, not sessions.",
    body: "Orb, panel, dock, spotlight — one conversation, one state, one context throughout. A surface changes size to match how much attention the moment deserves; it never becomes a different assistant.",
  },
  {
    icon: "arrow-up",
    title: "Position states intent",
    line: "Drag is the mode switcher.",
    body: "There is no mode menu and there should never be one. Docking says stay beside my work. Centering says I'm asking one thing. Dropping it loose says keep this, out of my way. The affordance appears exactly while it is relevant.",
  },
  {
    icon: "link",
    title: "Context is declared, not guessed",
    line: "The assistant can see what the chips say it can see.",
    body: "Pages declare what they are about, and anything can be right-clicked into the conversation. What grounds an answer is visible before the question is asked, and removable after.",
  },
  {
    icon: "check",
    title: "Provenance over confidence",
    line: "A claim carries its evidence.",
    body: "Tool calls collapse to what they did with the request and result one click away; searches show the query, not just the results; a citation binds a source to the sentence it supports. Trust is offered as something to check.",
  },
  {
    icon: "settings",
    title: "It inherits your system",
    line: "Every pixel comes from the same tokens.",
    body: "The layer has no palette, no type scale, and no motion of its own. Change the Foundation's accent and the assistant changes with it — because it was never a second design system bolted on top.",
  },
]

export function AmbientLayerView() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-14">
      <header className="flex flex-col gap-4">
        <span className="text-muted-foreground font-mono text-xs tracking-wide uppercase">
          The ambient layer
        </span>
        <h1 className="text-3xl leading-tight font-semibold text-balance">
          AI belongs on top of the product, not beside it.
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Most AI features are a room you go to. You leave what you were
          doing, describe it from memory to something that cannot see it, and
          carry the answer back by hand. The ambient layer is the other
          arrangement: a presence that lives above the interface, already
          holding the context you would have had to describe, reachable
          without going anywhere.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          What follows from that
        </div>
        <div className="border-border divide-border bg-card divide-y rounded-xl border">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="flex gap-4 px-4 py-4">
              <span className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Icon name={p.icon} size={15} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium">{p.title}</span>
                  <span className="text-muted-foreground text-xs italic">
                    {p.line}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          The harder claim
        </div>
        <div className="text-muted-foreground flex flex-col gap-3 text-sm leading-relaxed">
          <p>
            An assistant that can only talk is a chat window. An assistant
            worth putting above a product has to be able to{" "}
            <strong className="text-foreground">build</strong> — compose a
            view, propose a change, render the answer as an object rather than
            a paragraph. That is where it usually goes wrong: given a blank
            canvas, a model invents. It reaches for a hex code that is on no
            scale, a spacing value that matches nothing, a component shaped
            almost like one you already have.
          </p>
          <p>
            <strong className="text-foreground">
              So the interesting problem is not the assistant. It is the
              system underneath it.
            </strong>{" "}
            AI can build product UI safely only when it composes from a
            governed vocabulary — a fixed set of tokens, components, and
            patterns, each documented with what it is for and when not to use
            it — instead of inventing outside it. Give it that, and a
            reference stops being a request to draw something new: it becomes
            a request for a <em>configuration</em>.
          </p>
          <p>
            This whole environment is that argument applied to itself. The
            Foundation is the configuration surface. The design system is the
            vocabulary. The ambient layer is what an assistant looks like when
            it is only allowed to speak that vocabulary — and the next tab is
            a product using it.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Try it here
        </div>
        <div className="text-muted-foreground flex flex-col gap-2 text-sm leading-relaxed">
          <p>
            The assistant on this page is the real one, not a video. Press{" "}
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              ⌘K
            </kbd>{" "}
            to summon it from anywhere, click the orb to ask without opening a
            surface, or drag the orb to move it. Drag the panel to the right
            edge to dock it, or to the top to turn it into the palette.
          </p>
          <p>
            Everything it renders — the streaming text, the reference chips,
            the diffs and tool calls in the next tab — is a documented
            component in{" "}
            <code className="font-mono text-xs">/ds</code>. Nothing it draws
            was invented for the occasion.
          </p>
        </div>
      </section>
    </div>
  )
}
