"use client"

import * as React from "react"

import {
  AmbientRuntimeProvider,
  type AmbientRuntime,
} from "ambientui/ambient-runtime"

import { useFoundation } from "./foundation-context"
import { motionSpring, motionTransition, type MotionRole } from "./tokens"

/**
 * FOUNDATION → AMBIENT LAYER.
 *
 * The layer states what it needs from a design system (AmbientRuntime);
 * the Foundation implements it. Mount this inside a FoundationProvider and
 * the assistant animates and paints from the live config, while still not
 * knowing the Foundation exists.
 *
 * IT IS ITS OWN MODULE BECAUSE THE DEPENDENCY WAS BACKWARDS. This binding
 * used to live inside FoundationProvider, which meant taking the
 * configuration space also took the whole ambient layer — an assistant you
 * may not want, to get a radius scale. Only the file that needs both
 * imports both, and only a host that took both doors mounts it.
 *
 * `satisfies` is doing real work: add a required field to AmbientRuntime
 * and this file fails to compile, rather than the layer silently falling
 * back to a default nobody chose.
 */
export function FoundationAmbientBridge({
  children,
  assetBase = "/",
}: {
  children: React.ReactNode
  /**
   * Where the layer's own shader assets are served from. Only the HOST
   * knows its base path — an app under a subpath resolves a root-absolute
   * asset URL against the domain, not the app.
   */
  assetBase?: string
}) {
  const { config } = useFoundation()
  const runtime = React.useMemo(
    () =>
      ({
        assetBase,
        messageVariant: config.components.messageVariant,
        streamCharsPerSecond: config.components.streamCharsPerSecond,
        orb: config.orb,
        motionTransition: (role: MotionRole) => motionTransition(config, role),
        motionSpring: () => motionSpring(config),
      }) satisfies AmbientRuntime,
    [config, assetBase]
  )
  return (
    <AmbientRuntimeProvider value={runtime}>{children}</AmbientRuntimeProvider>
  )
}
