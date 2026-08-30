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
        The ambient layer is not the foundation of this repo. It is what the
        foundation was built to prove. Underneath it is{" "}
        <span className="text-foreground font-medium">design architecture</span>
        , the framework the Lumenridge team develops here and works in: a
        design system tells you what exists, and an architecture tells you
        what happens when something changes. Every component you can install
        below is downstream of it.
      </p>

      <Button variant="outline" className="mt-6" onClick={onRead}>
        Read the argument in full
        <Icon name="chevron-right" size={15} />
      </Button>

      <div className="mt-14 grid gap-10 md:grid-cols-2">
        <Point
          label="The change"
          title="The Foundation is a configuration space, not a stylesheet"
        >
          A reference is answered by selecting values, never by styling a
          component toward it. Accent, gray family, radius window, spacing
          grid, type scale, icon library, motion character: pick, save, and
          every component in the product restyles, because each dimension
          resolves from a variable rather than being written into the parts.
          The space is deliberately small. What it cannot express is not a
          gap, it is the point.
        </Point>

        <Point
          label="The engine"
          title="Figma mirrors the code, and only in that direction"
        >
          The sync writes variables and never components, so the file a
          designer opens is themed by the same values the app is. The
          Foundation collection holds no numbers at all, only aliases into
          the primitives the config selected, which is what makes one hue
          change re-theme every Figma page exactly as it re-themes the app.
          Code is master; the sync is one-way and safe to re-run.
        </Point>
      </div>

      <div className="border-border mt-12 rounded-xl border p-8">
        <SyncSchematic />
        <p className="text-muted-foreground mt-6 text-center text-sm">
          One store of values, two projections. Nothing writes back.
        </p>
      </div>
    </div>
  )
}
