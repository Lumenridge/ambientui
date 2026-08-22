import * as React from "react"

import {
  ArrowUpRight01Icon,
  Cancel01Icon,
  CheckListIcon,
  CubeIcon,
  DragDropHorizontalIcon,
  Message01Icon,
  PictureInPictureOnIcon,
  PlusSignIcon,
  SentIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { sections } from "@/nav"

import { AnimatePresence, motion } from "framer-motion"

import {
  useFoundation,
  useMotionSpring,
  useMotionTransition,
} from "@/foundation/foundation-context"

import { useAssistant, type ContextChip } from "./assistant-context"
import {
  ResponseBlock,
  StreamingText,
  UserMessage,
  composeResponse,
  type KitResponse,
} from "./response-kit"
import { OrbCharacter, OrbField, OrbGlyph } from "./orb-character"
import { AssistantOrb } from "./orb"

type Msg = {
  id: number
  role: "user" | "assistant"
  text: string
  /** Composed response-kit payload (assistant messages). */
  kit?: KitResponse
}

/**
 * Ids are derived from the list itself, never from a shared counter: a
 * state updater can be invoked more than once for a single update, so
 * `++counter` inside one mints colliding ids — which makes React remount
 * the transcript and replay every settled answer's stream.
 */
const nextId = (m: Msg[]) => (m.length ? m[m.length - 1]!.id + 1 : 1)

const RECENT_CHATS = [
  { text: "Which components lack vocabulary docs?", when: "2h ago" },
  { text: "Show every surface using ad-hoc colors", when: "Yesterday" },
  { text: "Draft usage rules for the new table density", when: "Mon" },
]

const SUGGESTED_PROMPTS = [
  "Summarize what's on this canvas",
  "Which vocabulary components fit a pipeline view?",
  "Compose a dashboard from existing components",
]

type PaletteItem = {
  id: string
  section: string
  label: string
  desc?: string
  trailing?: string
  iconKind: "recent" | "prompt" | "avatar" | "nav" | "ask"
  navIcon?: typeof SparklesIcon
  run: () => void
}

/**
 * THE AI FORM'S PLACEHOLDER — the shimmer belongs to every ambient input,
 * not just the palette's: it is how a form says the assistant is listening.
 * Rendered as an overlay because an <input>'s own placeholder can't carry a
 * background-clipped gradient.
 */
export function ShimmerPlaceholder({
  show,
  children,
  className,
}: {
  show: boolean
  children: React.ReactNode
  className?: string
}) {
  if (!show) return null
  return (
    <span
      aria-hidden
      className={cn(
        "ambient-shimmer pointer-events-none absolute inset-y-0 left-0 flex items-center text-base",
        className
      )}
    >
      {children}
    </span>
  )
}

/** Every AI form stands the same height, whichever surface it sits in. */
const AI_FORM_ROW = "flex min-h-14 items-center gap-3"

/** Heuristic: is the palette input a question for the AI rather than a nav search? */
function looksLikeQuestion(q: string) {
  const t = q.trim()
  if (!t) return false
  if (t.endsWith("?")) return true
  if (t.split(/\s+/).length >= 4) return true
  return /^(what|why|how|which|where|when|who|can|should|does|do|is|are|explain|compare|show|summar)/i.test(
    t
  )
}

export function Assistant() {
  // Surfaces move on the motion system (DESIGN.md §5): transforms ride the
  // configured character's spring — instantly responsive, settles naturally —
  // while opacity fades on the micro tween. Exits are a quick micro fade.
  const { config } = useFoundation()
  const microT = useMotionTransition("micro")
  const surfaceSpring = useMotionSpring()
  const enterT = { ...surfaceSpring, opacity: microT }
  const {
    mode,
    setMode,
    orbState,
    setOrbState,
    pageChip,
    chips,
    removeChip,
    seedVersion,
    consumeSeededPrompt,
    consumeAutoSend,
    consumeImmediate,
    navigate,
  } = useAssistant()

  const [input, setInput] = React.useState("")
  const [messages, setMessages] = React.useState<Msg[]>([])
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  // Page context is attached by default — the chip names what the page is about
  const [pagePinned, setPagePinned] = React.useState(true)
  // Palette keyboard selection
  const [selIdx, setSelIdx] = React.useState(0)
  React.useEffect(() => {
    setSelIdx(0)
  }, [input, mode])
  const [panelPos, setPanelPos] = React.useState<{ x: number; y: number } | null>(null)
  const [panelDrag, setPanelDrag] = React.useState<{ dx: number; dy: number } | null>(null)
  const [hotZone, setHotZone] = React.useState<"dock" | "spotlight" | null>(null)

  const startPanelDrag = (e: React.PointerEvent) => {
    if (mode !== "panel" && mode !== "dock") return
    if ((e.target as HTMLElement).closest("button,input")) return
    if (mode === "dock") {
      // detach the dock into a floating panel under the pointer, keep dragging
      const x = Math.min(Math.max(8, e.clientX - 220), window.innerWidth - 200)
      const y = Math.max(8, e.clientY - 16)
      setPanelPos({ x, y })
      setPanelDrag({ dx: e.clientX - x, dy: e.clientY - y })
      setMode("panel")
      return
    }
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    setPanelPos({ x: rect.left, y: rect.top })
    setPanelDrag({ dx: e.clientX - rect.left, dy: e.clientY - rect.top })
  }

  // The hot zone lives in a REF read at drop time: listeners attach once
  // per drag. (Keying the effect on hotZone re-subscribed the pointerup
  // every time the zone changed — a release landing between
  // re-subscriptions ran a stale closure and the drop silently failed.)
  const hotZoneRef = React.useRef<"dock" | "spotlight" | null>(null)
  React.useEffect(() => {
    if (!panelDrag) return
    const move = (e: PointerEvent) => {
      setPanelPos({
        x: Math.min(Math.max(8, e.clientX - panelDrag.dx), window.innerWidth - 200),
        y: Math.min(Math.max(8, e.clientY - panelDrag.dy), window.innerHeight - 80),
      })
      const zone =
        e.clientX > window.innerWidth - 140
          ? ("dock" as const)
          : e.clientY < 180 && Math.abs(e.clientX - window.innerWidth / 2) < 320
            ? ("spotlight" as const)
            : null
      hotZoneRef.current = zone
      setHotZone(zone)
    }
    const up = () => {
      const zone = hotZoneRef.current
      if (zone === "dock") {
        setMode("dock")
        setPanelPos(null)
      } else if (zone === "spotlight") {
        setMode("spotlight")
        setPanelPos(null)
      }
      hotZoneRef.current = null
      setPanelDrag(null)
      setHotZone(null)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  }, [panelDrag, setMode])

  // Global shortcuts: ⌘K toggles the palette; Esc clears the query, then closes
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setMode(
          mode === "spotlight" ? (messages.length > 0 ? "panel" : "line") : "spotlight"
        )
      } else if (e.key === "Escape") {
        if (mode === "spotlight" && input !== "") {
          setInput("")
          return
        }
        setMode(mode === "spotlight" && messages.length > 0 ? "panel" : "line")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mode, messages.length, input, setMode])

  // Focus input when a surface opens; pick up seeded prompts (right-click → Explain)
  React.useEffect(() => {
    if (mode !== "line") {
      const seeded = consumeSeededPrompt()
      // a quick-ask arrives already asked; an explain arrives as a draft
      if (seeded)
        consumeAutoSend()
          ? send(seeded, consumeImmediate())
          : setInput(seeded)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [mode, seedVersion, consumeSeededPrompt])

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const asking = messages.length > 0

  // In the palette, entering answer mode swaps the top search bar for a bottom
  // follow-up bar — move focus there.
  React.useEffect(() => {
    if (mode === "spotlight") {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [asking, mode])

  const clearConversation = () => {
    setMessages([])
  }

  // AI activation while typing: the moment the input reads as a question
  // (the "Ask ambientui" path), the ambient state turns to listening —
  // the orb and every live border lean in before send is even pressed.
  const busyRef = React.useRef(false)
  React.useEffect(() => {
    if (busyRef.current) return
    if (mode === "line") {
      setOrbState("still")
      return
    }
    setOrbState(looksLikeQuestion(input) ? "listening" : "still")
  }, [input, mode, setOrbState])

  const send = (textOverride?: string, immediate = false) => {
    const text = (typeof textOverride === "string" ? textOverride : input).trim()
    if (!text) return
    setInput("")
    setMessages((m) => [...m, { id: nextId(m), role: "user", text }])
    if (mode === "line") setMode("panel")
    // THE RESPONSE KIT (v0): page context + question → a composed answer
    // object, driving the real ambient pipeline — thinking while composing,
    // answer while streaming, still on settle. A model replaces
    // composeResponse; the objects and states stay.
    busyRef.current = true
    setOrbState("thinking")
    // `immediate`: the surface that sent this already showed the thinking
    // beat (quick ask), so composing waits only a frame
    window.setTimeout(() => {
      const kit = composeResponse(text, pageChip, chips)
      setMessages((m) => [
        ...m,
        { id: nextId(m), role: "assistant", text: kit.text, kit },
      ])
      setOrbState("answer")
    }, immediate ? 60 : 1100)
  }

  const settleResponse = () => {
    busyRef.current = false
    setOrbState("still")
  }

  let surfaceEl: React.ReactNode = null

  const transcriptBlock = (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      {messages.length === 0 && (
        <div className="px-1 pt-3">
          <h3 className="text-[15px] font-semibold">
            {pageChip ? "Ask about this page" : "Ask about ambientui"}
          </h3>
          <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
            I can see this page and its context. Try one of these:
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                className="border-border hover:bg-(--wash-strong) flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-start text-[13px]"
              >
                <span className="min-w-0 flex-1">{p}</span>
                <span className="text-muted-foreground shrink-0">
                  <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={1.8} />
                </span>
              </button>
            ))}
          </div>
          <p className="text-muted-foreground mt-4 text-[12px]">
            Tip: right-click anything on the page to explain it or add it to
            this chat's context.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {messages.map((m) =>
          m.role === "user" ? (
            <UserMessage key={m.id} text={m.text} />
          ) : m.kit ? (
            <ResponseBlock
              key={m.id}
              response={m.kit}
              live={m.id === messages[messages.length - 1]?.id}
              onSettled={settleResponse}
            />
          ) : (
            <StreamingText
              key={m.id}
              text={m.text}
              live={false}
              className="block max-w-full text-[13px] leading-relaxed"
            />
          )
        )}
      </div>
    </div>
  )

  // The heat field + its frost, self-clipped: the field canvas is
  // oversized past the surface, so the clip MUST live here — relying on
  // the outer container's overflow leaks the field (the dock has none).
  const fieldLayers = (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <OrbField
        state={orbState}
        colors={config.orb.useAccent ? undefined : config.orb.colors}
        speeds={config.orb.speeds}
      />
      <div className="ambient-field-frost pointer-events-none absolute inset-0" />
    </div>
  )

  const surface = (
    <div className="ambient-glass border-(--glass-border) relative flex h-full min-h-0 flex-col border">
      {fieldLayers}
      <div className="relative flex min-h-0 flex-1 flex-col">
      {/* header — the drag handle IS the form switcher: drag to float, dock, or spotlight */}
      <div
        onPointerDown={startPanelDrag}
        className={cn(
          "group/header relative flex items-center gap-2 border-b border-border px-3 py-2 select-none",
          panelDrag ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <AssistantMark size={20} />
        <span className="text-sm font-medium">ambientui</span>
        <span className="text-muted-foreground/70 absolute left-1/2 hidden -translate-x-1/2 group-hover/header:inline-flex">
          <HugeiconsIcon icon={DragDropHorizontalIcon} size={15} strokeWidth={1.8} />
        </span>
        <div className="text-muted-foreground ms-auto flex items-center gap-1">
          <HeaderBtn label="Minimize" onClick={() => setMode("line")}>
            <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={1.8} />
          </HeaderBtn>
        </div>
      </div>

      {transcriptBlock}

      {/* input */}
      <div className="border-(--glass-border) border-t px-4 py-2">
        <ContextRow
          pageChip={pageChip}
          pagePinned={pagePinned}
          onTogglePage={setPagePinned}
          chips={chips}
          removeChip={removeChip}
        />
        <InputRow
          inputRef={inputRef}
          input={input}
          setInput={setInput}
          onSend={send}
          pageChip={null}
          chips={[]}
          removeChip={removeChip}
          placeholder="Ask a follow-up…"
        />
      </div>
      </div>
    </div>
  )

  if (mode === "spotlight") {
    const q = input.trim()
    const question = looksLikeQuestion(input)

    const goNav = (id: string) => {
      navigate?.(id)
      setMode("line")
    }
    const askItem: PaletteItem = {
      id: "ask",
      section: "",
      label: "Ask ambientui",
      desc: `“${q}”`,
      iconKind: "ask",
      run: () => send(),
    }
    const navItems = (list: typeof sections): PaletteItem[] =>
      list.map((s) => ({
        id: `nav-${s.id}`,
        section: "Jump to",
        label: s.label,
        desc: s.description,
        iconKind: "nav" as const,
        navIcon: s.icon,
        run: () => goNav(s.id),
      }))
    let paletteItems: PaletteItem[] = []
    if (!asking) {
      if (question) {
        paletteItems = [askItem]
      } else if (q) {
        const ql = q.toLowerCase()
        paletteItems = [
          askItem,
          ...navItems(
            sections.filter(
              (s) =>
                s.label.toLowerCase().includes(ql) ||
                s.description.toLowerCase().includes(ql)
            )
          ),
        ]
      } else {
        paletteItems = [
          ...RECENT_CHATS.map((r) => ({
            id: `recent-${r.text}`,
            section: "Recent chats",
            label: r.text,
            trailing: r.when,
            iconKind: "recent" as const,
            run: () => send(r.text),
          })),
          ...SUGGESTED_PROMPTS.map((p) => ({
            id: `prompt-${p}`,
            section: "Suggested for this page",
            label: p,
            iconKind: "prompt" as const,
            run: () => send(p),
          })),
          {
            id: "open-chat",
            section: "Suggested for this page",
            label: "Open chat with page context",
            desc: pageChip?.label,
            iconKind: "avatar" as const,
            run: () => setMode("panel"),
          },
          ...navItems(sections),
        ]
      }
    }
    const onPaletteKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault()
        if (paletteItems.length) setSelIdx((i) => (i + 1) % paletteItems.length)
      } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault()
        if (paletteItems.length)
          setSelIdx((i) => (i - 1 + paletteItems.length) % paletteItems.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (paletteItems.length)
          paletteItems[Math.min(selIdx, paletteItems.length - 1)]?.run()
        else send()
      } else if (e.key === "Backspace" && input === "" && chips.length > 0) {
        removeChip(chips[chips.length - 1].id)
      }
    }
    surfaceEl = (
      <motion.div
        key="spotlight"
        // no backdrop — the palette floats on the page (glass carries the
        // separation); the full-viewport layer still catches outside clicks
        className="fixed inset-0 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: microT }}
        transition={microT}
        onClick={() => setMode(messages.length ? "panel" : "line")}
      >
        <motion.div
          className="mx-auto mt-[9vh] w-[720px] max-w-[92vw]"
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99, transition: microT }}
          transition={enterT}
          onClick={(e) => e.stopPropagation()}
        >
            <div
              className="ambient-glass ambient-live-border border-(--glass-border) relative flex max-h-[72vh] flex-col overflow-hidden rounded-2xl border shadow-[0_32px_100px_-16px_rgba(0,0,0,0.6),0_8px_32px_-12px_rgba(0,0,0,0.4)]"
              data-orb-state={orbState}
            >
              {fieldLayers}
              <div className="relative flex min-h-0 flex-col">
          {/* search / ask input — hidden in answer mode (follow-up bar takes over) */}
          {!asking && (
            <>
              <div className="border-(--glass-border) border-b px-4 py-2">
                <div className={AI_FORM_ROW}>
                <MiniAvatar />
                <div className="relative min-w-0 flex-1">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onPaletteKeyDown}
                    aria-label="Search or ask a question in ambientui"
                    className="w-full bg-transparent text-base outline-none"
                  />
                  <ShimmerPlaceholder show={input === ""}>
                    Search or ask a question in ambientui…
                  </ShimmerPlaceholder>
                </div>
              </div>

              {/* attached context lives inside the header band — one hairline */}
              {(pageChip || chips.length > 0) && (
                <div className="pt-2">
                  <ContextRow
                    pageChip={pageChip}
                    pagePinned={pagePinned}
                    onTogglePage={setPagePinned}
                    chips={chips}
                    removeChip={removeChip}
                  />
                </div>
              )}
              </div>
            </>
          )}

          {asking ? (
            <>
              <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                <AssistantMark size={18} />
                <span className="text-[13px] font-medium">AI Overview</span>
                <div className="text-muted-foreground ms-auto flex items-center gap-1">
                  <HeaderBtn label="Open in chat window" onClick={() => setMode("panel")}>
                    <HugeiconsIcon
                      icon={PictureInPictureOnIcon}
                      size={14}
                      strokeWidth={1.8}
                    />
                  </HeaderBtn>
                  <HeaderBtn label="Back to search" onClick={clearConversation}>
                    <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.8} />
                  </HeaderBtn>
                </div>
              </div>
              {transcriptBlock}
              {/* follow-up bar at the bottom, with context attached — like the panel */}
              <div className="border-(--glass-border) border-t px-4 py-2">
                <ContextRow
                  pageChip={pageChip}
                  pagePinned={pagePinned}
                  onTogglePage={setPagePinned}
                  chips={chips}
                  removeChip={removeChip}
                />
                <InputRow
                  inputRef={inputRef}
                  input={input}
                  setInput={setInput}
                  onSend={send}
                  pageChip={null}
                  chips={[]}
                  removeChip={removeChip}
                  placeholder="Ask a follow-up…"
                        />
              </div>
            </>
          ) : (
            <PaletteList
              items={paletteItems}
              selected={selIdx}
              onHover={setSelIdx}
              footer={
                question ? (
                  <p className="text-muted-foreground px-2 pt-2 pb-1 text-[12px]">
                    Answers are grounded in the attached context.
                  </p>
                ) : q && paletteItems.length === 1 ? (
                  <p className="text-muted-foreground px-2 py-3 text-[13px]">
                    No pages match — ↵ asks ambientui instead.
                  </p>
                ) : null
              }
            />
          )}

          <div className="text-muted-foreground border-(--glass-border) flex items-center gap-3 border-t px-3 py-2 text-xs">
            <span className="flex items-center gap-2">
              <OrbGlyph
                size={16}
                color={
                  config.orb.useAccent
                    ? undefined
                    : config.orb.colors[Math.min(1, config.orb.colors.length - 1)]
                }
              />
              ambientui
            </span>
            <span className="ms-auto flex items-center gap-1.5">
              Select <PaletteKey>↵</PaletteKey>
            </span>
            <span className="bg-(--glass-border) h-3.5 w-px" />
            <span className="flex items-center gap-1.5">
              Toggle <PaletteKey>⌘</PaletteKey>
              <PaletteKey>K</PaletteKey>
            </span>
          </div>
              </div>
            </div>
        </motion.div>
      </motion.div>
    )
  }

  if (mode === "dock") {
    surfaceEl = (
      <motion.div
        key="dock"
        data-orb-state={orbState}
        className="ambient-live-border fixed top-0 bottom-0 right-0 z-50 w-[420px] max-w-[90vw] shadow-[-24px_0_70px_-16px_rgba(0,0,0,0.4)]"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40, transition: microT }}
        transition={enterT}
      >
        {surface}
      </motion.div>
    )
  }

  // panel — draggable, with snap zones for dock / spotlight
  if (mode === "panel") {
    surfaceEl = (
      <motion.div
        key="panel"
        ref={panelRef}
        data-orb-state={orbState}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.99, transition: microT }}
        transition={enterT}
        className="ambient-live-border fixed z-50 h-[560px] max-h-[80vh] w-[440px] max-w-[92vw] overflow-hidden rounded-xl shadow-[0_32px_90px_-12px_rgba(0,0,0,0.5),0_8px_28px_-8px_rgba(0,0,0,0.35)]"
        style={
          panelPos
            ? { left: panelPos.x, top: panelPos.y }
            : { right: 16, bottom: 16 }
        }
      >
        {surface}
      </motion.div>
    )
  }

  return (
    <>
      {/* Only render the orb in its own mode: kept mounted-but-hidden it
          held a WebGL context and a 60fps loop behind every open surface. */}
      {mode === "line" && <AssistantOrb />}
      {mode === "panel" && panelDrag && <SnapZones hot={hotZone} />}
      <AnimatePresence>{surfaceEl}</AnimatePresence>
    </>
  )
}

