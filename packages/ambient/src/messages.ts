"use client"

import * as React from "react"

import { ambientMessagesAr } from "./messages.ar"
import { ambientMessagesDe } from "./messages.de"
import { ambientMessagesEn, type AmbientCatalog } from "./messages.en"
import { ambientMessagesEs } from "./messages.es"
import { ambientMessagesFr } from "./messages.fr"
import { ambientMessagesHi } from "./messages.hi"
import { ambientMessagesJa } from "./messages.ja"
import { ambientMessagesPt } from "./messages.pt"
import { ambientMessagesRu } from "./messages.ru"
import { ambientMessagesZh } from "./messages.zh"

export { ambientMessagesEn, type AmbientCatalog }

/** The catalogs that ship, by language. Add one by adding its file here. */
export const ambientCatalogs: Record<string, AmbientCatalog> = {
  en: ambientMessagesEn,
  zh: ambientMessagesZh,
  hi: ambientMessagesHi,
  es: ambientMessagesEs,
  fr: ambientMessagesFr,
  ar: ambientMessagesAr,
  pt: ambientMessagesPt,
  ru: ambientMessagesRu,
  ja: ambientMessagesJa,
  de: ambientMessagesDe,
}

/** The shipped catalog for a locale: exact tag, then its language, then English. */
export function catalogFor(locale = "en"): AmbientCatalog {
  const tag = locale.toLowerCase()
  return ambientCatalogs[tag] ?? ambientCatalogs[tag.split(/[-_]/)[0]!] ?? ambientMessagesEn
}

/**
 * The layer's words, resolved for one product and one locale from a catalog
 * (messages.<locale>.ts: flat keys, ICU MessageFormat strings).
 *
 *   <AssistantProvider productName="Acme" locale="ar">
 *
 * `messages` may override any subset; `locale` picks the catalog and the
 * plural rules, and travels with every question so the host can answer in
 * the same language. The formatter is a small ICU subset (`{name}`,
 * `{name, plural, …}` with `#`), so the layer needs no i18n library.
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
  assistantName = productName,
  locale = "en",
}: {
  messages?: Partial<AmbientCatalog>
  productName?: string
  assistantName?: string
  locale?: string
} = {}): AmbientMessages {
  const catalog: AmbientCatalog = { ...ambientMessagesEn, ...catalogFor(locale), ...messages }
  const out: Record<string, unknown> = {}
  for (const [key, template] of Object.entries(catalog)) {
    const names = { product: productName, assistant: assistantName }
    const params = /\{(?!(?:product|assistant)\b)\w+/.test(template)
    out[key] = params
      ? (values: Record<string, string | number>) =>
          formatAmbientMessage(template, { ...names, ...values }, locale)
      : formatAmbientMessage(template, names, locale)
  }
  return out as AmbientMessages
}

/** Its own context: the kits also render without an AssistantProvider, in English. */
const MessagesContext = React.createContext<AmbientMessages>(resolveAmbientMessages())

export const AmbientMessagesProvider = MessagesContext.Provider

export function useAmbientMessages(): AmbientMessages {
  return React.useContext(MessagesContext)
}
