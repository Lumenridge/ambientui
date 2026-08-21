/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

/**
 * The Foundation layer — the project's global design configuration and the
 * single source of truth for its design system.
 *
 * A FoundationConfig is a small set of decisions (accent, gray, radius,
 * scaling, Figma connection) that compiles to CSS variable overrides in one
 * injected <style> tag. Because every component is styled exclusively
 * through tokens, changing the foundation restyles the entire product —
 * ambient layer included — and the same config is what Figma Sync pushes
 * to the connected design file.
 */

export type Accent = {
  id: string
  name: string
  /** Swatch shown in the picker (light-mode value). */
  swatch: string
  light: { primary: string; primaryForeground: string }
  dark: { primary: string; primaryForeground: string }
  /** The ambient layer's accent (assistant chips, sparkles, highlights). */
  ambient: { light: string; dark: string }
}

export const ACCENTS: Accent[] = [
  {
    id: "blue",
    name: "Blue",
    swatch: "oklch(0.488 0.243 264.376)",
    light: {
      primary: "oklch(0.488 0.243 264.376)",
      primaryForeground: "oklch(0.97 0.014 254.604)",
    },
    dark: {
      primary: "oklch(0.424 0.199 265.638)",
      primaryForeground: "oklch(0.97 0.014 254.604)",
    },
    ambient: { light: "#2563eb", dark: "#4d9aff" },
  },
  {
    id: "violet",
    name: "Violet",
    swatch: "oklch(0.541 0.281 293.009)",
    light: {
      primary: "oklch(0.541 0.281 293.009)",
      primaryForeground: "oklch(0.969 0.016 293.756)",
    },
    dark: {
      primary: "oklch(0.491 0.27 292.581)",
      primaryForeground: "oklch(0.969 0.016 293.756)",
    },
    ambient: { light: "#7c3aed", dark: "#a78bfa" },
  },
  {
    id: "rose",
    name: "Rose",
    swatch: "oklch(0.586 0.222 17.585)",
    light: {
      primary: "oklch(0.586 0.222 17.585)",
      primaryForeground: "oklch(0.969 0.015 12.422)",
    },
    dark: {
      primary: "oklch(0.514 0.222 16.935)",
      primaryForeground: "oklch(0.969 0.015 12.422)",
    },
    ambient: { light: "#e11d48", dark: "#fb7185" },
  },
  {
    id: "amber",
    name: "Amber",
    swatch: "oklch(0.666 0.179 58.318)",
    light: {
      primary: "oklch(0.666 0.179 58.318)",
      primaryForeground: "oklch(0.145 0 0)",
    },
    dark: {
      primary: "oklch(0.769 0.188 70.08)",
      primaryForeground: "oklch(0.145 0 0)",
    },
    ambient: { light: "#d97706", dark: "#fbbf24" },
  },
  {
    id: "emerald",
    name: "Emerald",
    swatch: "oklch(0.596 0.145 163.225)",
    light: {
      primary: "oklch(0.596 0.145 163.225)",
      primaryForeground: "oklch(0.979 0.021 166.113)",
    },
    dark: {
      primary: "oklch(0.508 0.118 165.612)",
      primaryForeground: "oklch(0.979 0.021 166.113)",
    },
    ambient: { light: "#059669", dark: "#34d399" },
  },
  {
    id: "teal",
    name: "Teal",
    swatch: "oklch(0.6 0.118 184.704)",
    light: {
      primary: "oklch(0.6 0.118 184.704)",
      primaryForeground: "oklch(0.984 0.014 180.72)",
    },
    dark: {
      primary: "oklch(0.511 0.096 186.391)",
      primaryForeground: "oklch(0.984 0.014 180.72)",
    },
    ambient: { light: "#0d9488", dark: "#2dd4bf" },
  },
  {
    id: "neutral",
    name: "Neutral",
    swatch: "oklch(0.205 0 0)",
    light: {
      primary: "oklch(0.205 0 0)",
      primaryForeground: "oklch(0.985 0 0)",
    },
    dark: {
      primary: "oklch(0.922 0 0)",
      primaryForeground: "oklch(0.205 0 0)",
    },
    ambient: { light: "#404040", dark: "#d4d4d4" },
  },
]

export type Gray = {
  id: string
  name: string
  swatch: string
  /** Chroma/hue tint applied to every neutral surface token. */
  chroma: number
  hue: number
}

export const GRAYS: Gray[] = [
  { id: "neutral", name: "Neutral", swatch: "oklch(0.556 0 0)", chroma: 0, hue: 0 },
  { id: "slate", name: "Slate", swatch: "oklch(0.554 0.046 257.417)", chroma: 0.012, hue: 257 },
  { id: "stone", name: "Stone", swatch: "oklch(0.553 0.013 58.071)", chroma: 0.008, hue: 58 },
  { id: "sage", name: "Sage", swatch: "oklch(0.55 0.02 150)", chroma: 0.008, hue: 150 },
]

/**
 * The full radius ramp — every legal corner value, on the same 2/4-starter
 * grid logic as spacing. Customization means choosing a step, never typing
 * a number that isn't here.
 */
