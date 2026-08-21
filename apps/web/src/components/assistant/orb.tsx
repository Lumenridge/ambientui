import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

import { useFoundation } from "@/foundation/foundation-context"

import { useAssistant, type OrbAnchor } from "./assistant-context"
import { OrbCharacter } from "./orb-character"

const ORB = 52
/* One uniform inset on every edge — the eight anchors sit at the true
   corners and edge midpoints of the viewport. */
const MARGIN = 12
const ANCHORS: OrbAnchor[] = ["tl", "tc", "tr", "ml", "mr", "bl", "bc", "br"]

function anchorPoint(a: OrbAnchor, w: number, h: number) {
  const xs = { l: MARGIN, c: (w - ORB) / 2, r: w - ORB - MARGIN }
  const ys = { t: MARGIN, m: (h - ORB) / 2, b: h - ORB - MARGIN }
  const map: Record<OrbAnchor, { x: number; y: number }> = {
    tl: { x: xs.l, y: ys.t },
    tc: { x: xs.c, y: ys.t },
    tr: { x: xs.r, y: ys.t },
    ml: { x: xs.l, y: ys.m },
    mr: { x: xs.r, y: ys.m },
    bl: { x: xs.l, y: ys.b },
    bc: { x: xs.c, y: ys.b },
    br: { x: xs.r, y: ys.b },
  }
  return map[a]
}

/**
 * The floating AI orb — collapsed state of the assistant. Carries the page
 * context, can be dragged anywhere in the window, and snaps to 8 edge anchors.
 */
export function AssistantOrb() {
  const { orbAnchor, setOrbAnchor, setMode, orbState } = useAssistant()
  const { config } = useFoundation()
  const [drag, setDrag] = React.useState<{ x: number; y: number; moved: boolean } | null>(null)
  // Ref mirror so pointerup never reads a stale closure (fast flicks, synthetic events)
  const dragRef = React.useRef<typeof drag>(null)
  const [, bump] = React.useReducer((c: number) => c + 1, 0)

  const applyDrag = (d: typeof drag) => {
    dragRef.current = d
    setDrag(d)
  }

  React.useEffect(() => {
    window.addEventListener("resize", bump)
    return () => window.removeEventListener("resize", bump)
  }, [])

  const w = window.innerWidth
  const h = window.innerHeight
  const pos = drag
    ? { x: drag.x - ORB / 2, y: drag.y - ORB / 2 }
    : anchorPoint(orbAnchor, w, h)

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // synthetic events have no active pointer — dragging still works via move/up
    }
    applyDrag({ x: e.clientX, y: e.clientY, moved: false })
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    applyDrag({
      x: e.clientX,
      y: e.clientY,
      moved: d.moved || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4,
    })
  }
  const onPointerUp = () => {
    const d = dragRef.current
    if (!d) return
    if (!d.moved) {
      applyDrag(null)
      // click → the chat interface; ⌘K is the explicit path to the palette
      setMode("panel")
      return
    }
    const cx = d.x
    const cy = d.y
    let best: OrbAnchor = orbAnchor
    let bestDist = Infinity
    for (const a of ANCHORS) {
      const p = anchorPoint(a, w, h)
      const dist = Math.hypot(p.x + ORB / 2 - cx, p.y + ORB / 2 - cy)
      if (dist < bestDist) {
        bestDist = dist
        best = a
      }
    }
    setOrbAnchor(best)
    applyDrag(null)
  }

  return (
    <>
      {/* snap-zone hints while dragging */}
      {drag?.moved &&
        ANCHORS.map((a) => {
          const p = anchorPoint(a, w, h)
          return (
            <span
              key={a}
              className="border-muted-foreground/40 fixed z-40 rounded-full border border-dashed"
              style={{ left: p.x + 8, top: p.y + 8, width: ORB - 16, height: ORB - 16 }}
            />
          )
        })}
      <div
        className={cn("fixed z-50 touch-none select-none", !drag && "transition-all duration-300")}
        style={{ left: pos.x, top: pos.y, width: ORB, height: ORB }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
          <button
            type="button"
            aria-label="Open ambientui"
            className={cn(
              "flex items-center justify-center rounded-full shadow-lg shadow-black/30",
              drag?.moved ? "cursor-grabbing" : "cursor-grab"
            )}
            style={{ width: ORB, height: ORB }}
          >
            <OrbCharacter
              state={orbState}
              size={ORB}
              colors={config.orb.useAccent ? undefined : config.orb.colors}
              speeds={config.orb.speeds}
            />
          </button>
      </div>
    </>
  )
}
