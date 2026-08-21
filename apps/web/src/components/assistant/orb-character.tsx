import * as React from "react"

import { Heatmap } from "@paper-design/shaders-react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * The orb character — the assistant's animated identity: the Paper Design
 * heatmap shader wrapped around a circle, so heat flows around the orb's
 * edge like thermal energy. (The one sanctioned shader surface, DESIGN.md
 * §5 — implemented via @paper-design/shaders-react.)
 *
 * Each state has its own MOVEMENT, not just speed — the heat itself
 * behaves differently:
 * - "still"     — calm, balanced glow breathing around the edge.
 * - "listening" — heat drawn INWARD (inner glow dominates, waves angled
 *                 in): the orb absorbing what it hears.
 * - "thinking"  — hot: fast flow, high contour, grain, heat radiating
 *                 both ways — the orb working.
 * - "answer"    — a one-shot outward bloom (outer glow surges and decays),
 *                 then a slow, settled glow: found it.
 *
 * Transitions are continuous — every parameter eases toward its state
 * target, so a state change is a transition, never a cut. Per-state
 * speeds and the palette come from the Foundation orb config; palette is
 * accent-linked by default (a thermal ramp derived from the accent) or
 * custom colors used as the heat ramp (cold → hot).
 */

export type OrbState = "still" | "listening" | "thinking" | "answer"

export const ORB_STATES: OrbState[] = [
  "still",
  "listening",
  "thinking",
  "answer",
]

/** The designed cadence of each state — overridable via the speeds prop. */
export const DEFAULT_STATE_SPEEDS: Record<OrbState, number> = {
  still: 1,
  listening: 0.8,
  thinking: 2.8,
  answer: 0.5,
}

/** Per-state movement targets for the heat itself. */
const STATE_PARAMS: Record<
  OrbState,
  {
    speed: number
    contour: number
    innerGlow: number
    outerGlow: number
    noise: number
    angle: number
  }
> = {
  still: { speed: 0.5, contour: 0.5, innerGlow: 0.35, outerGlow: 0.3, noise: 0, angle: 0 },
  listening: { speed: 0.7, contour: 0.62, innerGlow: 0.8, outerGlow: 0.1, noise: 0, angle: 180 },
  thinking: { speed: 2.2, contour: 0.92, innerGlow: 0.5, outerGlow: 0.55, noise: 0, angle: 90 },
  answer: { speed: 0.45, contour: 0.68, innerGlow: 0.45, outerGlow: 0.42, noise: 0, angle: 0 },
}

/** The shape the heat wraps: a filled circle with room for the outer
    glow. Served as a real file — the shader's loader rejects data URIs. */
const CIRCLE_IMAGE_SRC = "/orb-circle.svg?v=2"

/** Resolve any CSS color string to a hex color. */
function resolveHex(css: string): string {
  const ctx = document.createElement("canvas").getContext("2d")
  if (!ctx) return "#2563eb"
  ctx.fillStyle = css.trim() || "#2563eb"
  return String(ctx.fillStyle)
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")
  return "#" + c(r) + c(g) + c(b)
}

/** Accent-linked thermal ramp: cold deep accent -> accent -> pale -> hot complement. */
function accentRamp(): string[] {
  const css = getComputedStyle(document.documentElement).getPropertyValue(
    "--app-blue"
  )
  const [r, g, b] = hexToRgb(resolveHex(css))
  return [
    // cold end transparent — the heat lives at the rim; the core is a
    // separate CSS layer under the canvas
    rgbToHex(r * 0.45, g * 0.45, b * 0.6) + "00",
    rgbToHex(r * 0.45, g * 0.45, b * 0.6) + "55",
    rgbToHex(r, g, b),
    rgbToHex(r * 0.35 + 166, g * 0.35 + 166, b * 0.35 + 166),
    rgbToHex(b, r, g),
    rgbToHex(255, Math.max(g, 120), 60),
  ]
}

export interface OrbCharacterProps {
  state?: OrbState
  /** Diameter in px. */
  size?: number
  /** Global motion multiplier — 1 is the designed cadence. */
  speed?: number
  /** Custom heat ramp (cold -> hot, 1-4 CSS colors). Omit for accent-linked. */
  colors?: string[]
  /** Per-state cadence multipliers; merged over DEFAULT_STATE_SPEEDS. */
  speeds?: Partial<Record<OrbState, number>>
  className?: string
}

