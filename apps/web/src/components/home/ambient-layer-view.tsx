import * as React from "react"

import { Button } from "@ambientui/ui/components/button"
import { Icon, type IconName } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"

import { InstallSection } from "@/components/home/install-section"

import { useAssistant } from "ambientui/assistant-context"
import { Composer } from "ambientui/composer"
import { OrbGlyph } from "ambientui/orb-character"
import {
  FollowUpSuggestions,
  MessageAttachments,
  ReasoningPanel,
} from "ambientui/message-kit"
import { ReferenceChips } from "ambientui/response-kit"
import {
  ReviewableDiff,
  ToolCall,
  ToolTimeline,
} from "ambientui/tool-kit"
import { InlineCitation, WebSearch } from "ambientui/knowledge-kit"

/**
 * THE ARGUMENT, MADE WITH ITS OWN EVIDENCE.
 *
 * Every interface on this page is the real thing, running: the reasoning
 * panels, tool calls, searches and diffs are the same components the
 * assistant renders in the dev tool, rendered settled rather than staged.
 * A page arguing that the assistant should be built from the product's own
 * system, illustrated with pictures of one, would argue against itself.
 *
 * The four form factors are the deliberate exception. What they illustrate is
 * GEOMETRY — where a surface sits and how much room it takes from the work —
 * so each is drawn as a scaled interface with the real components inside it.
 * Live surfaces would show their contents, which is the one thing that
 * section is not about.
 */

const REPO_URL = "https://github.com/Lumenridge/ambientui"

/* ------------------------------ primitives ------------------------------ */

/**
 * THE SECTION STATEMENT. One paragraph, not a heading plus a body: the lead
 * sentence is the claim and the rest is the qualification, and splitting them
 * into two blocks makes the reader treat the qualification as optional.
 */
function Statement({
  lead,
  children,
}: {
  lead: string
  children: React.ReactNode
}) {
  return (
    <p className="max-w-3xl text-2xl leading-snug tracking-tight text-balance">
      <span className="font-semibold">{lead}</span>{" "}
      <span className="text-muted-foreground">{children}</span>
    </p>
  )
}

/** The small uppercase caption under a visual. */
function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-center font-mono text-xs tracking-wide uppercase">
      {children}
    </p>
  )
}

/**
 * An interface, framed. Everything inside is a real component; the frame is
 * what says "this is a surface" without pretending to be a screenshot.
 */
function Frame({
  children,
  className,
  bare = false,
}: {
  children: React.ReactNode
  className?: string
  /** Skip the inner padding when the child IS the interface. */
  bare?: boolean
}) {
  return (
    <div
      className={cn(
        "border-border bg-card overflow-hidden rounded-2xl border shadow-sm",
        !bare && "p-6",
        className
      )}
    >
      {children}
    </div>
  )
}

/** A window chrome strip, so a framed interface reads as a surface. */
function Chrome({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="border-border bg-sidebar flex items-center gap-2 border-b px-3 py-2">
      <span className="bg-primary size-2 shrink-0 rounded-full" />
      <span className="min-w-0 truncate text-sm font-medium">{title}</span>
      {right && <span className="ms-auto shrink-0">{right}</span>}
    </div>
  )
}

function Section({
  lead,
  body,
  children,
  caption,
}: {
  lead: string
  body: string
  children?: React.ReactNode
  caption?: string
}) {
  return (
    <section className="flex flex-col gap-10">
      <Statement lead={lead}>{body}</Statement>
      {children}
      {caption && <Caption>{caption}</Caption>}
    </section>
  )
}

/* -------------------------------- forms --------------------------------- */

/**
 * The four shapes, each shown in the state that makes its geometry legible:
 * resting, holding a conversation, sharing the layout, and taking the centre.
 * Numbered because they are one thing at four sizes, not four features.
 */
