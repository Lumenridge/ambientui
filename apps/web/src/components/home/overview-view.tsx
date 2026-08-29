import * as React from "react"

import { motion } from "framer-motion"

import { Button } from "@ambientui/ui/components/button"
import { Icon } from "@ambientui/ui/components/icon"
import { useMotionSpring, useMotionTransition } from "@ambientui/foundation"
import { useAssistant } from "ambientui/assistant-context"

/**
 * OVERVIEW — the front door as a single held breath: the wordmark, the
 * ground, the presence. Nothing else.
 *
 * The reference (a giant, low-contrast centered wordmark on a soft
 * gradient) is answered with configuration, not styling: the ground is a
 * gradient between two surface roles, the wordmark is the foreground role
 * fading through opacity steps via clipped gradient text, and the type
 * sits on the top steps of the scale of record (8xl/9xl — the nearest
 * legal sizes to the reference's viewport-scale mark). The layer is live
 * on the page, which is the entire pitch: press ⌘K, or drag the orb.
 *
 * The one control is the arrow at the bottom — the reference's scroll
 * cue, made honest: here it opens the Architecture, because that is where
 * reading on leads.
 */
export function OverviewView({
  onNavigate,
}: {
  onNavigate: (view: string) => void
}) {
  const { setPageIntel } = useAssistant()
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
        className="from-foreground/60 to-foreground/15 bg-gradient-to-b bg-clip-text text-center text-8xl font-medium tracking-tight text-transparent select-none sm:text-9xl"
      >
        Ambient UI
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
