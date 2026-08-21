/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import { IconLibraryProvider } from "@workspace/ui/components/icon"

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
  /** Swatch shown in the picker. */
  swatch: string
  light: { primary: string; primaryForeground: string }
  dark: { primary: string; primaryForeground: string }
  /** The ambient layer's accent (assistant surfaces, orb, highlights). */
  ambient: { light: string; dark: string }
}

/**
 * The accents ARE the Tailwind color palette — every chromatic family,
 * referenced as CSS variables Tailwind v4 already ships. Light hues pair
 * with dark foregrounds (the token pair decides on-accent text).
 */
const TAILWIND_HUES = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const

const DARK_FG_HUES = new Set(["amber", "yellow", "lime"])

export const ACCENTS: Accent[] = [
  ...TAILWIND_HUES.map((hue) => {
    const fgLight = DARK_FG_HUES.has(hue)
      ? "var(--color-neutral-950)"
      : "var(--color-white)"
    return {
      id: hue,
      name: hue.charAt(0).toUpperCase() + hue.slice(1),
      swatch: `var(--color-${hue}-500)`,
      light: {
        primary: `var(--color-${hue}-600)`,
        primaryForeground: fgLight,
      },
      dark: {
        primary: `var(--color-${hue}-500)`,
        primaryForeground: DARK_FG_HUES.has(hue)
          ? "var(--color-neutral-950)"
          : "var(--color-white)",
      },
      ambient: {
        light: `var(--color-${hue}-600)`,
        dark: `var(--color-${hue}-400)`,
      },
    }
  }),
  {
    id: "neutral-accent",
    name: "Neutral",
    swatch: "var(--color-neutral-900)",
    light: {
      primary: "var(--color-neutral-900)",
      primaryForeground: "var(--color-neutral-50)",
    },
    dark: {
      primary: "var(--color-neutral-200)",
      primaryForeground: "var(--color-neutral-900)",
    },
    ambient: {
      light: "var(--color-neutral-600)",
      dark: "var(--color-neutral-400)",
    },
  },
]

export type Gray = {
  id: string
  name: string
  swatch: string
}

/** The five Tailwind gray families — the chosen one defines every surface. */
export const GRAYS: Gray[] = ["slate", "gray", "zinc", "neutral", "stone"].map(
  (id) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    swatch: `var(--color-${id}-500)`,
  })
)

/**
 * The full radius ramp — every legal corner value, on the same 2/4-starter
 * grid logic as spacing. Customization means choosing a step, never typing
 * a number that isn't here.
 */
export const RADIUS_STEPS = [0, 2, 4, 8, 12, 16, 20, 24] as const

/**
 * Spacing is Tailwind's own scale; the Foundation chooses its UNIT — the
 * `--spacing` variable every utility (`p-4`, `gap-2`, `h-9`) derives from.
 * Default is Tailwind's 4px unit; Spacious opens the whole product up.
 * Units are nominal px at the 100% base and emitted in rem.
 */
export const SPACING_GRIDS = [
  { id: "default", name: "Default", unit: 4 },
  { id: "spacious", name: "Spacious", unit: 6 },
] as const

/** The documented steps of the Tailwind spacing scale (class number → ×unit). */
export const SPACING_STEPS = [0.5, 1, 1.5, 2, 3, 4, 6, 8, 10, 12, 16] as const

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

/**
 * THE ROLE MAP — every semantic token as a configurable palette step.
 * Accent-source roles resolve on the accent hue; gray-source roles on the
 * gray family. The Colors page edits these; defaults are shadcn's shape.
 */
export type RoleDef = {
  token: string
  /** Human name shown in the role editor. */
  label: string
  /** What actually changes on screen when this role's step changes. */
  description: string
  source: "accent" | "gray"
  light: string
  dark: string
  /** Tokens that mirror this role's value. */
  aliases?: string[]
}