export const RADIUS_STEPS = [0, 2, 4, 8, 12, 16, 20, 24] as const

/**
 * The spacing grid is itself a foundation choice. Each grid resolves the
 * ten ambient-space steps as unit × multiplier, so the whole product (and
 * the Spacing page's documentation) re-derives from one decision.
 */
export const SPACING_MULTIPLIERS = [0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8] as const

export const SPACING_GRIDS = [
  { id: "default", name: "Default", unit: 8 },
  { id: "spacious", name: "Spacious", unit: 12 },
] as const

export function resolveSpacing(unit: number): number[] {
  return SPACING_MULTIPLIERS.map((m) => Math.round(unit * m * 100) / 100)
}

/**
 * Scaling presets map to a concrete base text size — the root font-size the
 * entire rem-based type ramp derives from. 100% = 16px.
 */
export const SCALINGS = [
  { pct: 90, base: 12 },
  { pct: 95, base: 14 },
  { pct: 100, base: 16 },
  { pct: 105, base: 18 },
  { pct: 110, base: 20 },
] as const

export interface OrbPaletteConfig {
  /** Derive the orb's colors from the theme accent (--app-blue). */
  useAccent: boolean
  /** Custom colors (crest, body, tail, streak) when not accent-linked. 1-4 entries. */
  colors: string[]
  /** Per-state cadence multipliers. */
  speeds: { still: number; listening: number; thinking: number; answer: number }
}

export interface FoundationConfig {
  accent: string
  gray: string
  /** Corner radius in px — must be one of RADIUS_STEPS. */
  radius: number
  /** Spacing grid id — resolves the ambient-space scale. */
  spacingGrid: (typeof SPACING_GRIDS)[number]["id"]
  scaling: (typeof SCALINGS)[number]["pct"]
  /** The orb character's palette — configured on its /ds page, saved with the theme. */
  orb: OrbPaletteConfig
  figmaFileUrl: string | null
}

export const DEFAULT_FOUNDATION: FoundationConfig = {
  accent: "blue",
  gray: "neutral",
  radius: 4,
  spacingGrid: "default",
  scaling: 100,
  orb: {
    useAccent: true,
    colors: ["#8bd8ff", "#2563eb", "#0b1e55"],
    speeds: { still: 1, listening: 0.8, thinking: 2.8, answer: 0.5 },
  },
  figmaFileUrl: null,
}

/** Migrate configs saved before radius became numeric / grids existed. */
function migrate(raw: Record<string, unknown>): Partial<FoundationConfig> {
  const legacyRadius: Record<string, number> = {
    none: 0,
    small: 4,
    medium: 8,
    large: 16,
    full: 24,
  }
  const out = { ...raw } as Partial<FoundationConfig> & { radius?: unknown }
  if (typeof out.radius === "string")
    out.radius = legacyRadius[out.radius] ?? DEFAULT_FOUNDATION.radius
  if (
    typeof out.radius === "number" &&
    !RADIUS_STEPS.includes(out.radius as (typeof RADIUS_STEPS)[number])
  )
    out.radius = DEFAULT_FOUNDATION.radius
  // The 4px "compact" grid was removed — too tight for real interfaces.
  if ((out as { spacingGrid?: string }).spacingGrid === "compact")
    out.spacingGrid = "default"
  const orb = (out as { orb?: Partial<OrbPaletteConfig> }).orb
  out.orb = {
    useAccent: orb?.useAccent ?? true,
    colors:
      Array.isArray(orb?.colors) && orb.colors.length > 0
        ? orb.colors.slice(0, 4)
        : DEFAULT_FOUNDATION.orb.colors,
    speeds: { ...DEFAULT_FOUNDATION.orb.speeds, ...orb?.speeds },
  }
  return out as Partial<FoundationConfig>
}

const STORAGE_KEY = "ambientui-foundation"

/* ------------------------------ css compilation ------------------------------ */

// The neutral surface tokens and their lightness per mode, matching the
// preset's globals.css. The gray choice re-tints all of them.
const SURFACE_TOKENS: {
  token: string
  light: number
  dark: number
  darkAlpha?: number
}[] = [
  { token: "--background", light: 1, dark: 0.145 },
  { token: "--foreground", light: 0.145, dark: 0.985 },
  { token: "--card", light: 1, dark: 0.205 },
  { token: "--card-foreground", light: 0.145, dark: 0.985 },
  { token: "--popover", light: 1, dark: 0.205 },
  { token: "--popover-foreground", light: 0.145, dark: 0.985 },
  { token: "--muted", light: 0.97, dark: 0.269 },
  { token: "--muted-foreground", light: 0.556, dark: 0.708 },
  { token: "--accent", light: 0.97, dark: 0.269 },
  { token: "--accent-foreground", light: 0.205, dark: 0.985 },
  { token: "--border", light: 0.922, dark: 1, darkAlpha: 0.1 },
  { token: "--input", light: 0.922, dark: 1, darkAlpha: 0.15 },
  { token: "--sidebar", light: 0.985, dark: 0.205 },
  { token: "--sidebar-foreground", light: 0.145, dark: 0.985 },
  { token: "--sidebar-accent", light: 0.97, dark: 0.269 },
  { token: "--sidebar-accent-foreground", light: 0.205, dark: 0.985 },
]

