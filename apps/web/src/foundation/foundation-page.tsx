import * as React from "react"

import { motion } from "framer-motion"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import { Icon } from "@/components/icon"
import { SectionRail } from "@workspace/ui/components/section-rail"

import { RoleEditor } from "@/components/ds/colors-page"
import {
  SaveReminder,
  SettingsCard,
  SettingsRow,
  SettingsSection,
  SettingsTitle,
} from "@/components/ds/settings-kit"
import { useTheme } from "@/components/theme-provider"
import {
  ACCENTS,
  FONTS,
  GRAYS,
  ICON_LIBRARIES,
  MOTION_CHARACTERS,
  MOTION_PACES,
  RADIUS_STEPS,
  SCALINGS,
  SPACING_GRIDS,
  TEXT_DARK_MIRROR,
  TEXT_PRIMARY_STEPS,
  TEXT_SECONDARY_STEPS,
  SPACING_STEPS,
  useFoundation,
} from "@/foundation/foundation-context"

/**
 * The Foundation page: the project's global design configuration, in the
 * settings-page pattern — section cards of rows, title + description left,
 * control right (or a full-width picker zone underneath).
 */

function parseFigmaFileKey(url: string): string | null {
  const match = url.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/)
  return match?.[1] ?? null
}

export function FoundationPage() {
  const { config, setConfig, dirty, save, reset, discard } = useFoundation()
  const { theme, setTheme } = useTheme()
  const [figmaInput, setFigmaInput] = React.useState(config.figmaFileUrl ?? "")

  const figmaKey = config.figmaFileUrl
    ? parseFigmaFileKey(config.figmaFileUrl)
    : null

  // Load every Google font option while this page is open so the font
  // picker previews render real specimens — the saved font loads globally.
  React.useEffect(() => {
    const families = FONTS.filter((f) => f.google)
      .map((f) => `family=${f.google}`)
      .join("&")
    const id = "ambientui-font-previews"
    if (document.getElementById(id)) return
    const link = document.createElement("link")
    link.id = id
    link.rel = "stylesheet"
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`
    document.head.appendChild(link)
  }, [])

  const saveTheme = () => {
    save()
    toast("Theme saved", {
      description: "Every surface now builds from this configuration.",
    })
  }

  const swatchButton = (
    selected: boolean,
    onClick: () => void,
    swatch: string,
    title: string
  ) => (
    <button
      key={title}
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-full transition-shadow",
        selected &&
          "ring-foreground/80 ring-2 ring-offset-2 ring-offset-[var(--card)]"
      )}
      style={{ backgroundColor: swatch }}
    >
      {selected && (
        <Icon name="check" size={14} strokeWidth={2.2} className="text-white" />
      )}
    </button>
  )

  return (
    <div className="mx-auto max-w-2xl pb-20">
      <SettingsTitle>Foundation</SettingsTitle>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        The global design configuration — the single source of truth the
        entire product builds on. Every component, page, and ambient surface
        follows it, and the connected Figma file stays in sync.
      </p>

      <SectionRail
        sections={[
          { id: "general", label: "General" },
          { id: "color", label: "Color" },
          { id: "semantic-mapping", label: "Mapping" },
          { id: "shape", label: "Shape" },
          { id: "motion", label: "Motion" },
          { id: "icons", label: "Icons" },
          { id: "figma", label: "Figma" },
          { id: "reset", label: "Reset" },
        ]}
      />

      <SettingsSection id="general" title="General">
        <SettingsCard>
          <SettingsRow
            title="Scaling — the base layer"
            description="Set this first. Type, spacing, and radius all derive from this base size."
          >
            <div className="flex gap-2">
              {SCALINGS.map((s) => (
                <button
                  key={s.pct}
                  type="button"
                  onClick={() => setConfig({ scaling: s.pct })}
                  className={cn(
                    "border-border flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-2 transition-colors",
                    config.scaling === s.pct
                      ? "border-ring bg-(--wash)"
                      : "hover:bg-(--wash)"
                  )}
                >
                  <span className="text-sm font-medium">{s.pct}%</span>
                  <span className="text-muted-foreground text-xs">
                    {s.base}px base
                  </span>
                </button>
              ))}
            </div>
          </SettingsRow>
          <SettingsRow
            title="Appearance"
            description="Light and dark are both first-class; every token pair covers both."
            control={
              <div className="flex gap-1.5">
                {(["light", "dark"] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={theme === mode ? "secondary" : "outline"}
                    onClick={() => setTheme(mode)}
                  >
                    <Icon name={mode === "light" ? "sun" : "moon"} size={14} />
                    {mode === "light" ? "Light" : "Dark"}
                  </Button>
                ))}
              </div>
            }
          />
          <SettingsRow
            title="Font"
            description="Sets --font-sans product-wide. Geist ships locally; the rest load from Google Fonts."
          >
            <div className="grid grid-cols-3 gap-2">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setConfig({ font: f.id })}
                  className={cn(
                    "border-border flex flex-col items-start gap-0.5 rounded-lg border p-3 transition-colors",
                    config.font === f.id
                      ? "border-ring bg-(--wash)"
                      : "hover:bg-(--wash)"
                  )}
                  style={{ fontFamily: `${f.family}, sans-serif` }}
                >
                  <span className="text-xl leading-none">Ag</span>
                  <span
                    className={cn(
                      "text-xs",
                      config.font === f.id
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {f.name}
                    {f.google === null && " · local"}
                  </span>
                </button>
              ))}
            </div>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection id="color" title="Color">
        <SettingsCard>
          <SettingsRow
            title="Accent color"
            description="A Tailwind hue; primary, ring, and the ambient accent derive from it."
          >
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((a) =>
                swatchButton(
                  config.accent === a.id,
                  () => setConfig({ accent: a.id }),
                  a.swatch,
                  a.name
                )
              )}
            </div>
          </SettingsRow>
          <SettingsRow
            title="Primary text"
            description="The tone body text carries — a step on the gray family; dark mode mirrors it."
            control={
              <div className="flex gap-1.5">
                {TEXT_PRIMARY_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() =>
                      setConfig({
                        roles: {
                          ...config.roles,
                          "--foreground": {
                            light: step,
                            dark: TEXT_DARK_MIRROR[step] ?? "50",
                          },
                        },
                      })
                    }
                    className={cn(
                      "border-border flex flex-col items-center rounded-lg border px-3 py-1.5 transition-colors",
                      (config.roles["--foreground"]?.light ?? "950") === step
                        ? "border-ring bg-(--wash)"
                        : "hover:bg-(--wash)"
                    )}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{
                        // Preview the step that will actually paint in the
                        // current appearance — dark mode shows the mirror.
                        color: `var(--color-${config.gray}-${
                          theme === "dark" ? (TEXT_DARK_MIRROR[step] ?? "50") : step
                        })`,
                      }}
                    >
                      Aa
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {theme === "dark" ? (TEXT_DARK_MIRROR[step] ?? "50") : step}
                    </span>
                  </button>
                ))}
              </div>
            }
          />
          <SettingsRow
            title="Secondary text"
            description="Descriptions, hints, and meta — quieter, still on the gray family."
            control={
              <div className="flex gap-1.5">
                {TEXT_SECONDARY_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() =>
                      setConfig({
                        roles: {
                          ...config.roles,
                          "--muted-foreground": {
                            light: step,
                            dark: TEXT_DARK_MIRROR[step] ?? "400",
                          },
                        },
                      })
                    }
                    className={cn(
                      "border-border flex flex-col items-center rounded-lg border px-3 py-1.5 transition-colors",
                      (config.roles["--muted-foreground"]?.light ?? "500") === step
                        ? "border-ring bg-(--wash)"
                        : "hover:bg-(--wash)"
                    )}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: `var(--color-${config.gray}-${
                          theme === "dark" ? (TEXT_DARK_MIRROR[step] ?? "400") : step
                        })`,
                      }}
                    >
                      Aa
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {theme === "dark" ? (TEXT_DARK_MIRROR[step] ?? "400") : step}
                    </span>
                  </button>
                ))}
              </div>
            }
          />
          <SettingsRow
            title="Gray color"
            description="A Tailwind gray family; it defines every surface — backgrounds, cards, borders."
          >
            <div className="flex flex-wrap gap-2">
              {GRAYS.map((g) =>
                swatchButton(
                  config.gray === g.id,
                  () => setConfig({ gray: g.id }),
                  g.swatch,
                  g.name
                )
              )}
            </div>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection id="semantic-mapping" title="Semantic mapping">
        <div className="mb-4 flex items-end justify-between gap-6">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Every semantic token is one visual job — a configurable step on
            the accent hue or gray family. Pick the light step and the dark
            one follows automatically; set dark yourself to override. The
            full palette is documented at /ds → Colors.
          </p>
          {/* quick appearance toggle — test both modes without leaving the map */}
          <div className="flex shrink-0 gap-1.5">
            {(["light", "dark"] as const).map((mode) => (
              <Button
                key={mode}
                size="xs"
                variant={theme === mode ? "secondary" : "outline"}
                onClick={() => setTheme(mode)}
              >
                <Icon name={mode === "light" ? "sun" : "moon"} size={12} />
                {mode === "light" ? "Light" : "Dark"}
              </Button>
            ))}
          </div>
        </div>
        <RoleEditor showSave={false} />
      </SettingsSection>

      <SettingsSection id="shape" title="Shape and density">
        <SettingsCard>
          <SettingsRow
            title="Radius"
            description="The full ramp of legal corner values; components derive their steps from your pick."
          >
            <div className="grid grid-cols-8 gap-2">
              {RADIUS_STEPS.map((px) => (
                <button
                  key={px}
                  type="button"
                  onClick={() => setConfig({ radius: px })}
                  className="group flex flex-col items-center gap-1"
                >
                  <span
                    className={cn(
                      "border-border bg-background flex h-12 w-full items-center justify-center rounded-lg border transition-colors",
                      config.radius === px && "border-ring"
                    )}
                  >
                    <span
                      className="border-primary bg-primary/10 size-6 border-t-2 border-l-2"
                      style={{ borderTopLeftRadius: px }}
                    />
                  </span>
                  <span
                    className={cn(
                      "font-mono text-xs",
                      config.radius === px
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {px}px
                  </span>
                </button>
              ))}
            </div>
          </SettingsRow>
          <SettingsRow
            title="Spacing unit"
            description="The scale is Tailwind's own; this sets its unit — every p-4 / gap-2 / h-9 re-derives."
          >
            <div className="grid grid-cols-2 gap-2">
              {SPACING_GRIDS.map((g) => {
                const values = SPACING_STEPS.map(
                  (m) => Math.round(g.unit * m * 100) / 100
                )
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setConfig({ spacingGrid: g.id })}
                    className={cn(
                      "border-border flex flex-col items-start gap-2 rounded-lg border p-3 text-start transition-colors",
                      config.spacingGrid === g.id
                        ? "border-ring bg-(--wash)"
                        : "hover:bg-(--wash)"
                    )}
                  >
                    <span className="flex w-full items-baseline justify-between">
                      <span className="text-sm font-medium">{g.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {g.unit}px unit
                        {g.unit === 4 ? " · Tailwind default" : ""}
                      </span>
                    </span>
                    <span className="flex items-end gap-1">
                      {values.map((v, i) => (
                        <span
                          key={i}
                          className="bg-primary/60 w-1.5 rounded-xs"
                          style={{ height: Math.max(2, v / 3) }}
                        />
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection id="motion" title="Motion">
        <SettingsCard>
          <SettingsRow
            title="Character"
            description="The feel of every transition, product-wide — easing, timing, and spring family. Hover a card to preview its move."
          >
            <div className="grid grid-cols-3 gap-2">
              {MOTION_CHARACTERS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setConfig({ motion: { ...config.motion, character: c.id } })
                  }
                  className={cn(
                    "border-border flex flex-col items-start gap-2 rounded-lg border p-3 text-start transition-colors",
                    config.motion.character === c.id
                      ? "border-ring bg-(--wash)"
                      : "hover:bg-(--wash)"
                  )}
                >
                  <motion.span
                    className="bg-primary block size-3 rounded-full"
                    initial={false}
                    whileHover={{
                      x: 40,
                      transition: {
                        duration: c.durations.surface / 1000,
                        ease: c.easeArr,
                      },
                    }}
                  />
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {c.description}
                  </span>
                </button>
              ))}
            </div>
          </SettingsRow>
          <SettingsRow
            title="Pace"
            description="Scales every motion role's timing together — the character stays the same."
            control={
              <div className="flex gap-1.5">
                {MOTION_PACES.map((p) => (
                  <Button
                    key={p.pct}
                    size="sm"
                    variant={
                      config.motion.pace === p.pct ? "secondary" : "outline"
                    }
                    onClick={() =>
                      setConfig({ motion: { ...config.motion, pace: p.pct } })
                    }
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
            }
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection id="icons" title="Icons">
        <SettingsCard>
          {ICON_LIBRARIES.map((lib) => (
            <button
              key={lib.id}
              type="button"
              onClick={() => setConfig({ icons: lib.id })}
              className="hover:bg-(--wash) flex w-full items-center justify-between px-5 py-3.5 text-start transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <span className="text-sm font-medium">{lib.name}</span>
              <span className="flex items-center gap-4">
                <span className="text-muted-foreground flex items-center gap-2.5">
                  {(
                    [
                      "search",
                      "settings",
                      "heart",
                      "calendar",
                      "user",
                      "sparkles",
                    ] as const
                  ).map((n) => (
                    <Icon key={n} name={n} size={15} library={lib.id} />
                  ))}
                </span>
                <span
                  className={cn(
                    "w-4",
                    config.icons === lib.id ? "text-primary" : "text-transparent"
                  )}
                >
                  <Icon name="check" size={15} />
                </span>
              </span>
            </button>
          ))}
        </SettingsCard>
        <p className="text-muted-foreground mt-2 text-xs">
          Components name icons semantically; the library you pick draws them
          everywhere.
        </p>
      </SettingsSection>

      <SettingsSection id="figma" title="Figma">
        <SettingsCard>
          <SettingsRow
            title="Design file"
            description="Everything created here — tokens, components, variants — syncs back to this file. Variables only; code wins on conflict."
            control={
              figmaKey ? (
                <Badge variant="secondary">Connected</Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )
            }
          >
            <div className="flex gap-2">
              <Input
                value={figmaInput}
                onChange={(e) => setFigmaInput(e.target.value)}
                placeholder="https://www.figma.com/design/…"
                className="flex-1"
              />
              <Button
                variant="outline"
                disabled={!parseFigmaFileKey(figmaInput)}
                onClick={() => setConfig({ figmaFileUrl: figmaInput })}
              >
                Connect
              </Button>
            </div>
            {figmaKey && (
              <p className="text-muted-foreground mt-2 text-xs">
                File key <code className="font-mono">{figmaKey}</code> · sync
                pending — the agent pushes token variables on "sync to Figma".
              </p>
            )}
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection id="reset" title="Reset">
        <SettingsCard>
          <SettingsRow
            title="Reset to defaults"
            description="Return every Foundation dimension — color, type, shape, motion, icons — to the system defaults. Applies live; Save Theme makes it permanent, Discard brings your saved theme back."
            control={
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  reset()
                  toast("Theme reset to defaults", {
                    description:
                      "Save Theme to keep it — or Discard to return to your saved theme.",
                  })
                }}
              >
                Reset theme
              </Button>
            }
          />
        </SettingsCard>
      </SettingsSection>

      <SaveReminder
        open={dirty}
        onSave={saveTheme}
        onDiscard={discard}
        saveLabel="Save Theme"
      />
    </div>
  )
}
