"use client"

import * as React from "react"
import {
  DEFAULT_STATE_SPEEDS,
  type OrbState,
} from "./kit-vocabulary"

import { Heatmap } from "@paper-design/shaders-react"
import { animate, useAnimationFrame, useMotionValue } from "framer-motion"

import { cn } from "@ambientui/ui/lib/utils"

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

/**
 * Resolve any CSS color string to hex — including oklch(), which is what
 * Tailwind v4's palette variables actually contain. Canvas fillStyle
 * echoes oklch back verbatim, so rasterize a pixel and read it: the only
 * conversion that works for every color syntax the tokens might use.
 */
function resolveHex(css: string): string {
  const value = css.trim() || "#2563eb"
  if (/^#[0-9a-f]{6}$/i.test(value)) return value
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return "#2563eb"
  ctx.fillStyle = value
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return rgbToHex(r!, g!, b!)
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
    "--ambient-accent"
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
  state,
  className,
}: {
  size?: number
  /** Core color; defaults to the ambient accent. */
  color?: string
  /** Ambient state — paces the glyph's breath (CSS, no shader). */
  state?: OrbState
  className?: string
}) {
  const core = color ?? "var(--ambient-accent)"
  return (
    <span
      aria-hidden
      data-orb-state={state ?? "still"}
      className={cn("relative inline-block shrink-0 rounded-full", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: "var(--glass-core)",
        boxShadow: "inset 0 0 0 1px var(--glass-border)",
      }}
    >
      <span
        className="ambient-glyph-orbit absolute rounded-full"
        style={{ inset: "12%" }}
      />
      <span
        className="ambient-glyph-core absolute rounded-full"
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

/**
 * The shared heat engine: spring-driven shader params + the palette, one
 * state machine for every heat surface (the orb character, the ambient
 * field). Springs carry velocity across retargets; the answer state runs
 * its one-shot outward bloom.
 */
function useHeatEngine({
  state,
  speed = 1,
  speeds,
  colors,
}: {
  state: OrbState
  speed?: number
  speeds?: Partial<Record<OrbState, number>>
  colors?: string[]
}) {
  const [params, setParams] = React.useState(() => ({ ...STATE_PARAMS.still }))
  const [palette, setPalette] = React.useState<string[]>([])

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
  // the frame loop reads the latest values, so the ref is refreshed after
  // commit rather than during render (React may render without committing)
  React.useEffect(() => {
    mvRef.current = mv
  })

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
  React.useEffect(() => {
    colorsRef.current = colors
  })
  // Each shader param feeds React state, so an un-quantized read re-renders
  // this instance 60× a second — forever, since springs never land on an
  // exact value. Rounding lets the equality check succeed once a transition
  // settles (zero renders at rest) and sampling every third frame is
  // indistinguishable at these speeds.
  const q = (v: number, p = 100) => Math.round(v * p) / p
  useAnimationFrame(() => {
    const frame = frameCount.current++
    if (frame % 3 === 0) {
      const m = mvRef.current
      setParams((prev) => {
        const next = {
          speed: q(m.speed.get()),
          contour: q(m.contour.get()),
          innerGlow: q(m.innerGlow.get()),
          outerGlow: q(m.outerGlow.get()),
          noise: 0,
          angle: q(m.angle.get(), 10),
        }
        const same =
          next.speed === prev.speed &&
          next.contour === prev.contour &&
          next.innerGlow === prev.innerGlow &&
          next.outerGlow === prev.outerGlow &&
          next.angle === prev.angle
        return same ? prev : next
      })
    }
    if (frame % 30 === 0) {
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

  return { params, palette }
}

export function OrbCharacter({
  state = "still",
  size = 96,
  speed = 1,
  colors,
  speeds,
  className,
}: OrbCharacterProps) {
  const { params, palette } = useHeatEngine({ state, speed, speeds, colors })
  const coreColor =
    colors && colors.length > 0
      ? colors[Math.min(1, colors.length - 1)]!
      : "var(--ambient-accent)"

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
        backgroundColor: "var(--glass-core)",
        boxShadow: "inset 0 0 0 1px var(--glass-border)",
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

/**
 * OrbHeat — the character's heat, unwrapped: the exact shader the orb
 * renders (same engine, same springs, same circle image, same palette),
 * with none of the character's glass shell. FOR SANCTIONED IDENTITY
 * SURFACES ONLY — the shader-surface rule applies to this export exactly
 * as it does to the character; a product surface wanting it is a
 * governance event. Width/height size the render; the box shows the
 * circle's heat at whatever slice the host clips.
 */
export function OrbHeat({
  state = "still",
  speed = 1,
  colors,
  speeds,
  width,
  height,
  className,
}: OrbCharacterProps & { width: number; height: number }) {
  const { params, palette } = useHeatEngine({ state, speed, speeds, colors })
  if (palette.length === 0) return null
  return (
    <div aria-hidden className={className}>
      <Heatmap
        width={width}
        height={height}
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
    </div>
  )
}

/** The field's shapes — near-full-bleed rounded rects in three aspect
    buckets, so the heat hugs every edge of wide, square, and tall
    surfaces (the loader rejects data URIs, so aspects are bucketed). */
function rectImageFor(w: number, h: number) {
  const ratio = w / h
  if (ratio > 1.4) return "/orb-rect-wide.svg?v=3"
  if (ratio < 0.72) return "/orb-rect-tall.svg?v=3"
  return "/orb-rect.svg?v=4"
}

/**
 * OrbField — the orb's heat as a SURFACE BACKGROUND: the same engine and
 * states, wrapped around a rounded rect that fills the surface behind its
 * glass. One field per open AI surface (only one is ever open), mounted
 * a beat after the entrance so the shader compile can't jank it, fading
 * in on the surface role.
 */
export function OrbField({
  state = "still",
  speed = 1,
  colors,
  speeds,
  strength = "ambient",
  className,
}: OrbCharacterProps & {
  /**
   * "ambient" — a low-presence layer behind surface content (the default).
   * "stage" — the field IS the ground (the canvas page, projectors): full
   * presence, paired with the lighter .ambient-stage-frost.
   */
  strength?: "ambient" | "stage"
}) {
  const { params, palette } = useHeatEngine({ state, speed, speeds, colors })
  const hostRef = React.useRef<HTMLDivElement>(null)
  const [box, setBox] = React.useState<{
    w: number
    h: number
    scale: number
  } | null>(null)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 400)
    return () => window.clearTimeout(t)
  }, [])

  React.useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const r = entry!.contentRect
      if (r.width <= 0 || r.height <= 0) return
      // RENDER RESOLUTION IS NOT LAYOUT SIZE. The field is a blurred
      // gradient stretched behind frosted glass, so its pixels carry no
      // detail — but at layout size on a retina display a full-page field
      // is millions of fragments per frame, which is what a shader costs.
      // Cap the long edge and let CSS scale it up; the result is identical
      // and the fragment load drops by an order of magnitude.
      const MAX = 360
      const shrink = Math.min(1, MAX / Math.max(r.width, r.height))
      setBox({
        w: Math.max(1, Math.round(r.width * shrink)),
        h: Math.max(1, Math.round(r.height * shrink)),
        scale: 1 / shrink,
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={cn(
        // Surfaces oversize the field so the shape's contour (and corners)
        // sit OUTSIDE the clip — only the glow bleeds in. A STAGE field is
        // the ground itself: keep the body in frame and amplify it so the
        // heat carries across a room.
        "pointer-events-none absolute transition-opacity duration-(--motion-surface) ease-(--motion-ease)",
        strength === "stage"
          // saturate only — brightness/contrast wash the ramp toward white,
          // which is exactly the color draining out of the ground
          ? "-inset-[4%] saturate-[1.5]"
          : "-inset-[14%]",
        // ambient light, not a flood — the field stays a low-presence layer
        // and the veil above does the rest
        ready && box && palette.length > 0
          ? strength === "stage"
            ? "opacity-100"
            : "opacity-35"
          : "opacity-0",
        className
      )}
    >
      {ready && box && palette.length > 0 && (
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            width: box.w,
            height: box.h,
            // transform scales the PIXELS, not the layout — the shader keeps
            // sizing itself from this capped box while the visual covers the
            // whole surface (and overshoots it, so a surface that grows never
            // reveals an edge).
            transform: `translate(-50%, -50%) scale(${box.scale * 1.06})`,
            transformOrigin: "center",
          }}
        >
        <Heatmap
          width={box.w}
          height={box.h}
          image={rectImageFor(box.w, box.h)}
          colors={palette}
          colorBack="#00000000"
          contour={params.contour}
          angle={params.angle}
          noise={0}
          innerGlow={params.innerGlow}
          outerGlow={params.outerGlow}
          speed={params.speed}
          scale={1}
          fit="cover"
        />
        </div>
      )}
    </div>
  )
}

export type { OrbState }
