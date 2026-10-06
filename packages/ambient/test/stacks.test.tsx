/**
 * THE CHAT-STACK ADAPTERS' CONTRACT:
 *
 *   - the same work (reasoning, a tool call, prose, a source) becomes the
 *     same answer whichever stack reported it
 *   - a native block sent as `ambient-*` data arrives as that block
 *   - a stack's error fails the turn with its message
 *   - Stop reaches the stack: the run is cancelled, not abandoned
 *   - a tool the browser runs, a tool that waits for the person and a tool
 *     that needs approval all continue the same answer
 *   - regenerate replaces the stack's answer; clear clears its thread
 *   - the stack's thread can be followed, turn by turn
 *   - every event the adapters emit passes the layer's own validation
 *   - Stop while the person is being asked ends the turn, and a late answer
 *     is refused, not kept
 *   - a browser tool that throws is a failure on every stack; one that is
 *     not registered is a failure too, never a quiet success
 *   - an answer that keeps calling tools is stopped with an error
 */
import { describe, expect, it, vi } from "vitest"

import {
  applyAnswerEvent,
  createAmbientApi,
  EMPTY_ANSWER,
  type AmbientApi,
} from "../src/responder"
import type { AmbientAnswer } from "../src/response-kit"
import type { AmbientQuestion } from "../src/responder-schemas"
import {
  aiSdkChat,
  aiSdkRoute,
  CONTINUE_TIMEOUT_MS,
  type AiSdkChat,
  type UIMessageLike,
} from "../src/stack-ai-sdk"
import {
  assistantUIThread,
  type AssistantUIMessage,
  type AssistantUIThread,
} from "../src/stack-assistant-ui"
import { agUIAgent, type AgUIAgent, type AgUIEvent, type AgUIMessage } from "../src/stack-ag-ui"
import {
  createPartsReader,
  NotWaitingError,
  waitForPerson,
  type AmbientStack,
  type StackPart,
} from "../src/stack-parts"

