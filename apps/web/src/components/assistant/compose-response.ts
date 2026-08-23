import type { ContextChip } from "./assistant-context"
import type { KitBlock, KitResponse } from "./response-kit"

/**
 * THE MODEL SEAM — now a SCENARIO ROUTER.
 *
 * Everything downstream of this function is real: the streaming, the staged
 * evidence, the states, the objects an answer is made of. Only the judgement
 * is canned. Wiring a model in replaces THIS FILE and nothing else — it emits
 * the same `KitResponse` grammar, and every surface keeps rendering it.
 *
 * What the router demonstrates is the thesis of the dev-tool simulation:
 * AN ANSWER'S SHAPE FOLLOWS ITS INTENT AND ITS CONTEXT, and scenarios CHAIN.
 * "Fix this" earns a diff to review; "run it" earns a terminal and, when it
 * fails, a failure with recovery follow-ups; "fix automatically" continues
 * that same workflow rather than opening a new conversation. The follow-ups
 * are the seams between scenarios — picking one hands the next intent back
 * through this router, which is how a few minutes of natural use walks the
 * whole vocabulary without ever feeling like a component tour.
 */

type Intent =
  | "fix-all"
  | "fix-auto"
  | "api-error"
  | "stream-error"
  | "db-error"
  | "threadlist-error"
  | "figma-sync"
  | "token-change"
  | "make-component"
  | "compact"
  | "generate-ui"
  | "research"
  | "refactor"
  | "run"
  | "tests"
  | "usages"
  | "fix"
  | "explain"
  | "code"
  | "generic"

/** Order matters: the first pattern that matches wins. */
function detectIntent(q: string, codeChip: boolean): Intent {
  const t = q.toLowerCase()
  // before every single-problem pattern: "fix everything" is a different
  // request from "fix this", and the specific patterns would swallow it
  if (/fix (all|everything|every problem|them all)|clear the (problem|inventory|board)|work through (all|the) problem/.test(t))
    return "fix-all"
  if (/fix (it )?automatically|apply the fix/.test(t)) return "fix-auto"
  if (/500|unhandled|rejection|api\/messages|post .*(fail|500)/.test(t))
    return "api-error"
  if (/stream .*(drop|dies|disconnect)|sse|heartbeat|30 seconds/.test(t))
    return "stream-error"
  if (/slow|n\+1|drafts endpoint|explain analyze|\bquery\b/.test(t))
    return "db-error"
  if (/re-?render|render loop|thread list.*loop|flicker|key warning/.test(t))
    return "threadlist-error"
  if (/figma/.test(t)) return "figma-sync"
  if (/radius|token|spacing unit|gray family|accent/.test(t)) return "token-change"
  if (/make this a component|extract .*component/.test(t)) return "make-component"
  if (/more compact|onboarding empty state/.test(t)) return "compact"
  if (/empty state|add .*state to this page|compose .*from/.test(t)) return "generate-ui"
  if (/recommended|best (way|approach)|how should|current react architecture/.test(t))
    return "research"
  if (/implement that|refactor|reusable|move .*(out|into|persistence)/.test(t))
    return "refactor"
  if (/\brun\b|check whether|verify the fix/.test(t)) return "run"
  if (/add tests|regression test|test suite/.test(t)) return "tests"
  if (/where .*used|find usages|usages/.test(t)) return "usages"
  if (/fix|wrong|vanish|broken|bug/.test(t)) return "fix"
  if (/what is|what does|explain|doing\??$|data flow/.test(t)) return "explain"
  if (codeChip) return "code"
  return "generic"
}

/* ------------------------- shared building blocks ------------------------ */

const READ_FILES: KitBlock = {
  kind: "parallel",
  summary: "Read 4 files in parallel",
  calls: [
    { tool: "read_file", target: "composer.tsx", duration: "38ms" },
    { tool: "read_file", target: "use-draft.ts", duration: "42ms" },
    { tool: "read_file", target: "thread.tsx", duration: "51ms" },
    { tool: "grep", target: "useDraft", duration: "61ms" },
  ],
}

