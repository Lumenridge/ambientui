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
  onFoundation,
}: {
  /** Take the reader to the argument this section summarises. */
  onRead: () => void
  /** Take them to the Foundation itself, which is /ds. */
  onFoundation: () => void
}) {
  return (
    <div>
      {/* THE OPENING IS CENTRED AND SPACIOUS; THE BODY IS NOT.
          A title the size of the thing it names, a single centred line
          under it, and a lot of air either side — the section announces
          itself before it starts explaining. The prose below stays left
          and stays columnar, because centred body text at paragraph
          length is hard to read: the eye loses the start of each line.
          Only the opening and the closing invitation are centred. */}
      <div className="mx-auto max-w-3xl px-2 py-16 text-center sm:py-24">
        <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          What it is built on
        </p>
        <h2 className="mt-8 text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          Design architecture
        </h2>
        <p className="text-muted-foreground mx-auto mt-10 max-w-xl text-lg leading-relaxed text-balance sm:text-xl">
          The assistant is not the point. It is the proof. Underneath it is
          a design system that stopped being a list of what you have, and
          became something that decides what happens when one of those
          things changes.
        </p>
        <Button variant="outline" size="sm" className="mt-10" onClick={onRead}>
          Read the argument in full
          <Icon name="chevron-right" size={15} />
        </Button>
      </div>

      <div className="mt-4 grid gap-10 md:grid-cols-2">
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

      {/* THE ONE PART OF THIS PAGE YOU CAN GO AND DO. Everything above is
          an argument; the Foundation is a live page where changing a value
          re-draws the site around you. A section about configuration that
          does not hand you the configuration is describing a demo it is
          standing next to. */}
      <div className="border-border mx-auto mt-20 max-w-2xl border-t px-2 pt-16 text-center sm:pt-20">
        <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          Make it yours
        </p>
        <h3 className="mt-6 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Change the Foundation and watch everything follow
        </h3>
        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-base leading-relaxed">
          The Foundation on this site is live, not a screenshot of one. Pick
          a different accent, a different grey, a wider corner or a tighter
          spacing step, and every component on every page redraws while you
          watch — the assistant included, since it has no colours of its own
          to keep. Save, and it is your theme. That is the whole
          customisation story: not a settings screen bolted on afterwards,
          but the same short menu the product was built from.
        </p>
        <Button variant="outline" size="sm" className="mt-8" onClick={onFoundation}>
          Open the Foundation
          <Icon name="chevron-right" size={15} />
        </Button>
      </div>
    </div>
  )
}
