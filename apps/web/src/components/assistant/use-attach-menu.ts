import * as React from "react"

import type { ContextChip } from "./assistant-context"

/**
 * ATTACH — the universal gesture of the ambient layer.
 *
 * Right-click anything and it becomes context: either explained now, or
 * added silently for the next question. This is how the assistant learns what
 * you mean without you describing it, and it is the reason the layer can sit
 * above a product without knowing anything about it — a surface hands over a
 * ContextChip and nothing else.
 *
 * Two verbs, deliberately. "Explain" is the impatient path (attach, ask, open
 * the panel); "Add to chat context" is the deliberate one (attach, say
 * nothing, let the user write the question). A third would be a menu.
 */
export function useAttachMenu() {
  const [menu, setMenu] = React.useState<{
    x: number
    y: number
    chip: ContextChip
  } | null>(null)

  const open = (e: React.MouseEvent, chip: ContextChip) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, chip })
  }

  /**
   * Open it without a pointer. The gesture is the layer's most important and
   * its least discoverable — nothing on screen says "right-click me" — so a
   * guided tour has to be able to perform it ON the real thing rather than
   * describe it. The menu that appears is the same menu, and the user still
   * picks the verb.
   */
  const openAt = (x: number, y: number, chip: ContextChip) => {
    setMenu({ x, y, chip })
  }

  return { menu, open, openAt, close: () => setMenu(null) }
}
