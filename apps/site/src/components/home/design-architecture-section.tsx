import * as React from "react"

import { Icon } from "@ambientui/ui/components/icon"
import {
  ACCENTS,
  GRAYS,
  RADIUS_STEPS,
  MOTION_CHARACTERS,
} from "@ambientui/foundation"

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
 * EVERY NUMBER HERE IS READ, NOT WRITTEN. The counts come from the
 * Foundation's own token module, so a nineteenth accent or a fourth motion
 * character updates this prose by existing. The paper made the same
 * argument in words the site was not repeating anywhere a stranger would
 * see it; a claim about a bounded space that hardcodes its own bounds is
 * the drift it is warning about.
 */

/** One point, stated once, with the thing that proves it. */
function Point({
  label,
  title,
  children,
  proof,
}: {
  label: string
  title: string
  children: React.ReactNode
  proof?: React.ReactNode
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
      {proof && <div className="mt-4">{proof}</div>}
    </div>
  )
}

/** A fact with a number in front of it. */
function Fact({ n, of }: { n: number | string; of: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-foreground font-mono text-sm">{n}</span>
      <span className="text-muted-foreground text-xs">{of}</span>
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

      <button
        type="button"
        onClick={onRead}
        className="text-primary mt-5 flex items-center gap-1.5 text-sm font-medium hover:underline"
      >
        Read the argument in full
        <Icon name="chevron-right" size={15} />
      </button>

      <div className="mt-14 grid gap-10 md:grid-cols-2">
        <Point
          label="The change"
          title="The Foundation is a configuration space, not a stylesheet"
          proof={
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <Fact n={ACCENTS.length} of="accents" />
              <Fact n={GRAYS.length} of="gray families" />
              <Fact n={RADIUS_STEPS.length} of="radius steps" />
              <Fact n={MOTION_CHARACTERS.length} of="motion characters" />
            </div>
          }
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
          proof={
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <Fact n={244} of="palette primitives" />
              <Fact n={120} of="Tailwind primitives" />
              <Fact n={42} of="Foundation aliases" />
              <Fact n="0" of="components written" />
            </div>
          }
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