const question: AmbientQuestion = {
  question: "Which tasks are overdue?",
  conversationId: "c1",
  history: [],
  pageChip: { id: "tasks", label: "Tasks", kind: "page" },
  chips: [],
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

/** Run a stack through the layer's own validated API, to the end. */
async function answerOf(
  stack: AmbientStack,
  input: AmbientQuestion = question,
  onEvent?: (kit: AmbientAnswer, api: AmbientApi) => void
) {
  const api = createAmbientApi(stack)
  let kit: AmbientAnswer = EMPTY_ANSWER
  for await (const event of api.ask(input, {
    signal: new AbortController().signal,
  })) {
    kit = applyAnswerEvent(kit, event)
    onEvent?.(kit, api)
  }
  return kit
}

/** The answer every stack should produce for the same work. */
const expected: AmbientAnswer = {
  text: "Two tasks are overdue.\n\nBoth are yours.",
  refs: [{ label: "Tracker docs", href: "https://example.com/docs" }],
  evidence: [
    {
      kind: "reasoning",
      steps: [{ title: "Look up the tasks", detail: "Filter by due date." }],
    },
    {
      kind: "tool",
      id: "k",
      verb: "searchTasks",
      request: '{"due":"past"}',
      result: '[{"id":1},{"id":2}]',
      name: "searchTasks",
      input: { due: "past" },
      output: [{ id: 1 }, { id: 2 }],
    },
  ],
  followUps: ["Reassign them?"],
}

const sse = (chunks: unknown[]) =>
  new Response(
    chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") +
      "data: [DONE]\n\n",
    { headers: { "content-type": "text/event-stream" } }
  )

/* ------------------------------ AI SDK route ----------------------------- */

describe("Vercel AI SDK route", () => {
  const chunks = [
    { type: "start", messageId: "a1" },
    { type: "start-step" },
    { type: "reasoning-start", id: "r" },
    { type: "reasoning-delta", id: "r", delta: "Look up the tasks\nFilter " },
    { type: "reasoning-delta", id: "r", delta: "by due date." },
    { type: "reasoning-end", id: "r" },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: "Two tasks " },
    { type: "text-delta", id: "t1", delta: "are overdue." },
    { type: "text-end", id: "t1" },
    { type: "tool-input-start", toolCallId: "k", toolName: "searchTasks" },
    { type: "tool-input-delta", toolCallId: "k", inputTextDelta: "{}" },
    { type: "tool-input-available", toolCallId: "k", toolName: "searchTasks", input: { due: "past" } },
    { type: "tool-output-available", toolCallId: "k", output: [{ id: 1 }], preliminary: true },
    { type: "tool-output-available", toolCallId: "k", output: [{ id: 1 }, { id: 2 }] },
    { type: "finish-step" },
    { type: "start-step" },
    { type: "text-start", id: "t2" },
    { type: "text-delta", id: "t2", delta: "Both are yours." },
    { type: "text-end", id: "t2" },
    { type: "source-url", sourceId: "s", url: "https://example.com/docs", title: "Tracker docs" },
    { type: "data-ambient-follow-ups", data: ["Reassign them?"] },
    { type: "data-weather", data: { ignored: true } },
    { type: "finish" },
  ]
  const bodyOf = (fetch: ReturnType<typeof vi.fn>, call = 0) =>
    JSON.parse((fetch.mock.calls[call] as unknown as [string, RequestInit])[1].body as string)

  it("posts the conversation and the page, and reads the stream back", async () => {
    const fetch = vi.fn(async () => sse(chunks))
    expect(await answerOf(aiSdkRoute({ api: "/api/chat", fetch }))).toEqual(expected)
    const body = bodyOf(fetch)
    expect(body.messages).toEqual([
      { id: "c1-0", role: "user", parts: [{ type: "text", text: question.question }] },
    ])
    expect(body.ambient.pageChip.id).toBe("tasks")
  })

  it("shows a call running, then finished, as one block", async () => {
    const seen: (string | undefined)[] = []
    await answerOf(aiSdkRoute({ api: "/api/chat", fetch: async () => sse(chunks) }), question, (kit) => {
      const tool = kit.evidence?.find((b) => b.kind === "tool")
      if (tool?.kind === "tool") seen.push(tool.status ?? "done")
    })
    expect(seen[0]).toBe("running")
    expect(seen[seen.length - 1]).toBe("done")
  })

  it("draws a tool call the host's way when asked", async () => {
    const kit = await answerOf(
      aiSdkRoute({
        api: "/api/chat",
        fetch: async () =>
          sse([
            { type: "tool-input-available", toolCallId: "k", toolName: "web", input: { q: "x" } },
            { type: "tool-output-available", toolCallId: "k", output: [] },
          ]),
        toolBlock: (call) => ({ kind: "search", query: String((call.input as { q: string }).q), sources: [] }),
      })
    )
    expect(kit.evidence).toEqual([{ kind: "search", id: "k", query: "x", sources: [] }])
  })

  it("fails the turn with the stream's error", async () => {
    const fetch = async () =>
      sse([{ type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: "Partly" }, { type: "error", errorText: "Rate limited." }])
    await expect(answerOf(aiSdkRoute({ api: "/api/chat", fetch }))).rejects.toThrow("Rate limited.")
  })

  it("runs a browser tool and continues the same answer with its output", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        sse([
          { type: "start", messageId: "a1" },
          { type: "start-step" },
          { type: "tool-input-available", toolCallId: "h", toolName: "highlight", input: { id: 101 }, providerMetadata: { openai: { itemId: "fc_1" } } },
          { type: "finish-step" },
        ])
      )
      .mockResolvedValueOnce(
        sse([{ type: "start-step" }, { type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: "Highlighted." }, { type: "text-end", id: "t" }])
      )
    const highlight = vi.fn(() => "ok")
    const kit = await answerOf(aiSdkRoute({ api: "/api/chat", fetch, tools: { highlight } }))
    expect(highlight).toHaveBeenCalledWith({ id: 101 })
    expect(kit.text).toBe("Highlighted.")
    expect(kit.evidence).toMatchObject([{ kind: "tool", id: "h", output: "ok" }])
    // the second post carries the assistant message, whole, with the output
    const again = bodyOf(fetch, 1)
    expect(again.messageId).toBe("a1")
    expect(again.messages[1]).toMatchObject({
      id: "a1",
      role: "assistant",
      parts: [
        { type: "step-start" },
        { type: "tool-highlight", toolCallId: "h", state: "output-available", input: { id: 101 }, output: "ok", callProviderMetadata: { openai: { itemId: "fc_1" } } },
      ],
    })
  })

  it("waits for approval, then continues with the person's answer", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        sse([
          { type: "start", messageId: "a1" },
          { type: "tool-input-available", toolCallId: "d", toolName: "completeTask", input: { id: 101 } },
          { type: "tool-approval-request", approvalId: "ap1", toolCallId: "d", reason: "It changes the tracker." },
        ])
      )
      .mockResolvedValueOnce(
        sse([
          { type: "tool-output-available", toolCallId: "d", output: { done: true } },
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: "Done." },
          { type: "text-end", id: "t" },
        ])
      )
    let asked = false
    const kit = await answerOf(aiSdkRoute({ api: "/api/chat", fetch }), question, (now, api) => {
      const approval = now.evidence?.find((b) => b.kind === "approval")
      if (approval?.kind === "approval" && !approval.decision && !asked) {
        asked = true
        expect(approval).toMatchObject({ id: "d", tool: "completeTask", reason: "It changes the tracker." })
        void api.respond({ id: "d", approved: true })
      }
    })
    expect(asked).toBe(true)
    expect(bodyOf(fetch, 1).messages[1].parts[0]).toMatchObject({
      state: "approval-responded",
      approval: { id: "ap1", approved: true },
    })
    expect(kit.text).toBe("Done.")
    // the approval became the call it allowed, in the same place
    expect(kit.evidence).toMatchObject([{ kind: "tool", id: "d", output: { done: true } }])
  })

  it("leaves a tool to the person when told to, and takes their output", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(sse([{ type: "tool-input-available", toolCallId: "p", toolName: "pickOwner", input: {} }]))
      .mockResolvedValueOnce(sse([{ type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: "Assigned to Ana." }]))
    const kit = await answerOf(
      aiSdkRoute({ api: "/api/chat", fetch, tools: { pickOwner: waitForPerson } }),
      question,
      (now, api) => {
        const tool = now.evidence?.[0]
        if (tool?.kind === "tool" && tool.status === "waiting") void api.respond({ id: "p", output: "Ana" })
      }
    )
    expect(kit.text).toBe("Assigned to Ana.")
    expect(bodyOf(fetch, 1).messages[1].parts[0]).toMatchObject({ state: "output-available", output: "Ana" })
  })
})

