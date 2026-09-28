/**
 * THE COPY'S CONTRACT: the English catalog is the one source of the
 * layer's words, it can be translated by copying it, and the language
 * reaches the host's API.
 */
import * as React from "react"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../src/orb-character", () => ({
  OrbCharacter: () => null,
  OrbGlyph: () => null,
  OrbField: () => null,
  OrbHeat: () => null,
}))

import { Assistant } from "../src/assistant"
import { AssistantProvider } from "../src/assistant-context"
import { ambientMessagesEn, formatAmbientMessage, resolveAmbientMessages } from "../src/messages"
import { createAmbientApi } from "../src/responder"

afterEach(cleanup)
Element.prototype.scrollTo ??= function () {}
Element.prototype.scrollIntoView ??= function () {}
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

describe("the formatter", () => {
  it("fills placeholders and picks plural forms by the locale's own rules", () => {
    const t = "{n, plural, one {# conversation} other {# conversations}}"
    expect(formatAmbientMessage(t, { n: 1 })).toBe("1 conversation")
    expect(formatAmbientMessage(t, { n: 3 })).toBe("3 conversations")
    const ar = "{n, plural, zero {لا محادثات} one {محادثة واحدة} two {محادثتان} few {# محادثات} many {# محادثة} other {# محادثة}}"
    expect(formatAmbientMessage(ar, { n: 0 }, "ar")).toBe("لا محادثات")
    expect(formatAmbientMessage(ar, { n: 2 }, "ar")).toBe("محادثتان")
    expect(formatAmbientMessage(ar, { n: 5 }, "ar")).toBe("5 محادثات")
    expect(formatAmbientMessage("{n, plural, =0 {none} other {#}}", { n: 0 })).toBe("none")
    expect(formatAmbientMessage("Ask {product}", { product: "Invoify" })).toBe("Ask Invoify")
  })
})

describe("the English catalog", () => {
  it("resolves every key: strings where there is nothing to fill, functions where there is", () => {
    const t = resolveAmbientMessages({ productName: "Ledger" })
    for (const [key, template] of Object.entries(ambientMessagesEn)) {
      const value = (t as Record<string, unknown>)[key]
      const takesValues = /\{(?!product\b)\w+/.test(template)
      expect(typeof value, key).toBe(takesValues ? "function" : "string")
      if (!takesValues) expect(value as string, key).not.toMatch(/\{\w+/)
    }
    expect(t.askAction).toBe("Ask Ledger")
  })

  it("a partial translation falls back to English, key by key", () => {
    const t = resolveAmbientMessages({
      locale: "es",
      productName: "Ledger",
      messages: { askAction: "Preguntar a {product}", conversations: "{n, plural, one {# conversación} other {# conversaciones}}" },
    })
    expect(t.askAction).toBe("Preguntar a Ledger")
    expect(t.conversations({ n: 2 })).toBe("2 conversaciones")
    expect(t.newChat).toBe("New chat")
  })
})

describe("the language on the wire", () => {
  it("sends the locale with every suggestions request and question", async () => {
    const seen: Array<string | undefined> = []
    const api = createAmbientApi({
      ask: async (input) => {
        seen.push(input.locale)
        return { text: "Una respuesta.", refs: [] }
      },
      suggestions: async (input) => {
        seen.push(input.locale)
        return []
      },
    })
    render(
      <AssistantProvider api={api} locale="es" messages={{ askAction: "Preguntar a {product}" }} productName="Ledger">
        <Assistant />
      </AssistantProvider>
    )
    await act(() => new Promise((r) => setTimeout(r, 20)))
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
    })
    const input = document.querySelector<HTMLInputElement>("[data-ambient-input]")!
    await act(async () => {
      input.value = ""
    })
    // a question typed and sent
    const { fireEvent } = await import("@testing-library/react")
    fireEvent.change(input, { target: { value: "¿por qué subió el alquiler este mes?" } })
    expect(screen.getByText("Preguntar a Ledger")).toBeTruthy()
    fireEvent.keyDown(input, { key: "Enter" })
    await act(() => new Promise((r) => setTimeout(r, 30)))
    expect(seen.length).toBeGreaterThanOrEqual(2)
    expect(seen.every((l) => l === "es")).toBe(true)
  })
})