/**
 * The assistant's mark: the real OrbCharacter — one shader instance per
 * surface mark, riding the live ambient state. (The CSS OrbGlyph remains
 * for incidental marks: the footer brand and settled transcript entries,
 * where a context per row would stack up — DESIGN.md §12.)
 */
function AssistantMark({ size }: { size: number }) {
  const { config } = useFoundation()
  const { orbState } = useAssistant()
  return (
    <span className="inline-flex shrink-0">
      <OrbCharacter
        size={size}
        state={orbState}
        colors={config.orb.useAccent ? undefined : config.orb.colors}
        speeds={config.orb.speeds}
      />
    </span>
  )
}

/** The AI avatar, pulled in close to the palette input. */
function MiniAvatar({ small }: { small?: boolean }) {
  const { config } = useFoundation()
  // `small` is the list-row variant: incidental, so it wears the CSS twin.
  // The surface's own mark (the input avatar) keeps the real character.
  if (small)
    return (
      <OrbGlyph
        size={24}
        color={
          config.orb.useAccent
            ? undefined
            : config.orb.colors[Math.min(1, config.orb.colors.length - 1)]
        }
      />
    )
  return <AssistantMark size={32} />
}

/** Raycast-style keycap chip — a neutral wash square on the glass. */
function PaletteKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-(--glass-wash) inline-flex min-w-5 items-center justify-center rounded-sm px-1 py-0.5 font-mono text-[10px]">
      {children}
    </kbd>
  )
}

