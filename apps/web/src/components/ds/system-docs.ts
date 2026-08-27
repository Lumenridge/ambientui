// The governing documents, imported as their real bytes. `?raw` means /ds
// renders the file that actually rules the repo — edit DESIGN.md and this
// page changes, because there is no copy to fall out of step.
//
// `notes/` is deliberately absent: it is gitignored provenance, not part of
// the system's public account of itself.
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

export type SystemDocGroup = "The system" | "Working rules" | "Skills"

export interface SystemDoc {
  id: string
  /** Rail label. */
  name: string
  /** The file's real path, shown so a reader can go find it. */
  path: string
  /** One line on what this document decides. */
  summary: string
  group: SystemDocGroup
  source: string
}

export const SYSTEM_DOCS: SystemDoc[] = [
  {
    id: "doc-design",
    name: "DESIGN.md",
    path: "DESIGN.md",
    group: "The system",
    summary:
      "The constitution: the two vocabularies, the token rules, the ambient layer contract, and every governance decision in the log.",
    source: designMd,
  },
  {
    id: "doc-paper",
    name: "PAPER.md",
    path: "PAPER.md",
    group: "The system",
    summary: "The argument the repo is evidence for.",
    source: paperMd,
  },
  {
    id: "doc-readme",
    name: "README.md",
    path: "README.md",
    group: "The system",
    summary: "What this is and how to run it.",
    source: readmeMd,
  },
  {
    id: "doc-claude",
    name: "CLAUDE.md",
    path: "CLAUDE.md",
    group: "Working rules",
    summary:
      "The rules the AI works under: tokens only, sanctioned components only, and what counts as a governance event.",
    source: claudeMd,
  },
  {
    id: "doc-motion-spec",
    name: "Motion spec",
    path: "docs/motion-spec.md",
    group: "Working rules",
    summary: "The global motion contract for porting — roles, characters, and the arrival choreography.",
    source: motionSpecMd,
  },
  {
    id: "doc-shell-spec",
    name: "Ambient shell spec",
    path: "docs/ambient-shell-spec.md",
    group: "Working rules",
    summary: "The complete behavior contract for porting the shell.",
    source: shellSpecMd,
  },
  {
    id: "doc-figma",
    name: "Figma sync",
    path: "figma/figma-sync.md",
    group: "Working rules",
    summary:
      "Code → Figma, variables only, code wins on conflict — the procedure and the drift check.",
    source: figmaMd,
  },
  {
    id: "doc-ds-manager",
    name: "ds-manager",
    path: ".claude/skills/ds-manager/SKILL.md",
    group: "Skills",
    summary:
      "System impact: token and component compliance, promote-or-reject, the blast radius of a token change.",
    source: dsManagerMd,
  },
  {
    id: "doc-product-design-manager",
    name: "product-design-manager",
    path: ".claude/skills/product-design-manager/SKILL.md",
    group: "Skills",
    summary:
      "UX judgment: the right surface for the use case, and flow consistency.",
    source: productDesignManagerMd,
  },
  {
    id: "doc-product-copy",
    name: "product-copy",
    path: ".claude/skills/product-copy/SKILL.md",
    group: "Skills",
    summary:
      "UI copy, microcopy and voice — including the terminology register that keeps the surfaces named correctly.",
    source: productCopyMd,
  },
  {
    id: "doc-product-copy-reference",
    name: "product-copy · REFERENCE",
    path: ".claude/skills/product-copy/REFERENCE.md",
    group: "Skills",
    summary:
      "What context the copy skill has and, deliberately, what it does not — an unfilled placeholder means not available.",
    source: productCopyReferenceMd,
  },
]
