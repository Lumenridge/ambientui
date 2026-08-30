"use client"

import * as React from "react"

import { cn } from "@ambientui/ui/lib/utils"

/**
 * THE FRAME THAT MAKES A SURFACE LOCAL.
 *
 * Extracted from the overview when /ds/form-factors needed the same thing.
 * It is not a stylistic wrapper: the layer's surfaces are `position: fixed`,
 * and a fixed element resolves against its nearest TRANSFORMED ancestor, so
 * this box is what makes an embedded dock dock to the demo rather than to
 * the browser window. Any page that wants to show the layer without handing
 * it the whole viewport needs this, which is why it now lives here instead
 * of inside one page's file.
 *
 * The chrome's caption is a prop rather than a constant, because the
 * overview's fictional product is the overview's, not the frame's.
 */
export function DemoWindow({
  children,
  overlay,
  chrome = true,
  title,
  logicalWidth = 1000,
}: {
  children: React.ReactNode
  overlay?: React.ReactNode
  /** the caption in the title bar, when `chrome` is on */
  title?: string
  /**
   * The browser dressing: title bar and traffic lights. On the film at the
   * top it earns its place — the claim there is "this is your product, and
   * the layer is living in it". In the form sections the claim is narrower
   * (here is what a panel IS), and a window frame around a single surface
   * makes the surface look like a screenshot of an app rather than the
   * component it is.
   *
   * THE BOX ITSELF STAYS EITHER WAY, and is not decoration: the layer's
   * surfaces are position:fixed, and a transformed ancestor is what makes
   * them fixed to THIS frame instead of to the viewport. Remove the box
   * and the dock docks to the browser.
   */
  chrome?: boolean
  /**
   * The width the contents are LAID OUT at before being scaled to fit.
   *
   * A desktop product in a phone-width box has two honest answers: crop it,
   * or shrink it. This is the shrink — the contents render at a laptop
   * measure and the whole frame is scaled down, so a phone sees the same
   * composition a desktop does rather than a slice of it. Nothing inside
   * has to know: the layer keeps sizing itself against a 1000px frame and
   * the transform does the rest.
   *
   * The cost is legibility, and it is not small — at a 359px frame the
   * factor is 0.36, so 14px body text lands near 5px. That is the trade
   * this mode makes: recognisable over readable.
   */
  logicalWidth?: number
}) {
  /**
   * SCALE ONLY WHEN THE BOX IS TOO SMALL. At desktop width the factor
   * clamps to 1 and the contents render normally — no fixed logical width
   * leaving a gap inside a wider frame, and no transform where none is
   * wanted.
   */
  const boxRef = React.useRef<HTMLDivElement | null>(null)
  const [box, setBox] = React.useState<{ w: number; h: number } | null>(null)
  React.useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      if (e) setBox({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const scale = box ? Math.min(1, box.w / logicalWidth) : 1
  const scaled = scale < 0.999 && !!box

  return (
    <div
      className={cn(
        // ONE ASPECT AT EVERY WIDTH, now that the contents scale. The
        // frame went portrait and then 640px tall while it was trying to
        // physically contain a desktop-sized surface; scaling removes that
        // job from the frame, so it can go back to being the same 16:9
        // window everywhere and show the same composition at every size.
        "relative z-10 flex aspect-video w-full transform-gpu flex-col overflow-hidden rounded-2xl",
        chrome
          ? "border-border bg-card border shadow-2xl"
          : // no ground of its own: the surfaces bring their own material,
            // and a card behind them would be the product shell again in
            // everything but name
            "border-border/60 border border-dashed"
      )}
    >
      {chrome && (
        <div className="border-border bg-muted/50 relative flex h-9 shrink-0 items-center justify-center border-b">
          <span className="absolute start-4 flex gap-1.5">
            <span className="bg-muted-foreground/30 size-3 rounded-full" />
            <span className="bg-muted-foreground/30 size-3 rounded-full" />
            <span className="bg-muted-foreground/30 size-3 rounded-full" />
          </span>
          <span className="text-muted-foreground text-xs">
            {title}
          </span>
        </div>
      )}
      <div ref={boxRef} className="relative min-h-0 flex-1">
        {scaled ? (
          // The transform makes THIS the containing block for the layer's
          // fixed surfaces, which is what carries them into the scale with
          // everything else. Height is the box divided by the factor, so
          // the logical page is exactly as tall as the frame can show.
          <div
            className="relative"
            style={{
              width: logicalWidth,
              height: box!.h / scale,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </div>
      {/* the cursor layer stays OUTSIDE the scale: it reads real element
          rects off the page and draws in real pixels, so scaling it would
          send the hand to coordinates that no longer match anything */}
      {overlay}
    </div>
  )
}
