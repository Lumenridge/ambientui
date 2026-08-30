"use client"

import * as React from "react"

import { Assistant } from "ambientui/assistant"
import {
  AssistantProvider,
  useAssistant,
  type AssistantMode,
} from "ambientui/assistant-context"

import { DemoWindow } from "@/components/demos/demo-window"

/**
 * ONE FORM, RENDERED — the reference page's answer to "show me".
 *
 * THE BUG THIS REPLACES. The page used to carry five Switch buttons that
 * called the page's own `setMode`, under a caption promising they drove
 * the real assistant. They did: the state changed and the label flipped to
 * Current. But /ds mounts the assistant's CONTEXT without mounting the
 * assistant, so the mode was read by nothing and nothing moved. The
 * buttons were not broken, which is why they were hard to see through —
 * every part worked except the one that would have been visible.
 *
 * WHY A LAYER PER SECTION RATHER THAN ONE PAGE-WIDE ASSISTANT. A single
 * global assistant can only be in one form at a time, so a page whose
 * subject is five coexisting forms would have to make the reader change it
 * back and forth to compare — and a reference page should let you look at
 * two things at once. Each frame gets its own provider, so five real
 * layers sit on the page in five different shapes.
 *
 * They are REAL, not pictures: a visitor can type into any of them. The
 * frame is what keeps them local — the surfaces are `position: fixed`, and
 * `DemoWindow`'s transform is what they resolve against.
 *
 * `hotkeys={false}` on every one: five layers all listening for ⌘K would
 * fight each other and the site's own palette.
 */

/** Puts the layer into its form once, and tells it where it is. */
function HoldMode({ mode, label }: { mode: AssistantMode; label: string }) {
  const { setMode, setPageChip, setPageIntel } = useAssistant()

  React.useEffect(() => {
    setMode(mode)
  }, [mode, setMode])

  // The page context contract (DESIGN.md §8) applies to an embedded layer
  // exactly as it does to a page: this one is looking at a form-factor
  // reference, and should say so rather than inheriting nothing.
  React.useEffect(() => {
    setPageChip({
      id: `ds-form-${mode}`,
      kind: "page",
      label: `${label} · Form factors`,
      icon: "layers",
    })
    setPageIntel({
      suggestions: [
        `What is the ${label.toLowerCase()} for?`,
        "How do I get to the other forms?",
        "Show me a composed answer",
      ],
      askPlaceholder: "Ask about this form…",
    })
    return () => {
      setPageChip(null)
      setPageIntel(null)
    }
  }, [mode, label, setPageChip, setPageIntel])

  return null
}

export function FormFactorDemo({
  mode,
  label,
}: {
  mode: AssistantMode
  label: string
}) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [near, setNear] = React.useState(false)

  // THE CONTEXT BUDGET, same rule as the overview's sections. Every heat
  // surface holds a WebGL context and the browser evicts the oldest when
  // it runs out; five always-mounted layers on one page is exactly the
  // shape that starves them. A frame more than 300px from the viewport
  // holds none.
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => setNear(!!e?.isIntersecting),
      { rootMargin: "300px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref}>
      <DemoWindow chrome={false}>
        {near ? (
          <AssistantProvider>
            <HoldMode mode={mode} label={label} />
            <Assistant hotkeys={false} />
          </AssistantProvider>
        ) : null}
      </DemoWindow>
    </div>
  )
}
