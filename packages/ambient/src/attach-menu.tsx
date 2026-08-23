import * as React from "react"

import { Icon } from "@ambientui/ui/components/icon"
import { cn } from "@ambientui/ui/lib/utils"

import { useAssistant, type ContextChip } from "./assistant-context"

/**
 * The two components of the attach gesture: the menu a right-click opens,
 * and the inline "Ask AI" a row reveals on hover. The hook that positions
 * the menu lives in use-attach-menu.ts.
 */
export function AttachMenu({
  menu,
  onClose,
}: {
  menu: { x: number; y: number; chip: ContextChip } | null
  onClose: () => void
}) {
  const { explain, addChip, setMode } = useAssistant()
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!menu) return
    // A pointerdown INSIDE the menu is the first half of choosing an item.
    // Dismissing on it unmounts the menu before the click can land, which is
    // why both verbs were unreachable: the gesture that opens the item is the
    // same gesture that was closing it.
    const dismiss = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) return
      onClose()
    }
    // any click outside, scroll, or Escape closes it — a context menu that
    // survives the next interaction is a modal nobody asked for
    window.addEventListener("pointerdown", dismiss)
    window.addEventListener("scroll", dismiss, true)
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", key)
    return () => {
      window.removeEventListener("pointerdown", dismiss)
      window.removeEventListener("scroll", dismiss, true)
      window.removeEventListener("keydown", key)
    }
  }, [menu, onClose])

  if (!menu) return null

  const item =
    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-(--glass-wash)"

  return (
    <div
      ref={ref}
      role="menu"
      // clamped so a right-click near an edge still lands on screen
      style={{
        left: Math.min(menu.x, window.innerWidth - 220),
        top: Math.min(menu.y, window.innerHeight - 110),
      }}
      className="ambient-glass border-(--glass-border) fixed z-50 w-52 rounded-xl border p-1 shadow-lg"
    >
      <div className="text-muted-foreground truncate px-2 py-1 font-mono text-xs">
        {menu.chip.label}
      </div>
      <button
        type="button"
        role="menuitem"
        className={item}
        onClick={() => {
          explain(menu.chip)
          onClose()
        }}
      >
        <Icon name="sparkles" size={13} />
        Explain with AI
      </button>
      <button
        type="button"
        role="menuitem"
        className={cn(item, "text-muted-foreground")}
        onClick={() => {
          addChip(menu.chip)
          setMode("spotlight")
          onClose()
        }}
      >
        <Icon name="plus" size={13} />
        Add to chat context
      </button>
    </div>
  )
}

/**
 * The inline entry point: a quiet "Ask AI" that appears on a row's hover.
 *
 * Putting it IN the row rather than in a toolbar is the whole point — the
 * question is asked where the thing is, so the user never has to describe
 * what they were looking at.
 *
 * IT FLOATS RATHER THAN SITTING IN FLOW. An affordance that appears on hover
 * must not resize the thing being hovered: in flow it made every row grow a
 * few pixels the moment the pointer landed, which reads as the list flinching.
 * Positioned absolutely, revealing it costs no layout at all.
 *
 * The row must therefore be `relative group/row`.
 */
export function AskAI({
  chip,
  prompt,
  className,
}: {
  chip: ContextChip
  /** Overrides the default "Explain …" question. */
  prompt?: string
  className?: string
}) {
  const { addChip, seedPrompt, setMode } = useAssistant()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        addChip(chip)
        seedPrompt(prompt ?? `Explain ${chip.label}`, true)
        setMode("panel")
      }}
      className={cn(
        "border-border bg-card text-muted-foreground hover:text-foreground absolute end-2 top-1/2 hidden shrink-0 -translate-y-1/2 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs group-hover/row:inline-flex",
        className
      )}
    >
      <Icon name="sparkles" size={11} />
      Ask AI
    </button>
  )
}
