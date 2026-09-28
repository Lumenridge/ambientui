/* eslint-disable react-refresh/only-export-components */
"use client"

import * as React from "react"

import { disconnectedAmbientApi, type AmbientApi } from "./responder"
import type { AmbientRecent } from "./responder-schemas"

import type { IconName } from "@ambient-ui/ui/components/icon"

import type { OrbState } from "./orb-character"
import {
  AmbientMessagesProvider,
  resolveAmbientMessages,
  type AmbientCatalog,
  type AmbientMessages,
} from "./messages"

export type AssistantMode =
  | "line"
  | "panel"
  | "dock"
  | "spotlight"
  | "history"

export type OrbAnchor = "tl" | "tc" | "tr" | "ml" | "mr" | "bl" | "bc" | "br"

export type ContextChip = {
  id: string
  label: string
  /**
   * What was attached. The kind picks the chip's mark and tells the composer
   * what sort of answer the question deserves — a file earns tool calls and a
   * diff, a page earns a search and citations.
   */
  kind: "page" | "control" | "target" | "cell" | "file" | "symbol" | "selection"
  /**
   * What this particular thing IS, when the kind is too coarse to say. Every
   * page is `kind: "page"`, but a page can be an editor, a colour map or a
   * motion table — and the page is the only thing that knows which. Omitted,
   * the kind's own icon stands in.
   */
  icon?: IconName
}

/**
 * What the page knows that the ambient layer should surface: the questions
 * worth asking RIGHT NOW (live — a healed problem leaves the list) and the
 * working history this surface would plausibly have. Announced by the page
 * like pageChip is; the layer renders it and falls back to its generic
 * defaults when no page has spoken.
 */
export type PageIntel = {
  suggestions?: string[]
  recents?: { text: string; when: string }[]
  /**
   * What "Jump to" navigates to while this page is open. A page with its own
   * workspace — the dev tool's files — offers those instead of the app's
   * routes: the palette should move you around where you are working, not
   * away from it.
   */
  jumps?: { id: string; label: string; desc?: string; icon?: NavItem["icon"] }[]
  onJump?: (id: string) => void
  /**
   * What the spotlight's input invites here. The generic line asks about the
   * app; a page with its own material can ask about that instead.
   */
  askPlaceholder?: string
  /** Section headings, when the page's own words are more useful. */
  suggestLabel?: string
  jumpLabel?: string
}

/**
 * A COMMAND the palette can run. The app registers these; the layer renders
 * them and calls `run`. It never learns what a command means — same contract
 * as the context chip, in the other direction.
 */
/**
 * A place the host app can navigate to, offered in the palette's "Jump to".
 *
 * THE LAYER IS TOLD, NEVER IMPORTS. assistant.tsx used to `import { sections }
 * from "@/nav"` — a UI layer reaching into one particular app's route table,
 * and the single thing that made it un-liftable.
 *
 * `icon` is a vocabulary NAME ("home", "settings"), drawn by the configured
 * library through <Icon>, like every other icon in the system. It was typed
 * `unknown` and documented as "forwarded to the host's Icon" while actually
 * being handed to <HugeiconsIcon>, so the first host to pass a name
 * ('home') crashed the whole app on its first ⌘K (Actual, 2026-09-28). A
 * HugeIcons icon object is still accepted, for hosts built against that.
 */
export type NavItem = {
  id: string
  label: string
  desc?: string
  icon?: IconName | NavIconObject
}

/** A HugeIcons icon definition — the legacy form of NavItem.icon. */
export type NavIconObject = readonly unknown[] | Record<string, unknown>

export type AmbientCommand = {
  id: string
  /** The group heading it files under: "Components", "Documentation"… */
  section: string
  label: string
  desc?: string
  /** Extra words to match on that are not worth showing. */
  keywords?: string
  /** An icon NAME from the vocabulary, drawn by the configured library. */
  icon?: string
  /**
   * What one of this section's commands is called when they are counted
   * ("8 accounts"). Omitted, the section name is lowercased and given an
   * "s", which is right for "Components" and wrong for "Accounts"
   * ("8 accountss", Actual, 2026-09-28).
   */
  noun?: string
  /** The plural, for languages where it is not the noun plus "s". */
  nounPlural?: string
  run: () => void
}

/**
 * A key combination: modifiers joined by `+`, then the key. `mod` is ⌘ on
 * macOS and Ctrl elsewhere. "mod+k", "mod+j", "mod+shift+k".
 */
