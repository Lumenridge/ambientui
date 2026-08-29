/**
 * THE GOVERNING DOCUMENTS' REAL BYTES.
 *
 * `?raw` means /ds renders the file that actually rules the repo — edit
 * DESIGN.md and the page changes, because there is no copy to fall out of
 * step. It also means a missing file is a BUILD error rather than an empty
 * page, which is the guarantee worth keeping.
 *
 * THIS IS THE ONLY VITE-SPECIFIC MODULE LEFT in the docs pipeline, and that
 * is deliberate: when the site moves to build-time file reads, this file is
 * the one that gets replaced, and everything importing system-docs.meta.ts
 * (route lists, sitemaps, indexes) carries over untouched.
 *
 * The keys are ids from system-docs.meta.ts; check-system-docs.mjs fails the
 * gate if the two halves ever name different sets.
 */
import claudeMd from "../../../../../CLAUDE.md?raw"
import designMd from "../../../../../DESIGN.md?raw"
import paperMd from "../../../../../PAPER.md?raw"
import readmeMd from "../../../../../README.md?raw"
import motionSpecMd from "../../../../../docs/motion-spec.md?raw"
import shellSpecMd from "../../../../../docs/ambient-shell-spec.md?raw"
import figmaMd from "../../../../../figma/figma-sync.md?raw"
import dsManagerMd from "../../../../../.claude/skills/ds-manager/SKILL.md?raw"
import productDesignManagerMd from "../../../../../.claude/skills/product-design-manager/SKILL.md?raw"
import productCopyMd from "../../../../../.claude/skills/product-copy/SKILL.md?raw"
import productCopyReferenceMd from "../../../../../.claude/skills/product-copy/REFERENCE.md?raw"

export const SYSTEM_DOC_SOURCE: Record<string, string> = {
  "doc-design": designMd,
  "doc-paper": paperMd,
  "doc-readme": readmeMd,
  "doc-claude": claudeMd,
  "doc-motion-spec": motionSpecMd,
  "doc-shell-spec": shellSpecMd,
  "doc-figma": figmaMd,
  "doc-ds-manager": dsManagerMd,
  "doc-product-design-manager": productDesignManagerMd,
  "doc-product-copy": productCopyMd,
  "doc-product-copy-reference": productCopyReferenceMd,
}
