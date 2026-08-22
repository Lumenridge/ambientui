import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import { Icon } from "@workspace/ui/components/icon"
import { cn } from "@workspace/ui/lib/utils"

/**
 * The canvas ground: a photographic backdrop behind the ambient layer's
 * frost and grid. Two families only — abstract light and aerial nature —
 * because the ground has to stay legible under glass surfaces: both read
 * as fields of colour at this scale rather than as subjects competing
 * with the UI.
 *
 * Every id below was verified to load; the set is deliberately small and
 * hand-picked rather than a random feed, so the page can't surprise a
 * presentation with a busy or off-tone image.
 */

type Backdrop = { id: string; family: "light" | "aerial"; note: string }

const BACKDROPS: Backdrop[] = [
  { id: "1506744038136-46273834b3fb", family: "aerial", note: "lake and treeline at dusk" },
  { id: "1518495973542-4542c06a5843", family: "light", note: "sunlight through leaves" },
  { id: "1497436072909-60f360e1d4b1", family: "aerial", note: "alpine ridge and mist" },
  { id: "1470071459604-3b5ec3a7fe05", family: "aerial", note: "fog over dark forest" },
  { id: "1439066615861-d1af74d74000", family: "aerial", note: "snowfield and pines" },
  { id: "1500530855697-b586d89ba3ee", family: "light", note: "sky gradient at altitude" },
  { id: "1502082553048-f009c37129b9", family: "aerial", note: "still water and rock" },
  { id: "1447752875215-b2761acb3c5d", family: "aerial", note: "forest canopy in sun" },
  { id: "1465146344425-f00d5f5c8f07", family: "light", note: "blossom against sky" },
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