function oklch(l: number, c: number, h: number, alpha?: number) {
  const base = c === 0 ? `oklch(${l} 0 0)` : `oklch(${l} ${c} ${h})`
  return alpha !== undefined ? base.replace(")", ` / ${alpha * 100}%)`) : base
}

export function compileFoundationCss(config: FoundationConfig): string {
  const accent = ACCENTS.find((a) => a.id === config.accent) ?? ACCENTS[0]!
  const gray = GRAYS.find((g) => g.id === config.gray) ?? GRAYS[0]!
  const grid =
    SPACING_GRIDS.find((g) => g.id === config.spacingGrid) ?? SPACING_GRIDS[0]
  // SCALING IS THE BASE LAYER: every dimension is nominal px at the 100%
  // base (16px) and emitted in rem, so the scaling preset re-derives the
  // entire app — spacing, radius, and type together.
  const rem = (px: number) => `${Math.round((px / 16) * 10000) / 10000}rem`
  const spaceVars = resolveSpacing(grid.unit)
    .map((px, i) => `--ambient-space-${i + 1}: ${rem(px)};`)
    .join(" ")
  // THE PROPAGATION RULE: the grid drives Tailwind's core --spacing too, so
  // every utility-based padding/gap/height in every component re-densifies
  // with the grid.
  const tailwindSpacing = `--spacing: ${rem(grid.unit / 2)};`

  const light: string[] = [
    `--primary: ${accent.light.primary};`,
    `--primary-foreground: ${accent.light.primaryForeground};`,
    `--ring: ${accent.light.primary};`,
    `--sidebar-primary: ${accent.light.primary};`,
    `--sidebar-primary-foreground: ${accent.light.primaryForeground};`,
    `--app-blue: ${accent.ambient.light};`,
    `--radius: ${rem(config.radius)};`,
    spaceVars,
    tailwindSpacing,
  ]
  const dark: string[] = [
    `--primary: ${accent.dark.primary};`,
    `--primary-foreground: ${accent.dark.primaryForeground};`,
    `--ring: ${accent.dark.primary};`,
    `--sidebar-primary: ${accent.dark.primary};`,
    `--sidebar-primary-foreground: ${accent.dark.primaryForeground};`,
    `--app-blue: ${accent.ambient.dark};`,
  ]

  if (gray.chroma > 0) {
    for (const t of SURFACE_TOKENS) {
      light.push(`${t.token}: ${oklch(t.light, gray.chroma, gray.hue)};`)
      dark.push(
        `${t.token}: ${oklch(t.dark, t.darkAlpha ? 0 : gray.chroma, gray.hue, t.darkAlpha)};`
      )
    }
  }

  const scaling =
    SCALINGS.find((s) => s.pct === config.scaling) ?? SCALINGS[2]

  return [
    `:root { ${light.join(" ")} }`,
    `.dark { ${dark.join(" ")} }`,
    `html { font-size: ${scaling.base}px; }`,
  ].join("\n")
}

/* ------------------------------ provider ------------------------------ */

interface FoundationContextValue {
  config: FoundationConfig
  setConfig: (patch: Partial<FoundationConfig>) => void
  /** Unsaved changes exist — config differs from the last saved theme. */
  dirty: boolean
  /** Persist the current config as the project's theme. */
  save: () => void
  reset: () => void
}

const FoundationContext = React.createContext<FoundationContextValue | null>(
  null
)

export function FoundationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [config, setConfigState] = React.useState<FoundationConfig>(
    DEFAULT_FOUNDATION
  )
  // The last saved theme. Edits apply live but only persist on save();
  // reloading without saving returns to this.
  const [saved, setSaved] = React.useState<FoundationConfig>(DEFAULT_FOUNDATION)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const stored = { ...DEFAULT_FOUNDATION, ...migrate(JSON.parse(raw)) }
        setConfigState(stored)
        setSaved(stored)
      }
    } catch {
      // ignore malformed storage
    }
  }, [])

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
  }, [config])

  const value = React.useMemo<FoundationContextValue>(
    () => ({
      config,
      setConfig: (patch) => setConfigState((c) => ({ ...c, ...patch })),
      dirty: JSON.stringify(config) !== JSON.stringify(saved),
      save: () => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
        } catch {
          // storage may be unavailable
        }
        setSaved(config)
      },
      reset: () => setConfigState(DEFAULT_FOUNDATION),
    }),
    [config, saved]
  )

  return (
    <FoundationContext.Provider value={value}>
      {children}
    </FoundationContext.Provider>
  )
}

export function useFoundation() {
  const ctx = React.useContext(FoundationContext)
  if (!ctx)
    throw new Error("useFoundation must be used within FoundationProvider")
  return ctx
}