const HOOK_REVIEW: KitBlock = {
  kind: "review",
  path: "use-draft.ts",
  hunks: [
    {
      header: "@@ -1,4 +1,8",
      lines: [
        { sign: "+", text: "export function useDraft(threadId: string) {" },
        { sign: "+", text: "  const store = useRuntimeStore();" },
        { sign: "+", text: '  return { value: store.drafts[threadId] ?? "",' },
        { sign: "+", text: "    set: (next) => store.setDraft(threadId, next) };" },
        { sign: "+", text: "}" },
      ],
    },
  ],
}

const COMPOSER_REVIEW: KitBlock = {
  kind: "review",
  path: "composer.tsx",
  hunks: [
    {
      header: "@@ -3,7 +3,7",
      lines: [
        { sign: " ", text: "  const composer = useComposer();" },
        { sign: "-", text: '  const [draft, setDraft] = useState("");' },
        { sign: "+", text: "  const draft = useDraft(threadId);" },
      ],
    },
    {
      header: "@@ -12,4 +12,5",
      lines: [
        { sign: " ", text: "      <textarea" },
        { sign: " ", text: "        value={draft.value}" },
        { sign: "+", text: "        onChange={draft.set}" },
      ],
    },
  ],
}

const PASSING_RUN: KitBlock = {
  kind: "terminal",
  command: "pnpm vitest run composer",
  exitCode: 0,
  lines: [
    "RUN  v4.0.5 /apps/web",
    "✓ composer restores draft on switch (12ms)",
    "✓ composer clears draft after send (9ms)",
  ],
}

/* ------------------------------ scenarios ------------------------------- */

function fixScenario(file: string): KitResponse {
  return {
    effect: "fix-composer",
    text:
      `The draft lives in this component's own \`useState\`, so it dies with the component — switching threads unmounts ` +
      `it, and there is nowhere for the value to survive. The runtime already keys drafts by thread id; pointing the ` +
      `composer at that slot fixes it without adding a store. The diff below is ready to review, hunk by hunk.`,
    evidence: [
      {
        kind: "reasoning",
        seconds: 4,
        steps: [
          {
            title: "Reading the selection",
            detail: `Scoped to ${file} and its imports — the error is on the draft state line.`,
          },
          {
            title: "Locating the seam",
            detail:
              "The runtime keys state by thread id; the composer keeps a private copy that cannot survive an unmount.",
          },
        ],
      },
      {
        kind: "tool",
        verb: "Read the surrounding implementation",
        request: `{"file": "${file}", "around": "draft"}`,
        result: "draft is component-local; useRuntimeStore exposes drafts[threadId]",
      },
    ],
    refs: [
      { label: file, icon: "code" },
      { label: "use-draft.ts", icon: "code" },
    ],
    artifacts: [COMPOSER_REVIEW],
    followUps: [
      "Run this and check whether the fix works",
      "Explain the data flow",
      "Also add tests once you're done",
    ],
  }
}

function explainScenario(file: string): KitResponse {
  return {
    text:
      `This is the composer's draft plumbing. \`useThreadId\` names the active conversation, \`useComposer\` owns send, ` +
      `and the textarea binds a LOCAL \`useState\` draft — which is the notable part: nothing persists it, so the value ` +
      `dies when the thread switches and this component unmounts. Everything else here delegates to the runtime.`,
    evidence: [
      {
        kind: "tool",
        verb: "Read the selection in context",
        request: `{"file": "${file}"}`,
        result: "3 hooks, 1 local state, no persistence",
      },
    ],
    refs: [
      { label: file, icon: "code" },
      { label: "use-draft.ts", icon: "code" },
      { label: "thread.tsx", icon: "code" },
    ],
    followUps: [
      "Refactor this",
      "Find where this is used",
      "Add tests",
      "Explain the data flow",
    ],
  }
}

