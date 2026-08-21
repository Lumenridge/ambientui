import * as React from "react"

import { Moon02Icon, Sun03Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

import { useTheme } from "@/components/theme-provider"
import {
  ACCENTS,
  GRAYS,
  RADIUS_STEPS,
  SCALINGS,
  SPACING_GRIDS,
  resolveSpacing,
  useFoundation,
} from "@/foundation/foundation-context"

/**
 * The Foundation page: the project's global design configuration.
 * Set the foundation first; the entire product — components, pages, and
 * the ambient layer — builds on top of these decisions, and Figma Sync
 * mirrors them into the connected design file.
 */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground mb-3 text-[11px] font-medium tracking-wide uppercase">
      {children}
    </div>
  )
}

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

  const saveTheme = () => {
    save()
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1600)
  }

  return (
    <div className="mx-auto max-w-2xl pb-16">
        <h1 className="text-xl font-semibold">Foundation</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          The global design configuration — the single source of truth the
          entire product builds on. Change it any time; every component, page,
          and ambient surface follows, and the connected Figma file stays in
          sync.
        </p>

        <div className="mt-8 flex flex-col gap-8">
          {/* scaling */}
          <section>
            <SectionLabel>Scaling — the base layer</SectionLabel>
            <p className="text-muted-foreground -mt-1 mb-3 text-[12px]">
              Set this first. Every dimension in the system — type, spacing,
              radius — derives from this base size.
            </p>
            <div className="flex gap-2">
              {SCALINGS.map((s) => (
                <button
                  key={s.pct}
                  type="button"
                  onClick={() => setConfig({ scaling: s.pct })}
                  className={cn(
                    "border-border bg-card flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-2.5 transition-colors",
                    config.scaling === s.pct
                      ? "border-ring"
                      : "hover:bg-accent/50"
                  )}
                >
                  <span className="text-[13px] font-medium">{s.pct}%</span>
                  <span className="text-muted-foreground text-[11px]">
                    {s.base}px base
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* accent */}
          <section>
            <SectionLabel>Accent color</SectionLabel>
            <div className="flex flex-wrap gap-2.5">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  title={a.name}
                  onClick={() => setConfig({ accent: a.id })}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full transition-shadow",
                    config.accent === a.id &&
                      "ring-foreground/80 ring-2 ring-offset-2 ring-offset-[var(--background)]"
                  )}
                  style={{ backgroundColor: a.swatch }}
                >
                  {config.accent === a.id && (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      size={16}
                      strokeWidth={2.2}
                      className="text-white"
                    />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* gray */}
          <section>
            <SectionLabel>Gray color</SectionLabel>
            <div className="flex flex-wrap gap-2.5">
              {GRAYS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  title={g.name}
                  onClick={() => setConfig({ gray: g.id })}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full transition-shadow",
                    config.gray === g.id &&
                      "ring-foreground/80 ring-2 ring-offset-2 ring-offset-[var(--background)]"
                  )}
                  style={{ backgroundColor: g.swatch }}
                >
                  {config.gray === g.id && (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      size={16}
                      strokeWidth={2.2}
                      className="text-white"
                    />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* appearance */}
          <section>
            <SectionLabel>Appearance</SectionLabel>
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={theme === mode ? "secondary" : "outline"}
                  className={cn("flex-1", theme === mode && "border-ring border")}
                  onClick={() => setTheme(mode)}
                >
                  <HugeiconsIcon
                    icon={mode === "light" ? Sun03Icon : Moon02Icon}
                    size={15}
                    strokeWidth={1.8}
                  />
                  {mode === "light" ? "Light" : "Dark"}
                </Button>
              ))}
            </div>
          </section>

          {/* radius */}
          <section>
            <SectionLabel>Radius</SectionLabel>
            <p className="text-muted-foreground -mt-1 mb-3 text-[12px]">
              The full ramp — every legal corner value. Components derive their
              steps (sm…4xl) from the one you pick.
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {RADIUS_STEPS.map((px) => (
                <button
                  key={px}
                  type="button"
                  onClick={() => setConfig({ radius: px })}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "border-border bg-card flex h-14 w-full items-center justify-center rounded-lg border transition-colors",
                      config.radius === px && "border-ring"
                    )}
                  >
                    <span
                      className="border-primary bg-primary/10 size-7 border-t-2 border-l-2"
                      style={{ borderTopLeftRadius: px }}
                    />
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[11px]",
                      config.radius === px
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {px === 0 ? "0" : px}px
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* spacing grid */}
          <section>
            <SectionLabel>Spacing grid</SectionLabel>
            <p className="text-muted-foreground -mt-1 mb-3 text-[12px]">
              The grid the whole spacing scale derives from — all ten steps of
              each option shown. Pages and the Spacing docs re-derive
              automatically.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SPACING_GRIDS.map((g) => {
                const values = resolveSpacing(g.unit)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setConfig({ spacingGrid: g.id })}
                    className={cn(
                      "border-border bg-card flex flex-col items-start gap-2 rounded-lg border p-3 text-start transition-colors",
                      config.spacingGrid === g.id
                        ? "border-ring"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <span className="flex w-full items-baseline justify-between">
                      <span className="text-[13px] font-medium">{g.name}</span>
                      <span className="text-muted-foreground text-[11px]">
                        {g.unit}px unit
                      </span>
                    </span>
                    <span className="flex items-end gap-1">
                      {values.map((v, i) => (
                        <span
                          key={i}
                          className="bg-primary/60 w-1.5 rounded-xs"
                          style={{ height: Math.max(2, v / 2) }}
                        />
                      ))}
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {values.join(" · ")}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* scale preview */}
          <section>
            <SectionLabel>Scale</SectionLabel>
            <div className="border-border flex flex-col gap-5 rounded-lg border p-4">
              <div>
                <p className="text-muted-foreground mb-2 text-[11px]">
                  Spacing — the selected grid, resolved (`--ambient-space-1…10`)
                </p>
                <div className="flex items-end gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((step) => (
                    <div key={step} className="flex flex-col items-center gap-1">
                      <span
                        className="bg-primary/60 w-3 rounded-xs"
                        style={{ height: `var(--ambient-space-${step})` }}
                      />
                      <span className="text-muted-foreground text-[10px]">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-2 text-[11px]">
                  Type — rem-based, follows the base size
                  (`--ambient-text-1…9`)
                </p>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => (
                    <span
                      key={step}
                      style={{ fontSize: `var(--ambient-text-${step})` }}
                    >
                      Aa<span className="text-muted-foreground text-[10px]">{step}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* figma connection */}
          <section>
            <SectionLabel>Figma connection</SectionLabel>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  Design file
                  {figmaKey ? (
                    <Badge variant="secondary">Connected</Badge>
                  ) : (
                    <Badge variant="outline">Not connected</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Everything created or changed here — tokens, components,
                  variants — syncs back to this file. Variables only; code
                  wins on conflict.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
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
                  <p className="text-muted-foreground text-[12px]">
                    File key <code className="font-mono">{figmaKey}</code> ·
                    sync pending — the agent pushes token variables on "sync to
                    Figma".
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* save / reset */}
          <div className="flex items-center gap-2">
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
            <p className="text-muted-foreground -mt-4 text-[12px]">
              Changes apply live but aren't saved yet — reloading returns to
              the last saved theme.
            </p>
          )}
        </div>
    </div>
  )
}
