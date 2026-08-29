"use client"

import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"


import { cn } from "@ambientui/ui/lib/utils"

import {
  useAmbientRuntime,
  useMotionSpring,
  useMotionTransition,
} from "./ambient-runtime"

import { useAssistant, type OrbAnchor } from "./assistant-context"
import { Icon } from "@ambientui/ui/components/icon"
import { Composer } from "./composer"
import { OrbCharacter } from "./orb-character"

const ORB = 52
/* One uniform inset on every edge — the eight anchors sit at the true
   corners and edge midpoints of the viewport. */
const MARGIN = 12
const ANCHORS: OrbAnchor[] = ["tl", "tc", "tr", "ml", "mr", "bl", "bc", "br"]

/** The region an opened ambient surface centers on: the page's content area. */
function measureZone(): DOMRect | null {
  const el = document.querySelector("main")
  return el ? el.getBoundingClientRect() : null
}

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
  const {
    orbAnchor,
    setOrbAnchor,
    setMode,
    orbState,
    setOrbState,
    seedPrompt,
    pageIntel,
  } = useAssistant()
  const runtime = useAmbientRuntime()
  const microT = useMotionTransition("micro")
  const spring = useMotionSpring()
  // QUICK ASK — the orb's own expanded form: hovering grows an input out of
  // the character, anchored to it, so a question costs no surface and no
  // travel. Leaving with an empty field collapses it back.
  const [quick, setQuick] = React.useState(false)
  const [quickInput, setQuickInput] = React.useState("")
  const quickRef = React.useRef<HTMLInputElement>(null)
  const closeTimer = React.useRef<number | null>(null)

  const openQuick = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    // measure before the first render, or the opening frame centers on the
    // viewport and then jumps to the content region
    setZone(measureZone())
    setQuick(true)
    setOrbState("listening")
    window.setTimeout(() => quickRef.current?.focus(), 60)
  }
  const closeQuick = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    if (askingRef.current) return
    setQuick(false)
    setQuickInput("")
    setOrbState("still")
  }
  const [asking, setAsking] = React.useState(false)
  const askingRef = React.useRef(false)
  // read from pointer handlers subscribed once; refreshed after commit
  React.useEffect(() => {
    askingRef.current = asking
  })
  const sendQuick = (override?: string) => {
    const text = (override ?? quickInput).trim()
    if (!text || asking) return
    // The pill holds the thinking beat itself — the question stays where it
    // was asked, the character churns in place — and hands over to the panel
    // at the moment there is an answer to hold.
    setAsking(true)
    setOrbState("thinking")
    window.setTimeout(() => {
      seedPrompt(text, true, true)
      setMode("panel")
      setQuickInput("")
      setQuick(false)
      setAsking(false)
    }, 1100)
  }
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

  // THE ORB MEASURES ITS CONTAINING BLOCK, not the window. An embedded
  // layer (a product demo framed inside another page) scopes its fixed
  // surfaces to a transformed ancestor; positioning from the viewport
  // there puts the orb past the frame's edge, half-clipped. offsetParent
  // of a fixed element IS that containing block — and null means the
  // viewport, where the window numbers are the truth.
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [frame, setFrame] = React.useState<{ w: number; h: number } | null>(
    null
  )
  React.useLayoutEffect(() => {
    const parent = rootRef.current?.offsetParent as HTMLElement | null
    if (!parent) return
    const measure = () =>
      setFrame({ w: parent.clientWidth, h: parent.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [])

  const w = frame?.w ?? window.innerWidth
  const h = frame?.h ?? window.innerHeight
  // The opened form is a SURFACE, so it centers on the CONTENT REGION it
  // opens over — the page's main area, not the raw viewport — so a rail or
  // an inspector on the side doesn't push it off-center. The orb travels
  // there on the page role and returns to its anchor on close.
  const QUICK_W = 420
  const [zone, setZone] = React.useState<DOMRect | null>(null)
  // re-measure on resize while open; the open itself measures synchronously
  // (see openQuick) so the first frame is already centered
  React.useEffect(() => {
    if (!quick) return
    setZone(measureZone())
  }, [quick, w, h])

  // Opening does not relocate the assistant — it stays in the zone it is
  // docked to. The form simply CENTERS on that zone's anchor instead of
  // hanging off the orb's edge, clamped so it never leaves the content
  // region.
  const anchored = anchorPoint(orbAnchor, w, h)
  const bounds = zone ?? { left: 0, right: w, top: 0, bottom: h }
  // The orb keeps its side: docked right, it is the RIGHT end of the form
  // and the input extends leftward — the character never crosses the screen
  // to open.
  const growsLeft = orbAnchor.endsWith("r")

  // the form centers on the zone's anchor, clamped into the content region…
  const formLeft = Math.round(
    Math.min(
      Math.max(anchored.x + ORB / 2 - QUICK_W / 2, bounds.left + MARGIN),
      bounds.right - QUICK_W - MARGIN
    )
  )
  const pos = drag
    ? { x: drag.x - ORB / 2, y: drag.y - ORB / 2 }
    : quick
      ? {
          // …and the orb sits at whichever end of it matches its side
          x: growsLeft ? formLeft + QUICK_W - ORB : formLeft,
          y: anchored.y,
        }
      : anchored

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
      // click → quick ask, right here; asking promotes to the panel, and
      // ⌘K remains the explicit path to the palette
      if (quickRef.current?.value || quick) closeQuick()
      else openQuick()
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

  // Click opens it, so a click elsewhere closes it — the surface is
  // deliberate now, not something the pointer brushes past.
  React.useEffect(() => {
    if (!quick) return
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement
      if (!el.closest("[data-quick-ask]")) closeQuick()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeQuick()
    }
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [quick])


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
        ref={rootRef}
        className={cn(
          "fixed z-50 touch-none select-none",
          // snap-to-anchor rides the page role — the largest ambient move
          !drag && "transition-all duration-(--motion-page) ease-(--motion-ease)"
        )}
        style={{ left: pos.x, top: pos.y, width: ORB, height: ORB }}
        data-quick-ask
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
          <button
            type="button"
            aria-label="Open ambientui"
            className={cn(
              "relative z-10 flex items-center justify-center rounded-full shadow-lg shadow-black/30",
              drag?.moved ? "cursor-grabbing" : "cursor-grab"
            )}
            style={{ width: ORB, height: ORB }}
          >
            <OrbCharacter
              state={orbState}
              size={ORB}
              colors={runtime.orb.useAccent ? undefined : runtime.orb.colors}
              speeds={runtime.orb.speeds}
            />
          </button>

          {/* QUICK ASK: the input grows out of the orb, on the side with
              room, and shares its glass — one object, not two. */}
          <AnimatePresence>
            {quick && !drag?.moved && (
              <motion.div
                key="quick"
                className={cn(
                  "ambient-glass ambient-live-border absolute top-1/2 flex items-center gap-2 rounded-full border border-(--glass-border) shadow-lg shadow-black/25",
                  growsLeft ? "right-0" : "left-0"
                )}
                data-orb-state={orbState}
                style={{
                  y: "-50%",
                  originX: growsLeft ? 1 : 0,
                  // the orb sits INSIDE the pill: match its height and clear
                  // its diameter on the side it grows from
                  height: ORB,
                  paddingInlineStart: growsLeft ? 18 : ORB + 6,
                  paddingInlineEnd: growsLeft ? ORB + 6 : 18,
                }}
                initial={{ width: ORB, opacity: 0 }}
                animate={{ width: QUICK_W, opacity: 1 }}
                exit={{ width: ORB, opacity: 0, transition: microT }}
                transition={{ ...spring, opacity: microT }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {asking ? (
                  <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
                    {quickInput}
                  </span>
                ) : (
                  // THE ONE COMPOSER, quick variant: the pill supplies the
                  // glass and the height, this supplies everything touched
                  <Composer
                    variant="quick"
                    inputRef={quickRef}
                    value={quickInput}
                    onChange={setQuickInput}
                    onSend={() => sendQuick()}
                    onEscape={closeQuick}
                    placeholder="Ask ambientui…"
                    // what this page thinks is worth doing next; Tab runs it
                    suggestion={pageIntel?.suggestions?.[0]}
                    onAcceptSuggestion={() => {
                      const next = pageIntel?.suggestions?.[0]
                      if (next) {
                        setQuickInput(next)
                        sendQuick(next)
                      }
                    }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* THE RECORD, beside the object rather than inside it. The pill is
              one thing — the character and the field it grew — so a second
              control in there would make it two. This sits alongside, on the
              side the pill did not take, and only while the pill is open. */}
          <AnimatePresence>
            {quick && !drag?.moved && !asking && (
              <motion.button
                key="quick-history"
                type="button"
                aria-label="History"
                title="History"
                onClick={() => {
                  closeQuick()
                  setMode("history")
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="ambient-glass text-muted-foreground hover:text-foreground absolute top-1/2 flex items-center justify-center rounded-full border border-(--glass-border) shadow-lg shadow-black/25"
                // Sized to the ORB, so the two round objects on this row read
                // as the same kind of thing. Cleared past the PILL, not the
                // orb: both are absolute in the same wrapper, so "beside the
                // object" has to be measured from the object's own width.
                style={{
                  y: "-50%",
                  height: ORB,
                  width: ORB,
                  ...(growsLeft
                    ? { right: QUICK_W + 8 }
                    : { left: QUICK_W + 8 }),
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: microT }}
                transition={{ ...spring, opacity: microT }}
              >
                <Icon name="history" size={18} />
              </motion.button>
            )}
          </AnimatePresence>
      </div>
    </>
  )
}
