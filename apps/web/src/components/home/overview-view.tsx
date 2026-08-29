import * as React from "react"

import { motion } from "framer-motion"

import { Button } from "@ambientui/ui/components/button"
import { Icon, type IconName } from "@ambientui/ui/components/icon"
import { useMotionSpring, useMotionTransition } from "@ambientui/foundation"
import { useAssistant } from "ambientui/assistant-context"

import { withBase } from "@/base"
import { CommandLine } from "@/components/command-line"

/**
 * OVERVIEW — the front door. One screen that says what ambientui is, hands
 * over the install command, and opens the doors: the architecture (the
 * article), the dev tool (the layer at work), the canvas (the quiet claim),
 * and the design system itself at /ds.
 *
 * It is a landing, not a document: no contents column, no sections — the
 * article lives behind the Architecture door. Everything here is vocabulary
 * and tokens on the ambient grid, and the layer is live on the page, which
 * is the only demo the hero needs.
 */

const DOORS: {
  view: string
  icon: IconName
  title: string
  desc: string
}[] = [
  {
    view: "architecture",
    icon: "ruler",
    title: "The architecture",
    desc: "Stop AI drift: the philosophy, the four steps, and the porting kit — the whole argument as a follow-along article.",
  },
  {
    view: "devtool",
    icon: "code",
    title: "The dev tool",
    desc: "An editor with the assistant docked beside real work — context, composed answers, reviewable diffs.",
  },
  {
    view: "canvas",
    icon: "image",
    title: "The canvas",
    desc: "Nothing but the presence. The quiet claim, with no product to hide behind.",
  },
]

const openDs = () => {
  window.history.pushState(null, "", withBase("/ds"))
  window.dispatchEvent(new PopStateEvent("popstate"))
}

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
    <div className="ambient-grid relative flex min-h-full items-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, opacity: micro }}
        className="mx-auto w-full max-w-2xl px-6 py-16"
      >
        <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          ambientui
        </p>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
          An AI layer that inherits your design system
        </h1>
        <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-relaxed">
          One presence above your product: it knows where you are, answers
          with your own components, and wears your theme because it never
          carried its own. Underneath it, an architecture that lets AI build
          at full speed without drifting.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button onClick={() => onNavigate("architecture")}>
            Read: Stop AI drift
          </Button>
          <Button variant="ghost" onClick={openDs}>
            Open the design system
            <Icon name="arrow-up-right" size={14} />
          </Button>
        </div>

        <CommandLine
          className="mt-6"
          command="npx shadcn add https://lumenridge.github.io/ambientui/r/ambient-layer.json"
        />

        {/* the doors — each one a view of the same argument */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {DOORS.map((d) => (
            <button
              key={d.view}
              type="button"
              onClick={() => onNavigate(d.view)}
              className="group border-border bg-card hover:border-foreground/20 flex flex-col gap-2 rounded-xl border p-4 text-start transition-colors"
            >
              <span className="text-muted-foreground flex items-center justify-between">
                <Icon name={d.icon} size={16} />
                <Icon
                  name="chevron-right"
                  size={14}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                />
              </span>
              <span className="text-sm font-medium">{d.title}</span>
              <span className="text-muted-foreground text-xs leading-relaxed">
                {d.desc}
              </span>
            </button>
          ))}
        </div>

        <p className="text-muted-foreground mt-10 text-xs">
          MIT · Built on shadcn/ui and Tailwind CSS · The layer is live on
          this page — press{" "}
          <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">
            ⌘K
          </kbd>{" "}
          or drag the orb.
        </p>
      </motion.div>
    </div>
  )
}
