/**
 * THE LAYER OVER A HOST'S CHAT STACK:
 *
 *   - a tool the host has a component for is drawn by it, in the layer's
 *     frame, and can answer a waiting call
 *   - an approval is asked in the transcript and its answer reaches the API
 *   - a later block with the same id takes the earlier one's place
 *   - the transcript follows a thread the host keeps, and keeps what it
 *     already showed
 *   - regenerate says so to the API; clear clears the host's thread
 *   - an answer the host could not take is undone and shown; Stop closes an
 *     open approval; a clear the host refused keeps the transcript
 */
import * as React from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../src/orb-character", () => ({
  OrbCharacter: () => null,
  OrbGlyph: () => null,
  OrbField: () => null,
  OrbHeat: () => null,
}))

import { Assistant } from "../src/assistant"
import { AssistantProvider } from "../src/assistant-context"
import { ambientMessagesEn } from "../src/messages"
import { followConversation, type TranscriptMessage } from "../src/follow-conversation"
import {
  applyAnswerEvent,
  createAmbientApi,
  EMPTY_ANSWER,
  type AmbientApiHandlers,
  type AmbientConversationTurn,
} from "../src/responder"
import type { AmbientToolProps } from "../src/tool-host"

afterEach(cleanup)
Element.prototype.scrollTo ??= function () {}
Element.prototype.scrollIntoView ??= function () {}
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const wait = (ms = 30) => act(() => new Promise<void>((r) => setTimeout(r, ms)))

async function mount(handlers: AmbientApiHandlers, props: Partial<React.ComponentProps<typeof AssistantProvider>> = {}) {
  render(
    <AssistantProvider api={createAmbientApi(handlers)} {...props}>
      <Assistant />
    </AssistantProvider>
  )
  await wait(20)
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
  })
}

async function ask(text: string) {
  const input = document.querySelector<HTMLInputElement>("[data-ambient-input]")!
  fireEvent.change(input, { target: { value: text } })
  fireEvent.keyDown(input, { key: "Enter" })
  await wait()
}

describe("an answer's blocks", () => {
  it("a block with an id replaces the earlier block with that id", () => {
    const running = { kind: "tool", id: "k", verb: "search", status: "running" } as const
    const done = { kind: "tool", id: "k", verb: "search", result: "2 tasks" } as const
    let kit = applyAnswerEvent(EMPTY_ANSWER, { type: "evidence", block: running })
    kit = applyAnswerEvent(kit, { type: "evidence", block: { kind: "tool", verb: "other" } })
    kit = applyAnswerEvent(kit, { type: "evidence", block: done })
    expect(kit.evidence).toEqual([done, { kind: "tool", verb: "other" }])
  })
})

describe("the host's own components", () => {
  function OwnerPicker({ input, status, respond }: AmbientToolProps) {
    return (
      <div data-testid="picker">
        {(input as { task: string }).task}:{status}
        <button onClick={() => respond("Ana")}>Pick Ana</button>
      </div>
    )
  }

  it("draws a tool with the host's component, which answers the waiting call", async () => {
    const respond = vi.fn()
    await mount(
      {
        ask: async () => ({
          text: "",
          refs: [],
          evidence: [{ kind: "tool", id: "p", verb: "pickOwner", name: "pickOwner", input: { task: "Roadmap" }, status: "waiting" }],
        }),
        respond,
      },
      { toolComponents: { pickOwner: OwnerPicker } }
    )
    await ask("who should own the roadmap?")
    await wait(700)
    expect(screen.getByTestId("picker").textContent).toContain("Roadmap:waiting")
    fireEvent.click(screen.getByText("Pick Ana"))
    expect(respond).toHaveBeenCalledWith({ id: "p", output: "Ana" })
  })

  it("falls back to the stack's registry, then to the generic call", async () => {
    const renderTool = vi.fn((call: AmbientToolProps) =>
      call.name === "known" ? <div data-testid="registry">from the registry</div> : undefined
    )
    await mount(
      {
        ask: async () => ({
          text: "",
          refs: [],
          evidence: [
            { kind: "tool", id: "a", verb: "known", name: "known", input: {} },
            { kind: "tool", id: "b", verb: "Plain call", name: "unknown", input: {} },
          ],
        }),
      },
      { renderTool }
    )
    await ask("run both")
    await wait(3200)
    expect(screen.getByTestId("registry")).toBeTruthy()
    expect(screen.getByText("Plain call")).toBeTruthy()
  }, 10000)
})

