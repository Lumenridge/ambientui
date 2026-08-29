import {
  AMBIENT_COMPONENTS as AMBIENT_DOCS,
  SHADCN_DEFAULT_COMPONENTS as SHADCN_DOCS,
  type ComponentDoc,
} from "@site/lib/catalog"
import { STORIES, type StoryEntry } from "@/components/ds/stories"

/**
 * THE JOIN. Prose lives in catalog.ts (serializable, React-free), demos in
 * stories.tsx (the whole kit). A surface that needs both — /ds, which is the
 * live reference — asks here; a surface that needs only what a component IS
 * imports the catalog alone and pays nothing for the demos.
 *
 * The two halves are kept in step mechanically by scripts/check-catalog.mjs,
 * not by whoever edits one of them next.
 */
export type ComponentEntry = ComponentDoc & StoryEntry

const join = (docs: ComponentDoc[]): ComponentEntry[] =>
  docs.map((d) => {
    const live = STORIES[d.id]
    return { ...d, stories: live?.stories ?? [], playground: live?.playground }
  })

export const SHADCN_DEFAULT_COMPONENTS = join(SHADCN_DOCS)
export const AMBIENT_COMPONENTS = join(AMBIENT_DOCS)