const FORMS: {
  n: string
  name: string
  line: string
  body: string
  state: string
  visual: React.ReactNode
}[] = [
  {
    n: "01",
    name: "Orb",
    line: "A presence, at rest",
    state: "State: idle, then listening",
    body: "It sits over the product and does nothing until you look at it. Hovering grows an input out of the character itself, so a quick question costs no surface and no travel.",
    visual: (
      <div className="flex flex-col items-center gap-3 py-2">
        <OrbGlyph size={44} />
        <div className="border-(--glass-border) bg-background flex h-11 w-64 items-center gap-3 rounded-full border px-4 shadow-sm">
          <OrbGlyph size={20} />
          <span className="text-muted-foreground text-sm">Ask ambientui…</span>
        </div>
      </div>
    ),
  },
  {
    n: "02",
    name: "Panel",
    line: "A conversation you can put down",
    state: "State: answering, with its evidence",
    body: "Dropped loose over the work. It keeps its position, its context and its transcript, and its header names what you are working on rather than the product you are already inside.",
    visual: (
      <div className="border-border bg-background w-full max-w-xs overflow-hidden rounded-xl border shadow-md">
        <Chrome title="Fix the lost-draft bug" />
        <div className="flex flex-col gap-2 p-3">
          <ToolCall verb="Read the surrounding implementation" staged={false} />
          <p className="text-sm leading-relaxed">
            The draft lives in this component&apos;s own state, so it dies with
            the component.
          </p>
        </div>
      </div>
    ),
  },
  {
    n: "03",
    name: "Dock",
    line: "Beside the work, not over it",
    state: "State: pinned, the editor reflowed",
    body: "Dragged to the right edge it becomes a column of the layout: the editor makes room instead of being covered. Both are fully visible, which is the only arrangement in which you can act on what it says.",
    visual: (
      <div className="border-border bg-background flex h-40 w-full max-w-xs gap-2 overflow-hidden rounded-xl border p-2 shadow-md">
        <div className="border-border bg-(--wash-strong) flex flex-1 flex-col gap-1.5 rounded-lg border p-2">
          <div className="bg-muted-foreground/20 h-1.5 w-4/5 rounded-full" />
          <div className="bg-(--positive-wash) h-1.5 w-full rounded-full" />
          <div className="bg-muted-foreground/20 h-1.5 w-2/3 rounded-full" />
          <div className="bg-muted-foreground/20 h-1.5 w-3/4 rounded-full" />
        </div>
        <div className="border-border bg-card flex w-24 flex-col gap-1.5 rounded-lg border p-2">
          <OrbGlyph size={14} />
          <div className="bg-muted h-1.5 w-full rounded-full" />
          <div className="bg-muted h-1.5 w-4/5 rounded-full" />
        </div>
      </div>
    ),
  },
  {
    n: "04",
    name: "Spotlight",
    line: "One question, from anywhere",
    state: "State: open, offering this page's work",
    body: "⌘K from any surface. One input that both finds and asks, and the answer arrives in the same place the question was typed — it never navigates you somewhere else to read it.",
    visual: (
      <div className="border-(--glass-border) bg-background w-full max-w-xs overflow-hidden rounded-xl border shadow-md">
        <div className="border-(--glass-border) flex items-center gap-2.5 border-b px-3 py-3">
          <OrbGlyph size={18} />
          <span className="text-muted-foreground text-sm">
            Search or ask a question…
          </span>
        </div>
        <div className="flex flex-col gap-1 p-2">
          {["Fix the re-render loop", "Why does POST return a 500?"].map(
            (t, i) => (
              <div
                key={t}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                  i === 0 && "bg-(--wash-strong)"
                )}
              >
                <Icon name="sparkles" size={11} />
                <span className="truncate">{t}</span>
              </div>
            )
          )}
        </div>
      </div>
    ),
  },
]

const PRINCIPLES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "palette",
    title: "One set of tokens",
    body: "Colors, radius, spacing and type come from the Foundation. There is no ambient palette to keep in sync, because there is no second palette.",
  },
  {
    icon: "play",
    title: "Motion by role",
    body: "Components consume four motion roles, never literal timings. The configured character and pace decide the feel product-wide, assistant included.",
  },
  {
    icon: "layers",
    title: "Selected, not invented",
    body: "The AI composes from a documented vocabulary. A component that is not in the registry does not exist as far as generation is concerned.",
  },
  {
    icon: "link",
    title: "One contract, both ways",
    body: "A surface hands over a context chip and receives an effect name. It never learns how an answer renders; the layer never learns what the product means.",
  },
]

/* --------------------------------- page --------------------------------- */

