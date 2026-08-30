import * as React from "react"

import { Button } from "@ambientui/ui/components/button"
import { Icon } from "@ambientui/ui/components/icon"
import {
  Schematic,
  SNode,
  SLink,
  SDot,
  SText,
  SLead,
} from "@/components/home/schematic-kit"

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
      <h3 className="mt-3 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {children}
      </p>
    </div>
  )
}

/**
 * ONE STORE, TWO PROJECTIONS — the diagram the sync contract describes.
 *
 * Drawn with the schematic kit rather than described in a paragraph
 * because the whole claim is about direction: the arrows only point one
 * way, and a sentence saying so is easier to disbelieve than a picture
 * that has no arrow going back.
 */
function SyncSchematic() {
  return (
    <Schematic
      viewBox="0 0 520 190"
      label="The token store projects into the running app and into Figma. Both arrows point away from the store; nothing writes back to it."
      className="w-full"
    >
      <SNode x={90} y={95} r={38} lines={["tokens", "master"]} accent />
      <SLead x1={90} y1={137} x2={90} y2={166} label="tokens.ts" anchor="start" />

      <SLink x1={128} y1={95} x2={330} y2={48} bend={0.6} accent />
      <SLink x1={128} y1={95} x2={330} y2={142} bend={0.6} accent />
      <SDot x={229} y={64} accent />
      <SDot x={229} y={126} accent />

      <SNode x={368} y={48} r={34} lines={["the", "app"]} />
      <SNode x={368} y={142} r={34} lines={["figma"]} />

      <SText x={402} y={18} anchor="start" muted>
        semantic roles
      </SText>
      <SText x={402} y={182} anchor="start" muted>
        variables only
      </SText>
    </Schematic>
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
      <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Design architecture
      </h2>
      <p className="text-muted-foreground mt-6 max-w-2xl leading-relaxed">
        The assistant is not the point. It is the proof. Underneath it is{" "}
        <span className="text-foreground font-medium">design architecture</span>
        , the framework the Lumenridge team builds with: a design system is a
        list of what you have, and an architecture decides what happens when
        one of those things changes. Everything you can install below came
        out of it.
      </p>

      <Button variant="outline" className="mt-6" onClick={onRead}>
        Read the argument in full
        <Icon name="chevron-right" size={15} />
      </Button>

      <div className="mt-14 grid gap-10 md:grid-cols-2">
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

      <div className="border-border mt-12 rounded-xl border p-8">
        <SyncSchematic />
        <p className="text-muted-foreground mt-6 text-center text-sm">
          One data layer. Two environments reading from it. Change the values, both follow.
        </p>
      </div>
    </div>
  )
}