const rowClass =
  "hover:bg-(--glass-wash) flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-start text-sm"

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground px-2 pt-3.5 pb-1.5 text-xs font-medium first:pt-1.5">
      {children}
    </div>
  )
}

function PaletteItemIcon({ item }: { item: PaletteItem }) {
  if (item.iconKind === "avatar") return <MiniAvatar small />
  if (item.iconKind === "prompt" || item.iconKind === "ask")
    return (
      <span className="text-muted-foreground">
        <HugeiconsIcon icon={SparklesIcon} size={16} strokeWidth={1.8} />
      </span>
    )
  return (
    <span className="text-muted-foreground">
      <HugeiconsIcon
        icon={item.iconKind === "recent" ? Message01Icon : (item.navIcon ?? Message01Icon)}
        size={16}
        strokeWidth={1.8}
      />
    </span>
  )
}

/** The palette's list: one flat, keyboard-navigable model with section headers. */
function PaletteList({
  items,
  selected,
  onHover,
  footer,
}: {
  items: PaletteItem[]
  selected: number
  onHover: (i: number) => void
  footer?: React.ReactNode
}) {
  React.useEffect(() => {
    document
      .getElementById(`palette-item-${selected}`)
      ?.scrollIntoView({ block: "nearest" })
  }, [selected])
  let lastSection: string | null = null
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      {items.map((item, i) => {
        const header =
          item.section && item.section !== lastSection ? item.section : null
        lastSection = item.section
        return (
          <React.Fragment key={item.id}>
            {header && <SectionLabel>{header}</SectionLabel>}
            <button
              id={`palette-item-${i}`}
              type="button"
              onClick={item.run}
              onMouseEnter={() => onHover(i)}
              className={cn(rowClass, i === selected && "bg-(--glass-wash)")}
            >
              <PaletteItemIcon item={item} />
              <span
                className={cn(
                  "min-w-0 truncate",
                  item.iconKind === "nav" && "shrink-0"
                )}
              >
                {item.label}
              </span>
              {item.desc && (
                <span className="text-muted-foreground min-w-0 truncate text-[12px]">
                  {item.desc}
                </span>
              )}
              {item.trailing && (
                <span className="text-muted-foreground ms-auto shrink-0 text-[11px]">
                  {item.trailing}
                </span>
              )}
              {i === selected && !item.trailing && (
                <kbd className="text-muted-foreground bg-(--glass-wash) ms-auto shrink-0 rounded-sm px-1.5 py-0.5 text-[11px]">
                  ↵
                </kbd>
              )}
            </button>
          </React.Fragment>
        )
      })}
      {footer}
    </div>
  )
}

