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

import { cn } from "@workspace/ui/lib/utils"

import { sections } from "@/nav"

import { AnimatePresence, motion } from "framer-motion"

import {
  useFoundation,
  useMotionSpring,
  useMotionTransition,
} from "@/foundation/foundation-context"

import { useAssistant, type ContextChip } from "./assistant-context"
import { OrbGlyph } from "./orb-character"
import { AssistantOrb } from "./orb"

type Msg = {
  id: number
  role: "user" | "assistant"
  text: string
}

let msgId = 0

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
  const microT = useMotionTransition("micro")
  const surfaceSpring = useMotionSpring()
  const enterT = { ...surfaceSpring, opacity: microT }
  const {
    mode,
    setMode,
    pageChip,
    chips,
    removeChip,
    seedVersion,
    consumeSeededPrompt,
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

  React.useEffect(() => {
    if (!panelDrag) return
    const move = (e: PointerEvent) => {
      setPanelPos({
        x: Math.min(Math.max(8, e.clientX - panelDrag.dx), window.innerWidth - 200),
        y: Math.min(Math.max(8, e.clientY - panelDrag.dy), window.innerHeight - 80),
      })
      setHotZone(
        e.clientX > window.innerWidth - 140
          ? "dock"
          : e.clientY < 180 && Math.abs(e.clientX - window.innerWidth / 2) < 320
            ? "spotlight"
            : null
      )
    }
    const up = () => {
      if (hotZone === "dock") {
        setMode("dock")
        setPanelPos(null)
      } else if (hotZone === "spotlight") {
        setMode("spotlight")
        setPanelPos(null)
      }
      setPanelDrag(null)
      setHotZone(null)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  }, [panelDrag, hotZone, setMode])

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
      if (seeded) setInput(seeded)
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

  const send = (textOverride?: string) => {
    const text = (typeof textOverride === "string" ? textOverride : input).trim()
    if (!text) return
    setInput("")
    setMessages((m) => [...m, { id: ++msgId, role: "user", text }])
    if (mode === "bar" || mode === "line") setMode("panel")
    // The response kit plugs in here: page context + intent + component
    // vocabulary → plan, streamed progress, and a composed answer.
  }

  let surfaceEl: React.ReactNode = null

  if (mode === "bar") {
    surfaceEl = (
      <motion.div
        key="bar"
        className="fixed bottom-4 left-1/2 z-50 w-[620px] max-w-[90vw]"
        style={{ x: "-50%" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8, transition: microT }}
        transition={enterT}
        onMouseLeave={() => {
          if (!input && messages.length === 0) setMode("line")
        }}
      >
        <InputRow
          inputRef={inputRef}
          input={input}
          setInput={setInput}
          onSend={send}
          pageChip={pageChip}
          chips={chips}
          removeChip={removeChip}
          placeholder="Ask or search ambientui…"
          showKbd
        />
      </motion.div>
    )
  }

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
                className="border-border hover:bg-accent/60 flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-start text-[13px]"
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
            <div
              key={m.id}
              className="ms-auto max-w-[85%] rounded-lg bg-[var(--app-blue-wash)] px-3 py-2 text-[13px] text-[var(--app-blue)]"
            >
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="max-w-full text-[13px] leading-relaxed">
              {m.text}
            </div>
          )
        )}
      </div>
    </div>
  )

  const surface = (
    <div className="bg-popover/80 border-border/70 flex h-full min-h-0 flex-col border backdrop-blur-2xl">
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
      <div className="border-t border-border p-2.5">
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
          bare
        />
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
        className="fixed inset-0 z-50 bg-black/50"
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
            <div className="bg-popover border-border flex max-h-[72vh] flex-col overflow-hidden rounded-xl border shadow-[0_32px_100px_-16px_rgba(0,0,0,0.6),0_8px_32px_-12px_rgba(0,0,0,0.4)]">
          {/* search / ask input — hidden in answer mode (follow-up bar takes over) */}
          {!asking && (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <MiniAvatar />
                <div className="relative min-w-0 flex-1">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onPaletteKeyDown}
                    aria-label="Search or ask a question in ambientui"
                    className="w-full bg-transparent text-[15px] outline-none"
                  />
                  {input === "" && (
                    <span
                      aria-hidden
                      className="ambient-shimmer pointer-events-none absolute inset-y-0 left-0 flex items-center text-[15px]"
                    >
                      Search or ask a question in ambientui…
                    </span>
                  )}
                </div>
              </div>

              {/* attached context — same anatomy as the chat panel */}
              {(pageChip || chips.length > 0) && (
                <div className="border-b border-border px-4 pt-2">
                  <ContextRow
                    pageChip={pageChip}
                    pagePinned={pagePinned}
                    onTogglePage={setPagePinned}
                    chips={chips}
                    removeChip={removeChip}
                  />
                </div>
              )}
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
              <div className="border-t border-border p-2.5">
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
                  bare
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

          <div className="text-muted-foreground flex items-center gap-4 border-t border-border px-4 py-2 text-[11px]">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc clear · close</span>
            <span className="ms-auto">⌘K toggle</span>
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
        className="fixed top-0 bottom-0 right-0 z-50 w-[420px] max-w-[90vw] shadow-[-24px_0_70px_-16px_rgba(0,0,0,0.4)]"
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
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.99, transition: microT }}
        transition={enterT}
        className="fixed z-50 h-[560px] max-h-[80vh] w-[440px] max-w-[92vw] overflow-hidden rounded-xl shadow-[0_32px_90px_-12px_rgba(0,0,0,0.5),0_8px_28px_-8px_rgba(0,0,0,0.35)]"
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
      {/* The orb stays mounted across modes — remounting it means a fresh
          WebGL context and shader compile mid-transition. */}
      <div hidden={mode !== "line"}>
        <AssistantOrb />
      </div>
      {mode === "panel" && panelDrag && <SnapZones hot={hotZone} />}
      <AnimatePresence>{surfaceEl}</AnimatePresence>
    </>
  )
}

