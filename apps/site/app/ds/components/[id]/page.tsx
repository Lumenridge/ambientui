import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import {
  AMBIENT_COMPONENTS,
  SHADCN_DEFAULT_COMPONENTS,
  type ComponentDoc,
} from "@/lib/catalog"
import { ComponentDemos } from "@/components/ds/component-demos"
import { BreadcrumbJsonLd } from "@/components/json-ld"
import { installCommandFor } from "@/lib/registry-facts"
import { pageMetadata } from "@/lib/site"

const ALL: (ComponentDoc & { vocabulary: "ambient" | "product" })[] = [
  ...AMBIENT_COMPONENTS.map((c) => ({ ...c, vocabulary: "ambient" as const })),
  ...SHADCN_DEFAULT_COMPONENTS.map((c) => ({
    ...c,
    vocabulary: "product" as const,
  })),
]

/** Fifty real URLs, one per documented component. */
export function generateStaticParams() {
  return ALL.map((c) => ({ id: c.id }))
}

/**
 * WHAT THE CARD AND THE SEARCH RESULT SAY ABOUT A COMPONENT.
 *
 * `description` is the VOCABULARY line — it is read by the AI composing
 * from this system, and it is deliberately terse: "Single-line text
 * entry." is exactly right sitting next to the component under its own
 * heading. Standing alone in a search result or a share card it explains
 * nothing, and eleven of the fifty were under 55 characters.
 *
 * So the card composes rather than the vocabulary being padded. The first
 * `whenToUse` line is the missing half — it is already written, already
 * reviewed, and says the thing a stranger actually needs (Input: "Free-form
 * single-line values: names, emails, search queries."). Nothing is
 * invented here and the AI-facing text is untouched.
 *
 * Only SHORT descriptions are extended. The ones that already carry their
 * own explanation are left exactly as their author wrote them, rather than
 * being truncated to hit a number.
 */
const SHORT = 110

function cardDescription(c: { description: string; whenToUse: string[] }) {
  if (c.description.length >= SHORT) return c.description
  const first = c.whenToUse[0]
  if (!first) return c.description
  return `${c.description} ${first}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const c = ALL.find((x) => x.id === id)
  if (!c) return {}
  const description = cardDescription(c)
  return pageMetadata({
    title: `${c.name} — ambientui components`,
    name: c.name,
    description,
    canonical: `/ds/components/${id}`,
  })
}

function DocList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="text-muted-foreground mt-3 flex flex-col gap-2 text-sm leading-relaxed">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-foreground/70 select-none">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * ONE COMPONENT, AS A DOCUMENT.
 *
 * Everything here is a SERVER component: the prose is the indexable payload
 * and it must not be hostage to fifty playgrounds each being SSR-safe. The
 * live demos mount separately (a client island, added when the story kit is
 * ported) — so a regressed playground costs a demo, never a page.
 */
export default async function ComponentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const c = ALL.find((x) => x.id === id)
  if (!c) notFound()

  const install = installCommandFor(c.id)

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-20">
      <BreadcrumbJsonLd
        trail={[
          { name: "Design system", path: "/ds" },
          { name: "Components", path: "/ds" },
          { name: c.name, path: `/ds/components/${c.id}` },
        ]}
      />
      <nav className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
        <Link href="/ds" className="hover:text-foreground">
          design system
        </Link>
        <span className="mx-2">/</span>
        <span>{c.vocabulary} vocabulary</span>
      </nav>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{c.name}</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
        {c.description}
      </p>

      {install ? (
        <div className="mt-8">
          <p className="text-muted-foreground mb-2 text-sm">Install it:</p>
          <pre className="border-border bg-card overflow-x-auto rounded-xl border px-4 py-3 font-mono text-sm">
            {install}
          </pre>
        </div>
      ) : (
        <p className="text-muted-foreground mt-8 max-w-2xl text-sm leading-relaxed">
          {c.vocabulary === "product"
            ? "A shadcn primitive — install it from shadcn, not from here. It is documented because the ambient layer is built from it."
            : "Not separately installable: it ships inside the ambient layer."}
        </p>
      )}

      <DocList title="Behavior" items={c.behavior} />
      <DocList title="When to use" items={c.whenToUse} />
      <DocList title="When not to" items={c.whenNotToUse} />

      {/* the demos mount below the prose, as their own island */}
      <ComponentDemos id={c.id} />
    </main>
  )
}