function SnapZones({ hot }: { hot: "dock" | "spotlight" | null }) {
  const zone = (active: boolean) =>
    cn(
      // glass: translucent fill + backdrop blur keeps the labels readable over content
      "fixed z-40 flex items-center justify-center rounded-lg border border-dashed text-xs font-medium pointer-events-none backdrop-blur-md",
      active
        ? "border-[var(--app-blue)] bg-[var(--app-blue-wash)] text-[var(--app-blue)]"
        : "border-muted-foreground/40 bg-(--scrim) text-muted-foreground"
    )
  return (
    <>
      <div className={cn(zone(hot === "dock"), "inset-y-2 right-2 w-28")}>Dock</div>
      <div
        className={cn(
          zone(hot === "spotlight"),
          "top-2 left-1/2 h-28 w-[640px] max-w-[80vw] -translate-x-1/2"
        )}
      >
        Spotlight
      </div>
    </>
  )
}

function HeaderBtn({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="hover:bg-accent hover:text-foreground flex size-7 items-center justify-center rounded-[4px]"
    >
      {children}
    </button>
  )
}

const chipKindIcon: Record<ContextChip["kind"], typeof CubeIcon> = {
  page: SparklesIcon,
  control: CheckListIcon,
  target: CubeIcon,
  cell: CubeIcon,
}

