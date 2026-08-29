import type { Metadata } from "next"
import Link from "next/link"

import { AMBIENT_COMPONENTS, SHADCN_DEFAULT_COMPONENTS } from "@/lib/catalog"
import { SYSTEM_DOC_META } from "@/lib/system-docs.meta"
import { docUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Design system — ambientui",
  description:
    "Fifty documented components across two vocabularies — the ambient layer's own surfaces and the shadcn primitives underneath — plus the governing documents.",
  alternates: { canonical: "/ds" },
}

/**
 * THE CRAWL HUB — the page `?c=` never had.
 *
 * On the SPA every component lived behind a query parameter on one
 * document, which meant nothing could DISCOVER a component: no link, no
 * URL, no way in except the rail's JavaScript. This page exists so that
 * every one of the fifty has an inbound link from static HTML.
 */
/** One linked row per component — the inbound link a crawler follows. */
function List({
  items,
}: {
  items: { id: string; name: string; description: string }[]
}) {
  return (
    <ul className="mt-5 grid gap-x-10 sm:grid-cols-2">
      {items.map((c) => (
        <li key={c.id} className="border-border border-t">
          <Link
            href={`/ds/components/${c.id}`}
            className="hover:bg-muted/40 flex flex-col gap-1 py-4"
          >
            <span className="font-medium">{c.name}</span>
            <span className="text-muted-foreground text-sm leading-relaxed">
              {c.description}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function DsIndex() {
  const groups = [
    ...new Set(AMBIENT_COMPONENTS.map((c) => c.group).filter(Boolean)),
  ] as string[]
  const core = AMBIENT_COMPONENTS.filter((c) => !c.group)

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        The design system
      </h1>
      <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
        Two vocabularies. The ambient layer composes its own surfaces; product
        UI composes the shadcn primitives underneath. Every component here is
        documented with what it does, when to use it, and when not to — which
        is what makes it installable.
      </p>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">
          Ambient vocabulary
        </h2>
        <List items={core} />
        {groups.map((group) => (
          <div key={group} className="mt-10">
            <h3 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              {group}
            </h3>
            <List items={AMBIENT_COMPONENTS.filter((c) => c.group === group)} />
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold tracking-tight">
          Product vocabulary
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
          shadcn&rsquo;s own primitives, documented here because the ambient
          layer is built from them — installed from shadcn, not from us.
        </p>
        <List items={SHADCN_DEFAULT_COMPONENTS} />
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold tracking-tight">
          The governing documents
        </h2>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          {SYSTEM_DOC_META.map((d) => (
            <li key={d.id}>
              <a
                href={docUrl(d.path)}
                target="_blank"
                rel="noreferrer"
                className="text-primary text-sm underline underline-offset-2"
              >
                {d.name}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
