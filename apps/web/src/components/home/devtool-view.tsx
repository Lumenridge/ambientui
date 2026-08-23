import * as React from "react"

import { Button } from "@ambientui/ui/components/button"
import { Icon, type IconName } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"

import {
  useAssistant,
  type ContextChip,
} from "ambientui/assistant-context"
import { AskAI, AttachMenu } from "ambientui/attach-menu"
import { ReviewComment } from "ambientui/message-kit"
import { useAttachMenu } from "ambientui/use-attach-menu"

/**
 * THE DEV TOOL TAB — a working editor, full screen, with the ambient layer
 * living in it.
 *
 * The workspace carries a real PROBLEM INVENTORY — frontend errors (render
 * loop, lost state) and backend errors (a 500, a dropping stream, an N+1
 * query) — and each is a scenario the assistant can actually resolve. When an
 * answer settles it announces an effect; the file heals, the problem leaves
 * the inventory, and the count in the status bar goes down. The Journey walks
 * these scenarios and SPOTLIGHTS the place each one lives before asking.
 *
 * The editor's side of the contract is still three calls: declare the page
 * (setPageChip), offer to ask at the data (AskAI), let anything become
 * context (right-click → attach). It never learns how answers render.
 */

type Task = {
  id: string
  title: string
  note: string
  when: string
  state: "done" | "running" | "queued"
  stat?: { added: number; removed: number }
  /** The change's identity, the way a workspace names one: id and branch. */
  ref?: string
  branch?: string
}

const TASKS: Task[] = [
  {
    id: "t1",
    title: "Persist composer drafts",
    note: "Moved draft state into the runtime",
    when: "now",
    state: "running",
    stat: { added: 14, removed: 3 },
    ref: "AMB-241",
    branch: "fix/composer-draft-persistence",
  },
  {
    id: "t2",
    title: "Message queue for in-flight runs",
    note: "Queued turns stack and stay cancelable",
    when: "12m",
    state: "done",
    stat: { added: 86, removed: 4 },
  },
  {
    id: "t3",
    title: "Citations on every answer",
    note: "Reference chips carry source marks",
    when: "1h",
    state: "done",
    stat: { added: 42, removed: 0 },
  },
  {
    id: "t4",
    title: "Port thread list to virtual rows",
    note: "Waiting on the runtime bump",
    when: "3h",
    state: "queued",
  },
]

/**
 * A file in the workspace. `effect` is the name a settled answer announces
 * when it fixes this file; `fixedLines`/`fixedMarks` are what the editor
 * shows once the fix lands. `ask` is the question its problem deserves.
 */
type OpenFile = {
  path: string
  language: string
  badge?: "server" | "db"
  lines: string[]
  problem?: { line: number; text: string; source: "frontend" | "backend"; ask: string }
  /**
   * The pending change, one sign per line — this workspace is a change under
   * review, so the editor reads as the diff it is rather than as flat text.
   */
  signs?: (" " | "+" | "-")[]
  /** A teammate's note, anchored to the line it is about. */
  review?: {
    line: number
    author: string
    when: string
    status: "comment" | "change-requested" | "resolved"
    text: string
  }
  stat?: string
  effect?: string
  fixedLines?: string[]
  fixedMarks?: number[]
  fixedStat?: string
}