export function AmbientLayerView() {
  const { setMode, navigate } = useAssistant()
  const [demo, setDemo] = React.useState("")

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-28 px-6 py-16">
      {/* ── hero ───────────────────────────────────────────────────────── */}
      <header className="flex flex-col items-center gap-6 text-center">
        <span className="text-muted-foreground font-mono text-xs tracking-wide uppercase">
          The ambient layer
        </span>
        <h1 className="max-w-2xl text-5xl leading-[1.05] font-semibold tracking-tight text-balance">
          Put the assistant where the work already is
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg leading-relaxed text-balance">
          An assistant that lives above your product instead of beside it. It
          can see the page, it takes the shape the moment deserves, and every
          pixel of it comes from your design system.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={() => setMode("spotlight")}>
            <Icon name="search" size={15} />
            Open the spotlight
          </Button>
          <span className="text-muted-foreground text-sm">
            or press{" "}
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              ⌘K
            </kbd>
          </span>
        </div>
      </header>

      {/* the hero interface: an answer, whole */}
      <Frame bare>
        <Chrome
          title="Editor · composer.tsx"
          right={
            <span className="font-mono text-xs">
              <span className="text-(--positive)">+14</span>{" "}
              <span className="text-destructive">−3</span>
            </span>
          }
        />
        <div className="flex flex-col gap-4 p-5">
          <ReasoningPanel
            staged={false}
            seconds={9}
            defaultOpen
            steps={[
              {
                title: "Reading the failure",
                detail:
                  "The draft is component state, so unmounting the thread throws it away.",
              },
            ]}
          />
          <ToolCall
            verb="Read the surrounding implementation"
            request={'{"file": "composer.tsx", "around": 4}'}
            result={'const [draft, setDraft] = useState("");'}
            staged={false}
          />
          <p className="text-sm leading-relaxed">
            The draft lives in this component&apos;s own state, so it dies with
            the component — switching threads unmounts it and the words go with
            it. Lifting it into the runtime store keys it by thread instead.
            <InlineCitation
              citation={{
                n: 1,
                title: "Persisting composer state across threads",
                domain: "assistant-ui.com",
                excerpt:
                  "Draft state owned by the component is lost on unmount; lift it to the runtime store.",
              }}
            />
          </p>
          <ReferenceChips
            refs={[
              { label: "composer.tsx", icon: "code" },
              { label: "use-draft.ts", icon: "code" },
            ]}
          />
        </div>
      </Frame>
      <Caption>Every block above is the component, running</Caption>

      {/* ── four shapes ────────────────────────────────────────────────── */}
      <Section
        lead="One presence, four shapes."
        body="Modes are geometry, not sessions. One conversation, one state and one context throughout — the surface changes size to match how much attention the moment deserves, and never becomes a different assistant. Dragging is the switch: there is no mode menu and there should never be one."
      >
        <div className="divide-border flex flex-col divide-y">
          {FORMS.map((f) => (
            <div
              key={f.n}
              className="flex flex-col gap-6 py-10 md:flex-row md:items-center md:gap-12"
            >
              <div className="flex-1">
                <div className="flex items-baseline gap-3">
                  <span className="text-muted-foreground font-mono text-xs">
                    {f.n}
                  </span>
                  <h3 className="text-base font-semibold">{f.name}</h3>
                </div>
                <p className="mt-1.5 text-sm font-medium">{f.line}</p>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {f.body}
                </p>
                <p className="text-muted-foreground mt-4 font-mono text-xs tracking-wide uppercase">
                  {f.state}
                </p>
              </div>
              <div className="flex shrink-0 items-center justify-center md:w-80">
                {f.visual}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── ⌘K ─────────────────────────────────────────────────────────── */}
      <Section
        lead="⌘K is the new move."
        body="The command palette taught a generation of software one gesture: one keystroke, one input, anything you need. An ambient layer inherits it and asks it to do more — the same input that finds a page can answer a question about it, because finding and asking are the same impulse arriving in the same place."
        caption="What it offers is drawn from the page you are on"
      >
        <Frame className="flex flex-col gap-4">
          <div className="border-border rounded-xl border px-4">
            <Composer
              value={demo}
              onChange={setDemo}
              onSend={() => setDemo("")}
              placeholder="Search or ask a question…"
            />
          </div>
          <FollowUpSuggestions
            label="Suggested for this page"
            suggestions={[
              "Which components lack vocabulary docs?",
              "Show every surface using ad-hoc colors",
              "Compose a dashboard from existing components",
            ]}
            onPick={() => setMode("spotlight")}
          />
        </Frame>
      </Section>

      {/* ── context ────────────────────────────────────────────────────── */}
      <Section
        lead="Context is declared, not guessed."
        body="The assistant can see exactly what the chips say it can see. Pages announce what they are about, anything on screen can be right-clicked into the conversation, and pasted material becomes an attachment rather than burying the question. What grounds an answer is visible before it is asked and removable after."
        caption="Provenance is shown, never implied"
      >
        <Frame className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border-border bg-muted inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm">
              <Icon name="sparkles" size={13} />
              Editor · composer.tsx
            </span>
            <span className="border-border bg-muted inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-xs">
              composer.tsx:4
            </span>
          </div>
          <MessageAttachments
            attachments={[
              {
                id: "trace",
                name: "TypeError: Cannot read properties of undefined",
                kind: "text",
                meta: "24 lines · 1,180 chars",
              },
            ]}
          />
          <WebSearch
            query="assistant-ui draft persistence"
            sources={[
              {
                title: "Persisting composer state across threads",
                domain: "assistant-ui.com",
              },
              {
                title: "Draft autosave patterns in chat UIs",
                domain: "patterns.dev",
              },
            ]}
            staged={false}
          />
        </Frame>
      </Section>

      {/* ── answers ────────────────────────────────────────────────────── */}
      <Section
        lead="An answer is objects, not a paragraph."
        body="What the assistant did matters as much as what it said, so the work renders as things you can inspect: reasoning that admits how long it took, a session summarized as verbs and file stats, a diff you accept hunk by hunk. A claim carries its evidence, and the evidence is offered as something to check."
        caption="Three states of one answer: thinking, working, proposing"
      >
        <div className="flex flex-col gap-4">
          <Frame>
            <ReasoningPanel
              staged={false}
              seconds={9}
              defaultOpen
              steps={[
                {
                  title: "Grouping before fixing",
                  detail:
                    "Five problems, but not five root causes: the two frontend ones share a lifetime bug.",
                },
                {
                  title: "Ordering by blast radius",
                  detail:
                    "The hook lands first — both consumers would otherwise be edited twice.",
                },
              ]}
            />
          </Frame>
          <Frame>
            <ToolTimeline
              staged={false}
              steps={[
                { verb: "Read", target: "use-draft.ts", icon: "document" },
                { verb: "Edited", target: "composer.tsx", icon: "edit" },
                { verb: "Ran", target: "pnpm vitest", icon: "code" },
              ]}
              files={[
                { path: "composer.tsx", added: 14, removed: 3 },
                { path: "use-draft.ts", added: 42 },
              ]}
            />
          </Frame>
          <Frame>
            <ReviewableDiff
              staged={false}
              path="composer.tsx"
              hunks={[
                {
                  header: "@@ -3,7 +3,7",
                  lines: [
                    { sign: " ", text: "  const composer = useComposer();" },
                    {
                      sign: "-",
                      text: '  const [draft, setDraft] = useState("");',
                    },
                    { sign: "+", text: "  const draft = useDraft(threadId);" },
                  ],
                },
              ]}
            />
          </Frame>
        </div>
      </Section>

      {/* ── the system ─────────────────────────────────────────────────── */}
      <Section
        lead="It inherits your system."
        body="The layer has no palette, no type scale and no motion of its own. Change the Foundation's accent and the assistant changes with it, because it was never a second design system bolted on top — it is your vocabulary, composed by something that can only select from it."
      >
        <div className="border-border grid gap-x-12 gap-y-8 border-t pt-10 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="flex gap-4">
              <span className="text-muted-foreground mt-0.5 shrink-0">
                <Icon name={p.icon} size={16} />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-sm font-semibold">{p.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── how you take it ────────────────────────────────────────────── */}
      <InstallSection onDocs={() => navigate?.("ds")} />

      {/* ── the way out ────────────────────────────────────────────────── */}
      <section className="border-border flex flex-col items-center gap-6 border-t py-16 text-center">
        <h2 className="max-w-lg text-4xl leading-tight font-semibold tracking-tight text-balance">
          Every piece of it is documented
        </h2>
        <p className="text-muted-foreground max-w-md text-base leading-relaxed">
          Fifty components, each with its behavior, its boundaries and a
          playground — and the constitution they all answer to. The rules ship
          with the code: install one and its when-to-use prints in your
          terminal.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={() => navigate?.("gallery")}>
            <Icon name="layers" size={15} />
            See all 32, running
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate?.("ds")}>
            Read the documentation
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <Icon name="code" size={15} />
              View on GitHub
              <Icon name="arrow-up-right" size={14} />
            </a>
          </Button>
        </div>
      </section>
    </div>
  )
}