/** The assistant's mark at surface scale — the CSS glyph, not the shader.
    Each OrbCharacter is a WebGL context + shader compile + 60fps loop;
    mounting those mid-entrance is what made surfaces stutter open. The
    full character lives on the floating orb and the /ds playground. */
function AssistantMark({ size }: { size: number }) {
  const { config } = useFoundation()
  const core = config.orb.useAccent
    ? undefined
    : config.orb.colors[Math.min(1, config.orb.colors.length - 1)]
  return (
    <span className="inline-flex shrink-0">
      <OrbGlyph size={size} color={core} />
    </span>
  )
}

/** The AI avatar, pulled in close to the palette input. */
function MiniAvatar({ small }: { small?: boolean }) {
  return <AssistantMark size={small ? 24 : 32} />
}

const rowClass =
  "hover:bg-accent/60 flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-start text-[13px]"

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground px-2 pt-3 pb-1 text-[11px] font-medium tracking-wide uppercase first:pt-1">
      {children}
    </div>
  )
}

function PaletteItemIcon({ item }: { item: PaletteItem }) {
  if (item.iconKind === "avatar") return <MiniAvatar small />
  if (item.iconKind === "prompt" || item.iconKind === "ask")
    return (
      <span className="text-[var(--app-blue)]">
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
              className={cn(rowClass, i === selected && "bg-accent/60")}
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
                <kbd className="text-muted-foreground ms-auto shrink-0 rounded-[4px] bg-accent px-1.5 py-0.5 text-[11px]">
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
        : "border-muted-foreground/40 bg-background/50 text-muted-foreground"
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

function IconTile({ icon }: { icon: typeof CubeIcon }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-[var(--app-blue-wash)] text-[var(--app-blue)]">
      <HugeiconsIcon icon={icon} size={12} strokeWidth={1.8} />
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
          <span className="border-border bg-accent/40 inline-flex max-w-full items-center gap-2 rounded-lg border py-1 ps-1.5 pe-1 text-[12.5px] font-medium">
            <IconTile icon={SparklesIcon} />
            <span className="min-w-0 truncate">{pageChip.label}</span>
            <button
              type="button"
              aria-label="Remove page context"
              onClick={() => onTogglePage(false)}
              className="bg-accent text-muted-foreground hover:text-foreground flex size-[22px] shrink-0 items-center justify-center rounded-md"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={1.8} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            title="Attach this page as context"
            onClick={() => onTogglePage(true)}
            className="border-border bg-popover hover:bg-accent/60 inline-flex items-center gap-2 rounded-lg border py-1 ps-1.5 pe-2.5 text-[12.5px] font-medium transition-colors"
          >
            <IconTile icon={SparklesIcon} />
            Attach context
            <span className="text-muted-foreground">
              <HugeiconsIcon icon={PlusSignIcon} size={13} strokeWidth={1.8} />
            </span>
          </button>
        ))}
      {chips.map((c) => (
        <span
          key={c.id}
          className="border-border bg-accent/40 inline-flex max-w-full items-center gap-2 rounded-lg border py-1 ps-1.5 pe-1 text-[12.5px] font-medium"
        >
          <IconTile icon={chipKindIcon[c.kind]} />
          <span className="min-w-0 max-w-56 truncate">{c.label}</span>
          <button
            type="button"
            aria-label={`Remove ${c.label}`}
            onClick={() => removeChip(c.id)}
            className="bg-accent text-muted-foreground hover:text-foreground flex size-[22px] shrink-0 items-center justify-center rounded-md"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={1.8} />
          </button>
        </span>
      ))}
    </div>
  )
}

function Chip({
  chip,
  muted,
  onRemove,
}: {
  chip: ContextChip
  muted?: boolean
  onRemove?: () => void
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-52 items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[11px]",
        muted
          ? "text-muted-foreground bg-accent"
          : "bg-[var(--app-blue-wash)] text-[var(--app-blue)]"
      )}
    >
      <span className="truncate">{chip.label}</span>
      {onRemove && (
        <button type="button" aria-label={`Remove ${chip.label}`} onClick={onRemove}>
          <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={1.8} />
        </button>
      )}
    </span>
  )
}

function InputRow({
  inputRef,
  input,
  setInput,
  onSend,
  pageChip,
  chips,
  removeChip,
  placeholder,
  showKbd,
  bare,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  input: string
  setInput: (v: string) => void
  onSend: () => void
  pageChip: ContextChip | null
  chips: ContextChip[]
  removeChip: (id: string) => void
  placeholder: string
  showKbd?: boolean
  bare?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2",
        bare
          ? "rounded-lg bg-accent/50"
          : "bg-popover rounded-lg border border-border shadow-2xl shadow-black/50"
      )}
    >
      {!bare && <AssistantMark size={20} />}
      {pageChip && <Chip chip={pageChip} muted />}
      {chips.map((c) => (
        <Chip key={c.id} chip={c} onRemove={() => removeChip(c.id)} />
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSend()
        }}
        placeholder={placeholder}
        className="placeholder:text-muted-foreground/70 min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
      {showKbd && (
        <kbd className="text-muted-foreground rounded-[4px] bg-accent px-1.5 py-0.5 text-[11px]">
          ⌘K
        </kbd>
      )}
      <button
        type="button"
        aria-label="Send"
        onClick={onSend}
        className="text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={SentIcon} size={16} strokeWidth={1.8} />
      </button>
    </div>
  )
}