const FILES: OpenFile[] = [
  {
    path: "composer.tsx",
    language: "TypeScript React",
    stat: "+14 −3",
    effect: "fix-composer",
    problem: {
      line: 4,
      source: "frontend",
      text: "Draft state is local to this component and is lost when the thread changes.",
      ask: "Why do drafts vanish when I switch threads?",
    },
    lines: [
      "export function Composer() {",
      "  const threadId = useThreadId();",
      "  const composer = useComposer();",
      '  const [draft, setDraft] = useState("");',
      "",
      "  return (",
      "    <form onSubmit={composer.send}>",
      "      <textarea",
      "        value={draft}",
      "        onChange={(e) => setDraft(e.target.value)}",
      "      />",
      "    </form>",
      "  );",
      "}",
    ],
    fixedLines: [
      "export function Composer() {",
      "  const threadId = useThreadId();",
      "  const composer = useComposer();",
      "  const draft = useDraft(threadId);",
      "",
      "  return (",
      "    <form onSubmit={composer.send}>",
      "      <textarea",
      "        value={draft.value}",
      "        onChange={draft.set}",
      "      />",
      "    </form>",
      "  );",
      "}",
    ],
    fixedMarks: [4, 9, 10],
    fixedStat: "+16 −4",
    signs: [" ", " ", " ", "-", " ", " ", " ", " ", "+", "+", " ", " ", " ", " "],
    review: {
      line: 4,
      author: "mingjie",
      when: "1h ago",
      status: "change-requested",
      text: "Should the draft live in the runtime store, or stay local and only persist on blur? Asking because the composer is the only consumer today.",
    },
  },
  {
    path: "thread-list.tsx",
    language: "TypeScript React",
    stat: "+9",
    effect: "fix-threadlist",
    problem: {
      line: 4,
      source: "frontend",
      text: "useEffect has no dependency array — setItems on every render is an infinite re-render loop.",
      ask: "Fix the re-render loop in the thread list",
    },
    lines: [
      "export function ThreadList({ threads }: Props) {",
      "  const [items, setItems] = useState(threads);",
      "  useEffect(() => {",
      "    setItems(threads.filter((t) => !t.archived));",
      "  });",
      "",
      "  return items.map((t) => <ThreadRow thread={t} />);",
      "}",
    ],
    fixedLines: [
      "export function ThreadList({ threads }: Props) {",
      "  const items = useMemo(",
      "    () => threads.filter((t) => !t.archived),",
      "    [threads]",
      "  );",
      "",
      "  return items.map((t) => <ThreadRow key={t.id} thread={t} />);",
      "}",
    ],
    fixedMarks: [2, 3, 4, 7],
    fixedStat: "+11 −4",
  },
  {
    path: "api/messages.ts",
    language: "TypeScript · Node",
    badge: "server",
    effect: "fix-api",
    problem: {
      line: 2,
      source: "backend",
      text: "createMessage returns a Promise — the unawaited rejection escapes the handler and the request 500s.",
      ask: "Why does POST /api/messages return a 500?",
    },
    lines: [
      'router.post("/api/messages", async (req, res) => {',
      "  const message = createMessage(req.body);",
      "  appendToThread(message.threadId, message);",
      "  res.status(201).json(message);",
      "});",
    ],
    fixedLines: [
      'router.post("/api/messages", async (req, res) => {',
      "  try {",
      "    const message = await createMessage(req.body);",
      "    appendToThread(message.threadId, message);",
      "    res.status(201).json(message);",
      "  } catch (error) {",
      "    res.status(422).json({ error: describe(error) });",
      "  }",
      "});",
    ],
    fixedMarks: [2, 3, 6, 7, 8],
    fixedStat: "+6 −2",
  },
  {
    path: "api/stream.ts",
    language: "TypeScript · Node",
    badge: "server",
    effect: "fix-stream",
    problem: {
      line: 3,
      source: "backend",
      text: "No heartbeat and no close handling — idle proxies drop the stream at 30s and the subscription leaks.",
      ask: "The message stream drops after 30 seconds — fix it",
    },
    lines: [
      'router.get("/api/stream/:id", (req, res) => {',
      '  res.setHeader("Content-Type", "text/event-stream");',
      "  subscribe(req.params.id, (chunk) => {",
      '    res.write(`data: ${chunk}\\n\\n`);',
      "  });",
      "});",
    ],
    fixedLines: [
      'router.get("/api/stream/:id", (req, res) => {',
      '  res.setHeader("Content-Type", "text/event-stream");',
      "  const off = subscribe(req.params.id, (chunk) => {",
      '    res.write(`data: ${chunk}\\n\\n`);',
      "  });",
      '  const beat = setInterval(() => res.write(":hb\\n\\n"), 15000);',
      '  req.on("close", () => { clearInterval(beat); off(); });',
      "});",
    ],
    fixedMarks: [3, 6, 7],
    fixedStat: "+3",
  },
  {
    path: "db/drafts.ts",
    language: "TypeScript · SQL",
    badge: "db",
    effect: "fix-db",
    problem: {
      line: 3,
      source: "backend",
      text: "One query per thread — N+1; the drafts endpoint runs at 340ms p95.",
      ask: "The drafts endpoint is slow — find and fix the query",
    },
    lines: [
      "export async function draftsForUser(userId: string) {",
      "  const threads = await db.threads.where({ userId });",
      "  return Promise.all(",
      "    threads.map((t) => db.drafts.where({ threadId: t.id }))",
      "  );",
      "}",
    ],
    fixedLines: [
      "export async function draftsForUser(userId: string) {",
      "  const threads = await db.threads.where({ userId });",
      "  return db.drafts.whereIn(",
      '    "threadId",',
      "    threads.map((t) => t.id)",
      "  );",
      "}",
    ],
    fixedMarks: [3, 4, 5],
    fixedStat: "+4 −3",
  },
  {
    path: "use-draft.ts",
    language: "TypeScript",
    stat: "+42",
    lines: [
      "export function useDraft(threadId: string) {",
      "  const store = useRuntimeStore();",
      "",
      "  return {",
      '    value: store.drafts[threadId] ?? "",',
      "    set: (next: string) => store.setDraft(threadId, next),",
      "  };",
      "}",
    ],
  },
]

