/* eslint-disable react-refresh/only-export-components */
"use client"

import * as React from "react"

import type { IconName } from "@ambient-ui/ui/components/icon"

import type { OrbState } from "./orb-character"

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
  jumps?: { id: string; label: string; desc?: string }[]
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
 * and the single thing that made it un-liftable. `icon` is deliberately
 * `unknown`: the layer only forwards it to the host's own Icon, so no icon
 * library leaks into the public contract.
 */
export type NavItem = {
  id: string
  label: string
  desc?: string
  icon?: unknown
}

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
  run: () => void
}

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
  /**
   * Hand a prompt to the next surface. autoSend asks it on arrival;
   * immediate skips the thinking beat, for a surface that already showed it.
   */
  seedPrompt: (text: string, autoSend?: boolean, immediate?: boolean) => void
  /** True once, if the pending seed should be sent rather than typed. */
  consumeAutoSend: () => boolean
  /** True once, if the pending seed should compose without the thinking beat. */
  consumeImmediate: () => boolean
  orbAnchor: OrbAnchor
  setOrbAnchor: (a: OrbAnchor) => void
  /** The orb character's state — driven by the response pipeline. */
  orbState: OrbState
  setOrbState: (s: OrbState) => void
  /** Navigate the app shell to a section (wired by App). */
  navigate?: (sectionId: string) => void
  /**
   * The last workspace effect a settled answer announced. Surfaces that own
   * product state subscribe and decide what it means; the layer only relays.
   */
  workspaceEffect: string | null
  announceEffect: (effect: string | null) => void
}

const AssistantContext = React.createContext<AssistantState | undefined>(undefined)

export function AssistantProvider({
  children,
  onNavigate,
  navItems = [],
}: {
  children: React.ReactNode
  onNavigate?: (sectionId: string) => void
  navItems?: NavItem[]
}) {
  const [mode, setMode] = React.useState<AssistantMode>("line")
  const [pageChip, setPageChip] = React.useState<ContextChip | null>(null)
  const [pageIntel, setPageIntel] = React.useState<PageIntel | null>(null)
  const [commands, setCommands] = React.useState<AmbientCommand[]>([])
  const [chips, setChips] = React.useState<ContextChip[]>([])
  const [seedVersion, setSeedVersion] = React.useState(0)
  const [workspaceEffect, announceEffect] = React.useState<string | null>(null)
  const [orbAnchor, setOrbAnchor] = React.useState<OrbAnchor>("bc")
  const [orbState, setOrbState] = React.useState<OrbState>("still")
  const seededRef = React.useRef<string | null>(null)

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
  const immediateRef = React.useRef(false)
  const seedPrompt = React.useCallback(
    (text: string, autoSend = false, immediate = false) => {
      seededRef.current = text
      autoSendRef.current = autoSend
      immediateRef.current = immediate
      setSeedVersion((v) => v + 1)
    },
    []
  )
  const consumeAutoSend = React.useCallback(() => {
    const a = autoSendRef.current
    autoSendRef.current = false
    return a
  }, [])
  const consumeImmediate = React.useCallback(() => {
    const i = immediateRef.current
    immediateRef.current = false
    return i
  }, [])

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
      consumeImmediate,
      consumeSeededPrompt,
      orbAnchor,
      setOrbAnchor,
      orbState,
      setOrbState,
      navigate: onNavigate,
      navItems,
      workspaceEffect,
      announceEffect,
    }),
    [mode, pageChip, pageIntel, commands, chips, addChip, removeChip, explain, seedVersion, seedPrompt, consumeAutoSend, consumeImmediate, consumeSeededPrompt, orbAnchor, orbState, onNavigate, navItems, workspaceEffect]
  )

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  )
}

export function useAssistant() {
  const ctx = React.useContext(AssistantContext)
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider")
  return ctx
}