/* ------------------------------- AI SDK chat ----------------------------- */

/** A fake `Chat`: each send plays the next script of message snapshots. */
function fakeChat(scripts: UIMessageLike[][]) {
  const onMessages = new Set<() => void>()
  const onStatus = new Set<() => void>()
  const chat: AiSdkChat & { stopped: boolean; sent: unknown[]; approvals: unknown[] } = {
    messages: [],
    status: "ready",
    error: undefined,
    stopped: false,
    sent: [],
    approvals: [],
    "~registerMessagesCallback": (cb) => (onMessages.add(cb), () => onMessages.delete(cb)),
    "~registerStatusCallback": (cb) => (onStatus.add(cb), () => onStatus.delete(cb)),
    async stop() {
      chat.stopped = true
      setStatus("ready")
    },
    async sendMessage(message, options) {
      chat.sent.push({ message, options })
      if (message) setMessages([...chat.messages, { id: `u${chat.messages.length}`, role: "user", parts: [{ type: "text", text: message.text }] }])
      await play()
    },
    async regenerate() {
      setMessages(chat.messages.slice(0, -1))
      await play()
    },
    addToolOutput({ toolCallId, output }) {
      patch((part) => (part.toolCallId === toolCallId ? { ...part, state: "output-available", output } : part))
    },
    addToolApprovalResponse(response) {
      chat.approvals.push(response)
      patch((part) =>
        (part.approval as { id?: string } | undefined)?.id === response.id
          ? { ...part, state: "approval-responded", approval: { id: response.id, approved: response.approved } }
          : part
      )
    },
  }
  const setStatus = (status: string) => {
    ;(chat as { status: string }).status = status
    onStatus.forEach((cb) => cb())
  }
  const setMessages = (messages: UIMessageLike[]) => {
    chat.messages = messages
    onMessages.forEach((cb) => cb())
  }
  const patch = (fn: (part: UIMessageLike["parts"][number]) => UIMessageLike["parts"][number]) =>
    setMessages(chat.messages.map((m) => ({ ...m, parts: m.parts.map(fn) })))
  const play = async () => {
    const script = scripts.shift() ?? []
    setStatus("submitted")
    const base = chat.messages.filter((m) => !script.some((s) => s.id === m.id))
    for (const snapshot of script) {
      await tick()
      if (chat.stopped) return
      setStatus("streaming")
      setMessages([...base, snapshot])
    }
    setStatus("ready")
  }
  return chat
}

describe("Vercel AI SDK chat", () => {
  const a = (parts: UIMessageLike["parts"], id = "a1"): UIMessageLike => ({ id, role: "assistant", parts })
  const tool = { type: "tool-searchTasks", toolCallId: "k", input: { due: "past" } }
  const reasoning = { type: "reasoning", text: "Look up the tasks\nFilter by due date.", state: "done" }

  it("asks through the chat and reads its message as it grows", async () => {
    const chat = fakeChat([
      [
        a([reasoning]),
        a([reasoning, { type: "text", text: "Two tasks" }]),
        a([reasoning, { type: "text", text: "Two tasks are overdue." }, { ...tool, state: "input-available" }]),
        a([
          reasoning,
          { type: "text", text: "Two tasks are overdue." },
          { ...tool, state: "output-available", output: [{ id: 1 }, { id: 2 }] },
          { type: "step-start" },
          { type: "text", text: "Both are yours." },
          { type: "source-url", url: "https://example.com/docs", title: "Tracker docs" },
          { type: "data-ambient-follow-ups", data: ["Reassign them?"] },
        ]),
      ],
    ])
    expect(await answerOf(aiSdkChat(() => chat))).toEqual(expected)
    expect(chat.sent[0]).toMatchObject({ message: { text: question.question }, options: { body: { ambient: { pageChip: { id: "tasks" } } } } })
  })

  it("answers an approval through the chat and resubmits it", async () => {
    const pending = { type: "tool-completeTask", toolCallId: "d", input: { id: 101 }, state: "approval-requested", approval: { id: "ap1" } }
    const chat = fakeChat([
      [a([pending])],
      [a([{ ...pending, state: "output-available", output: "ok", approval: { id: "ap1", approved: true } }, { type: "text", text: "Done." }])],
    ])
    let asked = false
    const kit = await answerOf(aiSdkChat(() => chat), question, (now, api) => {
      if (!asked && now.evidence?.some((b) => b.kind === "approval" && !b.decision)) {
        asked = true
        void api.respond({ id: "d", approved: true })
      }
    })
    expect(chat.approvals).toEqual([{ id: "ap1", approved: true, reason: undefined }])
    // no sendAutomaticallyWhen on this chat: the adapter continued it
    expect(chat.sent[1]).toEqual({ message: undefined, options: undefined })
    expect(kit.text).toBe("Done.")
    expect(kit.evidence).toMatchObject([{ kind: "tool", id: "d", output: "ok" }])
  })

  it("regenerates the chat's answer, clears it, and can be followed", async () => {
    const chat = fakeChat([[a([{ type: "text", text: "First." }])], [a([{ type: "text", text: "Second." }], "a2")]])
    const stack = aiSdkChat(() => chat)
    await answerOf(stack)
    expect((await answerOf(stack, { ...question, regenerate: true })).text).toBe("Second.")
    expect(chat.messages.map((m) => m.id)).toEqual(["u0", "a2"])

    const changed = vi.fn()
    const off = stack.conversation!.subscribe(changed)
    expect(stack.conversation!.getTurns()).toEqual([
      { id: "u0", role: "user", text: question.question },
      { id: "a2", role: "assistant", answer: { text: "Second.", refs: [] }, running: false },
    ])
    expect(stack.conversation!.getTurns()).toBe(stack.conversation!.getTurns())
    await stack.reset!()
    expect(changed).toHaveBeenCalled()
    expect(stack.conversation!.getTurns()).toEqual([])
    off()
  })
})

