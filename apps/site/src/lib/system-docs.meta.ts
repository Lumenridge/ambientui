/**
 * THE GOVERNING DOCUMENTS, described — not loaded.
 *
 * Metadata only: no `?raw`, no bundler feature, nothing that needs a browser
 * or Vite. A Node script can import this to build a sitemap or a route list,
 * and a static page can render the index without pulling ~9,000 lines of
 * markdown into the bundle to do it.
 *
 * Its other half is system-docs.source.ts, which holds the real bytes. They
 * are joined in system-docs.ts, and `scripts/check-system-docs.mjs` fails the
 * gate if either half names something the other does not.
 *
 * `notes/` is deliberately absent: it is gitignored provenance, not part of
 * the system's public account of itself.
 */

export type SystemDocGroup = "The system" | "Working rules" | "Skills"

export interface SystemDocMeta {
  id: string
  /**
   * The URL segment this document will own once documents are real routes
   * (/docs/<slug>). Kept here rather than derived from the id, because a URL
   * that changes when an internal id is renamed is a broken link someone
   * else already shared.
   */
  slug: string
  /** Rail label. */
  name: string
  /** The file's real path, shown so a reader can go find it. */
  path: string
  /** One line on what this document decides. Doubles as its meta description. */
  summary: string
  group: SystemDocGroup
}

export const SYSTEM_DOC_META: SystemDocMeta[] = [
  {
    id: "doc-design",
    slug: "design",
    name: "DESIGN.md",
    path: "DESIGN.md",
    group: "The system",
    summary:
      "The constitution: the two vocabularies, the token rules, the ambient layer contract, and every governance decision in the log.",
  },
  {
    id: "doc-readme",
    slug: "readme",
    name: "README.md",
    path: "README.md",
    group: "The system",
    summary: "What this is and how to run it.",
  },
  {
    id: "doc-claude",
    slug: "claude",
    name: "CLAUDE.md",
    path: "CLAUDE.md",
    group: "Working rules",
    summary:
      "The rules the AI works under: tokens only, sanctioned components only, and what counts as a governance event.",
  },
  {
    id: "doc-motion-spec",
    slug: "motion-spec",
    name: "Motion spec",
    path: "docs/motion-spec.md",
    group: "Working rules",
    summary:
      "The global motion contract for porting — roles, characters, and the arrival choreography.",
  },
  {
    id: "doc-shell-spec",
    slug: "ambient-shell-spec",
    name: "Ambient shell spec",
    path: "docs/ambient-shell-spec.md",
    group: "Working rules",
    summary: "The complete behavior contract for porting the shell.",
  },
  {
    id: "doc-figma",
    slug: "figma-sync",
    name: "Figma sync",
    path: "figma/figma-sync.md",
    group: "Working rules",
    summary:
      "Code → Figma, variables only, code wins on conflict — the procedure and the drift check.",
  },
  {
    id: "doc-ds-manager",
    slug: "ds-manager",
    name: "ds-manager",
    path: ".claude/skills/ds-manager/SKILL.md",
    group: "Skills",
    summary:
      "System impact: token and component compliance, promote-or-reject, the blast radius of a token change.",
  },
  {
    id: "doc-product-design-manager",
    slug: "product-design-manager",
    name: "product-design-manager",
    path: ".claude/skills/product-design-manager/SKILL.md",
    group: "Skills",
    summary:
      "UX judgment: the right surface for the use case, and flow consistency.",
  },
  {
    id: "doc-product-copy",
    slug: "product-copy",
    name: "product-copy",
    path: ".claude/skills/product-copy/SKILL.md",
    group: "Skills",
    summary:
      "UI copy, microcopy and voice — including the terminology register that keeps the surfaces named correctly.",
  },
  {
    id: "doc-product-copy-reference",
    slug: "product-copy-reference",
    name: "product-copy · REFERENCE",
    path: ".claude/skills/product-copy/REFERENCE.md",
    group: "Skills",
    summary:
      "What context the copy skill has and, deliberately, what it does not — an unfilled placeholder means not available.",
  },
]