function refactorScenario(): KitResponse {
  return {
    effect: "fix-composer",
    text:
      `Done in two moves: a reusable \`useDraft(threadId)\` hook over the runtime's per-thread slot, and the composer ` +
      `rewired to consume it. Both diffs are below — review them independently or accept the set; typecheck passes ` +
      `with the change applied.`,
    evidence: [
      {
        kind: "reasoning",
        seconds: 9,
        steps: [
          {
            title: "Mapping the ownership",
            detail:
              "Draft state must outlive the composer, so it moves to the runtime; the hook is the reusable face over it.",
          },
          {
            title: "Checking the consumers",
            detail: "Only composer.tsx holds draft state today; thread.tsx just renders messages.",
          },
          {
            title: "Sequencing the change",
            detail: "Hook first so the composer diff compiles on its own; typecheck last as the proof.",
          },
        ],
      },
      READ_FILES,
      {
        kind: "tool",
        verb: "Searched for other draft holders",
        request: '{"query": "setDraft|draft state"}',
        result: "1 owner (composer.tsx); 0 other components hold draft state",
      },
    ],
    refs: [
      { label: "use-draft.ts", icon: "code" },
      { label: "composer.tsx", icon: "code" },
    ],
    artifacts: [
      HOOK_REVIEW,
      COMPOSER_REVIEW,
      {
        kind: "terminal",
        command: "pnpm typecheck",
        exitCode: 0,
        lines: ["• Packages in scope: ui, web", "✓ 2 successful, 2 total"],
      },
      {
        kind: "timeline",
        steps: [
          { verb: "Read", target: "4 files", icon: "document" },
          { verb: "Created", target: "use-draft.ts", icon: "edit" },
          { verb: "Updated", target: "composer.tsx", icon: "edit" },
          { verb: "Ran", target: "pnpm typecheck", icon: "code" },
        ],
        files: [
          { path: "use-draft.ts", added: 8 },
          { path: "composer.tsx", added: 2, removed: 1 },
        ],
      },
    ],
    followUps: [
      "Run this and check whether the fix works",
      "Also add tests once you're done",
    ],
  }
}

function runScenario(): KitResponse {
  return {
    text:
      `One failure. The draft survives a reload but not a thread switch: the restore test reads an empty string, which ` +
      `means the composer is still mounting with local state before the hook hydrates. The failure is scoped to the ` +
      `call — the rest of the run is green.`,
    evidence: [
      {
        kind: "tool",
        verb: "Ran the suite",
        request: '{"command": "pnpm vitest run composer"}',
        result: "2 passed, 1 failed",
      },
    ],
    refs: [{ label: "composer.test.tsx", icon: "code" }],
    artifacts: [
      {
        kind: "terminal",
        command: "pnpm vitest run composer",
        exitCode: 1,
        lines: [
          "RUN  v4.0.5 /apps/web",
          "✓ composer clears draft after send (9ms)",
          "✓ composer keeps attachments per thread (11ms)",
          "✗ composer restores draft on switch (14ms)",
        ],
      },
      {
        kind: "failure",
        tool: "vitest",
        target: "composer restores draft on switch",
        error: 'Expected "why do drafts vanish" — received ""',
        attempt: 1,
        attempts: 3,
      },
    ],
    followUps: ["Fix it automatically", "Explain the data flow", "Retry"],
  }
}

/**
 * FIX ALL — the whole inventory in one agentic run. The workspace reads the
 * `fix-all` effect as "every file heals": the layer only names the effect,
 * the workspace decides what it means (DESIGN.md §8).
 */
