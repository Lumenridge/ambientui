"use client"

/* eslint-disable react-refresh/only-export-components --
   One concept's contract, provider and hooks belong in one module; the
   DATA moved out to tokens.ts, which is the split that actually mattered. */

import * as React from "react"

import { IconLibraryProvider } from "@ambient-ui/ui/components/icon"

import {
  FONTS,
  motionTransition,
  motionSpring,
  DEFAULT_FOUNDATION,
  migrate,
  compileFoundationCss,
  STORAGE_KEY,
  type MotionRole,
  type FoundationConfig,
} from "./tokens"

/**
 * THE FOUNDATION PROVIDER — the configuration space, live and editable.
 *
 * It holds the config, compiles it to one injected <style> tag, and
 * persists it. The VALUES it works with live in tokens.ts, which needs
 * neither React nor this provider; a consumer can take the space without
 * taking the machinery.
 *
 * It no longer mounts the ambient layer's runtime. That binding is
 * ambient-bridge.tsx, so installing the Foundation does not drag in an
 * assistant you may not want — the dependency pointed the wrong way and
 * lived in the wrong file.
 */

/* ------------------------------ provider ------------------------------ */

interface FoundationContextValue {
  config: FoundationConfig
  setConfig: (patch: Partial<FoundationConfig>) => void
  /**
   * Unsaved changes exist — either the config differs from the last saved
   * theme, or an Inspect-rail control was touched. THE RULE: anything the
   * user changes in the rail raises the save reminder, so a change is never
   * silently lost. See touch().
   */
  dirty: boolean
  /** The config itself differs from the saved theme (dirty minus rail touches). */
  configDirty: boolean
  /**
   * Mark the Inspect rail dirty. Called by the rail's control primitives
   * (ControlRow, ChoiceControl) — never by an individual playground, so the
   * rule cannot be forgotten when a new one is written.
   */
  touch: () => void
  /**
   * Bumped whenever edits are thrown away, so rail-local state (playground
   * props) remounts to its defaults — which is what makes Discard honest
   * for controls the Foundation config does not hold.
   */
  generation: number
  /** Persist the current config as the project's theme. */
  save: () => void
  /** Return every dimension to the system defaults (live; Save persists). */
  reset: () => void
  /** Throw away unsaved edits — back to the last saved theme. */
  discard: () => void
}

const FoundationContext = React.createContext<FoundationContextValue | null>(
  null
)

/**
 * The saved theme, read once at startup.
 *
 * This used to hydrate from an effect, which meant the first paint used the
 * DEFAULTS and then re-rendered into the user's theme — a flash of the wrong
 * accent on every load. A lazy initializer reads it before the first render
 * instead; storage is an external store, and this is a read, not a sync.
 */
function readSaved(): FoundationConfig {
  // No storage during a prerender. The try/catch below would swallow that
  // too, but silently, through an exception path meant for malformed data —
  // and a host building static HTML deserves to be a stated case rather
  // than an accident of error handling. The prerendered document therefore
  // carries the DEFAULT theme, and the client adopts the saved one on mount.
  if (typeof window === "undefined") return DEFAULT_FOUNDATION
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_FOUNDATION, ...migrate(JSON.parse(raw)) }
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_FOUNDATION
}

export function FoundationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [config, setConfigState] = React.useState<FoundationConfig>(readSaved)
  // The last saved theme. Edits apply live but only persist on save();
  // reloading without saving returns to this.
  const [saved, setSaved] = React.useState<FoundationConfig>(readSaved)
  // Rail-local edits (playground props) live in their own components, so the
  // config alone cannot tell us they happened — this flag carries them.
  const [touched, setTouched] = React.useState(false)
  const [generation, setGeneration] = React.useState(0)

  React.useEffect(() => {
    let style = document.getElementById(
      "ambientui-foundation"
    ) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement("style")
      style.id = "ambientui-foundation"
      document.head.appendChild(style)
    }
    style.textContent = compileFoundationCss(config)
    // Google font loading: one managed <link>, only when a Google family
    // is selected — Geist ships locally.
    const font = FONTS.find((f) => f.id === config.font)
    const linkId = "ambientui-google-font"
    let link = document.getElementById(linkId) as HTMLLinkElement | null
    if (font?.google) {
      const href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`
      if (!link) {
        link = document.createElement("link")
        link.id = linkId
        link.rel = "stylesheet"
        document.head.appendChild(link)
      }
      if (link.href !== href) link.href = href
    } else if (link) {
      link.remove()
    }
  }, [config])

  const value = React.useMemo<FoundationContextValue>(
    () => ({
      config,
      setConfig: (patch) => setConfigState((c) => ({ ...c, ...patch })),
      dirty: JSON.stringify(config) !== JSON.stringify(saved) || touched,
      configDirty: JSON.stringify(config) !== JSON.stringify(saved),
      touch: () => setTouched(true),
      generation,
      save: () => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
        } catch {
          // storage may be unavailable
        }
        setSaved(config)
        setTouched(false)
      },
      reset: () => {
        setConfigState(DEFAULT_FOUNDATION)
        setTouched(false)
        setGeneration((g) => g + 1)
      },
      discard: () => {
        setConfigState(saved)
        setTouched(false)
        setGeneration((g) => g + 1)
      },
    }),
    [config, saved, touched, generation]
  )

  return (
    <FoundationContext.Provider value={value}>
      <IconLibraryProvider library={config.icons}>{children}</IconLibraryProvider>
    </FoundationContext.Provider>
  )
}

/** The framer-motion tween for a motion role, live from the Foundation. */
export function useMotionTransition(role: MotionRole) {
  const { config } = useFoundation()
  return motionTransition(config, role)
}

/** The configured character's spring, live from the Foundation. */
export function useMotionSpring() {
  const { config } = useFoundation()
  return motionSpring(config)
}

export function useFoundation() {
  const ctx = React.useContext(FoundationContext)
  if (!ctx)
    throw new Error("useFoundation must be used within FoundationProvider")
  return ctx
}
