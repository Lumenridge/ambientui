/* eslint-disable react-refresh/only-export-components --
   Same shape, same reason as foundation-context.tsx: one concept's contract,
   defaults, provider and hooks belong in one module. Splitting them to satisfy
   Fast Refresh would put the interface in one file and its only implementation
   in another, for a dev-ergonomics win on a file that changes rarely. */
"use client"

import * as React from "react"

import { DEFAULT_STATE_SPEEDS, type OrbState } from "./kit-vocabulary"

/**
 * THE AMBIENT LAYER'S RUNTIME — everything it needs from a design system, and
 * nothing else.
 *
 * The layer used to read the Foundation directly. That was correct while both
 * lived in one app and fatal the moment anyone wanted the layer without it:
 * eight files importing `@/foundation/foundation-context` is eight hard
 * dependencies on 792 lines of configurator, to consume seven values.
 *
 * So the dependency is inverted. This file states the contract; the Foundation
 * *implements* it (see the bridge in foundation-context.tsx). The layer now
 * asks for what it needs rather than reaching for where it happens to live.
 *
 * THE CONTEXT HAS A REAL DEFAULT AND THE HOOK NEVER THROWS. That is the whole
 * point, and the deliberate opposite of `useFoundation()`, which throws
 * outside its provider. `<Assistant />` mounted in a bare app must render and
 * animate correctly on these values — if it ever cannot, this file is wrong,
 * not the app.
 *
 * The defaults below are not invented. They mirror two existing sources and
 * must keep mirroring them:
 *   · the motion numbers = the "productive" character in foundation-context.tsx
 *     and the `--motion-*` block in packages/ui globals.css (both 120/180/240/
 *     320ms on cubic-bezier(0.2, 0, 0, 1))
 *   · the orb cadence = DEFAULT_STATE_SPEEDS, imported rather than restated
 * Two copies of one value is this project's named failure mode; where a copy is
 * unavoidable, the comment naming the other copy is the mitigation.
 */

export type MotionRole = "micro" | "control" | "surface" | "page"

export type AmbientEase = [number, number, number, number]

export type AmbientTransition = { duration: number; ease: AmbientEase }

export type AmbientSpring = {
  type: "spring"
  stiffness: number
  damping: number
}

export interface AmbientRuntime {
  /** How a message is presented — see MessagePair. */
  messageVariant: "bubble" | "flat"
  /** The pace StreamingText types at. */
  streamCharsPerSecond: number
  /** The orb's palette and per-state cadence. */
  orb: {
    useAccent: boolean
    colors: string[]
    speeds: Record<OrbState, number>
  }
  /** The framer-motion tween for a motion role (DESIGN.md §5). */
  motionTransition: (role: MotionRole) => AmbientTransition
  /** The spring for interruptible/gestural motion. */
  motionSpring: () => AmbientSpring
}

/* Mirrors globals.css `:root` and the "productive" motion character. */
const DEFAULT_DURATIONS_MS: Record<MotionRole, number> = {
  micro: 120,
  control: 180,
  surface: 240,
  page: 320,
}
const DEFAULT_EASE: AmbientEase = [0.2, 0, 0, 1]

export const DEFAULT_AMBIENT_RUNTIME: AmbientRuntime = {
  messageVariant: "bubble",
  streamCharsPerSecond: 60,
  orb: {
    useAccent: true,
    colors: ["#8bd8ff", "#2563eb", "#0b1e55"],
    speeds: DEFAULT_STATE_SPEEDS,
  },
  motionTransition: (role) => ({
    duration: DEFAULT_DURATIONS_MS[role] / 1000,
    ease: DEFAULT_EASE,
  }),
  motionSpring: () => ({ type: "spring", stiffness: 380, damping: 32 }),
}

const AmbientRuntimeContext = React.createContext<AmbientRuntime>(
  DEFAULT_AMBIENT_RUNTIME
)

/**
 * Supplies a runtime. Anything omitted falls back to the default, so a host
 * can override the stream pace without knowing what a motion role is.
 */
export function AmbientRuntimeProvider({
  value,
  children,
}: {
  value?: Partial<AmbientRuntime>
  children: React.ReactNode
}) {
  const runtime = React.useMemo<AmbientRuntime>(
    () => (value ? { ...DEFAULT_AMBIENT_RUNTIME, ...value } : DEFAULT_AMBIENT_RUNTIME),
    [value]
  )
  return (
    <AmbientRuntimeContext.Provider value={runtime}>
      {children}
    </AmbientRuntimeContext.Provider>
  )
}

/** Never throws — see the header. A bare mount is a supported configuration. */
export function useAmbientRuntime() {
  return React.useContext(AmbientRuntimeContext)
}

/** The framer-motion tween for a motion role. */
export function useMotionTransition(role: MotionRole) {
  return useAmbientRuntime().motionTransition(role)
}

/** The configured character's spring. */
export function useMotionSpring() {
  return useAmbientRuntime().motionSpring()
}
