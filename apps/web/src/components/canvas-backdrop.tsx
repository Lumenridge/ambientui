import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import { Icon } from "@workspace/ui/components/icon"
import { cn } from "@workspace/ui/lib/utils"

/**
 * The canvas ground: an abstract gradient behind the ambient layer's frost
 * and grid. Gradients only, and only ones that read as a FIELD OF COLOUR at
 * this scale — the ground sits under glass surfaces carrying text, so
 * anything with a subject, a hard edge or fine detail competes with the UI
 * instead of supporting it. Candidates that loaded fine but failed that test
 * were dropped: pastel colour-blocks (hard edges), ink-in-water (busy at
 * every scale), a starfield, and one that turned out to be a photograph of
 * an office.
 *
 * `tone` is what the ground does to the surfaces on it: `light` grounds lift
 * a dark surface, `deep` ones let a light surface float. Both are kept so
 * the canvas has range in either appearance.
 *
 * Every id was verified to load AND looked at; the set is deliberately small
 * and hand-picked rather than a random feed, so the page cannot surprise a
 * presentation with a busy or off-tone image.
 */

type Backdrop = { id: string; tone: "light" | "deep"; note: string }

const BACKDROPS: Backdrop[] = [
  { id: "1579546929518-9e396f3cc809", tone: "light", note: "soft spectrum wash" },
  { id: "1550859492-d5da9d8e45f3", tone: "light", note: "warm blurred field" },
  { id: "1604079628040-94301bb21b91", tone: "light", note: "amber glow on pale ground" },
  { id: "1557682250-33bd709cbe85", tone: "deep", note: "violet into indigo" },
  { id: "1557682224-5b8590cd9ec5", tone: "deep", note: "crimson into blue" },
  { id: "1620121692029-d088224ddc74", tone: "deep", note: "deep blue liquid folds" },
  { id: "1618005182384-a83a8bd57fbe", tone: "deep", note: "purple and cyan waves" },
]

const src = (b: Backdrop) =>
  `https://images.unsplash.com/photo-${b.id}?w=2400&q=80&auto=format&fit=crop`

export function CanvasBackdrop({ className }: { className?: string }) {
  // one per session by default: a ground that reshuffles on its own reads
  // as a screensaver. Changing it is a deliberate act — the corner control.
  const [index, setIndex] = React.useState(() =>
    Math.floor(Math.random() * BACKDROPS.length)
  )
  const backdrop = BACKDROPS[index]!
  // which backdrop finished loading — not a boolean, because "loaded" is a
  // fact about ONE image. Comparing ids means switching backdrops reports
  // not-loaded without an effect resetting a flag after the fact.
  const [loadedId, setLoadedId] = React.useState<string | null>(null)
  const loaded = loadedId === backdrop.id
  const [hovered, setHovered] = React.useState(false)

  React.useEffect(() => {
    const img = new Image()
    img.onload = () => setLoadedId(backdrop.id)
    img.src = src(backdrop)
  }, [backdrop])

  // preload the next one, so cycling doesn't flash an empty ground
  React.useEffect(() => {
    const next = BACKDROPS[(index + 1) % BACKDROPS.length]!
    const img = new Image()
    img.src = src(next)
  }, [index])

  return (
    // not aria-hidden: the control inside is real UI. The decorative
    // layers carry it individually instead.
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-(--motion-page) ease-(--motion-ease)"
        style={{
          backgroundImage: `url(${src(backdrop)})`,
          opacity: loaded ? 1 : 0,
        }}
      />
      {/* the layer's own frost and lattice sit on top, so surfaces still
          read as glass over a ground rather than over a photograph */}
      <div aria-hidden className="ambient-stage-frost pointer-events-none absolute inset-0" />
      <div aria-hidden className="ambient-grid pointer-events-none absolute inset-0 opacity-40" />

      {/* THE BACKDROP CONTROL — the one configurable thing on the canvas,
          kept in the corner and quiet: the ground is context, not content.
          Reveals its label on hover; the surface is the layer's own glass. */}
      <div className="pointer-events-auto absolute right-4 bottom-4 flex items-center gap-2">
        <span
          className={cn(
            "ambient-glass border-(--glass-border) text-muted-foreground rounded-full border px-2.5 py-1 text-xs transition-opacity duration-(--motion-control) ease-(--motion-ease)",
            hovered ? "opacity-100" : "opacity-0"
          )}
        >
          {backdrop.note}
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Change the backdrop"
          title="Change the backdrop"
          className="ambient-glass border-(--glass-border) text-muted-foreground hover:text-foreground rounded-full border"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => setIndex((i) => (i + 1) % BACKDROPS.length)}
        >
          <Icon name="replay" size={14} />
        </Button>
      </div>
    </div>
  )
}