export type AmbientHotkey = string

type AssistantState = {
  mode: AssistantMode
  setMode: (m: AssistantMode) => void
  /** Ambient context — what the user is currently looking at. Replaced on navigation/selection. */
  pageChip: ContextChip | null
  setPageChip: (c: ContextChip | null) => void
  /** What the current page suggests and remembers — see PageIntel. */
  pageIntel: PageIntel | null
  setPageIntel: (i: PageIntel | null) => void
  /** Everything ⌘K can DO, registered by the app — see AmbientCommand. */
  commands: AmbientCommand[]
  /**
   * Replace the registered commands. SAFE TO CALL ON EVERY RENDER: a list
   * whose ids, labels, sections and descriptions match the current one does
   * not update state, so registering from an effect that re-runs cannot
   * loop. `run` always calls the LATEST closure passed in. Prefer
   * useRegisterCommands, which also clears on unmount.
   */
  setCommands: (c: AmbientCommand[]) => void
  /** Where the host can go — see NavItem. Empty is a valid state. */
  navItems: NavItem[]
  /** Explicit context added by the user (right-click → Explain / Add to context). */
  chips: ContextChip[]
  addChip: (c: ContextChip) => void
  removeChip: (id: string) => void
  /** Right-click → Explain: attach context and open the assistant with a seeded prompt. */
  explain: (c: ContextChip) => void
  seedVersion: number
  consumeSeededPrompt: () => string | null
  /** Hand a prompt to the next surface. autoSend asks it on arrival. */
  seedPrompt: (text: string, autoSend?: boolean) => void
  /** True once, if the pending seed should be sent rather than typed. */
  consumeAutoSend: () => boolean
  orbAnchor: OrbAnchor
  setOrbAnchor: (a: OrbAnchor) => void
  /** The orb character's state — driven by the response pipeline. */
  orbState: OrbState
  setOrbState: (s: OrbState) => void
  /** Navigate the app shell to a section (wired by App). */
  navigate?: (sectionId: string) => void
  /** The shortcut that opens the spotlight, or false for none. */
  hotkey: AmbientHotkey | false
  /** Return true to let the host keep this keystroke. */
  yieldHotkey?: (event: KeyboardEvent) => boolean
  /** The layer's stacking level against the host's chrome, when set. */
  zIndex?: number
  /** Render the layer in the host's dark theme regardless of `<html>`. */
  dark: boolean
  /** The chrome's words — see messages.ts. */
  messages: AmbientMessages
  /** The person's language: the provider's `locale`, else `<html lang>`, else "en". */
  locale: string
  /**
   * The host's Ambient API (see responder.ts): where every question,
   * suggestion list and recent-chat list comes from. Without one, every
   * question fails with the reason — the layer never answers on its own.
   */
  api: AmbientApi
  /**
   * What to offer asking here: the page's own live list when it announced
   * one (state only the page knows), otherwise the API's suggestions for
   * this page. Empty while loading, and when neither has any.
   */
  suggestions: string[]
  /** The working history: the page's, otherwise the API's. */
  recents: AmbientRecent[]
  /**
   * The last workspace effect a settled answer announced. Surfaces that own
   * product state subscribe and decide what it means; the layer only relays.
   */
  workspaceEffect: string | null
  announceEffect: (effect: string | null) => void
}

const AssistantContext = React.createContext<AssistantState | undefined>(undefined)

/** A stable key for what a command list SAYS, ignoring its closures. */
const commandSignature = (list: AmbientCommand[]) =>
  list
    .map((c) =>
      [c.id, c.section, c.label, c.desc ?? "", c.keywords ?? "", c.icon ?? "", c.noun ?? ""].join("\u0001")
    )
    .join("\u0002")