function IconTile({
  icon,
  compact,
}: {
  icon: typeof CubeIcon
  compact?: boolean
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-[var(--app-blue-wash)] text-[var(--app-blue)]",
        compact ? "size-4 rounded-[4px]" : "size-5 rounded-[5px]"
      )}
    >
      <HugeiconsIcon icon={icon} size={compact ? 10 : 12} strokeWidth={1.8} />
    </span>
  )
}

/**
 * CONTEXT CHIP — one attachment the assistant will answer against: the page
 * itself, or anything the user right-clicked into the conversation.
 *
 * THE ANATOMY IS ONE OBJECT, not a per-surface treatment: icon tile (typed by
 * what was attached) · label · a squared remove control. Two sizes only —
 * `default` where the composer has a row of its own (palette, panel), and
 * `compact` where chips share a line with the input (quick ask). Nothing
 * else varies; a surface picks the size, never the look.
 */
export function ContextChipView({
  chip,
  compact,
  onRemove,
  className,
}: {
  chip: ContextChip
  compact?: boolean
  onRemove?: () => void
  className?: string
}) {
  return (
    <span
      className={cn(
        "border-border bg-(--wash) inline-flex max-w-full items-center rounded-lg border font-medium",
        compact
          ? "gap-1.5 py-0.5 ps-1 pe-0.5 text-[11.5px]"
          : "gap-2 py-1 ps-1.5 pe-1 text-[12.5px]",
        className
      )}
    >
      <IconTile icon={chipKindIcon[chip.kind]} compact={compact} />
      <span className="min-w-0 max-w-56 truncate">{chip.label}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${chip.label}`}
          onClick={onRemove}
          className={cn(
            "bg-accent text-muted-foreground hover:text-foreground flex shrink-0 items-center justify-center rounded-md",
            compact ? "size-[18px]" : "size-[22px]"
          )}
        >
          <HugeiconsIcon
            icon={Cancel01Icon}
            size={compact ? 11 : 13}
            strokeWidth={1.8}
          />
        </button>
      )}
    </span>
  )
}

/**
 * Context row above the chat input: the page context as an "Attach context +"
 * button (unattached) or an icon-tile chip with a squared ✕ (attached), plus
 * any explicit attachment chips in the same anatomy.
 */
function ContextRow({
  pageChip,
  pagePinned,
  onTogglePage,
  chips,
  removeChip,
}: {
  pageChip: ContextChip | null
  pagePinned: boolean
  onTogglePage: (pinned: boolean) => void
  chips: ContextChip[]
  removeChip: (id: string) => void
}) {
  if (!pageChip && chips.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-2">
      {pageChip &&
        (pagePinned ? (
          <ContextChipView chip={pageChip} onRemove={() => onTogglePage(false)} />
        ) : (
          <button
            type="button"
            title="Attach this page as context"
            onClick={() => onTogglePage(true)}
            className="border-border bg-popover hover:bg-(--wash-strong) inline-flex items-center gap-2 rounded-lg border py-1 ps-1.5 pe-2.5 text-[12.5px] font-medium transition-colors"
          >
            <IconTile icon={SparklesIcon} />
            Attach context
            <span className="text-muted-foreground">
              <HugeiconsIcon icon={PlusSignIcon} size={13} strokeWidth={1.8} />
            </span>
          </button>
        ))}
      {chips.map((c) => (
        <ContextChipView key={c.id} chip={c} onRemove={() => removeChip(c.id)} />
      ))}
    </div>
  )
}

/**
 * CONTEXT PILL — one attached thing the assistant can see. The page's own
 * chip is muted (it arrived automatically); anything the user attached
 * carries the ambient accent and a remove control.
 */
function InputRow({
  inputRef,
  input,
  setInput,
  onSend,
  pageChip,
  chips,
  removeChip,
  placeholder,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  input: string
  setInput: (v: string) => void
  onSend: () => void
  pageChip: ContextChip | null
  chips: ContextChip[]
  removeChip: (id: string) => void
  placeholder: string
}) {
  return (
    <div
      className={cn(
        // THE AI FORM: the input sits plain ON the glass — no filled pill,
        // no inner border; the surface's own hairline separates it.
        AI_FORM_ROW
      )}
    >
      {pageChip && <ContextChipView chip={pageChip} compact />}
      {chips.map((c) => (
        <ContextChipView
          key={c.id}
          chip={c}
          compact
          onRemove={() => removeChip(c.id)}
        />
      ))}
      <div className="relative min-w-0 flex-1">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSend()
          }}
          aria-label={placeholder}
          className="w-full bg-transparent text-base outline-none"
        />
        <ShimmerPlaceholder show={input === ""}>{placeholder}</ShimmerPlaceholder>
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Send"
        onClick={onSend}
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        <HugeiconsIcon icon={SentIcon} size={16} strokeWidth={1.8} />
      </Button>
    </div>
  )
}