describe("an approval", () => {
  it("asks in the transcript and sends the answer to the API", async () => {
    const respond = vi.fn()
    await mount({
      ask: async () => ({
        text: "",
        refs: [],
        evidence: [{ kind: "approval", id: "d", tool: "Complete task 101", request: '{"id":101}', reason: "It changes the tracker." }],
      }),
      respond,
    })
    await ask("complete the checklist task")
    await wait(600)
    expect(screen.getByText("Needs your approval")).toBeTruthy()
    expect(screen.getByText("It changes the tracker.")).toBeTruthy()
    fireEvent.click(screen.getByText("Approve"))
    expect(respond).toHaveBeenCalledWith({ id: "d", approved: true })
    expect(screen.getByText("Approved")).toBeTruthy()
  })
})

describe("when the host cannot take it", () => {
  const approval = { kind: "approval", id: "d", tool: "Complete task 101" } as const

  it("an approval the host refuses is open again, with the reason", async () => {
    await mount({
      ask: async () => ({ text: "", refs: [], evidence: [approval] }),
      respond: async () => {
        throw new Error("That is no longer waiting for an answer.")
      },
    })
    await ask("complete it")
    await wait(600)
    fireEvent.click(screen.getByText("Approve"))
    await wait()
    expect(screen.getByRole("alert").textContent).toBe("That is no longer waiting for an answer.")
    expect(screen.getByText("Approve")).toBeTruthy()
    expect(screen.queryByText("Approved")).toBeNull()
  })

  it("an API with no respond refuses, instead of looking delivered", async () => {
    await mount({ ask: async () => ({ text: "", refs: [], evidence: [approval] }) })
    await ask("complete it")
    await wait(600)
    fireEvent.click(screen.getByText("Approve"))
    await wait()
    expect(screen.getByRole("alert").textContent).toContain("no `respond`")
  })

  it("Stop closes an approval that was still open", async () => {
    await mount({
      ask: async function* () {
        yield { type: "evidence", block: approval }
        await new Promise(() => {})
      },
      respond: vi.fn(),
    })
    await ask("complete it")
    await wait(600)
    expect(screen.getByText("Approve")).toBeTruthy()
    fireEvent.click(document.querySelector(`button[title="${ambientMessagesEn.stop}"]`)!)
    await wait()
    expect(screen.queryByText("Approve")).toBeNull()
    expect(screen.getByText("Denied")).toBeTruthy()
  })

  it("a clear the host refused keeps the transcript and says why", async () => {
    await mount({
      ask: async () => ({ text: "An answer.", refs: [] }),
      reset: async () => {
        throw new Error("The thread is locked.")
      },
    })
    await ask("anything")
    fireEvent.click(document.querySelector(`button[aria-label="${ambientMessagesEn.backToSearch}"]`)!)
    await wait()
    expect(document.body.textContent).toContain("Couldn't clear the conversation")
    expect(document.body.textContent).toContain("The thread is locked.")
    expect(document.body.textContent).toContain("anything")
    // the notice goes once the conversation moves on
    const input = document.querySelector<HTMLInputElement>("input")!
    fireEvent.change(input, { target: { value: "something else" } })
    fireEvent.keyDown(input, { key: "Enter" })
    await wait()
    expect(document.body.textContent).not.toContain("Couldn't clear the conversation")
  })
})

