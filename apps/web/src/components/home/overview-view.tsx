import * as React from "react"

import { motion } from "framer-motion"

import { Button } from "@ambientui/ui/components/button"
import { Icon } from "@ambientui/ui/components/icon"
import { useMotionSpring, useMotionTransition } from "@ambientui/foundation"
import { useAssistant } from "ambientui/assistant-context"
import { OrbHeat } from "ambientui/orb-character"

/**
 * OVERVIEW — the front door as a single held breath: the wordmark, the
 * ground, the presence. Nothing else.
 *
 * THE WORDMARK IS THE IDENTITY AT IDENTITY SCALE. The glyphs are filled
 * with the orb's EXACT shader — OrbHeat, the character's own heat engine,
 * springs, palette, and circle image, unwrapped from the glass shell —
 * rendered as a full circle behind the text band, so the clip shows the
 * rim's slice sweeping through the glyphs, riding the layer's real
 * orbState. The name breathes, listens, and thinks with the assistant.
 * This is the one page where the mark is the subject rather than chrome
 * (sanctioned in DESIGN.md §12); the character itself stays where it
 * lives — the resting orb — one character per surface.
 *
 * Drawn as SVG so the mark scales like the graphic it is: the type scale
 * governs text, and a wordmark is a drawing of a name. The clip text uses
 * the Foundation's configured font family, so the mark re-typesets with
 * the theme like everything else.
 *
 * The one control is the arrow at the bottom — the reference's scroll
 * cue, made honest: it opens the Architecture, because that is where
 * reading on leads. Placed above bottom-center, which the resting orb
 * owns.
 */
export function OverviewView({
  onNavigate,
}: {
  onNavigate: (view: string) => void
}) {
  const { setPageIntel, orbState } = useAssistant()
  const spring = useMotionSpring()
  const micro = useMotionTransition("micro")

  React.useEffect(() => {
    setPageIntel({
      suggestions: [
        "What is ambientui?",
        "How do I install the ambient layer?",
        "What is design architecture?",
      ],
      askPlaceholder: "Ask about ambientui…",
    })
    return () => setPageIntel(null)
  }, [setPageIntel])

  return (
    <div className="from-muted to-background relative flex min-h-full items-center justify-center bg-gradient-to-b">
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, opacity: micro }}
        className="w-full px-6"
      >
        <span className="sr-only">Ambient UI</span>
        <svg
          viewBox="0 0 640 150"
          aria-hidden
          className="mx-auto block w-full select-none"
        >
          <defs>
            <clipPath id="wordmark-clip">
              <text
                x="320"
                y="114"
                textAnchor="middle"
                fontSize="118"
                fontWeight="500"
                letterSpacing="-0.03em"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {"Ambient UI"}
              </text>
            </clipPath>
          </defs>
          {/* a quiet role-gradient underlay, so the name never goes blank
              while the shader warms up (or where WebGL is missing) */}
          <g clipPath="url(#wordmark-clip)">
            <rect width="640" height="150" fill="var(--muted-foreground)" opacity="0.3" />
            {/* the character's full circle, its TOP cap under the text —
                a circle's rim crosses a mid-band at only two points, but
                along the cap the arc sweeps through the whole name */}
            <foreignObject x="0" y="-10" width="640" height="640">
              <OrbHeat
                state={orbState}
                width={640}
                height={640}
                className="h-full w-full"
              />
            </foreignObject>
          </g>
        </svg>
      </motion.h1>

      {/* bottom-20, not bottom-10: the resting orb owns bottom-center */}
      <div className="absolute inset-x-0 bottom-20 flex justify-center">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Read the architecture"
          onClick={() => onNavigate("architecture")}
          className="text-muted-foreground hover:text-foreground rounded-full"
        >
          <Icon name="chevron-down" size={16} />
        </Button>
      </div>
    </div>
  )
}