function fixAllScenario(): KitResponse {
  return {
    effect: "fix-all",
    text:
      `All five are fixed. Two were the same bug wearing different clothes — the composer and the thread list both ` +
      `kept state that outlived the render that owned it — so they took one change each and a shared test. The ` +
      `backend three were independent: an unawaited promise, a stream with no heartbeat, and a query per row. ` +
      `Typecheck and the suite are green below; review them file by file before you take my word for it.`,
    evidence: [
      {
        kind: "reasoning",
        seconds: 9,
        steps: [
          {
            title: "Grouping before fixing",
            detail:
              "Five problems, but not five root causes: the two frontend ones share a lifetime bug, which means one pattern and one test rather than two patches.",
          },
          {
            title: "Ordering by blast radius",
            detail:
              "The hook lands first — the composer and the thread list both consume it, so fixing it second would mean editing them twice.",
          },
          {
            title: "Proving it, not asserting it",
            detail:
              "Each fix carries the evidence its own failure produced: a passing test, a 201 where the 500 was, a stream that outlives 30s, and the query count going 41 → 2.",
          },
        ],
      },
      {
        kind: "parallel",
        summary: "Read every file in the inventory",
        calls: [
          { tool: "read_file", target: "composer.tsx", duration: "38ms" },
          { tool: "read_file", target: "thread-list.tsx", duration: "44ms" },
          { tool: "read_file", target: "api/messages.ts", duration: "51ms" },
          { tool: "read_file", target: "api/stream.ts", duration: "47ms" },
          { tool: "read_file", target: "db/drafts.ts", duration: "55ms" },
        ],
      },
      {
        kind: "timeline",
        steps: [
          { verb: "Edited", target: "use-draft.ts", icon: "edit" },
          { verb: "Edited", target: "composer.tsx", icon: "edit" },
          { verb: "Edited", target: "thread-list.tsx", icon: "edit" },
          { verb: "Edited", target: "api/messages.ts", icon: "edit" },
          { verb: "Edited", target: "api/stream.ts", icon: "edit" },
          { verb: "Edited", target: "db/drafts.ts", icon: "edit" },
          { verb: "Ran", target: "pnpm typecheck", icon: "code" },
          { verb: "Ran", target: "pnpm vitest run", icon: "code" },
        ],
        files: [
          { path: "use-draft.ts", added: 42 },
          { path: "composer.tsx", added: 14, removed: 3 },
          { path: "thread-list.tsx", added: 6, removed: 4 },
          { path: "api/messages.ts", added: 9, removed: 2 },
          { path: "api/stream.ts", added: 18, removed: 1 },
          { path: "db/drafts.ts", added: 11, removed: 7 },
        ],
      },
    ],
    refs: [
      { label: "use-draft.ts", icon: "code" },
      { label: "api/stream.ts", icon: "code" },
      { label: "db/drafts.ts", icon: "code" },
    ],
    artifacts: [
      {
        kind: "terminal",
        command: "pnpm typecheck && pnpm vitest run",
        lines: [
          "tsc --noEmit",
          "  ✓ no errors",
          "",
          " ✓ composer.draft.test.ts (3)",
          " ✓ thread-list.render.test.tsx (2)",
          " ✓ api.messages.test.ts (4)",
          " ✓ api.stream.test.ts (3)",
          " ✓ db.drafts.bench.ts (2)",
          "",
          " Test Files  5 passed (5)",
          "      Tests  14 passed (14)",
        ],
        exitCode: 0,
      },
    ],
    followUps: [
      "Add tests once you're done",
      "Run it and check whether the fix works",
      "Sync the changes to Figma",
    ],
  }
}

function fixAutoScenario(): KitResponse {
  return {
    effect: "fix-composer",
    text:
      `Fixed in the same workflow: the hook now returns early until the thread id resolves, so the composer never ` +
      `mounts against an empty slot. The failing test passes — the run below is the proof, not a promise.`,
    evidence: [
      {
        kind: "reasoning",
        seconds: 3,
        steps: [
          {
            title: "Reading the failure",
            detail: "The restore test races hydration: the composer reads the slot before threadId settles.",
          },
        ],
      },
    ],
    refs: [{ label: "use-draft.ts", icon: "code" }],
    artifacts: [
      {
        kind: "diff",
        path: "use-draft.ts",
        lines: [
          { sign: " ", text: "export function useDraft(threadId: string) {" },
          { sign: "+", text: "  if (!threadId) return EMPTY_DRAFT;" },
          { sign: " ", text: "  const store = useRuntimeStore();" },
        ],
      },
      PASSING_RUN,
    ],
    followUps: ["Also add tests once you're done", "Make this a component"],
  }
}

function testsScenario(): KitResponse {
  return {
    text:
      `Added a regression test for the exact failure mode: switch threads mid-draft, come back, and expect the words ` +
      `to still be there. It fails on the old implementation and passes on the new one, which is what makes it a ` +
      `regression test rather than a description.`,
    refs: [{ label: "composer.test.tsx", icon: "code" }],
    artifacts: [
      {
        kind: "diff",
        path: "composer.test.tsx",
        lines: [
          { sign: "+", text: 'it("keeps the draft across a thread switch", () => {' },
          { sign: "+", text: '  type("draft in flight"); switchThread("t2");' },
          { sign: "+", text: '  switchThread("t1");' },
          { sign: "+", text: '  expect(input()).toHaveValue("draft in flight");' },
          { sign: "+", text: "});" },
        ],
      },
      PASSING_RUN,
    ],
    followUps: ["Run the full suite", "Make this a component"],
  }
}

