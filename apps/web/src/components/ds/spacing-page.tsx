import * as React from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import {
  SPACING_GRIDS,
  SPACING_STEPS,
  useFoundation,
} from "@/foundation/foundation-context"

/**
 * The Spacing page: the scale of record is Tailwind's own spacing scale.
 * The Foundation chooses its UNIT (the `--spacing` variable every utility
 * derives from), so `p-4`, `gap-2`, `h-9` re-densify product-wide from
 * one decision — and everything rides the scaling base (rem).
 *
 * Rule of record (DESIGN.md §2): every gap, padding, and margin is a
 * Tailwind spacing utility. A stated pixel is a request for a step.
 */

const STEP_USES: Record<string, string> = {
  "0.5": "Hairline separation — icon-to-badge nudges, focus ring offsets",
  "1": "Tight pairs — icon to label, chip internals",
  "1.5": "Compact control interiors",
  "2": "Related items — control rows, chip groups, list gaps",
  "3": "Grouped content inside a component",
  "4": "Component padding — cards, panels, inputs' surroundings",
  "6": "Section separation inside a surface",
  "8": "Between distinct blocks on a page",
  "10": "Page-level breathing room",
  "12": "Major section breaks",
  "16": "The largest sanctioned gap",
}

/** Figma-style measurement chip. */
function MeasureChip({ label }: { label: string }) {
  return (
    <span className="bg-primary text-primary-foreground rounded px-1.5 py-0.5 font-mono text-xs leading-none whitespace-nowrap">
      {label}
    </span>
  )
}

/**
 * A vertical spacing band inside the spec card — exactly the utility's
 * height, measured in the gutter with a dashed leader so annotations
 * never overlap content.
 */
function VGap({ step }: { step: number }) {
  return (
    <div
      className="bg-primary/15 relative"
      style={{ height: `calc(var(--spacing) * ${step})` }}
    >
      <div className="absolute top-1/2 left-full flex -translate-y-1/2 items-center">
        <span className="border-primary/50 w-5 border-t border-dashed" />
        <MeasureChip label={`p-${step}`} />
      </div>
    </div>
  )
}

/** An isolated horizontal-gap measurement — Figma's "measure between selections". */
function HGapFigure({
  step,
  left,
  right,
  caption,
}: {
  step: number
  left: React.ReactNode
  right: React.ReactNode
  caption: string
}) {
  return (
    <div className="border-border flex flex-col items-center gap-2 rounded-lg border p-4">
      <div className="flex items-center">
        {left}
        <div className="relative self-stretch">
          <div
            className="bg-primary/20 h-full"
            style={{ width: `calc(var(--spacing) * ${step})` }}
          />
          <span className="border-primary/50 absolute top-full left-1/2 h-3 border-l border-dashed" />
        </div>
        {right}
      </div>
      <MeasureChip label={`gap-${step}`} />
      <p className="text-muted-foreground text-xs">{caption}</p>
    </div>
  )
}

export function SpacingPage() {
  const { config } = useFoundation()
  const grid =
    SPACING_GRIDS.find((g) => g.id === config.spacingGrid) ?? SPACING_GRIDS[0]

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <h1 className="text-xl font-semibold">Spacing</h1>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        The scale of record is <strong>Tailwind's spacing scale</strong> —
        every utility (`p-N`, `gap-N`, `m-N`, `h-N`) is a multiple of one
        unit, `--spacing`. The Foundation sets that unit (currently{" "}
        <strong>{grid.name}</strong>, {grid.unit}px at the 100% base), so one
        decision re-densifies the entire product. A stated pixel is a request
        for a step — no exact step means the nearest legal step, never an
        arbitrary value.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {/* the scale */}
        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            The scale — Tailwind steps × the {grid.unit}px unit
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Utility</TableHead>
                <TableHead>Use for</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SPACING_STEPS.map((step) => (
                <TableRow key={step}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="bg-primary/60 h-3 rounded-xs"
                        style={{ width: `calc(var(--spacing) * ${step})` }}
                      />
                      <code className="font-mono text-xs">{step}</code>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {Math.round(step * grid.unit * 100) / 100}px
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    p-{step}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {STEP_USES[String(step)] ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-muted-foreground mt-2 text-xs">
            Intermediate Tailwind steps (5, 7, 9, 11, 14…) exist and are
            legal; the table shows the rhythm the product actually uses.
          </p>
        </section>

        {/* worked example */}
        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Worked example — every gap annotated
          </div>
          <p className="text-muted-foreground mb-3 text-sm">
            The same card twice. Left: as shipped. Right: the redline spec —
            tinted bands are the exact utility sizes, measured in the gutter
            like a Figma inspect.
          </p>
          <div className="grid items-start gap-6 md:grid-cols-2">
            {/* as shipped */}
            <div className="border-border rounded-xl border p-4">
              <div className="flex items-center gap-1">
                <h3 className="text-base font-semibold">Table</h3>
                <Badge variant="destructive">Drifting</Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                Ships an undocumented density variant.
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm">Fix docs</Button>
                <Button size="sm" variant="outline">
                  Ignore
                </Button>
              </div>
            </div>

            {/* redline spec */}
            <div className="pe-24">
              <div className="border-primary/40 rounded-xl border border-dashed">
                <VGap step={4} />
                <div className="px-4">
                  <div className="flex items-center gap-1">
                    <h3 className="text-base font-semibold">Table</h3>
                    <Badge variant="destructive">Drifting</Badge>
                  </div>
                  <VGap step={1} />
                  <p className="text-muted-foreground text-sm">
                    Ships an undocumented density variant.
                  </p>
                  <VGap step={4} />
                  <div className="flex gap-2">
                    <Button size="sm">Fix docs</Button>
                    <Button size="sm" variant="outline">
                      Ignore
                    </Button>
                  </div>
                </div>
                <VGap step={4} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <HGapFigure
              step={1}
              left={<h3 className="text-base font-semibold">Table</h3>}
              right={<Badge variant="destructive">Drifting</Badge>}
              caption="Title to badge — a tight pair, one unit of meaning."
            />
            <HGapFigure
              step={2}
              left={<Button size="sm">Fix docs</Button>}
              right={
                <Button size="sm" variant="outline">
                  Ignore
                </Button>
              }
              caption="Between sibling buttons — related items."
            />
          </div>
        </section>

        <Separator />

        {/* the rule */}
        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            The rule
          </div>
          <div className="text-muted-foreground flex flex-col gap-2 text-sm leading-relaxed">
            <p>
              <strong className="text-foreground">
                A stated pixel is a request for a step.
              </strong>{" "}
              "16px padding" means{" "}
              <code className="font-mono text-xs">p-4</code>. "10px" has
              no step at the default unit — use{" "}
              <code className="font-mono text-xs">p-2</code> or{" "}
              <code className="font-mono text-xs">p-3</code>, and say
              which you chose.
            </p>
            <p>
              Arbitrary values (`p-[10px]`) break two things at once: the
              Figma sync (a value that isn't on the scale has nowhere to
              land) and the propagation rule (a literal px ignores the
              Foundation's unit and the scaling base). The utilities are the
              scale — styling essentially comes from Tailwind.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
