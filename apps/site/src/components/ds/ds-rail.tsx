"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Icon, type IconName } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"

import { AMBIENT_COMPONENTS, SHADCN_DEFAULT_COMPONENTS } from "@/lib/catalog"
import { SYSTEM_DOC_META } from "@/lib/system-docs.meta"

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
  active,
}: {
  href: string
  label: string
  icon?: IconName
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-accent/50"
      )}
    >
      {icon && <Icon name={icon} size={15} />}
      <span className="truncate">{label}</span>
    </Link>
  )
}

export function DsRail() {
  const pathname = usePathname()
  const [query, setQuery] = React.useState("")
  const q = query.trim().toLowerCase()
  const show = (label: string) => !q || label.toLowerCase().includes(q)

  const groups = [
    ...new Set(AMBIENT_COMPONENTS.map((c) => c.group).filter(Boolean)),
  ] as string[]
  const core = AMBIENT_COMPONENTS.filter((c) => !c.group && show(c.name))
  const here = (href: string) => pathname === href

  return (
    <nav className="bg-sidebar border-border hidden w-64 shrink-0 flex-col gap-2 overflow-y-auto border-e p-3 lg:flex">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search components…"
        aria-label="Search components"
        className="border-border bg-background focus-visible:ring-ring/30 mb-1 rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-3"
      />

      <Row href="/ds" label="Overview" icon="home" active={here("/ds")} />

      <p className="text-muted-foreground mt-3 px-3 font-mono text-xs tracking-widest uppercase">
        Foundations
      </p>
      {TOOLS.filter((t) => show(t.label)).map((t) => (
        <Row
          key={t.id}
          href={`/ds/${t.id}`}
          label={t.label}
          icon={t.icon}
          active={here(`/ds/${t.id}`)}
        />
      ))}

      <p className="text-muted-foreground mt-3 px-3 font-mono text-xs tracking-widest uppercase">
        Ambient vocabulary
      </p>
      {core.map((c) => (
        <Row
          key={c.id}
          href={`/ds/components/${c.id}`}
          label={c.name}
          icon="sparkles"
          active={here(`/ds/components/${c.id}`)}
        />
      ))}
      {groups.map((group) => {
        const items = AMBIENT_COMPONENTS.filter(
          (c) => c.group === group && show(c.name)
        )
        if (!items.length) return null
        return (
          <details key={group} open={!!q} className="group">
            <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium tracking-wide uppercase">
              <Icon
                name="chevron-right"
                size={12}
                className="transition-transform group-open:rotate-90"
              />
              {group}
              <span className="ms-auto font-mono">{items.length}</span>
            </summary>
            <div className="border-border ms-4 border-s ps-2">
              {items.map((c) => (
                <Row
                  key={c.id}
                  href={`/ds/components/${c.id}`}
                  label={c.name}
                  active={here(`/ds/components/${c.id}`)}
                />
              ))}
            </div>
          </details>
        )
      })}

      <p className="text-muted-foreground mt-3 px-3 font-mono text-xs tracking-widest uppercase">
        Product vocabulary
      </p>
      {SHADCN_DEFAULT_COMPONENTS.filter((c) => show(c.name)).map((c) => (
        <Row
          key={c.id}
          href={`/ds/components/${c.id}`}
          label={c.name}
          active={here(`/ds/components/${c.id}`)}
        />
      ))}

      <p className="text-muted-foreground mt-3 px-3 font-mono text-xs tracking-widest uppercase">
        Documents
      </p>
      {SYSTEM_DOC_META.filter((d) => show(d.name)).map((d) => (
        <Row
          key={d.id}
          href={`/docs/${d.slug}`}
          label={d.name}
          icon="document"
          active={here(`/docs/${d.slug}`)}
        />
      ))}
    </nav>
  )
}
