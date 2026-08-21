import { Badge } from "@workspace/ui/components/badge"
import {
  SPACING_GRIDS,
  resolveSpacing,
  useFoundation,
} from "@/foundation/foundation-context"
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

/**
 * The Spacing page: the ambient spacing scale — an 8px grid starting from
 * 2px — and a worked example showing exactly which step carries each gap.
 *
 * Rule of record (DESIGN.md §2): every gap, padding, and margin is a step on
 * this scale. A stated pixel is a request for a token; off-scale values have
 * nowhere to land in Figma and teach the AI that drift is normal.
 */

const STEP_USES = [
  "Hairline separation — icon-to-badge nudges, focus ring offsets",
  "Tight pairs — icon to label, chip internals",
  "Related items — control rows, chip groups, list gaps",
  "Component padding — cards, panels, inputs' surroundings",
  "Section separation inside a surface",
  "Between distinct blocks on a page",
  "Page-level breathing room",
  "Major section breaks",
  "Hero / landing rhythm",
  "The largest sanctioned gap",
]

/** Figma-style measurement chip. */
function MeasureChip({ label }: { label: string }) {
  return (
    <span className="bg-primary text-primary-foreground rounded px-1.5 py-0.5 font-mono text-[10px] leading-none whitespace-nowrap">
      {label}
    </span>
  )
}

/**
 * A vertical spacing band inside the spec card. The band is exactly the
 * token's height; its measurement chip sits in the right-hand gutter,
 * connected by a dashed leader line — outside the card, so annotations can
 * never overlap content.
 */
function VGap({ step }: { step: number }) {
  return (
    <div
      className="bg-primary/15 relative"
      style={{ height: `var(--ambient-space-${step})` }}
    >
      <div className="absolute top-1/2 left-full flex -translate-y-1/2 items-center">
        <span className="border-primary/50 w-5 border-t border-dashed" />
        <MeasureChip label={`space-${step}`} />
      </div>
    </div>
  )
}

/**
 * An isolated horizontal-gap measurement: the two elements with the tinted
 * band between them, and the chip below with a dashed leader — Figma's
 * "measure between selections" reading.
 */
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
    <div className="border-border flex flex-col items-center gap-ambient-3 rounded-lg border p-ambient-4">
      <div className="flex items-center">
        {left}
        <div className="relative self-stretch">
          <div
            className="bg-primary/20 h-full"
            style={{ width: `var(--ambient-space-${step})` }}
          />
          <span className="border-primary/50 absolute top-full left-1/2 h-3 border-l border-dashed" />
        </div>
        {right}
      </div>
      <MeasureChip label={`space-${step}`} />
      <p className="text-muted-foreground text-[12px]">{caption}</p>
    </div>
  )
}