describe("a failure that gave no reason", () => {
  it("is told in the person's language, for a turn and for a tool", async () => {
    await mount(
      {
        ask: async function* () {
          yield { type: "evidence", block: { kind: "failure", tool: "searchTasks", error: "" } }
          yield { type: "error", message: "" }
        },
      },
      { locale: "es" }
    )
    await ask("¿qué tareas están atrasadas?")
    await wait()
    const said = document.body.textContent ?? ""
    // once under the failed tool, once as the turn's own reason
    expect(said.split("El asistente no pudo responder.").length - 1).toBe(2)
    expect(said).not.toContain("The assistant could not answer.")
  })
})

describe("regenerate and clear", () => {
  it("clear clears the host's thread too", async () => {
    const reset = vi.fn()
    await mount({ ask: async () => ({ text: "An answer.", refs: [] }), reset })
    await ask("anything")
    const clear = document.querySelector(`button[aria-label="${ambientMessagesEn.backToSearch}"]`)
    expect(clear, "a clear control").toBeTruthy()
    fireEvent.click(clear!)
    expect(reset).toHaveBeenCalledOnce()
  })
})

describe("following the host's thread", () => {
  const answer = (text: string) => ({ text, refs: [] })
  const shown: TranscriptMessage[] = [
    { id: 1, role: "user", text: "Hi" },
    { id: 2, role: "assistant", text: "Hello.", kits: [answer("Hello.")], prompt: "Hi", settled: true },
  ]
  const thread: AmbientConversationTurn[] = [
    { id: "u", role: "user", text: "Hi" },
    { id: "a", role: "assistant", answer: answer("Hello.") },
  ]

  it("keeps what it shows when the thread agrees", () => {
    expect(followConversation(shown, thread)).toBe(shown)
  })

  it("adds a turn that started elsewhere, live while it runs and settled as history", () => {
    const running = followConversation(shown, [
      ...thread,
      { id: "u2", role: "user", text: "And tasks?" },
      { id: "a2", role: "assistant", answer: answer("Two"), running: true },
    ])
    expect(running.slice(0, 2)).toEqual(shown)
    expect(running[0]).toBe(shown[0])
    expect(running.slice(2)).toEqual([
      { id: 3, role: "user", text: "And tasks?" },
      { id: 4, role: "assistant", text: "Two", kits: [answer("Two")], prompt: "And tasks?", arriving: true, settled: false },
    ])
    const done = followConversation(running, [
      ...thread,
      { id: "u2", role: "user", text: "And tasks?" },
      { id: "a2", role: "assistant", answer: answer("Two are overdue.") },
    ])
    expect(done[3]).toMatchObject({ id: 4, text: "Two are overdue.", kits: [answer("Two are overdue.")], arriving: false })
    // history the layer was not there for is written, not performed
    expect(followConversation([], thread).every((m) => m.role === "user" || m.settled)).toBe(true)
  })

  it("an answer the thread replaced becomes a new version of it", () => {
    const next = followConversation(shown, [thread[0]!, { id: "a2", role: "assistant", answer: answer("Hello again.") }])
    expect(next[1]!.kits).toEqual([answer("Hello."), answer("Hello again.")])
  })

  it("a cleared thread clears the transcript, and a failure the thread never saw stays", () => {
    expect(followConversation(shown, [])).toEqual([])
    const failed: TranscriptMessage[] = [shown[0]!, { id: 2, role: "assistant", text: "", failed: "Offline." }]
    expect(followConversation(failed, [thread[0]!])).toBe(failed)
  })

  it("shows a turn the product started, in the layer", async () => {
    let turns: AmbientConversationTurn[] = []
    const listeners = new Set<() => void>()
    await mount({
      ask: async () => ({ text: "", refs: [] }),
      conversation: {
        subscribe: (l) => (listeners.add(l), () => listeners.delete(l)),
        getTurns: () => turns,
      },
    })
    await act(async () => {
      turns = [
        { id: "u", role: "user", text: "Asked from the product's own page" },
        { id: "a", role: "assistant", answer: answer("Answered there.") },
      ]
      listeners.forEach((l) => l())
    })
    // mid-conversation the hotkey shows search over it; the conversation is one row back
    await wait()
    expect(document.body.textContent).toContain("Asked from the product's own page")
  })
})
