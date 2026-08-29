import type { Metadata } from "next"
import Link from "next/link"

import { SYSTEM_DOC_META } from "@/lib/system-docs.meta"

export const metadata: Metadata = {
  title: "Documents — ambientui",
  description:
    "The files that actually govern this repo: the constitution, the paper, the working rules and the review skills — rendered from their real bytes.",
}

/**
 * The index. A server component reading plain metadata — no document bytes
 * are loaded here, which is the entire reason the metadata was split from
 * the sources: listing eleven documents should not cost ~9,000 lines of
 * markdown in the page.
 */
export default function DocsIndex() {
  const groups = [...new Set(SYSTEM_DOC_META.map((d) => d.group))]
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        The documents
      </h1>
      <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
        These are not a description of the system. They are the files the
        system is actually governed by, rendered from their real bytes — edit
        one in the repo and this page changes.
      </p>

      {groups.map((group) => (
        <section key={group} className="mt-14">
          <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            {group}
          </h2>
          <ul className="mt-5 flex flex-col">
            {SYSTEM_DOC_META.filter((d) => d.group === group).map((doc) => (
              <li key={doc.id} className="border-border border-t">
                <Link
                  href={`/docs/${doc.slug}`}
                  className="hover:bg-muted/40 flex flex-col gap-1 py-5"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="font-medium">{doc.name}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {doc.path}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-sm leading-relaxed">
                    {doc.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
