import { Separator } from "@ambientui/ui/components/separator"
import { Button } from "@ambientui/ui/components/button"

import { ChoiceControl } from "@/components/ds/ds-docs"
import {
  ACCENT_STEP_OPTIONS,
  GRAY_STEP_OPTIONS,
  ROLE_DEFS,
  deriveDark,
  resolveRole,
  useFoundation,
} from "@ambientui/foundation"
import { toast } from "sonner"

/**
 * The Colors page: the palette of record is Tailwind's own — every family,
 * every step, rendered from the CSS variables Tailwind v4 ships. The
 * Foundation selects from this palette (accent hue, gray family); the
 * semantic tokens components consume are aliases into it.
 *
 * Rule of record (DESIGN.md §2): components never touch palette steps
 * directly — they use semantic roles. A stated color is a request for the
 * nearest palette step, reached through a role.
 */

const CHROMATIC = [
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
]
const GRAYS = ["slate", "gray", "zinc", "neutral", "stone"]
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

function PaletteRow({ family }: { family: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-16 shrink-0 font-mono text-xs">
        {family}
      </span>
      <div className="grid flex-1 grid-cols-11 gap-1">
        {STEPS.map((step) => (
          <div
            key={step}
            title={`${family}-${step}`}
            className="border-(--glass-border) h-7 rounded-sm border"
            style={{ backgroundColor: `var(--color-${family}-${step})` }}
          />
        ))}
      </div>
    </div>
  )
}

export function RoleEditor({ showSave = true }: { showSave?: boolean }) {
  const { config, setConfig, dirty, save } = useFoundation()
  const accentFamily =
    config.accent === "neutral-accent" ? "neutral" : config.accent

  const stepVar = (def: (typeof ROLE_DEFS)[number], step: string) =>
    step === "white"
      ? "var(--color-white)"
      : `var(--color-${def.source === "accent" ? accentFamily : config.gray}-${step})`

  // Light is the design decision — picking it re-derives dark from the
  // aesthetic mirror. Picking dark explicitly pins it (until the next
  // light pick), so customization stays one click away without making
  // the default path think about two modes.
  const setStep = (
    def: (typeof ROLE_DEFS)[number],
    mode: "light" | "dark",
    step: string
  ) =>
    setConfig({
      roles: {
        ...config.roles,
        [def.token]:
          mode === "light"
            ? { light: step, dark: deriveDark(def, step) }
            : { ...config.roles[def.token], dark: step },
      },
    })

  return (
    <div className="border-border bg-card divide-border divide-y rounded-xl border">
      <div className="text-muted-foreground grid grid-cols-[1fr_90px_130px_130px] items-center gap-2 px-4 py-2 text-xs font-medium">
        <span>Role</span>
        <span>Source</span>
        <span>Light</span>
        <span>Dark</span>
      </div>
      {ROLE_DEFS.map((def) => {
        const { light, dark } = resolveRole(config, def)
        const options =
          def.source === "accent" ? ACCENT_STEP_OPTIONS : GRAY_STEP_OPTIONS
        return (
          <div
            key={def.token}
            className="grid grid-cols-[1fr_90px_130px_130px] items-center gap-2 px-4 py-2"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium">{def.label}</div>
              <div className="text-muted-foreground mt-0.5 text-xs">
                {def.description}
              </div>
              <div className="text-muted-foreground/80 mt-1 truncate font-mono text-xs">
                {def.token}
                {def.aliases ? ` + ${def.aliases.join(", ")}` : ""}
              </div>
            </div>
            <span className="text-muted-foreground text-xs">
              {def.source === "accent" ? "accent hue" : "gray family"}
            </span>
            {(["light", "dark"] as const).map((mode) => (
              <div key={mode} className="flex items-center gap-1.5">
                <span
                  className="border-(--glass-border) size-5 shrink-0 rounded-full border"
                  style={{
                    backgroundColor: stepVar(def, mode === "light" ? light : dark),
                  }}
                />
                <ChoiceControl
                  options={options}
                  value={(mode === "light" ? light : dark) as never}
                  onChange={(v) => setStep(def, mode, v)}
                />
              </div>
            ))}
          </div>
        )
      })}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-muted-foreground text-xs">
          Picking a light step derives the dark one automatically; set dark
          yourself to override. --primary-foreground stays paired.
        </span>
        {showSave && (
          <Button
            size="sm"
            disabled={!dirty}
            onClick={() => {
              save()
              toast("Theme saved")
            }}
          >
            {dirty ? "Save Theme" : "Saved"}
          </Button>
        )}
      </div>
    </div>
  )
}

export function ColorsPage() {
  const { config } = useFoundation()

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <h1 className="text-xl font-semibold">Colors</h1>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        The palette of record is <strong>Tailwind's color palette</strong> —
        every family and step below is a CSS variable
        (`--color-{"{family}"}-{"{step}"}`) that ships with Tailwind v4. The
        Foundation selects from it: the accent hue (currently{" "}
        <strong>{config.accent}</strong>) and the gray family (currently{" "}
        <strong>{config.gray}</strong>) resolve every semantic token the
        components consume.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Steps
          </div>
          <div className="text-muted-foreground mb-3 grid grid-cols-11 gap-1 ps-18 font-mono text-xs">
            {STEPS.map((s) => (
              <span key={s} className="text-center">
                {s}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {CHROMATIC.map((f) => (
              <PaletteRow key={f} family={f} />
            ))}
          </div>
        </section>

        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Grays — the surface families
          </div>
          <div className="flex flex-col gap-1.5">
            {GRAYS.map((f) => (
              <PaletteRow key={f} family={f} />
            ))}
          </div>
        </section>

        <Separator />

        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            The semantic mapping
          </div>
          <p className="text-muted-foreground text-sm">
            Every semantic token is a configurable step on the accent hue or
            gray family — <strong className="text-foreground">configured on
            the Foundation page</strong> (Semantic mapping section), where
            all theme decisions live.
          </p>
        </section>

        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            The rule
          </div>
          <div className="text-muted-foreground flex flex-col gap-2 text-sm leading-relaxed">
            <p>
              <strong className="text-foreground">
                Components consume semantic roles, never palette steps.
              </strong>{" "}
              "A softer grey for that text" is{" "}
              <code className="font-mono text-xs">text-muted-foreground</code>,
              not <code className="font-mono text-xs">text-gray-400</code>.
              Roles survive an accent or gray-family change; raw steps do not.
            </p>
            <p>
              A stated hex is a starting point, not a value — map it to the
              nearest palette step, reach it through a role, and say which
              step now carries it. The only place palette steps are named
              directly is the Foundation's mapping itself.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
