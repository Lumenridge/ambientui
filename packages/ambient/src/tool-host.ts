"use client"

import * as React from "react"

import type { AmbientResponse } from "./responder-schemas"

/**
 * THE HOST'S OWN COMPONENTS, INSIDE AN ANSWER.
 *
 * A product that already runs a chat stack has components for its tools: a
 * weather card, a booking form, a chart. The layer keeps them. It is the
 * assistant's surface (the orb, the states, the palette, the transcript),
 * and a tool the host has a component for is drawn by that component, in
 * the layer's frame, where the generic tool call would have been.
 *
 *   <AssistantProvider toolComponents={{ getWeather: WeatherCard }}>
 *
 * The component receives the call as data and one function, `respond`, for
 * a call that is waiting on the person (a form the model asked them to
 * fill): what it passes becomes the call's output and the answer continues.
 *
 * A host whose stack already keeps a registry of tool components (CopilotKit's
 * render functions, assistant-ui's tool UIs) passes `renderTool` instead and
 * forwards to it; returning undefined falls back to the generic call.
 */

/** What a host's tool component is given. */
export type AmbientToolProps = {
  /** The block's id: the call's identity in this answer. */
  id?: string
  /** The tool as the model called it. */
  name: string
  input: unknown
  /** Absent until the call has produced one. */
  output?: unknown
  status: "running" | "waiting" | "done"
  /** Give a waiting call its output. The answer continues from it. */
  respond: (output: unknown) => void
}

export type AmbientToolComponents = Record<
  string,
  React.ComponentType<AmbientToolProps>
>

export type AmbientToolHost = {
  components?: AmbientToolComponents
  /** For a stack with its own registry. Undefined means "not mine". */
  render?: (call: AmbientToolProps) => React.ReactNode | undefined
  /**
   * Where a waiting block's answer goes: the Ambient API's `respond`. It
   * rejects when the host could not take the answer; the block that asked
   * shows why.
   */
  respond?: (response: AmbientResponse) => Promise<void>
}

/**
 * Provided by the Assistant from what the host gave the provider. Null
 * outside one (a /ds playground): blocks render generic and their buttons
 * call the props they were given.
 */
export const AmbientToolHostContext = React.createContext<AmbientToolHost | null>(
  null
)

export const useAmbientToolHost = () => React.useContext(AmbientToolHostContext)