export function OrbCharacter({
  state = "still",
  size = 96,
  speed = 1,
  colors,
  speeds,
  className,
}: OrbCharacterProps) {
  const propsRef = React.useRef({ state, speed, colors, speeds })
  propsRef.current = { state, speed, colors, speeds }

  const [params, setParams] = React.useState(() => ({ ...STATE_PARAMS.still }))
  const [palette, setPalette] = React.useState<string[]>([])
  const coreColor =
    colors && colors.length > 0
      ? colors[Math.min(1, colors.length - 1)]!
      : "var(--app-blue)"


  // Transitions, not cuts — and S-curved, not merely eased. Each parameter
  // runs SECOND-ORDER smoothing (the state target eases into an
  // intermediate, which eases into the live value), so velocity is
  // continuous: changes lean in and settle out. Per-parameter time
  // constants: the flow speed glides slowly, glows breathe, the wave
  // direction swings deliberately. Updates run every frame.
  React.useEffect(() => {
    let raf = 0
    let last = performance.now()
    let lastState: OrbState = propsRef.current.state
    let stateEntered = last
    let frame = 0
    let paletteKey = ""

    type P = "speed" | "contour" | "innerGlow" | "outerGlow" | "noise" | "angle"
    const KEYS: P[] = ["speed", "contour", "innerGlow", "outerGlow", "noise", "angle"]
    const TAU: Record<P, number> = {
      speed: 0.7,
      contour: 0.45,
      innerGlow: 0.5,
      outerGlow: 0.5,
      noise: 0.3,
      angle: 0.85,
    }
    const init = STATE_PARAMS[propsRef.current.state]
    const mid = { ...init }
    const cur = { ...init }

    const loop = (now: number) => {
      const { state: st, speed: sp, speeds: sps, colors: custom } =
        propsRef.current
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (st !== lastState) {
        lastState = st
        stateEntered = now
      }
      const stateT = (now - stateEntered) / 1000

      const target = { ...STATE_PARAMS[st] }
      // per-state cadence config scales the heat's flow speed
      target.speed *=
        ((sps?.[st] ?? DEFAULT_STATE_SPEEDS[st]) / DEFAULT_STATE_SPEEDS[st]) *
        (sp ?? 1)
      // answer: one-shot outward bloom that decays over ~1.4s
      if (st === "answer") {
        const bloom = Math.exp(-stateT * 2.2)
        target.outerGlow = Math.min(1, target.outerGlow + bloom * 0.6)
        target.contour = Math.min(1, target.contour + bloom * 0.25)
      }

      for (const key of KEYS) {
        const a = 1 - Math.exp((-2 * dt) / TAU[key])
        mid[key] += (target[key] - mid[key]) * a
        cur[key] += (mid[key] - cur[key]) * a
      }

      setParams({ ...cur })
      if (frame++ % 30 === 0) {
        const next =
          custom && custom.length > 0
            ? [resolveHex(custom[0]!) + "00", ...custom.map(resolveHex)]
            : accentRamp()
        const key = next.join()
        if (key !== paletteKey) {
          paletteKey = key
          setPalette(next)
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden rounded-full", className)}
      style={{
        width: size,
        height: size,
        // frosted glass: the page blurs through; tint and hairline derive
        // from theme tokens
        backdropFilter: "blur(var(--ambient-blur)) saturate(1.15)",
        WebkitBackdropFilter: "blur(var(--ambient-blur)) saturate(1.15)",
        backgroundColor: "color-mix(in oklab, var(--popover) 22%, transparent)",
        boxShadow:
          "inset 0 0 0 1px color-mix(in oklab, var(--border) 70%, transparent)",
      }}
    >
      {/* the accent core — the middle wears the theme; the shell around it
          stays frosted glass, the rim heat renders above */}
      <div
        style={{
          position: "absolute",
          inset: "20%",
          borderRadius: "9999px",
          background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${coreColor} 55%, white), ${coreColor} 58%, color-mix(in oklab, ${coreColor} 62%, black))`,
          filter: "blur(2px)",
        }}
      />
      {palette.length > 0 && (
        <Heatmap
          width={size}
          height={size}
          image={CIRCLE_IMAGE_SRC}
          colors={palette}
          colorBack="#00000000"
          contour={params.contour}
          angle={params.angle}
          noise={0}
          innerGlow={params.innerGlow}
          outerGlow={params.outerGlow}
          speed={params.speed}
          scale={1}
          fit="contain"
        />
      )}
    </div>
  )
}