/**
 * THE JOURNEY — a guided walk through the scenarios, driving the REAL
 * assistant. Each step SPOTLIGHTS where its problem lives (opens the file,
 * rings the line), attaches the prescribed context, and asks the real
 * question through the real pipeline. Nothing is played back.
 */
type JourneyStep = {
  id: string
  group: string
  label: string
  prompt: string
  chip?: ContextChip
  /** Open this file and ring this line before asking. */
  focus?: { file: string; line?: number }
  /** A second instruction fired while the first runs — the queue scenario. */
  queue?: string
  /**
   * Perform the attach GESTURE on the focused line instead of asking
   * outright: the real context menu opens where the code is and the user
   * picks the verb. The layer's most important gesture is also its least
   * discoverable, so the tour has to show it rather than describe it.
   */
  gesture?: "attach"
}

const JOURNEY: JourneyStep[] = [
  {
    id: "attach",
    group: "Context",
    label: "Attach a line and ask",
    prompt: "Explain composer.tsx:9",
    focus: { file: "composer.tsx", line: 9 },
    gesture: "attach",
  },
  {
    id: "fix",
    group: "Frontend errors",
    label: "Fix the lost-draft bug",
    prompt: "Why do drafts vanish when I switch threads?",
    chip: { id: "line-composer.tsx-4", kind: "symbol", label: "composer.tsx:4" },
    focus: { file: "composer.tsx", line: 4 },
  },
  {
    id: "threadlist",
    group: "Frontend errors",
    label: "Kill the re-render loop",
    prompt: "Fix the re-render loop in the thread list",
    chip: { id: "line-thread-list-4", kind: "symbol", label: "thread-list.tsx:4" },
    focus: { file: "thread-list.tsx", line: 4 },
  },
  {
    id: "api",
    group: "Backend errors",
    label: "Fix the 500 on send",
    prompt: "Why does POST /api/messages return a 500?",
    chip: { id: "file-api-messages", kind: "file", label: "api/messages.ts" },
    focus: { file: "api/messages.ts", line: 2 },
  },
  {
    id: "stream",
    group: "Backend errors",
    label: "Keep the stream alive",
    prompt: "The message stream drops after 30 seconds — fix it",
    chip: { id: "file-api-stream", kind: "file", label: "api/stream.ts" },
    focus: { file: "api/stream.ts", line: 3 },
  },
  {
    id: "db",
    group: "Backend errors",
    label: "Speed up the drafts query",
    prompt: "The drafts endpoint is slow — find and fix the query",
    chip: { id: "file-db-drafts", kind: "file", label: "db/drafts.ts" },
    focus: { file: "db/drafts.ts", line: 3 },
  },
  {
    id: "refactor",
    group: "Agent workflows",
    label: "Refactor — and queue tests behind it",
    prompt:
      "Move draft persistence out of this component and make it reusable across threads.",
    queue: "Also add tests once you're done",
    focus: { file: "composer.tsx" },
  },
  {
    id: "run",
    group: "Agent workflows",
    label: "Run it — and watch a failure",
    prompt: "Run this and check whether the fix works",
  },
  {
    id: "fix-auto",
    group: "Agent workflows",
    label: "Recover automatically",
    prompt: "Fix it automatically",
  },
  {
    id: "generate",
    group: "Build & ship",
    label: "Generate UI from the vocabulary",
    prompt: "Add an empty state to this page",
    focus: { file: "thread-list.tsx" },
  },
  {
    id: "component",
    group: "Build & ship",
    label: "Make it a component",
    prompt: "Make this a component",
  },
  {
    id: "token",
    group: "Build & ship",
    label: "Change a design token",
    prompt: "Change the radius from medium to large",
  },
  { id: "figma", group: "Build & ship", label: "Sync to Figma", prompt: "Sync to Figma" },
  {
    id: "research",
    group: "Build & ship",
    label: "Research with citations",
    prompt:
      "What is the recommended approach for streaming this response with the current React architecture?",
  },
]

const STATE_MARK: Record<Task["state"], IconName> = {
  done: "check",
  running: "play",
  queued: "pause",
}

/**
 * What this surface's working history plausibly looks like — the palette's
 * "Recent chats" while the dev tool is the page. Static on purpose: history
 * is what already happened.
 */