function usagesScenario(): KitResponse {
  return {
    text: `Three call sites, one owner. The composer holds the state; the other two only read.`,
    evidence: [
      {
        kind: "tool",
        verb: "Searched the workspace",
        request: '{"query": "useDraft\\\\("}',
        result: "composer.tsx:4 (owner) · thread.tsx:12 (read) · quick-ask.tsx:31 (read)",
      },
    ],
    refs: [
      { label: "composer.tsx:4", icon: "code" },
      { label: "thread.tsx:12", icon: "code" },
      { label: "quick-ask.tsx:31", icon: "code" },
    ],
    followUps: ["Refactor this", "Explain the data flow"],
  }
}

function generateScenario(): KitResponse {
  return {
    text:
      `Composed from the existing vocabulary, not invented: EmptyState carries the frame, Stack the rhythm, Button the ` +
      `action — every value on the system's scales. The diff drops it into the page where the thread list renders ` +
      `empty.`,
    evidence: [
      {
        kind: "tool",
        verb: "Searched the component registry",
        request: '{"query": "empty state"}',
        result: "EmptyState exists; Button, Stack, Text sanctioned; no bespoke UI needed",
      },
    ],
    refs: [
      { label: "EmptyState", icon: "code" },
      { label: "Button", icon: "code" },
      { label: "Stack", icon: "code" },
      { label: "Text", icon: "code" },
    ],
    artifacts: [
      {
        kind: "diff",
        path: "thread-list.tsx",
        lines: [
          { sign: " ", text: "  if (threads.length === 0) return (" },
          { sign: "+", text: '    <EmptyState title="No conversations yet"' },
          { sign: "+", text: '      description="Ask anything — the thread lands here."' },
          { sign: "+", text: '      action={<Button size="sm">New thread</Button>} />' },
          { sign: " ", text: "  );" },
        ],
      },
    ],
    followUps: [
      "Make it more compact",
      "Use the existing onboarding empty state instead",
      "Make this a component",
    ],
  }
}

function compactScenario(): KitResponse {
  return {
    text: `Tightened within the system: the compact spacing step and the small text slot — no arbitrary values entered.`,
    refs: [{ label: "thread-list.tsx", icon: "code" }],
    artifacts: [
      {
        kind: "diff",
        path: "thread-list.tsx",
        lines: [
          { sign: "-", text: '    <EmptyState title="No conversations yet"' },
          { sign: "+", text: '    <EmptyState size="compact" title="No conversations yet"' },
        ],
      },
    ],
    followUps: ["Make this a component", "Add an empty state to the archive page too"],
  }
}

function makeComponentScenario(): KitResponse {
  return {
    text:
      `Extracted as \`PipelineHealthCard\` and saved to the library. It is now part of the vocabulary: developers can ` +
      `import it, the assistant can compose with it, and it is eligible for the next Figma sync.`,
    refs: [{ label: "pipeline-health-card.tsx", icon: "code" }],
    artifacts: [
      {
        kind: "diff",
        path: "pipeline-health-card.tsx",
        lines: [
          { sign: "+", text: "export function PipelineHealthCard({ stage, health }: Props) {" },
          { sign: "+", text: "  return (" },
          { sign: "+", text: "    <Card><Badge tone={health} /><Progress value={stage} /></Card>" },
          { sign: "+", text: "  );" },
          { sign: "+", text: "}" },
        ],
      },
      {
        kind: "timeline",
        steps: [
          { verb: "Component created", target: "pipeline-health-card.tsx", icon: "edit" },
          { verb: "Registry updated", target: "/ds → Product vocabulary", icon: "document" },
          { verb: "Vocabulary updated", target: "AI context", icon: "sparkles" },
          { verb: "Figma update prepared", target: "1 component pending", icon: "link" },
        ],
      },
    ],
    followUps: ["Sync to Figma", "Open it in /ds"],
  }
}

function tokenScenario(): KitResponse {
  return {
    text:
      `That is a design-system change, not a local edit: the radius token moves one step along Tailwind's scale and ` +
      `every component that reads \`rounded-*\` re-derives — product, ambient, and preview together. Applied. Figma ` +
      `now has 1 unsynced token change.`,
    evidence: [
      {
        kind: "tool",
        verb: "Resolved the token",
        request: '{"token": "--radius", "from": "lg", "to": "xl"}',
        result: "8px → 12px; 41 components consume the derived steps",
      },
    ],
    refs: [
      { label: "tokens.json · foundation.radius", icon: "document" },
      { label: "Foundation · Shape", icon: "document" },
    ],
    artifacts: [
      {
        kind: "timeline",
        steps: [
          { verb: "Design tokens", target: "--radius → xl", icon: "settings" },
          { verb: "Product components", target: "41 re-derived", icon: "code" },
          { verb: "Ambient components", target: "follow --radius", icon: "sparkles" },
          { verb: "Application preview", target: "live", icon: "play" },
        ],
      },
    ],
    followUps: ["Sync to Figma", "Show every component that changed"],
  }
}

