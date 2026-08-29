"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Icon, type IconName } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"

import { AMBIENT_COMPONENTS, SHADCN_DEFAULT_COMPONENTS } from "@/lib/catalog"
import { SYSTEM_DOC_META } from "@/lib/system-docs.meta"
import { docUrl } from "@/lib/site"

/**
 * THE /ds RAIL — the index that makes the reference navigable.
 *
 * The SPA had one and the first cut of the static site did not, which
 * traded a real navigation for a list of links on one page. It is back as
 * a CLIENT component over `next/link`: real hrefs, so a crawler follows
 * them and a reader can middle-click, with `usePathname` marking where you
 * are — the two things the SPA's rail did with JavaScript alone.
 *
 * Search filters the same catalog the pages are generated from, so it can
 * never offer a component that has no page.
 */
const TOOLS: { id: string; label: string; icon: IconName }[] = [
  { id: "foundation", label: "Foundation", icon: "sliders" },
  { id: "colors", label: "Colors", icon: "palette" },
  { id: "spacing", label: "Spacing", icon: "ruler" },
  { id: "shadows", label: "Shadows", icon: "layers" },
  { id: "motion", label: "Motion", icon: "play" },
  { id: "translucency", label: "Translucency", icon: "moon" },
  { id: "form-factors", label: "Form factors", icon: "sidebar" },
]

function Row({
  href,
  label,
  icon,
  active = false,
  external = false,
}: {
  href: string
  label: string
  icon?: IconName
  active?: boolean
  /** Leaves the site. Marked, because a rail row that navigates away
   *  without saying so is the rail lying about where it goes. */
  external?: boolean
}) {
  const className = cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "text-muted-foreground hover:bg-sidebar-accent/50"
  )
  const inner = (
    <>
      {icon && <Icon name={icon} size={15} />}
      <span className="truncate">{label}</span>
      {external && (
        <Icon
          name="arrow-up-right"
          size={13}
          className="ms-auto shrink-0 opacity-60"
        />
      )}
    </>
  )
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {inner}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  )
}

/**
 * A section of the rail. Sentence case, not the uppercase mono the rail
 * used before: at this size the tracking made the labels harder to scan
 * than the rows they organise, which is backwards for a signpost.
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mt-4 mb-0.5 px-3 text-xs font-medium">
      {children}
    </p>
  )
}

/**
 * A COLLAPSIBLE CATEGORY — the one shape every list of things wears.
 *
 * Count on the right, so the size of a category is legible before opening
 * it, and children on an indent rail so a long open category still reads
 * as belonging to its heading once its summary has scrolled off.
 */
function Category<T extends { id: string }>({
  label,
  items,
  open,
  render,
}: {
  label: string
  items: readonly T[]
  open: boolean
  render: (item: T) => React.ReactNode
}) {
  if (!items.length) return null
  return (
    <details open={open} className="group">
      <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm">
        <Icon
          name="chevron-right"
          size={12}
          className="shrink-0 transition-transform group-open:rotate-90"
        />
        <span className="truncate">{label}</span>
        <span className="ms-auto font-mono text-xs opacity-70">
          {items.length}
        </span>
      </summary>
      <div className="border-border ms-4 border-s ps-2">
        {items.map(render)}
      </div>
    </details>
  )
}

export function DsRail() {
  const pathname = usePathname()
  const [query, setQuery] = React.useState("")
  const q = query.trim().toLowerCase()
  const show = (label: string) => !q || label.toLowerCase().includes(q)
  // A search that leaves its hits folded away has not answered anything.
  const openAll = !!q

  const groups = [
    ...new Set(AMBIENT_COMPONENTS.map((c) => c.group).filter(Boolean)),
  ] as string[]
  const core = AMBIENT_COMPONENTS.filter((c) => !c.group && show(c.name))
  const primitives = SHADCN_DEFAULT_COMPONENTS.filter((c) => show(c.name))
  const here = (href: string) => pathname === href
  /**
   * A category opens itself when the page you are on lives inside it.
   * Categorising the rail hid the current component behind a closed
   * summary — the rail stopped answering "where am I", which is the
   * question it exists for.
   */
  const holdsHere = (items: readonly { id: string }[]) =>
    items.some((c) => here(`/ds/components/${c.id}`))
  const componentRow = (c: { id: string; name: string }) => (
    <Row
      key={c.id}
      href={`/ds/components/${c.id}`}
      label={c.name}
      active={here(`/ds/components/${c.id}`)}
    />
  )

  return (
    /* STICKY, AND EXACTLY ONE VIEWPORT TALL.
     *
     * `overflow-y-auto` alone did nothing here: the parent is `min-h-svh`,
     * so the rail stretched to the height of the whole document and there
     * was never any overflow to scroll — the search box just left with the
     * page. It needs its own height (h-svh) to have something to overflow,
     * and sticky to stay put while the page moves.
     *
     * This is the shape a docs rail wants now that the document scrolls;
     * the old app shell got it for free from `overflow: hidden` on body,
     * which was removed because it froze every long page on the site. */
    <nav className="bg-sidebar border-border sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-2 overflow-y-auto border-e p-3 lg:flex">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search components…"
        aria-label="Search components"
        className="border-border bg-background focus-visible:ring-ring/30 mb-1 rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-3"
      />

      <Row href="/ds" label="Overview" icon="home" active={here("/ds")} />

      <SectionLabel>Foundations</SectionLabel>
      {TOOLS.filter((t) => show(t.label)).map((t) => (
        <Row
          key={t.id}
          href={`/ds/${t.id}`}
          label={t.label}
          icon={t.icon}
          active={here(`/ds/${t.id}`)}
        />
      ))}

      {/* EVERY COMPONENT LIST IS A CATEGORY, including the ones that were
          loose. "Core" and "Primitives" had no header of their own and so
          read as items belonging to the section label above them, while
          their siblings sat inside collapsible groups — the same kind of
          thing wearing two different shapes. One shape now: a category, a
          count, and children on the indent rail. */}
      <SectionLabel>Ambient vocabulary</SectionLabel>
      <Category
        label="Core"
        items={core}
        open={openAll || holdsHere(core)}
        render={componentRow}
      />
      {groups.map((group) => {
        const items = AMBIENT_COMPONENTS.filter(
          (c) => c.group === group && show(c.name)
        )
        return (
          <Category
            key={group}
            label={group}
            items={items}
            open={openAll || holdsHere(items)}
            render={componentRow}
          />
        )
      })}

      <SectionLabel>Product vocabulary</SectionLabel>
      <Category
        label="Primitives"
        items={primitives}
        open={openAll || holdsHere(primitives)}
        render={componentRow}
      />

      {/* These leave the site. The documents are not rendered here any
          more, and the file on GitHub carries its history and blame, which
          is most of what makes a governing document worth reading. */}
      <SectionLabel>Reference</SectionLabel>
      <Category
        label="Governing documents"
        items={SYSTEM_DOC_META.filter((d) => show(d.name))}
        open={openAll}
        render={(d) => (
          <Row
            key={d.id}
            href={docUrl(d.path)}
            label={d.name}
            icon="document"
            external
          />
        )}
      />
    </nav>
  )
}
