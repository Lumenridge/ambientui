import * as React from "react"

import { useAnimationFrame } from "framer-motion"


import { useFoundation } from "@/foundation/foundation-context"

/**
 * STREAMING TEXT — text that arrives rather than appears.
 *
 * Three zones travel with the write head: settled text in the foreground,
 * a warm tail in the ambient accent, and a blurred edge behind a fading
 * mask. The reveal runs on the FRAME CLOCK, not a timer, and derives its
 * position from ELAPSED TIME rather than by counting ticks. A hidden tab
 * pauses the frame loop either way; what this buys is the recovery — coming
 * back, the write head is where the clock says it should be, instead of
 * however far a throttled timer happened to count.
 *
 * `live={false}` renders the whole string settled — history is written,
 * not replayed, so a re-rendered older message never re-types itself.
 */
/** How many characters trail behind the write head, warm then blurred. */
const TAIL = 26
const EDGE = 8

export function StreamingText({
  text,
  live = true,
  charsPerSecond,
  onSettled,
  className,
}: {
  text: string
  live?: boolean
  /**
   * Override the saved pace (config.components.streamCharsPerSecond). The
   * default reads as deliberate writing, not a printer.
   */
  charsPerSecond?: number
  onSettled?: () => void
  className?: string
}) {
  // THE COMPONENT-LAYER CONFIG: the pace is a saved product decision, so the
  // prop is an override, not the source of truth. Same rule as the orb's
  // palette — the rail edits the theme, the theme drives every instance.
  const { config } = useFoundation()
  const cps = charsPerSecond ?? config.components.streamCharsPerSecond
  const [shown, setShown] = React.useState(() => (live ? 0 : text.length))
  const settledRef = React.useRef(!live)
  const onSettledRef = React.useRef(onSettled)
  // the frame loop calls this without re-subscribing; refreshed after commit
  React.useEffect(() => {
    onSettledRef.current = onSettled
  })
  const startRef = React.useRef<number | null>(null)

  useAnimationFrame((t) => {
    if (settledRef.current || !live) return
    if (startRef.current === null) startRef.current = t
    const next = Math.min(
      text.length,
      Math.floor(((t - startRef.current) / 1000) * cps)
    )
    setShown(next)
    if (next >= text.length) {
      settledRef.current = true
      window.setTimeout(() => onSettledRef.current?.(), 400)
    }
  })

  const done = shown >= text.length

  return (
    <span className={className}>
      {text.slice(0, done ? text.length : Math.max(0, shown - TAIL))}
      {!done && (
        <>
          <span className="ambient-stream-warm">
            {text.slice(Math.max(0, shown - TAIL), Math.max(0, shown - EDGE))}
          </span>
          <span className="ambient-stream-edge">
            {text.slice(Math.max(0, shown - EDGE), shown)}
          </span>
          <span className="bg-primary ms-0.5 inline-block h-3.5 w-0.5 animate-pulse align-middle" />
        </>
      )}
    </span>
  )
}
