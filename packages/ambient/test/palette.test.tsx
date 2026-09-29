/**
 * THE PALETTE'S CONTRACT WITH A HOST:
 *
 *   - registering commands every render does not loop
 *   - a command or a jump leaves the palette closed and its query empty
 *   - the hotkey is heard even when the host stops the key, unless the
 *     host yields it
 *   - the hotkey opens SEARCH mid-conversation, the conversation one row away
 *   - a section counts in its own noun ("8 accounts", not "8 accountss")
 *   - a nav item's icon is a name, drawn by <Icon>
 *   - the chrome says the product's name, never "ambientui"
 */
import * as React from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// the shader needs WebGL, which jsdom does not have; the palette does not
// need the shader
vi.mock("../src/orb-character", () => ({
  OrbCharacter: () => null,
  OrbGlyph: () => null,
  OrbField: () => null,
  OrbHeat: () => null,
}))

import { Assistant } from "../src/assistant"
import {
  AssistantProvider,
  useAssistant,
  useRegisterCommands,
  type AmbientCommand,
  type NavItem,
} from "../src/assistant-context"
import { createAmbientApi } from "../src/responder"

afterEach(cleanup)

// jsdom lays nothing out: the layer's scroll-into-view and size watching
// become no-ops here
Element.prototype.scrollTo ??= function () {}
Element.prototype.scrollIntoView ??= function () {}
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const api = createAmbientApi({
  ask: async () => ({ text: "An answer.", refs: [] }),
  suggestions: async () => [],
})

// jsdom reports no platform, so "mod" is Ctrl here
const hotkey = (target: EventTarget = window, init: KeyboardEventInit = {}) =>
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true, ...init })
    )
  })

const spotlight = () => document.querySelector('[data-ambient-surface="spotlight"]')
const input = () => document.querySelector<HTMLInputElement>("[data-ambient-input]")
const settle = () => act(() => new Promise((r) => setTimeout(r, 30)))

function Host({
  commands = [],
  navItems = [],
  onNavigate,
  yieldHotkey,
  productName = "Ledger",
}: {
  commands?: AmbientCommand[]
  navItems?: NavItem[]
  onNavigate?: (id: string) => void
  yieldHotkey?: (e: KeyboardEvent) => boolean
  productName?: string
}) {
  return (
    <AssistantProvider
      api={api}
      productName={productName}
      navItems={navItems}
      onNavigate={onNavigate}
      yieldHotkey={yieldHotkey}
    >
      <Registrar commands={commands} />
      <Assistant />
    </AssistantProvider>
  )
}

/** Registers a FRESH array every render, the way a real host builds it. */
function Registrar({ commands }: { commands: AmbientCommand[] }) {
  useRegisterCommands(commands.map((c) => ({ ...c })))
  return null
}

describe("the palette's contract", () => {
  it("an identical command list does not update state, so registering every render cannot loop", async () => {
    // a render-count test of the loop itself HANGS when the guard is gone
    // (the loop never yields), so the guard is tested directly: repeated
    // identical lists must leave the rendered list untouched
    const seen = new Set<unknown>()
    let register: ((c: AmbientCommand[]) => void) | undefined
    function Probe() {
      const { commands, setCommands } = useAssistant()
      React.useEffect(() => {
        seen.add(commands)
        register = setCommands
      })
      return null
    }
    render(
      <AssistantProvider api={api}>
        <Probe />
      </AssistantProvider>
    )
    const list = () => [{ id: "a", section: "Accounts", label: "Checking", run: () => {} }]
    act(() => register!(list()))
    const afterFirst = seen.size
    act(() => register!(list()))
    act(() => register!(list()))
    expect(seen.size).toBe(afterFirst)
  })

  it("a registered command always runs its newest closure", async () => {
    const calls: string[] = []
    const { rerender } = render(<Host commands={[{ id: "c", section: "Accounts", label: "Checking", run: () => calls.push("old") }]} />)
    rerender(<Host commands={[{ id: "c", section: "Accounts", label: "Checking", run: () => calls.push("new") }]} />)
    hotkey()
    fireEvent.change(input()!, { target: { value: "checking" } })
    fireEvent.click(screen.getByText("Checking"))
    expect(calls).toEqual(["new"])
  })

  it("a command leaves the palette closed and its query empty, and runs the latest closure", async () => {
    const run = vi.fn()
    render(<Host commands={[{ id: "open-checking", section: "Accounts", label: "Checking", run }]} />)
    hotkey()
    expect(spotlight()).not.toBeNull()
    fireEvent.change(input()!, { target: { value: "checking" } })
    fireEvent.click(screen.getByText("Checking"))
    expect(run).toHaveBeenCalledTimes(1)
    await settle()
    hotkey()
    expect(input()!.value).toBe("")
    expect(spotlight()).not.toBeNull()
  })

  it("a jump leaves the palette closed and its query empty", async () => {
    const onNavigate = vi.fn()
    render(<Host navItems={[{ id: "reports", label: "Reports", icon: "document" }]} onNavigate={onNavigate} />)
    hotkey()
    fireEvent.change(input()!, { target: { value: "reports" } })
    fireEvent.click(screen.getByText("Reports"))
    expect(onNavigate).toHaveBeenCalledWith("reports")
    await settle()
    hotkey()
    expect(input()!.value).toBe("")
  })

  it("hears the hotkey even when the host stops it, unless the host yields", async () => {
    const stop = (e: Event) => e.stopPropagation()
    document.addEventListener("keydown", stop)
    const { unmount } = render(<Host />)
    hotkey(document.body)
    expect(spotlight()).not.toBeNull()
    unmount()
    document.removeEventListener("keydown", stop)

    render(<Host yieldHotkey={() => true} />)
    hotkey()
    expect(spotlight()).toBeNull()
  })

  it("opens search mid-conversation, with the conversation one row away", async () => {
    render(<Host />)
    hotkey()
    fireEvent.change(input()!, { target: { value: "why did rent go up this month?" } })
    fireEvent.keyDown(input()!, { key: "Enter" })
    await settle()
    // the conversation took over the palette; close it, then ask again
    hotkey()
    await settle()
    hotkey()
    expect(input()).not.toBeNull()
    expect(screen.getByText("Back to the conversation")).toBeTruthy()
  })

  it("counts a section in its own noun", async () => {
    const run = () => {}
    const commands = Array.from({ length: 8 }, (_, i) => ({
      id: `acct-${i}`,
      section: "Accounts",
      noun: "account",
      label: `Account ${i}`,
      run,
    }))
    render(<Host commands={commands} />)
    await settle()
    hotkey()
    expect(screen.getByText(/8 accounts\b/)).toBeTruthy()
    expect(screen.queryByText(/accountss/)).toBeNull()
  })

  it("draws a nav item's icon from its name without crashing", () => {
    render(<Host navItems={[{ id: "home", label: "Home", icon: "home" }]} />)
    hotkey()
    expect(screen.getByText("Home")).toBeTruthy()
  })

  it("names the product, never the library", () => {
    render(<Host productName="Ledger" />)
    hotkey()
    const root = document.querySelector("[data-ambient-root]")!
    expect(root.textContent).toContain("Ledger")
    expect(root.textContent?.toLowerCase()).not.toContain("ambientui")
  })
})
