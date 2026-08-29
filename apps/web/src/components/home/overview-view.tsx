import * as React from "react"

import { motion } from "framer-motion"

import { Button } from "@ambientui/ui/components/button"
import { Icon } from "@ambientui/ui/components/icon"
import { useMotionSpring, useMotionTransition } from "@ambientui/foundation"
import { useAssistant } from "ambientui/assistant-context"
import { OrbCharacter, OrbField } from "ambientui/orb-character"

/**
 * OVERVIEW — the front door as a single held breath: the wordmark, the
 * ground, the presence. Nothing else.
 *
 * THE WORDMARK IS THE IDENTITY AT IDENTITY SCALE. The glyphs are filled
 * with the live heat field (OrbField riding the layer's real orbState, so
 * the name breathes, listens, and thinks with the assistant), and the
 * character itself sits in the wordmark as the dot of the i — the text is
 * set with a dotless ı and the orb takes the dot's place. This is the one
 * page where the mark is the subject rather than chrome, which is what
 * the identity-scale cost rule exists to allow (sanctioned in DESIGN.md
 * §12; the shader surface count is unchanged — these are the identity's
 * own bodies, driven by the same state machine).
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
              {/* dotless ı — the character takes the dot's place */}
              <text
                x="320"
                y="114"
                textAnchor="middle"
                fontSize="118"
                fontWeight="500"
                letterSpacing="-0.03em"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {"Ambıent UI"}
              </text>
            </clipPath>
          </defs>
          {/* a quiet role-gradient underlay, so the name never goes blank
              while the shader warms up (or where WebGL is missing) */}
          <g clipPath="url(#wordmark-clip)">
            <rect width="640" height="150" fill="var(--muted-foreground)" opacity="0.3" />
            <foreignObject x="0" y="0" width="640" height="150">
              <OrbField
                state={orbState}
                strength="stage"
                className="h-full w-full"
              />
            </foreignObject>
          </g>
          {/* the identity, sitting as the dot of the ı */}
          <foreignObject x="257" y="14" width="40" height="40">
            <OrbCharacter size={40} state={orbState} />
          </foreignObject>
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