/* ------------------------------ assistant-ui ----------------------------- */

/** A fake assistant-ui thread: each run plays the next script of snapshots. */
function fakeThread(scripts: AssistantUIMessage[][]) {
  const listeners = new Set<() => void>()
  let state = { messages: [] as AssistantUIMessage[], isRunning: false }
  const set = (next: Partial<typeof state>) => {
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  }
  const play = (base: AssistantUIMessage[]) =>
    queueMicrotask(async () => {
      const script = scripts.shift() ?? []
      set({ messages: base, isRunning: true })
      for (const message of script) {
        await tick()
        if (thread.cancelled) return
        set({ messages: [...base, message] })
      }
      if (!thread.cancelled) set({ isRunning: false })
    })
  const patch = (toolCallId: string, change: Record<string, unknown>) =>
    set({
      messages: state.messages.map((m) => ({
        ...m,
        content: m.content.map((p) => (p.toolCallId === toolCallId ? { ...p, ...change } : p)),
      })),
    })
  const thread: AssistantUIThread & { cancelled: boolean; approvals: unknown[] } = {
    cancelled: false,
    approvals: [],
    getState: () => state,
    subscribe: (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    cancelRun() {
      thread.cancelled = true
      set({ isRunning: false })
    },
    reset: () => set({ messages: [], isRunning: false }),
    append(message) {
      play([...state.messages, { id: `u${state.messages.length}`, role: "user", content: message.content }])
    },
    getMessageById: (id) => ({
      reload: () => play(state.messages.slice(0, state.messages.findIndex((m) => m.id === id))),
      getMessagePartByToolCallId: (toolCallId) => ({
        addToolResult: (result) => patch(toolCallId, { result }),
        resumeToolCall: (payload) => patch(toolCallId, { interrupt: undefined, result: payload }),
        async respondToToolApproval(response) {
          thread.approvals.push(response)
          patch(toolCallId, { approval: { id: "ap1", approved: response.approved } })
          // the runtime continues the same message
          const base = state.messages.slice(0, -1)
          play(base)
        },
      }),
    }),
  }
  return thread
}

describe("assistant-ui", () => {
  const reasoning = { type: "reasoning", text: "Look up the tasks\nFilter by due date." }
  const call = { type: "tool-call", toolCallId: "k", toolName: "searchTasks", args: { due: "past" } }
  const snap = (content: AssistantUIMessage["content"], status = "running", id = "a1") => ({
    id,
    role: "assistant",
    content,
    status: { type: status, reason: "stop" },
  })

  it("reads the run's message as it grows", async () => {
    const thread = fakeThread([
      [
        snap([reasoning]),
        snap([reasoning, { type: "text", text: "Two tasks" }]),
        snap([reasoning, { type: "text", text: "Two tasks are overdue." }, call]),
        snap(
          [
            reasoning,
            { type: "text", text: "Two tasks are overdue." },
            { ...call, result: [{ id: 1 }, { id: 2 }] },
            { type: "text", text: "Both are yours." },
            { type: "source", url: "https://example.com/docs", title: "Tracker docs" },
            { type: "data", name: "ambient-follow-ups", data: ["Reassign them?"] },
          ],
          "complete"
        ),
      ],
    ])
    expect(await answerOf(assistantUIThread(() => thread))).toEqual(expected)
  })

  it("fails the turn when the run ends in error", async () => {
    const thread = fakeThread([
      [{ id: "a1", role: "assistant", content: [], status: { type: "incomplete", reason: "error", error: "Model offline." } }],
    ])
    await expect(answerOf(assistantUIThread(() => thread))).rejects.toThrow("Model offline.")
  })

  it("cancels the thread's run on Stop", async () => {
    const thread = fakeThread([[snap([{ type: "text", text: "Two" }])]])
    const stop = new AbortController()
    const api = createAmbientApi(assistantUIThread(() => thread))
    const events = api.ask(question, { signal: stop.signal })[Symbol.asyncIterator]()
    await events.next()
    stop.abort()
    expect(thread.cancelled).toBe(true)
  })

  it("answers an approval on the thread and reads the rest", async () => {
    const pending = { type: "tool-call", toolCallId: "d", toolName: "completeTask", args: { id: 101 }, approval: { id: "ap1", prompt: "It changes the tracker." } }
    const thread = fakeThread([
      [snap([pending], "requires-action")],
      [snap([{ ...pending, approval: { id: "ap1", approved: true }, result: "ok" }, { type: "text", text: "Done." }], "complete")],
    ])
    let asked = false
    const kit = await answerOf(assistantUIThread(() => thread), question, (now, api) => {
      const approval = now.evidence?.find((b) => b.kind === "approval")
      if (!asked && approval?.kind === "approval" && !approval.decision) {
        asked = true
        expect(approval.reason).toBe("It changes the tracker.")
        void api.respond({ id: "d", approved: true })
      }
    })
    expect(thread.approvals).toEqual([{ approved: true, reason: undefined }])
    expect(kit.text).toBe("Done.")
    expect(kit.evidence).toMatchObject([{ kind: "tool", id: "d", output: "ok" }])
  })

  it("gives a waiting call its output", async () => {
    const waiting = { type: "tool-call", toolCallId: "p", toolName: "pickOwner", args: {} }
    const thread = fakeThread([[snap([waiting], "requires-action")]])
    let answered = false
    const kit = await answerOf(assistantUIThread(() => thread), question, (now, api) => {
      const tool = now.evidence?.[0]
      if (!answered && tool?.kind === "tool" && tool.status === "waiting") {
        answered = true
        void api.respond({ id: "p", output: "Ana" })
      }
    })
    expect(kit.evidence).toMatchObject([{ kind: "tool", id: "p", output: "Ana" }])
  })

  it("regenerates on the thread, clears it, and can be followed", async () => {
    const thread = fakeThread([[snap([{ type: "text", text: "First." }], "complete")], [snap([{ type: "text", text: "Second." }], "complete", "a2")]])
    const stack = assistantUIThread(() => thread)
    await answerOf(stack)
    expect((await answerOf(stack, { ...question, regenerate: true })).text).toBe("Second.")
    expect(thread.getState().messages.map((m) => m.id)).toEqual(["u0", "a2"])

    const off = stack.conversation!.subscribe(() => {})
    expect(stack.conversation!.getTurns()).toEqual([
      { id: "u0", role: "user", text: question.question },
      { id: "a2", role: "assistant", answer: { text: "Second.", refs: [] }, running: false },
    ])
    await stack.reset!()
    expect(stack.conversation!.getTurns()).toEqual([])
    off()
  })
})

/* ---------------------------------- AG-UI -------------------------------- */

type Step = { messages?: AgUIMessage[]; event?: AgUIEvent }

/** A fake AG-UI agent: each run plays the next script of steps. */
function fakeAgent(scripts: Step[][], fail?: Error) {
  type Sub = Parameters<AgUIAgent["subscribe"]>[0]
  const subs = new Set<Sub>()
  const changed = () => subs.forEach((s) => s.onMessagesChanged?.({}))
  const agent: AgUIAgent & { runs: unknown[]; aborted: boolean } = {
    messages: [],
    threadId: "t1",
    isRunning: false,
    pendingInterrupts: [],
    runs: [],
    aborted: false,
    addMessage(message) {
      agent.messages = [...agent.messages, message]
      changed()
    },
    setMessages(messages) {
      agent.messages = messages
      changed()
    },
    subscribe: (s) => (subs.add(s), { unsubscribe: () => subs.delete(s) }),
    abortRun: () => void (agent.aborted = true),
    async runAgent(parameters) {
      agent.runs.push(parameters)
      agent.isRunning = true
      subs.forEach((s) => s.onRunInitialized?.({}))
      const base = agent.messages
      for (const step of scripts.shift() ?? []) {
        await tick()
        if (step.messages) {
          agent.messages = [...base, ...step.messages]
          changed()
        }
        if (step.event) subs.forEach((s) => s.onEvent?.({ event: step.event! }))
      }
      agent.isRunning = false
      subs.forEach((s) => s.onRunFinalized?.({}))
      if (fail) throw fail
      return {}
    },
  }
  return agent
}

describe("AG-UI (CopilotKit)", () => {
  const reasoning = { id: "r", role: "reasoning", content: "Look up the tasks\nFilter by due date." }
  const m1 = { id: "m1", role: "assistant", content: "Two tasks are overdue." }
  const withCall = { ...m1, toolCalls: [{ id: "k", function: { name: "searchTasks", arguments: '{"due":"past"}' } }] }
  const result = { id: "t", role: "tool", toolCallId: "k", content: '[{"id":1},{"id":2}]' }
  const run: Step[] = [
    { messages: [reasoning] },
    { messages: [reasoning, { ...m1, content: "Two tasks" }] },
    { messages: [reasoning, withCall] },
    { messages: [reasoning, withCall, result, { id: "m2", role: "assistant", content: "Both are yours." }] },
    { event: { type: "CUSTOM", name: "ambient-refs", value: [{ label: "Tracker docs", href: "https://example.com/docs" }] } },
    { event: { type: "CUSTOM", name: "ambient-follow-ups", value: ["Reassign them?"] } },
  ]

  it("runs the question on the agent and reads its messages", async () => {
    const agent = fakeAgent([run])
    expect(await answerOf(agUIAgent(() => agent))).toEqual(expected)
    expect(agent.messages[0]).toMatchObject({ role: "user", content: question.question })
    expect(JSON.stringify(agent.runs[0])).toContain('\\"id\\":\\"tasks\\"')
  })

  it("runs through the host's runner when given one", async () => {
    const agent = fakeAgent([run])
    const runner = vi.fn((a: typeof agent) => a.runAgent())
    await answerOf(agUIAgent(() => agent, { run: runner }))
    expect(runner).toHaveBeenCalledOnce()
  })

  it("fails the turn on RUN_ERROR, and when the run rejects", async () => {
    await expect(
      answerOf(agUIAgent(() => fakeAgent([[{ event: { type: "RUN_ERROR", message: "No credits." } }]])))
    ).rejects.toThrow("No credits.")
    await expect(answerOf(agUIAgent(() => fakeAgent([[]], new Error("Network down."))))).rejects.toThrow("Network down.")
  })

  it("runs a browser tool, adds its result and runs the agent again", async () => {
    const calling = { id: "m1", role: "assistant", toolCalls: [{ id: "h", function: { name: "highlight", arguments: '{"id":101}' } }] }
    const agent = fakeAgent([[{ messages: [calling] }], [{ messages: [{ id: "m2", role: "assistant", content: "Highlighted." }] }]])
    const highlight = vi.fn(() => ({ ok: true }))
    const kit = await answerOf(
      agUIAgent(() => agent, { tools: { highlight: { description: "Highlight a task", run: highlight } } })
    )
    expect(highlight).toHaveBeenCalledWith({ id: 101 })
    expect(agent.runs).toHaveLength(2)
    expect(agent.runs[0]).toMatchObject({ tools: [{ name: "highlight", description: "Highlight a task" }] })
    expect(agent.messages.find((m) => m.role === "tool")).toMatchObject({ toolCallId: "h", content: '{"ok":true}' })
    expect(kit.text).toBe("Highlighted.")
    expect(kit.evidence).toMatchObject([{ kind: "tool", id: "h", output: { ok: true } }])
  })

  it("answers an interrupt and resumes the run with it", async () => {
    const agent = fakeAgent([[{ messages: [{ id: "m1", role: "assistant", content: "I need a yes." }] }], [{ messages: [{ id: "m2", role: "assistant", content: "Done." }] }]])
    const original = agent.runAgent.bind(agent)
    agent.runAgent = async (parameters) => {
      const out = await original(parameters)
      agent.pendingInterrupts = agent.runs.length === 1 ? [{ id: "i1", reason: "Complete task 101", message: "It changes the tracker." }] : []
      return out
    }
    let asked = false
    const kit = await answerOf(agUIAgent(() => agent), question, (now, api) => {
      const approval = now.evidence?.find((b) => b.kind === "approval")
      if (!asked && approval?.kind === "approval" && !approval.decision) {
        asked = true
        expect(approval).toMatchObject({ id: "i1", tool: "Complete task 101", reason: "It changes the tracker." })
        void api.respond({ id: "i1", approved: true })
      }
    })
    expect(agent.runs[1]).toMatchObject({ resume: [{ interruptId: "i1", status: "resolved", payload: { approved: true } }] })
    expect(kit.text).toBe("I need a yes.\n\nDone.")
  })

  it("regenerates on the agent, clears it, and can be followed", async () => {
    const agent = fakeAgent([[{ messages: [{ id: "m1", role: "assistant", content: "First." }] }], [{ messages: [{ id: "m2", role: "assistant", content: "Second." }] }]])
    const stack = agUIAgent(() => agent)
    await answerOf(stack)
    expect((await answerOf(stack, { ...question, regenerate: true })).text).toBe("Second.")
    expect(agent.messages.map((m) => m.role)).toEqual(["user", "assistant"])

    const off = stack.conversation!.subscribe(() => {})
    expect(stack.conversation!.getTurns()).toMatchObject([
      { role: "user", text: question.question },
      { id: "m2", role: "assistant", answer: { text: "Second." }, running: false },
    ])
    await stack.reset!()
    expect(stack.conversation!.getTurns()).toEqual([])
    expect(agent.threadId).not.toBe("t1")
    off()
  })
})


/* ------------------------- the edges worth pinning ----------------------- */

/** Collect a stack's events until it ends, with a handle to stop it. */
function start(stack: AmbientStack, input: AmbientQuestion = question) {
  const api = createAmbientApi(stack)
  const stop = new AbortController()
  let kit: AmbientAnswer = EMPTY_ANSWER
  const seen: ((kit: AmbientAnswer) => void)[] = []
  const done = (async () => {
    for await (const event of api.ask(input, { signal: stop.signal })) {
      kit = applyAnswerEvent(kit, event)
      seen.forEach((f) => f(kit))
    }
    return kit
  })()
  /** Resolves once the answer has a block matching `test`. */
  const until = (test: (kit: AmbientAnswer) => boolean) =>
    new Promise<AmbientAnswer>((resolve) => {
      const check = (now: AmbientAnswer) => test(now) && resolve(now)
      seen.push(check)
      check(kit)
    })
  return { api, stop, done, until }
}

const asking = (kit: AmbientAnswer) =>
  Boolean(kit.evidence?.some((b) => b.kind === "approval" && !b.decision))
const waitingOn = (kit: AmbientAnswer) =>
  Boolean(kit.evidence?.some((b) => b.kind === "tool" && b.status === "waiting"))

describe("the shared reader", () => {
  it("says nothing twice when a call is slotted in ahead of what is already said", () => {
    const read = createPartsReader()
    const said = (parts: StackPart[]) =>
      read(parts, false).map((e) => (e.type === "text" ? e.delta : e.type === "evidence" ? e.block.id : e.type))
    const b: StackPart = { type: "tool", id: "b", name: "second", input: {}, state: "running" }
    const text: StackPart = { type: "text", text: "Looking." }
    expect(said([b, text])).toEqual(["b", "Looking."])
    // the first call's input finished streaming: it appears BEFORE both
    const a: StackPart = { type: "tool", id: "a", name: "first", input: {}, state: "running" }
    expect(said([a, b, text])).toEqual(["a"])
  })
})

describe("Stop while the person is being asked", () => {
  it("AI SDK route: an open approval ends the turn, and a late answer is refused", async () => {
    const fetch = vi.fn(async () =>
      sse([
        { type: "tool-input-available", toolCallId: "d", toolName: "completeTask", input: { id: 101 } },
        { type: "tool-approval-request", approvalId: "ap1", toolCallId: "d" },
      ])
    )
    const run = start(aiSdkRoute({ api: "/api/chat", fetch }))
    await run.until(asking)
    run.stop.abort()
    await run.done
    expect(fetch).toHaveBeenCalledOnce()
    await expect(run.api.respond({ id: "d", approved: true })).rejects.toBeInstanceOf(NotWaitingError)
  })

  it("AI SDK route: stopped while a browser tool still runs, with a call waiting in the same round", async () => {
    let finish!: (value: string) => void
    const slow = () => new Promise<string>((resolve) => (finish = resolve))
    const fetch = vi.fn(async () =>
      sse([
        { type: "tool-input-available", toolCallId: "s", toolName: "slow", input: {} },
        { type: "tool-input-available", toolCallId: "p", toolName: "pickOwner", input: {} },
      ])
    )
    const run = start(aiSdkRoute({ api: "/api/chat", fetch, tools: { slow, pickOwner: waitForPerson } }))
    await tick()
    await tick()
    run.stop.abort()
    finish("late")
    // the wait is taken on a signal that has already fired: it must not hang
    await run.done
    expect(fetch).toHaveBeenCalledOnce()
  })

  it("AG-UI: an open interrupt ends the turn, cancels the run, and a late answer is refused", async () => {
    const agent = fakeAgent([[{ messages: [{ id: "m1", role: "assistant", content: "I need a yes." }] }]])
    const original = agent.runAgent.bind(agent)
    agent.runAgent = async (parameters) => {
      const out = await original(parameters)
      agent.pendingInterrupts = [{ id: "i1", reason: "Complete task 101" }]
      return out
    }
    const run = start(agUIAgent(() => agent))
    await run.until(asking)
    run.stop.abort()
    await run.done
    expect(agent.aborted).toBe(true)
    expect(agent.runs).toHaveLength(1)
    await expect(run.api.respond({ id: "i1", approved: true })).rejects.toBeInstanceOf(NotWaitingError)
  })

  it("assistant-ui: a waiting call ends the turn and cancels the run", async () => {
    const waiting = { type: "tool-call", toolCallId: "p", toolName: "pickOwner", args: {} }
    const thread = fakeThread([[{ id: "a1", role: "assistant", content: [waiting], status: { type: "requires-action" } }]])
    const run = start(assistantUIThread(() => thread))
    await run.until(waitingOn)
    run.stop.abort()
    expect(thread.cancelled).toBe(true)
  })
})

describe("a browser tool that fails, or is not there", () => {
  const boom = () => {
    throw new Error("Row not found.")
  }

  it("AI SDK route: a throw is a failure block, and the model is told", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(sse([{ type: "tool-input-available", toolCallId: "h", toolName: "highlight", input: { id: 9 } }]))
      .mockResolvedValueOnce(sse([{ type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: "I could not." }]))
    const kit = await answerOf(aiSdkRoute({ api: "/api/chat", fetch, tools: { highlight: boom } }))
    expect(kit.evidence).toEqual([{ kind: "failure", id: "h", tool: "highlight", target: '{"id":9}', error: "Row not found." }])
    const body = JSON.parse((fetch.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)
    expect(body.messages[1].parts[0]).toMatchObject({ state: "output-error", errorText: "Row not found." })
  })

  it("AG-UI: the same throw is the same failure block", async () => {
    const calling = { id: "m1", role: "assistant", toolCalls: [{ id: "h", function: { name: "highlight", arguments: '{"id":9}' } }] }
    const agent = fakeAgent([[{ messages: [calling] }], [{ messages: [{ id: "m2", role: "assistant", content: "I could not." }] }]])
    const kit = await answerOf(agUIAgent(() => agent, { tools: { highlight: { description: "Highlight", run: boom } } }))
    expect(kit.evidence).toEqual([{ kind: "failure", id: "h", tool: "highlight", target: '{"id":9}', error: "Row not found." }])
    expect(agent.messages.find((m) => m.role === "tool")).toMatchObject({ toolCallId: "h", error: "Row not found." })
  })

  it("a call to a tool the browser has not registered fails, naming it", async () => {
    const fetch = async () => sse([{ type: "tool-input-available", toolCallId: "x", toolName: "missing", input: {} }])
    const route = await answerOf(aiSdkRoute({ api: "/api/chat", fetch }))
    expect(route.evidence).toMatchObject([{ kind: "failure", id: "x", error: expect.stringContaining('"missing"') }])
    const calling = { id: "m1", role: "assistant", toolCalls: [{ id: "x", function: { name: "missing", arguments: "{}" } }] }
    const agent = await answerOf(agUIAgent(() => fakeAgent([[{ messages: [calling] }]])))
    expect(agent.evidence).toMatchObject([{ kind: "failure", id: "x", error: expect.stringContaining('"missing"') }])
  })
})

describe("an answer that keeps calling tools", () => {
  it("AI SDK route: stops at the cap with an error, not quietly", async () => {
    let n = 0
    const fetch = vi.fn(async () => sse([{ type: "tool-input-available", toolCallId: `h${n++}`, toolName: "again", input: {} }]))
    await expect(
      answerOf(aiSdkRoute({ api: "/api/chat", fetch, tools: { again: () => "ok" }, maxRounds: 3 }))
    ).rejects.toThrow("after 3 rounds")
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it("AG-UI: the same cap", async () => {
    let n = 0
    const agent = fakeAgent([])
    const original = agent.runAgent.bind(agent)
    agent.runAgent = async (parameters) => {
      const out = await original(parameters)
      agent.messages = [...agent.messages, { id: `m${n}`, role: "assistant", toolCalls: [{ id: `h${n++}`, function: { name: "again", arguments: "{}" } }] }]
      return out
    }
    await expect(
      answerOf(agUIAgent(() => agent, { tools: { again: { description: "Again", run: () => "ok" } }, maxRounds: 3 }))
    ).rejects.toThrow("after 3 rounds")
    expect(agent.runs).toHaveLength(3)
  })
})

describe("regenerating on a thread the stack keeps", () => {
  it("an answer that is not the thread's last is asked again as a new turn, and nothing after it is lost", async () => {
    const agent = fakeAgent([
      [{ messages: [{ id: "m1", role: "assistant", content: "First." }] }],
      [{ messages: [{ id: "m2", role: "assistant", content: "Other." }] }],
      [{ messages: [{ id: "m3", role: "assistant", content: "First, again." }] }],
    ])
    const stack = agUIAgent(() => agent)
    await answerOf(stack)
    await answerOf(stack, { ...question, question: "And the rest?" })
    const kit = await answerOf(stack, { ...question, regenerate: true })
    expect(kit.text).toBe("First, again.")
    expect(agent.messages.map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant", "user", "assistant"])
  })
})

describe("assistant-ui, the runtime's own edges", () => {
  it("an approval that was cancelled or expired reads as denied; an unknown resolution does not", async () => {
    const call = { type: "tool-call", toolCallId: "d", toolName: "completeTask", args: {} }
    const answer = async (approval: Record<string, unknown>, result?: string) =>
      (
        await answerOf(
          assistantUIThread(() =>
            fakeThread([[{ id: "a1", role: "assistant", content: [{ ...call, approval, result }, { type: "text", text: "Ok." }], status: { type: "complete" } }]])
          )
        )
      ).evidence?.[0]
    expect(await answer({ id: "ap", resolution: "expired" })).toMatchObject({ kind: "approval", decision: "denied" })
    expect(await answer({ id: "ap", resolution: "cancelled" })).toMatchObject({ kind: "approval", decision: "denied" })
    expect(await answer({ id: "ap", approved: true, resolution: "something-new" }, "ok")).toMatchObject({ kind: "tool" })
  })

  it("a run that ends on a tool result and is not continued is resubmitted through the runtime's chat", async () => {
    const call = { type: "tool-call", toolCallId: "p", toolName: "pickOwner", args: {} }
    const done = { ...call, result: "Ana" }
    const thread = fakeThread([
      [{ id: "a1", role: "assistant", content: [call], status: { type: "requires-action" } }],
      [{ id: "a1", role: "assistant", content: [done, { type: "text", text: "Assigned to Ana." }], status: { type: "complete" } }],
    ])
    const sendMessage = vi.fn(async () => {
      // the chat resubmits: the runtime runs again and continues the message
      thread.getMessageById("a1").reload()
    })
    const state = thread.getState.bind(thread)
    thread.getState = () => ({ ...state(), extras: { chat: { sendMessage } } })
    let answered = false
    const kit = await answerOf(assistantUIThread(() => thread), question, (now, api) => {
      if (!answered && waitingOn(now)) {
        answered = true
        void api.respond({ id: "p", output: "Ana" })
      }
    })
    expect(sendMessage).toHaveBeenCalledOnce()
    expect(kit.text).toBe("Assigned to Ana.")
  }, 10000)
})

describe("AI SDK chat, the SDK's own edges", () => {
  it("with resubmit off and nobody continuing, the answer ends instead of holding the turn", async () => {
    vi.useFakeTimers()
    try {
      const pending = { type: "tool-completeTask", toolCallId: "d", input: { id: 101 }, state: "approval-requested", approval: { id: "ap1" } }
      const chat = fakeChat([[{ id: "a1", role: "assistant", parts: [pending] }]])
      const run = start(aiSdkChat(() => chat, { resubmit: false }))
      await vi.advanceTimersByTimeAsync(50)
      await run.api.respond({ id: "d", approved: true })
      // this chat has no sendAutomaticallyWhen, and the adapter was told not to resubmit
      await vi.advanceTimersByTimeAsync(CONTINUE_TIMEOUT_MS + 50)
      const kit = await run.done
      expect(chat.sent).toHaveLength(1)
      expect(kit.evidence).toMatchObject([{ kind: "tool", id: "d" }])
    } finally {
      vi.useRealTimers()
    }
  })

  it("says which hook is missing when the Chat cannot be followed", () => {
    const chat = fakeChat([])
    delete (chat as Record<string, unknown>)["~registerMessagesCallback"]
    const stack = aiSdkChat(() => chat)
    expect(() => stack.conversation!.subscribe(() => {})).toThrow("~registerMessagesCallback")
  })
})