export const ROLE_DEFS: RoleDef[] = [
  { token: "--primary", label: "Action color", description: "Filled buttons, switches and checks when on, the active nav accent — the color that marks the main action.", source: "accent", light: "600", dark: "500", aliases: ["--sidebar-primary"] },
  { token: "--ring", label: "Focus ring", description: "The outline drawn around whichever control has keyboard focus.", source: "accent", light: "600", dark: "500" },
  { token: "--app-blue", label: "Ambient accent", description: "The assistant layer's accent — its chips, links, and highlights bridge to the brand hue through this.", source: "accent", light: "600", dark: "400" },
  { token: "--background", label: "Page background", description: "The ground every screen sits on; everything else stacks above it.", source: "gray", light: "white", dark: "950" },
  { token: "--foreground", label: "Primary text", description: "Headings and body copy everywhere — cards, popovers, and the sidebar inherit it.", source: "gray", light: "950", dark: "50", aliases: ["--card-foreground", "--popover-foreground", "--sidebar-foreground"] },
  { token: "--card", label: "Raised surface", description: "The face of anything lifted off the page — cards, popovers, menus, sheets.", source: "gray", light: "white", dark: "900", aliases: ["--popover"] },
  { token: "--muted", label: "Quiet fill", description: "The soft wash behind hover and selected states, subtle chips, and secondary surfaces.", source: "gray", light: "100", dark: "800", aliases: ["--accent", "--sidebar-accent"] },
  { token: "--muted-foreground", label: "Secondary text", description: "Supporting copy — descriptions, captions, placeholders, section labels.", source: "gray", light: "500", dark: "400" },
  { token: "--accent-foreground", label: "Text on quiet fill", description: "Text sitting on the quiet fill — a hovered menu item's label, a selected row's text.", source: "gray", light: "900", dark: "100", aliases: ["--sidebar-accent-foreground"] },
  { token: "--border", label: "Hairline border", description: "Every hairline — card edges, dividers, table rules.", source: "gray", light: "200", dark: "800", aliases: ["--sidebar-border"] },
  { token: "--input", label: "Field border", description: "Form-control borders at rest — inputs, selects, checkboxes.", source: "gray", light: "200", dark: "700" },
  { token: "--sidebar", label: "Sidebar ground", description: "The navigation rail's tint, and the shell behind the inset content card.", source: "gray", light: "50", dark: "900" },
]