function figmaScenario(): KitResponse {
  return {
    text:
      `Figma synced successfully — 3 changes: the radius token repointed at Tailwind's xl step, PipelineHealthCard ` +
      `registered, and the Composer's updated anatomy noted. Variables only, per the contract: components in the file ` +
      `bind to them, so the file re-themed without a single component being written.`,
    evidence: [
      {
        kind: "tool",
        verb: "Diffed code against the Figma file",
        request: '{"collections": ["Foundation", "Tailwind Primitives"]}',
        result: "3 changes ready: radius-lg → xl · PipelineHealthCard · Composer",
      },
    ],
    refs: [
      {
        label: "AmbientUI · Figma",
        icon: "link",
        href: "https://www.figma.com/design/DxCX3RUqjzefoUc9eOV8hr/",
      },
      { label: "figma/figma-sync.md", icon: "document" },
    ],
    artifacts: [
      {
        kind: "timeline",
        steps: [
          { verb: "Connecting", target: "design system", icon: "link" },
          { verb: "Updating", target: "variables · Radius/Active → xl", icon: "settings" },
          { verb: "Updating", target: "component metadata", icon: "document" },
          { verb: "Publishing", target: "changes", icon: "check" },
        ],
      },
    ],
    followUps: ["Open the file in Figma", "Run the drift check"],
  }
}

function researchScenario(question: string): KitResponse {
  return {
    text:
      `The current consensus: stream into an external store and subscribe with \`useSyncExternalStore\`, batching ` +
      `paints on the frame clock rather than per chunk. It avoids tearing under concurrent rendering, keeps the ` +
      `transcript pure, and matches the architecture this codebase already uses for drafts. The report below carries ` +
      `the sources per section.`,
    evidence: [
      {
        kind: "search",
        query: question.slice(0, 60),
        sources: [
          {
            title: "useSyncExternalStore and streaming data",
            domain: "react.dev",
            href: "https://react.dev/reference/react/useSyncExternalStore",
          },
          { title: "Streaming UI patterns for chat", domain: "patterns.dev" },
          { title: "Frame-clock batching for token streams", domain: "assistant-ui.com" },
        ],
      },
    ],
    refs: [
      {
        label: "react.dev · useSyncExternalStore",
        icon: "globe",
        href: "https://react.dev/reference/react/useSyncExternalStore",
      },
      { label: "streaming-text.tsx", icon: "code" },
    ],
    artifacts: [
      {
        kind: "report",
        title: "Streaming responses in this architecture",
        sourcesRead: 7,
        sections: [
          {
            title: "The store, not the component",
            status: "done",
            sources: 3,
            body: "Chunks land in an external store; components subscribe to a consistent snapshot.",
          },
          {
            title: "Batch on the frame clock",
            status: "done",
            sources: 2,
            body: "Per-chunk setState floods the scheduler; one paint per frame reads as smooth writing.",
          },
          {
            title: "What this repo already does",
            status: "done",
            sources: 2,
            body: "StreamingText runs on useAnimationFrame — the same discipline, applied at the leaf.",
          },
        ],
      },
    ],
    followUps: ["Implement that approach", "Compare it with the current implementation"],
  }
}