export function SpacingPage() {
  const { config } = useFoundation()
  const grid =
    SPACING_GRIDS.find((g) => g.id === config.spacingGrid) ?? SPACING_GRIDS[0]
  const values = resolveSpacing(grid.unit)
  const steps = values.map((px, i) => ({ n: i + 1, px, use: STEP_USES[i]! }))

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <h1 className="text-xl font-semibold">Spacing</h1>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        One scale carries every gap: the <strong>{grid.name}</strong> grid
        ({grid.unit}px unit, set in Foundation) resolved as
        `--ambient-space-1…10`, used as `p-ambient-N` / `gap-ambient-N`.
        A stated pixel is a request for a token — no exact step means the
        nearest legal step, never a new number.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {/* the scale */}
        <section>
          <div className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
            The scale
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
              {steps.map((s) => (
                <TableRow key={s.n}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        className="bg-primary/60 h-3 rounded-xs"
                        style={{ width: `var(--ambient-space-${s.n})` }}
                      />
                      <code className="font-mono text-[12px]">{s.n}</code>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[12px]">{s.px}px</TableCell>
                  <TableCell className="font-mono text-[12px]">
                    p-ambient-{s.n}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[13px]">
                    {s.use}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* worked example */}
        <section>
          <div className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
            Worked example — every gap annotated
          </div>
          <p className="text-muted-foreground mb-3 text-[13px]">
            The same card twice. Left: as shipped. Right: the redline spec —
            tinted bands are the exact token heights, measured in the gutter
            like a Figma inspect.
          </p>
          <div className="grid items-start gap-6 md:grid-cols-2">
            {/* as shipped */}
            <div className="border-border rounded-xl border p-ambient-4">
              <div className="flex items-center gap-ambient-2">
                <h3 className="text-ambient-5 font-semibold">Table</h3>
                <Badge variant="destructive">Drifting</Badge>
              </div>
              <p className="text-muted-foreground mt-ambient-2 text-ambient-3">
                Ships an undocumented density variant.
              </p>
              <div className="mt-ambient-4 flex gap-ambient-3">
                <Button size="sm">Fix docs</Button>
                <Button size="sm" variant="outline">
                  Ignore
                </Button>
              </div>
            </div>

            {/* redline spec: card + measurement gutter */}
            <div className="pe-24">
              <div className="border-primary/40 rounded-xl border border-dashed">
                <VGap step={4} />
                <div className="px-ambient-4">
                  <div className="flex items-center gap-ambient-2">
                    <h3 className="text-ambient-5 font-semibold">Table</h3>
                    <Badge variant="destructive">Drifting</Badge>
                  </div>
                  <VGap step={2} />
                  <p className="text-muted-foreground text-ambient-3">
                    Ships an undocumented density variant.
                  </p>
                  <VGap step={4} />
                  <div className="flex gap-ambient-3">
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

          {/* horizontal gaps, measured in isolation */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <HGapFigure
              step={2}
              left={<h3 className="text-ambient-5 font-semibold">Table</h3>}
              right={<Badge variant="destructive">Drifting</Badge>}
              caption="Title to badge — a tight pair, one unit of meaning."
            />
            <HGapFigure
              step={3}
              left={<Button size="sm">Fix docs</Button>}
              right={
                <Button size="sm" variant="outline">
                  Ignore
                </Button>
              }
              caption="Between sibling buttons — related items."
            />
          </div>
          <ul className="text-muted-foreground mt-4 flex flex-col gap-1.5 text-[13px]">
            <li>
              <code className="text-foreground font-mono text-[12px]">p-ambient-4</code>{" "}
              (16px) — the card's padding: component-level breathing room.
            </li>
            <li>
              <code className="text-foreground font-mono text-[12px]">gap-ambient-2</code>{" "}
              (4px) — title to badge: a tight pair, one unit of meaning.
            </li>
            <li>
              <code className="text-foreground font-mono text-[12px]">mt-ambient-2</code>{" "}
              (4px) — title block to description: same thought, new line.
            </li>
            <li>
              <code className="text-foreground font-mono text-[12px]">mt-ambient-4</code>{" "}
              (16px) — content to actions: a new region inside the card.
            </li>
            <li>
              <code className="text-foreground font-mono text-[12px]">gap-ambient-3</code>{" "}
              (8px) — between sibling buttons: related items.
            </li>
          </ul>
        </section>

        <Separator />

        {/* the rule */}
        <section>
          <div className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
            The rule
          </div>
          <div className="text-muted-foreground flex flex-col gap-2 text-[13px] leading-relaxed">
            <p>
              <strong className="text-foreground">
                A stated pixel is a request for a token.
              </strong>{" "}
              "16px padding" means <code className="font-mono text-[12px]">p-ambient-4</code>.
              "12px" has no step — use 8 or 16, and say which you chose.
            </p>
            <p>
              Off-scale values break two things at once: the Figma sync (a value
              that isn't a variable has nowhere to land) and the AI's training
              signal (every exception teaches the generator that exceptions are
              normal). The scale is small on purpose — ten steps are enough to
              lay out everything on this page.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