export const GRAY_STEP_OPTIONS = ["white", "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const
export const ACCENT_STEP_OPTIONS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const

/** Dark-mode mirror used by the Foundation's quick text-tone rows. */
export const TEXT_DARK_MIRROR: Record<string, string> = {
  "950": "50",
  "900": "100",
  "800": "200",
  "600": "300",
  "500": "400",
  "400": "500",
}
export const TEXT_PRIMARY_STEPS = ["950", "900", "800"] as const
export const TEXT_SECONDARY_STEPS = ["600", "500", "400"] as const

/** The five icon libraries the system can draw from. */
export const ICON_LIBRARIES = [
  { id: "lucide", name: "Lucide" },
  { id: "tabler", name: "Tabler Icons" },
  { id: "hugeicons", name: "HugeIcons" },
  { id: "phosphor", name: "Phosphor Icons" },
  { id: "remix", name: "Remix Icon" },
] as const

/**
 * The type family: Geist ships locally; the rest load from Google Fonts
 * on demand (a <link> the provider injects when a Google family is saved).
 */
export const FONTS = [
  { id: "geist", name: "Geist", family: "'Geist Variable'", google: null },
  { id: "inter", name: "Inter", family: "'Inter'", google: "Inter:wght@400..700" },
  { id: "dm-sans", name: "DM Sans", family: "'DM Sans'", google: "DM+Sans:opsz,wght@9..40,400..700" },
  { id: "manrope", name: "Manrope", family: "'Manrope'", google: "Manrope:wght@400..700" },
  { id: "space-grotesk", name: "Space Grotesk", family: "'Space Grotesk'", google: "Space+Grotesk:wght@400..700" },
  { id: "ibm-plex-sans", name: "IBM Plex Sans", family: "'IBM Plex Sans'", google: "IBM+Plex+Sans:wght@400;500;600;700" },
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
  /** Spacing unit id — sets Tailwind's --spacing, which every utility derives from. */
  spacingGrid: (typeof SPACING_GRIDS)[number]["id"]
  scaling: (typeof SCALINGS)[number]["pct"]
  /** Per-role step overrides — the semantic mapping, editable on /ds → Colors. */
  roles: Record<string, { light?: string; dark?: string }>
  /** The icon library every <Icon> draws from. */
  icons: (typeof ICON_LIBRARIES)[number]["id"]
  /** The type family (--font-sans); Google families load on demand. */
  font: (typeof FONTS)[number]["id"]
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
  roles: {},
  icons: "hugeicons",
  font: "geist",
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
  // Pre-Tailwind-palette configs: "sage" gray retired; the achromatic
  // accent was renamed to avoid colliding with the neutral gray family.
  if (out.gray === "sage") out.gray = "gray"
  if (out.accent === "neutral") out.accent = "neutral-accent"
  if (out.gray && !["slate", "gray", "zinc", "neutral", "stone"].includes(out.gray))
    out.gray = DEFAULT_FOUNDATION.gray
  if (out.accent && !ACCENTS.some((a) => a.id === out.accent))
    out.accent = DEFAULT_FOUNDATION.accent
  const legacy = out as { textPrimary?: string; textSecondary?: string }
  const roles: Record<string, { light?: string; dark?: string }> = {
    ...(typeof out.roles === "object" && out.roles ? out.roles : {}),
  }
  if (legacy.textPrimary)
    roles["--foreground"] = {
      light: legacy.textPrimary,
      dark: TEXT_DARK_MIRROR[legacy.textPrimary] ?? "50",
    }
  if (legacy.textSecondary)
    roles["--muted-foreground"] = {
      light: legacy.textSecondary,
      dark: TEXT_DARK_MIRROR[legacy.textSecondary] ?? "400",
    }
  delete legacy.textPrimary
  delete legacy.textSecondary
  out.roles = roles
  out.icons = ICON_LIBRARIES.some((x) => x.id === out.icons)
    ? out.icons
    : "hugeicons"
  out.font = FONTS.some((x) => x.id === out.font) ? out.font : "geist"
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

export function resolveRole(config: FoundationConfig, def: RoleDef) {
  const o = config.roles[def.token]
  return { light: o?.light ?? def.light, dark: o?.dark ?? def.dark }
}

export function compileFoundationCss(config: FoundationConfig): string {
  const accent = ACCENTS.find((a) => a.id === config.accent) ?? ACCENTS[10]!
  const accentFamily = accent.id === "neutral-accent" ? "neutral" : accent.id
  const grayFamily = config.gray
  const grid =
    SPACING_GRIDS.find((g) => g.id === config.spacingGrid) ?? SPACING_GRIDS[0]

  // SCALING IS THE BASE LAYER: every dimension is nominal px at the 100%
  // base (16px) and emitted in rem, so the scaling preset re-derives the
  // entire app — spacing, radius, and type together.
  const rem = (px: number) => `${Math.round((px / 16) * 10000) / 10000}rem`

  const roleVar = (def: RoleDef, step: string) =>
    step === "white"
      ? "var(--color-white)"
      : `var(--color-${def.source === "accent" ? accentFamily : grayFamily}-${step})`

  const light: string[] = [
    `--primary-foreground: ${accent.light.primaryForeground};`,
    `--sidebar-primary-foreground: ${accent.light.primaryForeground};`,
    `--radius: ${rem(config.radius)};`,
    // THE PROPAGATION RULE: the Foundation sets Tailwind's core --spacing,
    // so every utility-based dimension in every component follows.
    `--spacing: ${rem(grid.unit)};`,
    ...(config.font !== "geist"
      ? [
          `--font-sans: ${
            FONTS.find((f) => f.id === config.font)?.family ??
            "'Geist Variable'"
          }, 'Geist Variable', sans-serif;`,
        ]
      : []),
  ]
  const dark: string[] = [
    `--primary-foreground: ${accent.dark.primaryForeground};`,
    `--sidebar-primary-foreground: ${accent.dark.primaryForeground};`,
  ]

  // THE ROLE MAP: every semantic token resolves to a configured palette
  // step on the accent hue or gray family — the mapping the Colors page
  // edits.
  for (const def of ROLE_DEFS) {
    const { light: l, dark: d } = resolveRole(config, def)
    for (const token of [def.token, ...(def.aliases ?? [])]) {
      light.push(`${token}: ${roleVar(def, l)};`)
      dark.push(`${token}: ${roleVar(def, d)};`)
    }
  }

  const scaling = SCALINGS.find((s) => s.pct === config.scaling) ?? SCALINGS[2]

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
      <IconLibraryProvider library={config.icons}>
        {children}
      </IconLibraryProvider>
    </FoundationContext.Provider>
  )
}

export function useFoundation() {
  const ctx = React.useContext(FoundationContext)
  if (!ctx)
    throw new Error("useFoundation must be used within FoundationProvider")
  return ctx
}