function threadListScenario(): KitResponse {
  return {
    effect: "fix-threadlist",
    text:
      `The effect has no dependency array, so \`setItems\` fires on every render and every render fires the effect — ` +
      `that is the loop. The state is derived, so it should not be state at all: \`useMemo\` over the prop removes both ` +
      `the loop and the stale copy, and the rows get their missing keys in the same pass.`,
    evidence: [
      {
        kind: "tool",
        verb: "Read the console",
        request: '{"filter": "warnings"}',
        result:
          "Maximum update depth exceeded (ThreadList) · Each child in a list should have a unique key",
      },
      {
        kind: "reasoning",
        seconds: 3,
        steps: [
          {
            title: "Tracing the loop",
            detail: "render → effect → setItems → render. Derived state masquerading as state.",
          },
        ],
      },
    ],
    refs: [{ label: "thread-list.tsx", icon: "code" }],
    artifacts: [
      {
        kind: "review",
        path: "thread-list.tsx",
        hunks: [
          {
            header: "@@ -2,5 +2,5",
            lines: [
              { sign: "-", text: "  const [items, setItems] = useState(threads);" },
              { sign: "-", text: "  useEffect(() => { setItems(threads.filter(…)) });" },
              { sign: "+", text: "  const items = useMemo(" },
              { sign: "+", text: "    () => threads.filter((t) => !t.archived), [threads]);" },
            ],
          },
          {
            header: "@@ -7,1 +6,1",
            lines: [
              { sign: "-", text: "  return items.map((t) => <ThreadRow thread={t} />);" },
              { sign: "+", text: "  return items.map((t) => <ThreadRow key={t.id} thread={t} />);" },
            ],
          },
        ],
      },
    ],
    followUps: ["Why does POST /api/messages return a 500?", "Add tests"],
  }
}

function apiErrorScenario(): KitResponse {
  return {
    effect: "fix-api",
    text:
      `The handler never awaits \`createMessage\`, so a validation failure becomes an unhandled rejection instead of a ` +
      `response — Express turns that into a bare 500 and the client learns nothing. Awaiting inside a try/catch turns ` +
      `the same failure into a 422 with a reason. The server log below is the smoking gun.`,
    evidence: [
      {
        kind: "terminal",
        command: "tail -f server.log",
        exitCode: 1,
        lines: [
          "POST /api/messages 500 12ms",
          "UnhandledPromiseRejection: ValidationError: body.text is required",
          "    at createMessage (api/messages.ts:2)",
        ],
      },
      {
        kind: "tool",
        verb: "Read the handler",
        request: '{"file": "api/messages.ts"}',
        result: "createMessage is async; the return value is used before it resolves",
      },
    ],
    refs: [
      { label: "api/messages.ts", icon: "code" },
      { label: "server.log", icon: "document" },
    ],
    artifacts: [
      {
        kind: "review",
        path: "api/messages.ts",
        hunks: [
          {
            header: "@@ -2,3 +2,7",
            lines: [
              { sign: "-", text: "  const message = createMessage(req.body);" },
              { sign: "+", text: "  try {" },
              { sign: "+", text: "    const message = await createMessage(req.body);" },
              { sign: "+", text: "    …" },
              { sign: "+", text: "  } catch (error) {" },
              { sign: "+", text: "    res.status(422).json({ error: describe(error) });" },
              { sign: "+", text: "  }" },
            ],
          },
        ],
      },
      {
        kind: "terminal",
        command: "curl -X POST /api/messages -d '{}'",
        exitCode: 0,
        lines: ['422 { "error": "body.text is required" }'],
      },
    ],
    followUps: [
      "The message stream drops after 30 seconds — fix it",
      "Add a regression test for the 422",
    ],
  }
}

function streamErrorScenario(): KitResponse {
  return {
    effect: "fix-stream",
    text:
      `Two problems wearing one symptom. Idle proxies kill connections that stay silent, and this stream only speaks ` +
      `when there is a chunk — so at ~30s of quiet it dies. And nothing unsubscribes on close, so every drop leaks a ` +
      `subscription. A 15s heartbeat keeps the pipe warm; the close handler returns the seat.`,
    evidence: [
      {
        kind: "terminal",
        command: "curl -N /api/stream/t1",
        exitCode: 1,
        lines: [
          "data: {…}",
          "data: {…}",
          "curl: (18) transfer closed with outstanding read data remaining  [t+31s]",
        ],
      },
      {
        kind: "tool",
        verb: "Checked the subscription registry",
        request: '{"metric": "active_subscriptions"}',
        result: "412 active for ~60 connected clients — leaking on every drop",
      },
    ],
    refs: [{ label: "api/stream.ts", icon: "code" }],
    artifacts: [
      {
        kind: "review",
        path: "api/stream.ts",
        hunks: [
          {
            header: "@@ -3,3 +3,6",
            lines: [
              { sign: " ", text: "  const off = subscribe(req.params.id, …);" },
              { sign: "+", text: '  const beat = setInterval(() => res.write(":hb\\n\\n"), 15000);' },
              { sign: "+", text: '  req.on("close", () => { clearInterval(beat); off(); });' },
            ],
          },
        ],
      },
    ],
    followUps: [
      "The drafts endpoint is slow — find and fix the query",
      "What is the recommended approach for streaming this response with the current React architecture?",
    ],
  }
}

