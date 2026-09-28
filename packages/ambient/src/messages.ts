"use client"

import * as React from "react"

import { ambientMessagesEn, type AmbientCatalog } from "./messages.en"

export { ambientMessagesEn, type AmbientCatalog }

/**
 * EVERY WORD THE LAYER SAYS ON ITS OWN BEHALF, resolved for one product and
 * one locale.
 *
 * The copy lives in a catalog (messages.en.ts): flat keys, ICU MessageFormat
 * strings. It used to be written inline, in English, and several words named
 * the LIBRARY ("Ask ambientui", a footer reading "ambientui"). Every install
 * hit that (tududi, Actual, Invoify, Excalidraw), and a product with
 * eighteen locales had no way to pass its translations in. Now:
 *
 *   <AssistantProvider productName="Invoify" locale="ar" messages={ambientMessagesAr}>
 *
 * `messages` may be any subset (missing keys fall back to English), and
 * `locale` picks the plural rules and travels with every question, so the
 * host's API can answer in the same language.
 *
 * The formatter is a small ICU subset — `{name}` and
 * `{name, plural, =N {…} zero|one|two|few|many|other {…}}` with `#` — so
 * the layer needs no i18n library, and a catalog is still one that
 * i18next, next-intl and react-intl read unchanged.
 */

/** The keys that take values beyond `{product}`, and what they take. */
type Params = {
  startTypingHint: { families: string }
  sectionCount: { n: number; noun: string }
  canSeePage: { page: string }
  pastedMeta: { lines: number; chars: number }
  conversations: { n: number }
  thinkingFor: { n: number }
  thoughtFor: { n: number }
  applyCount: { n: number }
}

export type AmbientMessages = {
  [K in keyof AmbientCatalog]: K extends keyof Params ? (values: Params[K]) => string : string
}

/* ------------------------------ the formatter ----------------------------- */

/** The text inside the braces that open at `start`, braces balanced. */
function block(t: string, start: number): [string, number] {
  let depth = 0
  for (let i = start; i < t.length; i++) {
    if (t[i] === "{") depth++
    else if (t[i] === "}" && --depth === 0) return [t.slice(start + 1, i), i + 1]
  }
  return [t.slice(start + 1), t.length]
}

/** Format one ICU string: `{name}` and `{name, plural, …}` with `#`. */
export function formatAmbientMessage(
  template: string,
  values: Record<string, string | number>,
  locale = "en"
): string {
  let out = ""
  let i = 0
  while (i < template.length) {
    if (template[i] !== "{") {
      out += template[i++]
      continue
    }
    const [inner, next] = block(template, i)
    i = next
    const [name, kind, ...rest] = inner.split(",").map((s) => s.trim())
    const value = values[name!]
    if (kind !== "plural") {
      out += value ?? `{${name}}`
      continue
    }
    // the options after "plural,": `one {…} other {…}` (braces balanced)
    const body = inner.slice(inner.indexOf(",", inner.indexOf(",") + 1) + 1)
    void rest
    const options: Record<string, string> = {}
    let j = 0
    while (j < body.length) {
      const m = /^\s*(=\d+|zero|one|two|few|many|other)\s*/.exec(body.slice(j))
      if (!m) break
      j += m[0].length
      const [text, after] = block(body, j)
      options[m[1]!] = text
      j = after
    }
    const n = Number(value)
    const chosen =
      options[`=${n}`] ??
      options[new Intl.PluralRules(locale).select(n)] ??
      options.other ??
      ""
    out += formatAmbientMessage(chosen.replace(/#/g, String(n)), values, locale)
  }
  return out
}

/** A catalog resolved for one product and locale: strings, or functions of their values. */
export function resolveAmbientMessages({
  messages,
  productName = "the assistant",
  locale = "en",
}: {
  messages?: Partial<AmbientCatalog>
  productName?: string
  locale?: string
} = {}): AmbientMessages {
  const catalog: AmbientCatalog = { ...ambientMessagesEn, ...messages }
  const out: Record<string, unknown> = {}
  for (const [key, template] of Object.entries(catalog)) {
    const params = /\{(?!product\b)\w+/.test(template)
    out[key] = params
      ? (values: Record<string, string | number>) =>
          formatAmbientMessage(template, { product: productName, ...values }, locale)
      : formatAmbientMessage(template, { product: productName }, locale)
  }
  return out as AmbientMessages
}

/**
 * A context of its own, NOT a field of the assistant context: the kits
 * (ReasoningPanel, ErrorState, Composer) render standalone — in the /ds
 * playground, in a host's own page — with no AssistantProvider above them,
 * and must still have words. With no provider they get English.
 */
const MessagesContext = React.createContext<AmbientMessages>(resolveAmbientMessages())

export const AmbientMessagesProvider = MessagesContext.Provider

export function useAmbientMessages(): AmbientMessages {
  return React.useContext(MessagesContext)
}