export function AssistantProvider({
  children,
  onNavigate,
  navItems = [],
  api,
  productName,
  messages,
  locale: localeProp,
  hotkey = "mod+k",
  yieldHotkey,
  zIndex,
  dark = false,
  defaultOrbAnchor = "bc",
}: {
  children: React.ReactNode
  onNavigate?: (sectionId: string) => void
  navItems?: NavItem[]
  /** Where questions go: the host's API, built with createAmbientApi. */
  api?: AmbientApi
  /**
   * The product's name, as its users know it. The chrome's defaults say it
   * ("Ask Invoify", "Open Invoify"); omitted, they say "the assistant".
   * Never the library's name.
   */
  productName?: string
  /**
   * The chrome's words in another language, or just different words: any
   * subset of the catalog (messages.en.ts), each an ICU string. Missing
   * keys fall back to English.
   */
  messages?: Partial<AmbientCatalog>
  /**
   * The person's language (BCP 47: "en", "ar", "pt-BR"). It picks the
   * plural rules for `messages`, and it is sent with every question and
   * suggestions request, so the host answers in it. Omitted: `<html lang>`.
   */
  locale?: string
  /**
   * The shortcut that opens the spotlight ("mod+k" by default), or false.
   * A host that already owns ⌘K passes another combination, or keeps ⌘K and
   * passes `yieldHotkey`.
   */
  hotkey?: AmbientHotkey | false
  /**
   * Called with the keydown before the layer claims its hotkey. Return true
   * and the layer steps aside: the host's own handler gets the key. The
   * layer listens in the CAPTURE phase, so it hears the key before a host
   * handler can stop it (Excalidraw binds ⌘K to "Add link" and stopped
   * propagation, so the palette never opened), and this is the host's way
   * to share it back.
   */
  yieldHotkey?: (event: KeyboardEvent) => boolean
  /**
   * Stack the layer at this z-index. Its surfaces sit at `z-50` inside the
   * layer, which loses to host chrome above 50 (Actual's sticky headers sit
   * at 1000); set this above the product's chrome and below its modals.
   */
  zIndex?: number
  /**
   * Render in dark mode. The layer follows a `.dark` class on an ancestor,
   * which is shadcn's convention; a product that keeps its theme elsewhere
   * (Excalidraw's `.theme--dark` container, an app preference) mirrors it
   * here.
   */
  dark?: boolean
  /**
   * Where the resting orb starts. Bottom centre by default; a product with
   * its own fixed bottom bar passes "mr" (Invoify's Generate PDF bar).
   */
  defaultOrbAnchor?: OrbAnchor
}) {
  const [mode, setMode] = React.useState<AssistantMode>("line")
  const [pageChip, setPageChip] = React.useState<ContextChip | null>(null)
  const [pageIntel, setPageIntel] = React.useState<PageIntel | null>(null)
  // THE LIST THAT RENDERS changes only when what it SAYS changes; the
  // closures live in a ref so a command always runs the latest one. A plain
  // useState here looped forever for the first host that registered from an
  // effect (Actual, 2026-09-28): its lists were rebuilt every render, each
  // set re-rendered every consumer, the registering component included, and
  // the page never painted.
  const [commands, setCommandState] = React.useState<AmbientCommand[]>([])
  const latestCommands = React.useRef<AmbientCommand[]>([])
  const commandSig = React.useRef("")
  const setCommands = React.useCallback((next: AmbientCommand[]) => {
    latestCommands.current = next
    const sig = commandSignature(next)
    if (sig === commandSig.current) return
    commandSig.current = sig
    setCommandState(
      next.map((c) => ({
        ...c,
        run: () => latestCommands.current.find((x) => x.id === c.id)?.run(),
      }))
    )
  }, [])
  const [chips, setChips] = React.useState<ContextChip[]>([])
  const [seedVersion, setSeedVersion] = React.useState(0)
  const [workspaceEffect, announceEffect] = React.useState<string | null>(null)
  const [orbAnchor, setOrbAnchor] = React.useState<OrbAnchor>(defaultOrbAnchor)
  const [orbState, setOrbState] = React.useState<OrbState>("still")
  const seededRef = React.useRef<string | null>(null)

  // the person's language: the host's word for it, else the document's
  const locale =
    localeProp ??
    (typeof document !== "undefined" ? document.documentElement.lang || undefined : undefined) ??
    "en"

  // THE API IS ASKED, NOT IMPORTED. Suggestions follow the page (keyed on
  // what the chip says, not on the object, which pages recreate freely);
  // recents are asked once per API. A failed list is an empty list: the
  // palette still works, it just has nothing to offer.
  const connected = api ?? disconnectedAmbientApi
  const chipKey = pageChip ? `${pageChip.id}\u0000${pageChip.label}` : ""
  const chipRef = React.useRef(pageChip)
  React.useEffect(() => {
    chipRef.current = pageChip
  })
  const [apiSuggestions, setApiSuggestions] = React.useState<string[]>([])
  React.useEffect(() => {
    const request = new AbortController()
    connected
      .suggestions({ pageChip: chipRef.current, locale }, { signal: request.signal })
      .then(setApiSuggestions, () => {
        if (!request.signal.aborted) setApiSuggestions([])
      })
    return () => request.abort()
  }, [connected, chipKey, locale])
  const [apiRecents, setApiRecents] = React.useState<AmbientRecent[]>([])
  React.useEffect(() => {
    const request = new AbortController()
    connected.recents({ signal: request.signal }).then(setApiRecents, () => {
      if (!request.signal.aborted) setApiRecents([])
    })
    return () => request.abort()
  }, [connected])
  const suggestions = pageIntel?.suggestions ?? apiSuggestions
  const recents = pageIntel?.recents ?? apiRecents

  const addChip = React.useCallback((c: ContextChip) => {
    setChips((prev) => (prev.some((p) => p.id === c.id) ? prev : [...prev, c]))
  }, [])

  const removeChip = React.useCallback((id: string) => {
    setChips((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const explain = React.useCallback(
    (c: ContextChip) => {
      addChip(c)
      seededRef.current = `Explain ${c.label}`
      setSeedVersion((v) => v + 1)
      setMode("panel")
    },
    [addChip]
  )

  const consumeSeededPrompt = React.useCallback(() => {
    const p = seededRef.current
    seededRef.current = null
    return p
  }, [])

  const autoSendRef = React.useRef(false)
  const seedPrompt = React.useCallback(
    (text: string, autoSend = false) => {
      seededRef.current = text
      autoSendRef.current = autoSend
      setSeedVersion((v) => v + 1)
    },
    []
  )
  const consumeAutoSend = React.useCallback(() => {
    const a = autoSendRef.current
    autoSendRef.current = false
    return a
  }, [])

  const words = React.useMemo(
    () => resolveAmbientMessages({ messages, productName, locale }),
    [messages, productName, locale]
  )

  const value = React.useMemo(
    () => ({
      mode,
      setMode,
      pageChip,
      setPageChip,
      pageIntel,
      setPageIntel,
      commands,
      setCommands,
      chips,
      addChip,
      removeChip,
      explain,
      seedVersion,
      seedPrompt,
      consumeAutoSend,
      consumeSeededPrompt,
      orbAnchor,
      setOrbAnchor,
      orbState,
      setOrbState,
      navigate: onNavigate,
      navItems,
      api: connected,
      suggestions,
      recents,
      workspaceEffect,
      announceEffect,
      hotkey,
      yieldHotkey,
      zIndex,
      dark,
      messages: words,
      locale,
    }),
    [mode, pageChip, pageIntel, commands, setCommands, chips, addChip, removeChip, explain, seedVersion, seedPrompt, consumeAutoSend, consumeSeededPrompt, orbAnchor, orbState, onNavigate, navItems, connected, suggestions, recents, workspaceEffect, hotkey, yieldHotkey, zIndex, dark, words, locale]
  )

  return (
    <AssistantContext.Provider value={value}>
      <AmbientMessagesProvider value={words}>{children}</AmbientMessagesProvider>
    </AssistantContext.Provider>
  )
}

/**
 * Register palette commands for as long as the calling component is
 * mounted. Pass the list every render — building it inline is fine; the
 * provider compares what the list says and ignores repeats, and `run` always
 * reaches the newest closure. Unmounting clears the list.
 */
export function useRegisterCommands(list: AmbientCommand[]) {
  const { setCommands } = useAssistant()
  React.useEffect(() => {
    setCommands(list)
  })
  React.useEffect(() => () => setCommands([]), [setCommands])
}

/** Does this keydown match a hotkey string such as "mod+k"? */
export function matchesHotkey(event: KeyboardEvent, hotkey: AmbientHotkey) {
  const parts = hotkey.toLowerCase().split("+")
  const key = parts.pop()
  const mac =
    typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform)
  const want = {
    meta: parts.includes("meta") || (mac && parts.includes("mod")),
    ctrl: parts.includes("ctrl") || (!mac && parts.includes("mod")),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
  }
  // ⌘ and Ctrl both open it on a Mac keyboard for "mod": a Mac user on a
  // PC keyboard, and the layer's own history, both expect Ctrl to work too
  const modOk = parts.includes("mod")
    ? event.metaKey || event.ctrlKey
    : event.metaKey === want.meta && event.ctrlKey === want.ctrl
  return (
    modOk &&
    event.shiftKey === want.shift &&
    event.altKey === want.alt &&
    event.key.toLowerCase() === key
  )
}

export function useAssistant() {
  const ctx = React.useContext(AssistantContext)
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider")
  return ctx
}
