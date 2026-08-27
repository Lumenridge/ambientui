import * as React from "react"

/**
 * SCHEMATIC KIT — engineering line-work for the playbook's diagrams.
 *
 * PRESENTATION TOOLING, NOT VOCABULARY. This kit is deliberately outside
 * the official design system: it has no /ds registry entry, no place in
 * packages/ui, and no claim on product surfaces. It exists so the article
 * (and future presentations) can draw sitemap/flow-style schematics — node
 * circles, fanned bezier links, waypoint dots, dotted leader annotations —
 * in one shared grammar. If a product surface ever wants these, that is a
 * governance event, not an import.
 *
 * TOKENS STILL APPLY. Every stroke and fill is a semantic role read through
 * a CSS variable (--foreground, --border, --muted-foreground, --primary,
 * --background), so the schematics re-theme with the Foundation like
 * everything else on the page. No literal colors, ever.
 *
 * INTERACTION-READY. Every primitive spreads extra SVG props onto its root
 * element, so hover/click behaviors can be layered on later without
 * touching the kit.
 */

const INK = "var(--foreground)"
const MID = "var(--muted-foreground)"
const FAINT = "var(--border)"
const ACCENT = "var(--primary)"
const GROUND = "var(--background)"

type SvgProps = React.SVGProps<SVGGElement>

/** The drawing surface. Width follows the container; viewBox is the ruler. */
export function Schematic({
  viewBox,
  label,
  className,
  children,
}: {
  viewBox: string
  /** Accessible name — a schematic is an image, and images have names. */
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={label}
      className={className ?? "w-full"}
    >
      {children}
    </svg>
  )
}

/** A named station: outlined circle, mono caps label inside. */
export function SNode({
  x,
  y,
  r = 34,
  lines,
  accent,
  ...rest
}: {
  x: number
  y: number
  r?: number
  lines: string[]
  accent?: boolean
} & SvgProps) {
  return (
    <g {...rest}>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={GROUND}
        stroke={accent ? ACCENT : INK}
        strokeWidth={1}
      />
      <text
        x={x}
        y={y - (lines.length - 1) * 4.5 + 3}
        textAnchor="middle"
        fontSize={8}
        letterSpacing="0.08em"
        fill={INK}
        className="font-mono"
      >
        {lines.map((l, i) => (
          <tspan key={l} x={x} dy={i === 0 ? 0 : 10}>
            {l.toUpperCase()}
          </tspan>
        ))}
      </text>
    </g>
  )
}

/** A waypoint: solid ink, hollow ring, or accent. */
export function SDot({
  x,
  y,
  r = 2.5,
  ring,
  accent,
  ...rest
}: {
  x: number
  y: number
  r?: number
  ring?: boolean
  accent?: boolean
} & SvgProps) {
  return (
    <g {...rest}>
      {ring ? (
        <circle cx={x} cy={y} r={r + 0.5} fill={GROUND} stroke={INK} strokeWidth={1} />
      ) : (
        <circle cx={x} cy={y} r={r} fill={accent ? ACCENT : INK} />
      )}
    </g>
  )
}

/** A flow line: horizontal-out cubic bezier, the fan-out curve. */
export function SLink({
  x1,
  y1,
  x2,
  y2,
  bend = 0.5,
  dashed,
  accent,
  ...rest
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  /** 0 = straight chord, 1 = full square-out curve. */
  bend?: number
  dashed?: boolean
  accent?: boolean
} & SvgProps) {
  const dx = (x2 - x1) * bend
  return (
    <g {...rest}>
      <path
        d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={accent ? ACCENT : MID}
        strokeWidth={0.75}
        strokeDasharray={dashed ? "2 3" : undefined}
      />
    </g>
  )
}

/** Mono caps annotation text. */
export function SText({
  x,
  y,
  anchor = "start",
  size = 8,
  muted,
  accent,
  children,
  ...rest
}: {
  x: number
  y: number
  anchor?: "start" | "middle" | "end"
  size?: number
  muted?: boolean
  accent?: boolean
  children: string
} & SvgProps) {
  return (
    <g {...rest}>
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        fontSize={size}
        letterSpacing="0.08em"
        fill={accent ? ACCENT : muted ? MID : INK}
        className="font-mono"
      >
        {children.toUpperCase()}
      </text>
    </g>
  )
}

/** A dotted leader from a point of interest out to its label. */
export function SLead({
  x1,
  y1,
  x2,
  y2,
  label,
  anchor = "start",
  accent,
  ...rest
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  anchor?: "start" | "end"
  accent?: boolean
} & SvgProps) {
  const pad = anchor === "start" ? 4 : -4
  return (
    <g {...rest}>
      <path
        d={`M ${x1} ${y1} L ${x2} ${y2}`}
        fill="none"
        stroke={accent ? ACCENT : FAINT}
        strokeWidth={0.75}
        strokeDasharray="1.5 2.5"
      />
      <SText x={x2 + pad} y={y2 + 2.5} anchor={anchor} muted={!accent} accent={accent}>
        {label}
      </SText>
    </g>
  )
}

/** A wireframe surface: rounded outline, no fill of its own. */
export function SScreen({
  x,
  y,
  w,
  h,
  rx = 6,
  dashed,
  accent,
  ...rest
}: {
  x: number
  y: number
  w: number
  h: number
  rx?: number
  dashed?: boolean
  accent?: boolean
} & SvgProps) {
  return (
    <g {...rest}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={rx}
        fill={GROUND}
        stroke={accent ? ACCENT : MID}
        strokeWidth={accent ? 1 : 0.75}
        strokeDasharray={dashed ? "3 3" : undefined}
      />
    </g>
  )
}

/** A content stand-in: one muted bar. */
export function SBar({
  x,
  y,
  w,
  h = 3.5,
  ...rest
}: {
  x: number
  y: number
  w: number
  h?: number
} & SvgProps) {
  return (
    <g {...rest}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="var(--muted)" />
    </g>
  )
}
