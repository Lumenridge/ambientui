"use client"

import * as React from "react"

import {
  useAssistant,
  type ContextChip,
  type PageIntel,
} from "ambientui/assistant-context"

/**
 * A PAGE DECLARING ITSELF — the context contract, as one mountable line.
 *
 * DESIGN.md §8 requires every page inside the layer to say what it is, and
 * an audit found the rule kept by exactly the two surfaces whose authors
 * remembered it. A rule that each page must re-implement is a rule that
 * decays; this is the one component that does it, so a new page declares
 * by mounting rather than by remembering a hook, an effect and a cleanup.
 *
 * IT CLEARS ON UNMOUNT. A chip that outlives its page is worse than no
 * chip: the assistant then answers confidently about a surface the user
 * has already left, which is the exact failure the contract exists to
 * prevent. The effect's cleanup is the whole point of putting this in a
 * component rather than in each page's own body.
 *
 * The props are the layer's own exported types, so a change to the shape
 * of the contract fails this file first.
 */
export function DeclareContext({
  chip,
  intel,
}: {
  chip: ContextChip
  /** What this page knows that the layer should offer — optional. */
  intel?: PageIntel
}) {
  const { setPageChip, setPageIntel } = useAssistant()

  // The chip is an object literal at every call site, so depending on the
  // object itself would re-declare on every render. Its fields are the
  // real identity.
  const { id, label, kind, icon } = chip

  React.useEffect(() => {
    setPageChip({ id, label, kind, icon })
    return () => setPageChip(null)
  }, [id, label, kind, icon, setPageChip])

  /**
   * Intel is a literal at every call site, so it is a NEW OBJECT on every
   * render. Depending on it would re-announce forever; suppressing the
   * dependency would announce a stale one. Neither is acceptable, so the
   * identity is its serialisable content, and the freshest object is read
   * through a ref when that content actually changes.
   *
   * `onJump` is a function and JSON drops it — deliberately. A page that
   * swaps its jump handler without changing a single visible suggestion
   * has not changed what the layer should offer, and the ref hands over
   * the current function either way.
   */
  const key = intel ? JSON.stringify(intel) : ""
  const latest = React.useRef(intel)

  // The ref is synced in an EFFECT, not in the render body: writing a ref
  // during render is a compiler error here, and rightly — a render that
  // mutates is a render that cannot be replayed. Declared first, so it has
  // run by the time the announcing effect below reads it.
  React.useEffect(() => {
    latest.current = intel
  })

  React.useEffect(() => {
    if (!key) return
    setPageIntel(latest.current ?? null)
    return () => setPageIntel(null)
  }, [key, setPageIntel])

  return null
}
