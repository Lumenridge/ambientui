import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ArticleJsonLd } from "@/components/json-ld"
import { Markdown } from "@/components/markdown"
import { readDocBySlug } from "@/lib/read-doc"
import { SYSTEM_DOC_META } from "@/lib/system-docs.meta"

/** One static page per governing document — eleven real, indexable URLs. */
export function generateStaticParams() {
  return SYSTEM_DOC_META.map((d) => ({ slug: d.slug }))
}

/**
 * The description is the summary already authored in the metadata. Eleven
 * hand-written one-liners have been sitting in this repo unused; they are
 * meta descriptions and nobody had ever shipped them.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const doc = readDocBySlug(slug)
  if (!doc) return {}
  return {
    title: `${doc.meta.name} — ambientui`,
    description: doc.meta.summary,
    alternates: { canonical: `/docs/${slug}` },
    openGraph: { type: "article", title: doc.meta.name, description: doc.meta.summary },
  }
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const doc = readDocBySlug(slug)
  if (!doc) notFound()

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-20">
      <ArticleJsonLd
        headline={doc.meta.name}
        description={doc.meta.summary}
        path={`/docs/${slug}`}
      />
      <Link
        href="/docs"
        className="text-muted-foreground hover:text-foreground font-mono text-xs tracking-widest uppercase"
      >
        ← the documents
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        {doc.meta.name}
      </h1>
      <p className="text-muted-foreground mt-2 font-mono text-xs">
        {doc.meta.path}
      </p>
      <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
        {doc.meta.summary}
      </p>
      {/* the file's real bytes, parsed and rendered on the SERVER */}
      <Markdown source={doc.source} className="mt-12 max-w-none" />
    </main>
  )
}
