"use client"

import * as React from "react"

import { useFoundation } from "@ambientui/foundation"

/**
 * The Translucency page: every alpha in the system, as tokens. Each swatch
 * renders over a live specimen (the accent gradient below), because a
 * translucent value is meaningless on a flat ground — you have to see what
 * it lets through.
 */

const TOKENS: {
  token: string
  label: string
  derives: string
  paints: string
}[] = [
  {
    token: "--glass-fill",
    label: "Glass body",
    derives: "popover 55%",
    paints:
      "The body of every AI surface — palette, panel, dock, bar. Paired with the blur in .ambient-glass.",
  },
  {
    token: "--glass-core",
    label: "Glass core",
    derives: "popover 60%",
    paints:
      "The orb's shell and its CSS twin: the same glass, sized for an object rather than a surface.",
  },
  {
    token: "--glass-border",
    label: "Glass hairline",
    derives: "border 70%",
    paints:
      "Edges and dividers on glass, where a full-strength border reads as a drawn line rather than a seam.",
  },
  {
    token: "--glass-wash",
    label: "Wash on glass",
    derives: "foreground 9%",
    paints:
      "Neutral fills ON glass: palette selection and hover, keycap chips, the answer object's card. Neutral, not accent — on glass the accent marks actions, not focus position.",
  },
  {
    token: "--wash",
    label: "Quiet wash",
    derives: "accent 40%",
    paints:
      "The soft accent fill at rest: selected config cards, subtle chips, secondary surfaces on solid ground.",
  },
  {
    token: "--wash-strong",
    label: "Active wash",
    derives: "accent 60%",
    paints: "The same fill under hover or when a control is active.",
  },
  {
    token: "--positive-wash",
    label: "Positive wash",
    derives: "positive 12%",
    paints:
      "The tint behind anything that succeeded — added diff lines, a kept hunk, a passing run.",
  },
  {
    token: "--destructive-wash",
    label: "Failure wash",
    derives: "destructive 12%",
    paints:
      "Its twin: removed diff lines, a stopped generation, a tool error's quoted output.",
  },
  {
    token: "--scrim",
    label: "Scrim",
    derives: "background 50%",
    paints:
      "Translucent covers over content — the drag zones that appear while a surface is being moved.",
  },
  {
    token: "--glass-veil",
    label: "Field veil",
    derives: "popover 62%",
    paints:
      "The frost BETWEEN a surface's heat field and its content (.ambient-field-frost) — it blurs the field, not the page, so the identity glows through without touching legibility.",
  },
  {
    token: "--glass-veil-stage",
    label: "Stage veil",
    derives: "popover 32%",
    paints:
      "The thin veil over a field that IS the ground (.ambient-stage-frost) — the canvas page, presentations. Thinner, so color carries across a room.",
  },
]

const RECIPES: { name: string; body: string }[] = [
  {
    name: ".ambient-glass",
    body: "--glass-fill over blur(--ambient-blur) saturate(1.5). The one glass recipe: every AI surface wears it, and no ambient surface may define its own blur.",
  },
  {
    name: ".ambient-field-frost",
    body: "--glass-veil over the same blur. Sits between a heat field and surface content.",
  },
  {
    name: ".ambient-stage-frost",
    body: "--glass-veil-stage over half that blur, saturated further. For a field used as a page ground.",
  },
]

function Specimen({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border relative h-28 overflow-hidden rounded-xl border">
      {/* the ground a translucent value has to be judged against */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, var(--primary) 0%, var(--color-white) 45%, var(--primary) 100%)",
        }}
      />
      <div
        aria-hidden
        className="text-foreground/70 absolute inset-0 flex items-center justify-center text-xs"
      >
        content behind
      </div>
      {children}
    </div>
  )
}