const DEV_RECENTS = [
  { text: "Move draft persistence into a shared hook", when: "1h ago" },
  { text: "Why is the thread list re-rendering on every keystroke?", when: "Yesterday" },
  { text: "Add optimistic updates to message send", when: "Mon" },
]

/** What to suggest once every problem in the inventory has been fixed. */
const ALL_CLEAR_SUGGESTIONS = [
  "Run it and check whether the fix works",
  "Move draft persistence out of this component and make it reusable across threads",
  "What is the recommended approach for streaming this response with the current React architecture?",
]

/** Offered above the individual problems once more than one is outstanding. */
const FIX_ALL_PROMPT = "Fix all the problems in this workspace"

export function DevToolView() {
  const {
    setPageChip,
    setPageIntel,
    mode,
    addChip,
    seedPrompt,
    setMode,
    orbState,
    workspaceEffect,
  } = useAssistant()

  // THE WORKSPACE RECEIVES THE WORK. Effects accumulate: each settled answer
  // that fixed a file adds its name here, the file heals, and the problem
  // leaves the inventory. The count only ever goes down honestly.
  const [fixedEffects, setFixedEffects] = React.useState<Set<string>>(new Set())
  // adjusted DURING render (react.dev: adjusting state when a prop changes) —
  // an effect here would paint one frame with the fix announced but not landed
  if (workspaceEffect && !fixedEffects.has(workspaceEffect)) {
    setFixedEffects(new Set(fixedEffects).add(workspaceEffect))
  }

  // "fix-all" is the one effect that is not about a single file: the
  // workspace reads it as every problem healing at once. Deciding that here
  // is the contract — the layer only announces the name (DESIGN.md §8).
  const isFixed = (f: OpenFile) =>
    Boolean(f.effect && (fixedEffects.has(f.effect) || fixedEffects.has("fix-all")))
  const resolve = (f: OpenFile): OpenFile =>
    isFixed(f) && f.fixedLines
      ? { ...f, lines: f.fixedLines, problem: undefined, stat: f.fixedStat ?? f.stat }
      : f

  const problems = FILES.filter((f) => f.problem && !isFixed(f))
  const aiBusy = orbState === "thinking" || orbState === "answer"

  const [visited, setVisited] = React.useState<Set<string>>(new Set())
  // the place the assistant is currently pointed at — set by a journey step,
  // worn by the editor as a ring, cleared when the file's fix lands
  const [spot, setSpot] = React.useState<{ file: string; line?: number } | null>(null)

  const { menu, open, openAt, close } = useAttachMenu()
  const [activePath, setActivePath] = React.useState("composer.tsx")
  const [openTabs, setOpenTabs] = React.useState([
    "composer.tsx",
    "use-draft.ts",
  ])
  const [activeTask, setActiveTask] = React.useState("t1")
  // The rail costs 256px, which a narrow window does not have to spare — so
  // it starts hidden there and is recalled deliberately. `]` toggles it (the
  // editor convention) and the header control does the same thing visibly: a
  // shortcut nobody can discover is not an affordance.
  const [railOpen, setRailOpen] = React.useState(
    () => typeof window === "undefined" || window.innerWidth >= 1024
  )
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing =
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.isContentEditable
      if (e.key === "]" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setRailOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Crossing the breakpoint decides FOR you once, in the direction that can
  // only help: narrowing hides the rail (it would cover the work), widening
  // brings it back. In between, your last choice stands.
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const onChange = (e: MediaQueryListEvent) => setRailOpen(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  const [selection, setSelection] = React.useState("")
  // A reply hands the thread to the assistant: the comment closes (it is now
  // the panel's business) and the line it pointed at takes the working
  // highlight, so the handover is visible in the code rather than only in
  // the panel that just opened.
  const [resolving, setResolving] = React.useState<string | null>(null)

  const openFile = React.useCallback((path: string) => {
    setActivePath(path)
    setOpenTabs((t) => (t.includes(path) ? t : [...t, path]))
  }, [])

  // a journey step performs the scenario for real: spotlight, attach, ask —
  // and for the queue step, hand over a second instruction mid-run
  const runStep = (step: JourneyStep) => {
    setVisited((v) => new Set(v).add(step.id))
    if (step.focus) {
      openFile(step.focus.file)
      setSpot(step.focus)
    }
    if (step.gesture === "attach" && step.focus?.line) {
      // let the file render, then open the real menu on the real row
      const { file, line } = step.focus
      window.setTimeout(() => {
        const row = document.querySelector(
          `[data-file="${file}"][data-line="${line}"]`
        )
        if (!row) return
        row.scrollIntoView({ block: "center", behavior: "smooth" })
        const r = row.getBoundingClientRect()
        openAt(r.left + 120, r.bottom - 4, {
          id: `line-${file}-${line}`,
          kind: "symbol",
          label: `${file}:${line}`,
        })
      }, 260)
      return
    }
    if (step.chip) addChip(step.chip)
    seedPrompt(step.prompt, true)
    setMode("panel")
    if (step.queue) {
      window.setTimeout(() => seedPrompt(step.queue!, true), 1800)
    }
  }

  const baseFile = FILES.find((f) => f.path === activePath) ?? FILES[0]!
  const file = resolve(baseFile)
  // the spotlight is DERIVED off: once the spotlit file is fixed there is
  // nothing left to point at — no effect required to clear it
  const spotFile = spot && FILES.find((x) => x.path === spot.file)
  const activeSpot = spot && spotFile && !isFixed(spotFile) ? spot : null

  // 1. THE PAGE DECLARES ITSELF — the open file, not the route
  React.useEffect(() => {
    setPageChip({
      id: "editor",
      kind: "page",
      label: `Editor · ${activePath}`,
      // this page is an editor over source, and says so
      icon: "code",
    })
    return () => setPageChip(null)
  }, [activePath, setPageChip])

  // 2. AND WHAT IT KNOWS: the palette's suggestions ARE the live problem
  //    inventory — each one is the question its error deserves, phrased so
  //    the scenario router recognizes it, and a healed problem leaves the
  //    list. Joined to a string so the effect re-fires on content, not on
  //    array identity.
  const asksKey = problems.map((f) => f.problem!.ask).join("\n")
  React.useEffect(() => {
    const asks = asksKey ? asksKey.split("\n") : []
    setPageIntel({
      // clearing the board is the first offer while more than one problem is
      // outstanding — it is what a developer looking at a red count wants
      suggestions: asks.length
        ? [...(asks.length > 1 ? [FIX_ALL_PROMPT] : []), ...asks].slice(0, 4)
        : ALL_CLEAR_SUGGESTIONS,
      recents: DEV_RECENTS,
      // the layer speaks the workspace's language while the workspace is
      // what you are looking at — the file, not "this page"
      askPlaceholder: `Ask about ${activePath}, or find a file…`,
      suggestLabel: asks.length ? "Problems in this workspace" : "Suggested next",
      jumpLabel: "Workspace files",
      // a file's subtitle is its problem while it has one — jumping to a file
      // should say why you would want to
      jumps: FILES.map((f) => ({
        id: f.path,
        label: f.path,
        desc: f.problem && !fixedEffects.has("fix-all") && !fixedEffects.has(f.effect ?? "")
          ? f.problem.text
          : f.language,
      })),
      onJump: openFile,
    })
    return () => setPageIntel(null)
  }, [asksKey, setPageIntel, openFile, fixedEffects, activePath])

  const readSelection = () => {
    const text = window.getSelection()?.toString().trim() ?? ""
    setSelection(text.length > 2 ? text : "")
  }

  const task = TASKS.find((t) => t.id === activeTask) ?? TASKS[0]!
  const workingHere =
    aiBusy && baseFile.problem && !isFixed(baseFile) ? baseFile.problem.line : null
  // the line under a review the assistant was just asked to resolve
  const resolvingLine =
    resolving === baseFile.path ? (baseFile.review?.line ?? null) : null

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0",
        // the dock is a column of the layout, not a cover over it
        // the dock is inset by 8px on each side, so the column it occupies
        // is its width plus that gutter
        mode === "dock" && "pe-[436px]"
      )}
    >
      {/* ── rail ────────────────────────────────────────────────────────── */}
      {railOpen && (
      <aside className="border-border bg-sidebar absolute inset-y-0 start-0 z-30 flex w-64 shrink-0 flex-col overflow-y-auto border-e shadow-lg lg:static lg:z-auto lg:shadow-none">
        <div className="text-muted-foreground px-3 pt-3 pb-1.5 text-xs font-medium tracking-wide uppercase">
          Ready for review
        </div>
        {TASKS.map((raw) => {
          // the running task completes when the workspace receives the fix
          const t =
            raw.id === "t1" && fixedEffects.has("fix-composer")
              ? { ...raw, state: "done" as const }
              : raw
          // a div, not a button: the row CONTAINS a button (AskAI)
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveTask(t.id)}
              onKeyDown={(e) => e.key === "Enter" && setActiveTask(t.id)}
              onContextMenu={(e) =>
                open(e, { id: `task-${t.id}`, kind: "target", label: t.title })
              }
              className={cn(
                "group/row relative flex flex-col items-start gap-0.5 px-3 py-2 text-start",
                activeTask === t.id ? "bg-accent" : "hover:bg-(--wash-strong)"
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span
                  className={cn(
                    "shrink-0",
                    t.state === "done"
                      ? "text-(--positive)"
                      : t.state === "running"
                        ? "text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  <Icon name={STATE_MARK[t.state]} size={13} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {t.title}
                </span>
                <span className="text-muted-foreground shrink-0 font-mono text-xs group-hover/row:opacity-0">
                  {t.when}
                </span>
              </span>
              <span className="text-muted-foreground flex w-full items-center gap-2 ps-[21px]">
                {t.stat && (
                  <span className="shrink-0 font-mono text-xs">
                    <span className="text-(--positive)">+{t.stat.added}</span>{" "}
                    <span className="text-destructive">−{t.stat.removed}</span>
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-xs">{t.note}</span>
              </span>
              <AskAI
                chip={{ id: `task-${t.id}`, kind: "target", label: t.title }}
                prompt={`What changed in "${t.title}"?`}
              />
            </div>
          )
        })}

        <div className="text-muted-foreground px-3 pt-4 pb-1.5 text-xs font-medium tracking-wide uppercase">
          Workspace
        </div>
        {FILES.map((f) => (
          <div
            key={f.path}
            onClick={() => openFile(f.path)}
            onContextMenu={(e) =>
              open(e, { id: `file-${f.path}`, kind: "file", label: f.path })
            }
            className={cn(
              "group/row relative flex cursor-default items-center gap-2 px-3 py-1.5",
              activePath === f.path
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-(--wash-strong)",
              activeSpot?.file === f.path && "ring-ring/50 ring-1 ring-inset"
            )}
          >
            <Icon name={f.badge ? "code" : "document"} size={13} />
            <span className="min-w-0 flex-1 truncate font-mono text-xs">
              {f.path}
            </span>
            {f.badge && (
              <span className="bg-muted text-muted-foreground shrink-0 rounded px-1 font-mono text-[0.625rem] uppercase">
                {f.badge}
              </span>
            )}
            {f.problem && !isFixed(f) && (
              <span className="text-destructive shrink-0">
                <Icon name="alert" size={12} />
              </span>
            )}
            {isFixed(f) && (
              <span className="text-(--positive) shrink-0">
                <Icon name="check" size={12} />
              </span>
            )}
            <AskAI
              chip={{ id: `file-${f.path}`, kind: "file", label: f.path }}
              prompt={f.problem?.ask ?? `Review ${f.path} and tell me what is wrong`}
            />
          </div>
        ))}

        <div className="text-muted-foreground px-3 pt-4 pb-1.5 text-xs font-medium tracking-wide uppercase">
          Journey
        </div>
        <p className="text-muted-foreground px-3 pb-1.5 text-xs">
          Real scenarios through the real assistant — follow-ups chain them,
          so wander off-script freely.
        </p>
        {JOURNEY.map((step, i) => (
          <React.Fragment key={step.id}>
            {step.group !== JOURNEY[i - 1]?.group && (
              <div className="text-muted-foreground/70 px-3 pt-2 pb-0.5 text-[0.625rem] font-medium tracking-wide uppercase">
                {step.group}
              </div>
            )}
            <button
              type="button"
              onClick={() => runStep(step)}
              className={cn(
                "group/row relative flex items-center gap-2 px-3 py-1.5 text-start",
                "text-muted-foreground hover:bg-(--wash-strong) hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full font-mono text-[0.625rem]",
                  visited.has(step.id)
                    ? "bg-(--positive-wash) text-(--positive)"
                    : "bg-muted"
                )}
              >
                {visited.has(step.id) ? <Icon name="check" size={9} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{step.label}</span>
              <span className="shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100">
                <Icon name="play" size={12} />
              </span>
            </button>
          </React.Fragment>
        ))}
        <div className="pb-3" />
      </aside>
      )}

      {/* ── editor ──────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* THE CHANGE, NAMED. A workspace is not "some open files" — it is one
            change with an id, a branch and a size, and the review actions
            belong beside that identity rather than in a menu. pe clears the
            floating view-switcher pill. */}
        <div className="border-border bg-sidebar flex shrink-0 items-center gap-2 overflow-x-auto border-b px-3 py-2 pe-40">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={railOpen ? "Hide the rail" : "Show the rail"}
            aria-expanded={railOpen}
            title={`${railOpen ? "Hide" : "Show"} the rail  ]`}
            onClick={() => setRailOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <Icon name="sidebar" size={14} />
          </Button>
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full",
              task.state === "done" ? "bg-(--positive)" : "bg-primary"
            )}
          />
          <span className="text-muted-foreground shrink-0 font-mono text-xs">
            {task.ref ?? "AMB-000"}
          </span>
          <Icon name="chevron-right" size={12} />
          <span className="shrink-0 text-sm font-medium whitespace-nowrap">
            {task.title}
          </span>
          {task.branch && (
            <span className="text-muted-foreground hidden shrink-0 font-mono text-xs lg:inline">
              {task.branch}
            </span>
          )}
          {task.stat && (
            <span className="shrink-0 font-mono text-xs">
              <span className="text-(--positive)">+{task.stat.added}</span>{" "}
              <span className="text-destructive">−{task.stat.removed}</span>
            </span>
          )}
          <div className="ms-auto flex shrink-0 items-center gap-1.5 ps-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                seedPrompt("Review this change and tell me what to fix before I submit it", true)
                setMode("panel")
              }}
            >
              <Icon name="sparkles" size={13} />
              Review with ambientui
            </Button>
            <Button size="sm" variant="outline">
              Submit review
            </Button>
          </div>
        </div>
        <div className="border-border bg-sidebar flex shrink-0 items-center overflow-x-auto border-b">
          {openTabs.map((path) => (
            <button
              key={path}
              type="button"
              onClick={() => setActivePath(path)}
              className={cn(
                "border-border flex shrink-0 items-center gap-2 border-e px-3 py-2 font-mono text-xs whitespace-nowrap",
                activePath === path
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon name="document" size={12} />
              {path}
            </button>
          ))}
          <span className="ms-auto flex shrink-0 items-center gap-3 px-3">
            {file.stat && (
              <span className="font-mono text-xs">
                {file.stat.split(" ").map((part, i) => (
                  <span
                    key={part + i}
                    className={
                      part.startsWith("+")
                        ? "text-(--positive)"
                        : "text-destructive"
                    }
                  >
                    {part}{" "}
                  </span>
                ))}
              </span>
            )}
            <span className="text-muted-foreground font-mono text-xs">
              {file.language}
            </span>
          </span>
        </div>

        <div
          className="min-h-0 flex-1 overflow-auto py-2"
          onMouseUp={readSelection}
          onKeyUp={readSelection}
        >
          {file.lines.map((line, i) => {
            const n = i + 1
            const flagged = file.problem?.line === n
            const spotted = activeSpot?.file === file.path && activeSpot.line === n
            const healed = isFixed(baseFile) && baseFile.fixedMarks?.includes(n)
            // the pending change, per line — a workspace under review shows
            // what is changing, not just what is there
            const sign = (isFixed(baseFile) ? undefined : file.signs?.[i]) ?? " "
            const thread = file.review?.line === n ? file.review : null
            return (
              <React.Fragment key={n}>
              <div
                data-file={file.path}
                data-line={n}
                className={cn(
                  "group/row hover:bg-(--wash) relative flex items-start gap-3 px-4",
                  sign === "+" && "bg-(--positive-wash)",
                  sign === "-" && "bg-(--destructive-wash)"
                )}
                onContextMenu={(e) =>
                  open(e, {
                    id: `line-${file.path}-${n}`,
                    kind: "symbol",
                    label: `${file.path}:${n}`,
                  })
                }
              >
                <span className="text-muted-foreground w-7 shrink-0 text-end font-mono text-sm leading-6 opacity-50 select-none">
                  {n}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "w-2 shrink-0 font-mono text-sm leading-6 select-none",
                    sign === "+" && "text-(--positive)",
                    sign === "-" && "text-destructive"
                  )}
                >
                  {sign === " " ? "" : sign}
                </span>
                <pre
                  className={cn(
                    "min-w-0 flex-1 rounded-sm font-mono text-sm leading-6 whitespace-pre",
                    flagged && workingHere !== n &&
                      "decoration-destructive underline decoration-wavy underline-offset-4",
                    // the AI is editing HERE: the error line pulses on the
                    // quiet wash instead of accusing while being fixed
                    (workingHere === n || resolvingLine === n) &&
                      "bg-(--wash) animate-pulse",
                    healed && "bg-(--positive-wash)",
                    // the journey's spotlight: where the scenario lives
                    spotted && "ring-ring ring-1",
                    !flagged && "text-muted-foreground"
                  )}
                >
                  {line || " "}
                </pre>
                <AskAI
                  chip={{
                    id: `line-${file.path}-${n}`,
                    kind: "symbol",
                    label: `${file.path}:${n}`,
                  }}
                  prompt={
                    flagged && file.problem
                      ? file.problem.ask
                      : `Explain ${file.path}:${n}`
                  }
                />
              </div>
              {/* the note lives under the line it is about, not in a panel
                  that makes you hold a line number in your head */}
              {thread && resolving !== file.path && (
                <div className="px-4 py-2 ps-14">
                  <ReviewComment
                    author={thread.author}
                    when={thread.when}
                    status={isFixed(baseFile) ? "resolved" : thread.status}
                    text={thread.text}
                    onReply={(text) => {
                      addChip({
                        id: `review-${file.path}-${n}`,
                        kind: "symbol",
                        label: `${file.path}:${n}`,
                      })
                      seedPrompt(text, true)
                      setMode("panel")
                      setResolving(file.path)
                    }}
                    replyPlaceholder="Reply, or ask ambientui to resolve it…"
                    className="max-w-xl"
                  />
                </div>
              )}
              </React.Fragment>
            )
          })}
        </div>

        {/* ── problems: the whole inventory, frontend and backend ───────── */}
        <div className="border-border bg-sidebar shrink-0 overflow-x-auto border-t">
          <div className="text-muted-foreground flex items-center gap-2 px-4 pt-2 pb-1 text-xs font-medium tracking-wide uppercase">
            Problems
            <span
              className={cn(
                "rounded px-1 font-mono",
                problems.length > 0
                  ? "bg-(--destructive-wash) text-destructive"
                  : "bg-(--positive-wash) text-(--positive)"
              )}
            >
              {problems.length}
            </span>
          </div>
          {problems.length === 0 ? (
            <div className="text-(--positive) flex items-center gap-2 px-4 pb-2 text-xs">
              <Icon name="check" size={12} />
              All clear. Run the suite to confirm, or ask for a refactor.
            </div>
          ) : (
            problems.map((f) => (
              <div
                key={f.path}
                role="button"
                tabIndex={0}
                onClick={() => {
                  openFile(f.path)
                  setSpot({ file: f.path, line: f.problem!.line })
                }}
                onKeyDown={(e) => e.key === "Enter" && openFile(f.path)}
                className="group/row hover:bg-(--wash-strong) relative flex items-center gap-2 px-4 py-1.5 text-start"
              >
                <span className="text-destructive shrink-0">
                  <Icon name="alert" size={12} />
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded px-1 font-mono text-[0.625rem] uppercase",
                    f.problem!.source === "backend"
                      ? "bg-muted text-muted-foreground"
                      : "bg-(--wash) text-foreground"
                  )}
                >
                  {f.problem!.source}
                </span>
                <span className="shrink-0 font-mono text-xs">
                  {f.path}:{f.problem!.line}
                </span>
                <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                  {f.problem!.text}
                </span>
                <AskAI
                  chip={{
                    id: `problem-${f.path}`,
                    kind: "symbol",
                    label: `${f.path}:${f.problem!.line}`,
                  }}
                  prompt={f.problem!.ask}
                />
              </div>
            ))
          )}
        </div>

        {/* ── status bar ─────────────────────────────────────────────────── */}
        <div className="border-border group/row bg-sidebar relative flex shrink-0 items-center gap-3 border-t px-4 py-1.5">
          <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
            <Icon name="code" size={11} />
            main
          </span>
          <span className="text-muted-foreground font-mono text-xs">
            {file.lines.length} lines
          </span>
          {workingHere !== null ? (
            <span className="ambient-shimmer ms-auto font-mono text-xs">
              AI is working on {baseFile.path}:{workingHere}…
            </span>
          ) : selection ? (
            <>
              <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
                selected: {selection.slice(0, 40)}
                {selection.length > 40 ? "…" : ""}
              </span>
              <AskAI
                chip={{
                  id: `sel-${file.path}`,
                  kind: "selection",
                  label: `${file.path} · selection`,
                }}
                prompt={`Explain this from ${file.path}: ${selection.slice(0, 120)}`}
              />
            </>
          ) : (
            <span
              className={cn(
                "ms-auto font-mono text-xs",
                problems.length === 0 ? "text-(--positive)" : "text-muted-foreground"
              )}
            >
              {problems.length === 0
                ? "no problems"
                : `${problems.length} problem${problems.length === 1 ? "" : "s"}`}
            </span>
          )}
        </div>
      </div>

      <AttachMenu menu={menu} onClose={close} />
    </div>
  )
}
