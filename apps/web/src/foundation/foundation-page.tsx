import * as React from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import { Icon } from "@/components/icon"
import { RoleEditor } from "@/components/ds/colors-page"
import {
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
  const { config, setConfig, dirty, save, reset } = useFoundation()
  const { theme, setTheme } = useTheme()
  const [figmaInput, setFigmaInput] = React.useState(config.figmaFileUrl ?? "")
  const [justSaved, setJustSaved] = React.useState(false)

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
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1600)
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

      <SettingsSection title="General">
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
                      ? "border-ring bg-accent/40"
                      : "hover:bg-accent/40"
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
                      ? "border-ring bg-accent/40"
                      : "hover:bg-accent/40"
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

      <SettingsSection title="Color">
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
                        ? "border-ring bg-accent/40"
                        : "hover:bg-accent/40"
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
                        ? "border-ring bg-accent/40"
                        : "hover:bg-accent/40"
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

      <SettingsSection title="Semantic mapping">
        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
          Every semantic token is one visual job — a configurable step on the
          accent hue or gray family. Change a step and the whole product
          follows. The full palette is documented at /ds → Colors.
        </p>
        <RoleEditor showSave={false} />
      </SettingsSection>

      <SettingsSection title="Shape and density">
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
                        ? "border-ring bg-accent/40"
                        : "hover:bg-accent/40"
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

      <SettingsSection title="Icons">
        <SettingsCard>
          {ICON_LIBRARIES.map((lib) => (
            <button
              key={lib.id}
              type="button"
              onClick={() => setConfig({ icons: lib.id })}
              className="hover:bg-accent/30 flex w-full items-center justify-between px-5 py-3.5 text-start transition-colors first:rounded-t-xl last:rounded-b-xl"
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

      <SettingsSection title="Figma">
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

      <div className="mt-10 flex items-center gap-2">
        <Button
          className="flex-1"
          disabled={!dirty && !justSaved}
          onClick={saveTheme}
        >
          {justSaved ? "Saved" : dirty ? "Save Theme" : "Theme saved"}
        </Button>
        <Button variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>
      {dirty && (
        <p className="text-muted-foreground mt-2 text-xs">
          Changes apply live but aren't saved yet — reloading returns to the
          last saved theme.
        </p>
      )}
    </div>
  )
}
