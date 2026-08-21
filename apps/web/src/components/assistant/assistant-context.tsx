/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import type { OrbState } from "./orb-character"

export type AssistantMode = "line" | "bar" | "panel" | "dock" | "spotlight"

export type OrbAnchor = "tl" | "tc" | "tr" | "ml" | "mr" | "bl" | "bc" | "br"

export type ContextChip = {
  id: string
  label: string
  kind: "page" | "control" | "target" | "cell"
}

type AssistantState = {
  mode: AssistantMode
  setMode: (m: AssistantMode) => void
  /** Ambient context — what the user is currently looking at. Replaced on navigation/selection. */
  pageChip: ContextChip | null
  setPageChip: (c: ContextChip | null) => void
  /** Explicit context added by the user (right-click → Explain / Add to context). */
  chips: ContextChip[]
  addChip: (c: ContextChip) => void
  removeChip: (id: string) => void
  /** Right-click → Explain: attach context and open the assistant with a seeded prompt. */
  explain: (c: ContextChip) => void
  seedVersion: number
  consumeSeededPrompt: () => string | null
  orbAnchor: OrbAnchor
  setOrbAnchor: (a: OrbAnchor) => void
  /** The orb character's state — driven by the response pipeline. */
  orbState: OrbState
  setOrbState: (s: OrbState) => void
  /** Navigate the app shell to a section (wired by App). */
  navigate?: (sectionId: string) => void
}

const AssistantContext = React.createContext<AssistantState | undefined>(undefined)

export function AssistantProvider({
  children,
  onNavigate,
}: {
  children: React.ReactNode
  onNavigate?: (sectionId: string) => void
}) {
  const [mode, setMode] = React.useState<AssistantMode>("line")
  const [pageChip, setPageChip] = React.useState<ContextChip | null>(null)
  const [chips, setChips] = React.useState<ContextChip[]>([])
  const [seedVersion, setSeedVersion] = React.useState(0)
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

  const value = React.useMemo(
    () => ({
      mode,
      setMode,
      pageChip,
      setPageChip,
      chips,
      addChip,
      removeChip,
      explain,
      seedVersion,
      consumeSeededPrompt,
      orbAnchor,
      setOrbAnchor,
      orbState,
      setOrbState,
      navigate: onNavigate,
    }),
    [mode, pageChip, chips, addChip, removeChip, explain, seedVersion, consumeSeededPrompt, orbAnchor, orbState, onNavigate]
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