export function TranslucencyPage() {
  const { config } = useFoundation()

  /**
   * THE LIVE BLUR RADIUS, READ AFTER LAYOUT — never in the render body.
   * `getComputedStyle` during render is a read of the very DOM React is
   * still describing, and it does not exist at all during a prerender.
   *
   * It is measured rather than taken from the config because this page is
   * an inspector: it reports what the running document actually resolves,
   * so a value the Foundation failed to apply shows up here as itself.
   * `--ambient-blur` is re-read whenever the config changes, since that is
   * what can change it.
   */
  const readBlur = () =>
    typeof window === "undefined"
      ? null
      : getComputedStyle(document.documentElement)
          .getPropertyValue("--ambient-blur")
          .trim() || null
  const [blur, setBlur] = React.useState<string | null>(readBlur)
  React.useEffect(() => {
    // NEXT FRAME, deliberately: the Foundation writes its style tag from an
    // effect too, so reading synchronously here would report the value it
    // is in the middle of replacing.
    const id = requestAnimationFrame(() => setBlur(readBlur()))
    return () => cancelAnimationFrame(id)
  }, [config])

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <h1 className="text-xl font-semibold">Translucency</h1>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        Every alpha in the system is one of these tokens — no raw opacity
        modifiers (<code className="font-mono text-xs">/40</code>), no ad-hoc{" "}
        <code className="font-mono text-xs">color-mix</code> in component
        code. Each derives from a semantic role, so the role map re-tints
        them like everything else: the glass follows{" "}
        <code className="font-mono text-xs">--popover</code>, the washes
        follow the accent, the scrim follows the background.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            The tokens
          </div>
          <div className="border-border divide-border bg-card divide-y rounded-xl border">
            {TOKENS.map((t) => (
              <div
                key={t.token}
                className="grid grid-cols-[1fr_140px] items-center gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {t.paints}
                  </div>
                  <div className="text-muted-foreground/80 mt-1 font-mono text-xs">
                    {t.token} · {t.derives}
                  </div>
                </div>
                {/* the value over a specimen, so the alpha is visible */}
                <div className="border-border h-12 overflow-hidden rounded-lg border">
                  <div
                    className="relative h-full w-full"
                    style={{
                      background:
                        "linear-gradient(115deg, var(--primary), var(--color-white))",
                    }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: `var(${t.token})` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            The glass recipes
          </div>
          <p className="text-muted-foreground mb-3 text-sm">
            A tint alone is not glass — it is a tint. Glass is a token plus a
            backdrop blur, and the blur radius is itself one token (
            <code className="font-mono text-xs">--ambient-blur</code>,
            currently{" "}
            {/* a fixed-width slot: the value arrives one frame late, and a
                sentence that reflows as it lands reads as a glitch */}
            <span className="inline-block min-w-14 font-mono text-xs">
              {blur ?? "…"}
            </span>
            ). These three classes are the only legal combinations.
          </p>
          <div className="flex flex-col gap-3">
            {RECIPES.map((r) => (
              <div key={r.name}>
                <Specimen>
                  <div className={`${r.name.slice(1)} absolute inset-0`} />
                  <div className="text-foreground absolute inset-0 flex items-center justify-center font-mono text-xs">
                    {r.name}
                  </div>
                </Specimen>
                <p className="text-muted-foreground mt-1.5 text-xs">{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            The rule
          </div>
          <div className="text-muted-foreground flex flex-col gap-2 text-sm leading-relaxed">
            <p>
              <strong className="text-foreground">
                A look that exists as a class is configurable; a look that
                exists as scattered utilities is folklore.
              </strong>{" "}
              These eleven tokens replaced roughly thirty inline alpha
              expressions — every one of which had been an invisible design
              decision nobody could find or change.
            </p>
            <p>
              Reaching for <code className="font-mono text-xs">/50</code> or a
              new <code className="font-mono text-xs">color-mix</code> in a
              component is a governance event: either an existing token fits,
              or the set grows deliberately and is documented here.
            </p>
            <p>
              Because every token derives from a role, translucency follows the
              theme automatically — the current accent (
              <strong className="text-foreground">{config.accent}</strong>) and
              gray family (
              <strong className="text-foreground">{config.gray}</strong>) are
              already in the swatches above.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