function dbErrorScenario(): KitResponse {
  return {
    effect: "fix-db",
    text:
      `Classic N+1: one query for the threads, then one more per thread for its draft. At p95 that is 340ms of round ` +
      `trips for what a single \`WHERE threadId IN (…)\` answers in one. The plan below shows the collapse: 41 queries ` +
      `become 2, and the endpoint lands at 24ms.`,
    evidence: [
      {
        kind: "tool",
        verb: "Profiled the endpoint",
        request: '{"endpoint": "/api/drafts", "percentile": 95}',
        result: "340ms p95 · 41 queries per request (1 threads + 40 drafts)",
      },
      {
        kind: "terminal",
        command: "EXPLAIN ANALYZE SELECT * FROM drafts WHERE thread_id = $1",
        exitCode: 0,
        lines: [
          "Index Scan using drafts_thread_id_idx  (cost=0.29..8.31)",
          "Execution Time: 0.4 ms   × 40 round trips = the problem",
        ],
      },
    ],
    refs: [{ label: "db/drafts.ts", icon: "code" }],
    artifacts: [
      {
        kind: "review",
        path: "db/drafts.ts",
        hunks: [
          {
            header: "@@ -3,3 +3,4",
            lines: [
              { sign: "-", text: "  return Promise.all(" },
              { sign: "-", text: "    threads.map((t) => db.drafts.where({ threadId: t.id }))" },
              { sign: "+", text: '  return db.drafts.whereIn("threadId",' },
              { sign: "+", text: "    threads.map((t) => t.id));" },
            ],
          },
        ],
      },
      {
        kind: "terminal",
        command: "pnpm bench drafts",
        exitCode: 0,
        lines: ["p95 before: 340ms", "p95 after:   24ms  (2 queries)"],
      },
    ],
    followUps: ["Kill the re-render loop in the thread list", "Sync to Figma"],
  }
}

/* -------------------------------- router -------------------------------- */

/** v0 composer: canned judgement over a real grammar. A model replaces this file. */
export function composeResponse(
  question: string,
  pageChip: ContextChip | null,
  chips: ContextChip[]
): KitResponse {
  const codeChip = chips.find(
    (c) => c.kind === "file" || c.kind === "symbol" || c.kind === "selection"
  )
  const file =
    codeChip?.label.split(/[:·]/)[0]?.trim() ??
    pageChip?.label.split("·").pop()?.trim() ??
    "composer.tsx"

  switch (detectIntent(question, Boolean(codeChip))) {
    case "fix-all":
      return fixAllScenario()
    case "fix-auto":
      return fixAutoScenario()
    case "api-error":
      return apiErrorScenario()
    case "stream-error":
      return streamErrorScenario()
    case "db-error":
      return dbErrorScenario()
    case "threadlist-error":
      return threadListScenario()
    case "figma-sync":
      return figmaScenario()
    case "token-change":
      return tokenScenario()
    case "make-component":
      return makeComponentScenario()
    case "compact":
      return compactScenario()
    case "generate-ui":
      return generateScenario()
    case "research":
      return researchScenario(question)
    case "refactor":
      return refactorScenario()
    case "run":
      return runScenario()
    case "tests":
      return testsScenario()
    case "usages":
      return usagesScenario()
    case "fix":
    case "code":
      return fixScenario(file)
    case "explain":
      return explainScenario(file)
  }

  const ground = pageChip?.label ?? "this page"
  const extras =
    chips.length > 0
      ? ` plus ${chips.length} attached item${chips.length > 1 ? "s" : ""}`
      : ""
  return {
    text:
      `Grounded in ${ground}${extras}. Ask about the code on screen, or try an action — fix, explain, refactor, run — ` +
      `and the answer will arrive shaped for it: evidence above, the change and its proof below.`,
    refs: [
      ...(pageChip ? [{ label: pageChip.label, icon: "document" as const }] : []),
      ...chips.map((c) => ({ label: c.label, icon: "link" as const })),
    ],
    followUps: [
      "Explain what this file is doing",
      "Refactor draft persistence to be reusable",
      "Run this and check whether the fix works",
    ],
  }
}
