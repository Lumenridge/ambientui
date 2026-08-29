import {
  SYSTEM_DOC_META,
  type SystemDocMeta,
} from "@/components/ds/system-docs.meta"
import { SYSTEM_DOC_SOURCE } from "@/components/ds/system-docs.source"

/**
 * THE JOIN: each governing document's description plus its real bytes.
 *
 * The halves are separate because they have different reach. The metadata
 * (system-docs.meta.ts) is plain data any script or static page can read;
 * the sources (system-docs.source.ts) need Vite's `?raw` and pull thousands
 * of lines into whatever imports them. A page listing the documents should
 * pay for the first and not the second.
 *
 * Surfaces that render a document keep importing SYSTEM_DOCS from here and
 * are unchanged by the split.
 */

export type { SystemDocGroup, SystemDocMeta } from "@/components/ds/system-docs.meta"

export interface SystemDoc extends SystemDocMeta {
  source: string
}

export const SYSTEM_DOCS: SystemDoc[] = SYSTEM_DOC_META.map((meta) => ({
  ...meta,
  source: SYSTEM_DOC_SOURCE[meta.id] ?? "",
}))
