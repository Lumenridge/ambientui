import * as React from "react"

import { Heatmap } from "@paper-design/shaders-react"
import { animate, useAnimationFrame, useMotionValue } from "framer-motion"

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
 * Transitions are continuous — every parameter is a Framer Motion spring
 * (the sanctioned animation library, DESIGN.md §5) retargeted on state
 * change, so velocity carries through: a state change is a transition,
 * never a cut, and interrupting one mid-flight stays smooth. Per-state
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

/**
 * The orb at glyph scale — a pure-CSS stand-in for marks and avatars
 * (≤32px), where the shader's detail is invisible but its cost is not:
 * every OrbCharacter is a fresh WebGL context, a shader compile, and a
 * 60fps loop, which is exactly what made surfaces stutter on open. Same
 * anatomy (glass shell, accent core), zero runtime cost.
 */
export function OrbGlyph({
  size = 20,
  color,
  className,
}: {
  size?: number
  /** Core color; defaults to the ambient accent. */
  color?: string
  className?: string
}) {
  const core = color ?? "var(--app-blue)"
  return (
    <span
      aria-hidden
      className={cn("relative inline-block shrink-0 rounded-full", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: "color-mix(in oklab, var(--popover) 60%, transparent)",
        boxShadow:
          "inset 0 0 0 1px color-mix(in oklab, var(--border) 70%, transparent)",
      }}
    >
      <span
        className="absolute rounded-full"
        style={{
          inset: "20%",
          background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${core} 55%, white), ${core} 58%, color-mix(in oklab, ${core} 62%, black))`,
          filter: "blur(0.5px)",
        }}
      />
    </span>
  )
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
  const [params, setParams] = React.useState(() => ({ ...STATE_PARAMS.still }))
  const [palette, setPalette] = React.useState<string[]>([])
  const coreColor =
    colors && colors.length > 0
      ? colors[Math.min(1, colors.length - 1)]!
      : "var(--app-blue)"

  // Each shader parameter is a spring-driven motion value. Springs carry
  // velocity across retargets, so a state change mid-transition leans in
  // and settles out instead of restarting — the S-curve the character
  // needs, for free. Per-parameter spring characters: the flow speed
  // glides, the glows breathe, the wave direction swings deliberately.
  const mv = {
    speed: useMotionValue(STATE_PARAMS.still.speed),
    contour: useMotionValue(STATE_PARAMS.still.contour),
    innerGlow: useMotionValue(STATE_PARAMS.still.innerGlow),
    outerGlow: useMotionValue(STATE_PARAMS.still.outerGlow),
    angle: useMotionValue(STATE_PARAMS.still.angle),
  }
  const mvRef = React.useRef(mv)
  mvRef.current = mv

  // per-state cadence config scales the heat's flow speed
  const speedFactor =
    ((speeds?.[state] ?? DEFAULT_STATE_SPEEDS[state]) /
      DEFAULT_STATE_SPEEDS[state]) *
    (speed ?? 1)

  React.useEffect(() => {
    const m = mvRef.current
    const target = STATE_PARAMS[state]
    const spring = (opts: { stiffness: number; damping: number; mass?: number }) =>
      ({ type: "spring", ...opts }) as const

    const controls = [
      animate(m.speed, target.speed * speedFactor, spring({ stiffness: 50, damping: 18, mass: 1.2 })),
      animate(m.innerGlow, target.innerGlow, spring({ stiffness: 110, damping: 20 })),
      animate(m.angle, target.angle, spring({ stiffness: 45, damping: 16, mass: 1.4 })),
    ]
    if (state === "answer") {
      // one-shot outward bloom: surge past the resting glow, then decay
      // into it — keyframes from the CURRENT value, so re-entry mid-flight
      // stays continuous
      controls.push(
        animate(
          m.outerGlow,
          [null as unknown as number, Math.min(1, target.outerGlow + 0.6), target.outerGlow],
          { duration: 1.6, times: [0, 0.2, 1], ease: ["easeOut", "easeOut"] }
        ),
        animate(
          m.contour,
          [null as unknown as number, Math.min(1, target.contour + 0.25), target.contour],
          { duration: 1.6, times: [0, 0.2, 1], ease: ["easeOut", "easeOut"] }
        )
      )
    } else {
      controls.push(
        animate(m.outerGlow, target.outerGlow, spring({ stiffness: 110, damping: 20 })),
        animate(m.contour, target.contour, spring({ stiffness: 130, damping: 22 }))
      )
    }
    return () => controls.forEach((c) => c.stop())
  }, [state, speedFactor])

  // Feed the springs into the shader once per frame; refresh the palette
  // (theme accent or custom ramp) at a slow cadence.
  const frameCount = React.useRef(0)
  const paletteKey = React.useRef("")
  const colorsRef = React.useRef(colors)
  colorsRef.current = colors
  useAnimationFrame(() => {
    const m = mvRef.current
    setParams((prev) => {
      const next = {
        speed: m.speed.get(),
        contour: m.contour.get(),
        innerGlow: m.innerGlow.get(),
        outerGlow: m.outerGlow.get(),
        noise: 0,
        angle: m.angle.get(),
      }
      const same =
        Math.abs(next.speed - prev.speed) < 1e-4 &&
        Math.abs(next.contour - prev.contour) < 1e-4 &&
        Math.abs(next.innerGlow - prev.innerGlow) < 1e-4 &&
        Math.abs(next.outerGlow - prev.outerGlow) < 1e-4 &&
        Math.abs(next.angle - prev.angle) < 1e-4
      return same ? prev : next
    })
    if (frameCount.current++ % 30 === 0) {
      const custom = colorsRef.current
      const next =
        custom && custom.length > 0
          ? [resolveHex(custom[0]!) + "00", ...custom.map(resolveHex)]
          : accentRamp()
      const key = next.join()
      if (key !== paletteKey.current) {
        paletteKey.current = key
        setPalette(next)
      }
    }
  })

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
        backgroundColor: "color-mix(in oklab, var(--popover) 60%, transparent)",
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
