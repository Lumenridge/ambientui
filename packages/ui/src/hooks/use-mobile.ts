"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * The viewport is an external store, so it is READ as one rather than
 * mirrored into state. The previous version seeded `undefined`, then wrote
 * the real value from an effect — which meant every consumer rendered once
 * as "not mobile" before correcting itself, and cost a cascading render to
 * do it.
 */
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    // no viewport to measure server-side; desktop is the safer assumption,
    // and it matches what the old undefined seed resolved to
    () => false
  )
}
