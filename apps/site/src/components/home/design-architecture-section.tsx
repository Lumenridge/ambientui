import * as React from "react"

import { Button } from "@ambientui/ui/components/button"
import { Icon } from "@ambientui/ui/components/icon"
/**
 * WHAT THIS REPO IS BUILT ON — the section before the commands.
 *
 * A visitor who reaches the install block without this has been shown an
 * assistant and then handed four commands, with nothing said about the
 * thing underneath that makes the assistant behave. The layer is the
 * demand; design architecture is the supply, and the order matters: the
 * Foundation and the Figma engine only make sense once you know they are
 * two projections of one value store rather than two features.
 *
 * IT MAKES THE ARGUMENT IN WORDS, NOT COUNTS. It carried the Foundation's
 * accent/gray/radius/motion tallies read live from the token module, which
 * was honest but answered a question nobody had arrived with: a stranger
 * meeting "design architecture" for the first time needs the idea, and the
 * exact size of the configuration space is what /ds is for. The paper made
 * this argument at length and the site was repeating none of it where a
 * visitor would see it; that gap is what this section closes.
 */

/** One point, stated once. */
function Point({
  label,
  title,
  children,
}: {
  label: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border-border border-t pt-6">
      <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
        {label}
      </p>
      <h3 className="mt-2.5 text-base font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
        {children}
      </p>
    </div>
  )
}

export function DesignArchitectureSection({
  onRead,
}: {
  /** Take the reader to the paper this section summarises. */
  onRead: () => void
}) {
  return (
    <div>
      <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
        What it is built on
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        Design architecture
      </h2>
      <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-relaxed">
        The assistant is not the point. It is the proof. Underneath it is{" "}
        <span className="text-foreground font-medium">design architecture</span>
        , the framework the Lumenridge team builds with: a design system is a
        list of what you have, and an architecture decides what happens when
        one of those things changes. Everything you can install below came
        out of it.
      </p>

      <Button variant="outline" size="sm" className="mt-5" onClick={onRead}>
        Read the argument in full
        <Icon name="chevron-right" size={15} />
      </Button>

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        <Point
          label="The change"
          title="You set values, you do not style components"
        >
          Someone shows you a product and says “make it feel like that”.
          The usual answer is to go and adjust components until it looks
          close. Here you pick from a short menu instead: an accent colour,
          a grey, a corner radius, a spacing step, a type scale, an icon
          set, how motion feels. Save, and everything in the product
          follows. The menu is short on purpose. If it cannot express
          something, that is the system doing its job.
        </Point>

        <Point
          label="The engine"
          title="Design and code read from the same values"
        >
          Your codebase and your Figma file are two different places, and
          they start drifting apart the day you make them. Underneath both
          there is one data layer: the tokens. Figma already has variables
          as a concept — colours for light and dark, spacing, radius — so
          the same Tailwind scales your code uses are written into them,
          and the Foundation points at those. Change a value, run the sync,
          and Figma follows without anyone redrawing anything.
          <br />
          <br />
          Pulling a design out of Figma and into code is a well-travelled
          road. This is the return trip: not just writing variables, but
          wiring them to a short menu of choices, so one save re-themes
          both sides at once. The point is not tidiness. It is that design
          and engineering end up naming the same things the same way.
        </Point>
      </div>
    </div>
  )
}
