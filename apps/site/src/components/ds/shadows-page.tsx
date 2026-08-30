"use client"

import { Separator } from "@ambientui/ui/components/separator"

/**
 * The Shadows page: documentation of the elevation scale of record —
 * Tailwind's shadow scale, as-is. Shadows are not a Foundation config;
 * they are steps components choose by meaning.
 *
 * Rule of record (DESIGN.md §2): every shadow is a Tailwind step
 * (`shadow-2xs` … `shadow-2xl`). Never a literal box-shadow.
 */

const STEPS: { cls: string; token: string; use: string }[] = [
  {
    cls: "shadow-2xs",
    token: "--shadow-2xs",
    use: "The faintest lift — pressed/flat controls that still need separation from their surface.",
  },
  {
    cls: "shadow-xs",
    token: "--shadow-xs",
    use: "Resting controls and inputs — the default shadcn control elevation.",
  },
  {
    cls: "shadow-sm",
    token: "--shadow-sm",
    use: "Cards at rest — grouped content sitting just above the page.",
  },
  {
    cls: "shadow-md",
    token: "--shadow-md",
    use: "Raised interactive surfaces — dropdown menus, popovers, hover-lifted cards.",
  },
  {
    cls: "shadow-lg",
    token: "--shadow-lg",
    use: "Floating surfaces — the assistant's panel, sheets, toasts.",
  },
  {
    cls: "shadow-xl",
    token: "--shadow-xl",
    use: "Prominent overlays — large dialogs, the spotlight shell.",
  },
  {
    cls: "shadow-2xl",
    token: "--shadow-2xl",
    use: "The heaviest elevation — full-screen takeover surfaces. Rare by design.",
  },
]

export function ShadowsPage() {
  return (
    <div className="mx-auto max-w-3xl pb-16">
      <h1 className="text-3xl font-semibold tracking-tight">Shadows</h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        The elevation scale of record is <strong>Tailwind's shadow scale</strong>,
        used as-is — seven steps from a hairline lift to a full takeover.
        Elevation is chosen by meaning, not by taste: the higher a surface
        floats above the page, the higher its step.
      </p>

      <div className="mt-10 flex flex-col gap-3">
        {STEPS.map((s) => (
          <div
            key={s.cls}
            className="border-border flex items-center gap-6 rounded-xl border p-5"
          >
            <div className="bg-muted/40 flex h-24 w-40 shrink-0 items-center justify-center rounded-lg">
              <div className={`bg-card h-12 w-24 rounded-md ${s.cls}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-3">
                <code className="font-mono text-sm font-medium">{s.cls}</code>
                <code className="text-muted-foreground font-mono text-xs">
                  {s.token}
                </code>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{s.use}</p>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-10" />

      <div className="text-muted-foreground flex flex-col gap-2 text-sm leading-relaxed">
        <p>
          <strong className="text-foreground">
            A shadow is a step, never a literal.
          </strong>{" "}
          Components use the utilities (`shadow-sm`, `shadow-lg`); a
          hand-written box-shadow has no place in the Figma sync and no
          meaning on the elevation ladder.
        </p>
        <p>
          Shadows are deliberately <em>not</em> a Foundation config — a
          product's elevation language comes from which steps its surfaces
          use, and those choices live with the components that make them.
        </p>
      </div>
    </div>
  )
}
