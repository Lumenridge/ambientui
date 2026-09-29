"use client"

import * as React from "react"

import {
  Cancel01Icon,
  DragDropHorizontalIcon,
  Message01Icon,
  PictureInPictureOnIcon,
  PlusSignIcon,
  SourceCodeIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@ambient-ui/ui/lib/utils"

import { AnimatePresence, motion } from "framer-motion"

import {
  AssistantMark,
  ContextChipView,
  IconTile,
  ShimmerPlaceholder,
} from "./ambient-marks"
import { OrbField, OrbGlyph } from "./orb-character"

import {
  useAmbientRuntime,
  useMotionSpring,
  useMotionTransition,
} from "./ambient-runtime"

import {
  matchesHotkey,
  useAssistant,
  type ContextChip,
  type NavItem,
} from "./assistant-context"
import { useAmbientMessages } from "./messages"
import {
  MessageBranches,
  StreamingText,
  UserMessage,
  type AmbientAnswer,
} from "./response-kit"
import {
  AttachmentChip,
  ChipSlider,
  ErrorState,
  FollowUpSuggestions,
  type MessageAttachment,
} from "./message-kit"
import { applyAnswerEvent, EMPTY_ANSWER, failureDetail } from "./responder"
import type { AmbientTurn } from "./responder-schemas"
import { AssistantOrb } from "./orb"
import { Composer } from "./composer"
import { Icon, type IconName } from "@ambient-ui/ui/components/icon"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@ambient-ui/ui/components/sidebar"
import { MessageQueue } from "./message-kit"

type Msg = {
  id: number
  role: "user" | "assistant"
  text: string
  /**
   * Composed response-kit payloads (assistant messages). A list, not one
   * object: regenerating APPENDS a version rather than overwriting, so the
   * answer the user may have preferred is still reachable (MessageBranches).
   */
  kits?: AmbientAnswer[]
  /** The question that produced this answer, so it can be asked again. */
  prompt?: string
  /**
   * This answer has finished arriving. It survives the surface changing —
   * dragging panel → dock remounts the transcript, and without this the
   * message would perform its stream again. An answer is said once.
   */
  settled?: boolean
  /**
   * The turn failed, and this is what went wrong. An assistant message can
   * carry this alone (the first answer never arrived) or beside its kits (a
   * regenerate failed, and the earlier versions are still worth keeping).
   */
  failed?: string
  /**
   * The API is still sending this answer (a stream). The prose may catch up
   * with what has arrived, but it does not settle until this clears.
   */
  arriving?: boolean
}

/** A conversation's identity for the API: stable until it is cleared. */
const newConversationId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

/**
 * The conversation as the API is told it: every turn, in order, as text.
 * An answer counts as the version currently newest; a turn that failed
 * before saying anything is left out, because nothing was said.
 */
const historyOf = (list: Msg[]): AmbientTurn[] =>
  list.flatMap((msg): AmbientTurn[] =>
    msg.role === "user"
      ? [{ role: "user", text: msg.text }]
      : msg.kits?.length
        ? [{ role: "assistant", text: msg.kits[msg.kits.length - 1]!.text }]
        : []
  )

/**
 * Ids are derived from the list itself, never from a shared counter: a
 * state updater can be invoked more than once for a single update, so
 * `++counter` inside one mints colliding ids — which makes React remount
 * the transcript and replay every settled answer's stream.
 */
const nextId = (m: Msg[]) => (m.length ? m[m.length - 1]!.id + 1 : 1)

/**
 * What the `+` attaches. A real file picker belongs to the host product, not
 * to the layer — the layer's job is to hold what it is given — so this stands
 * in for one until a host supplies the gesture.
 */
const SAMPLE_ATTACHMENT =
  'TypeError: Cannot read properties of undefined (reading "draft")\n    at Composer (composer.tsx:9:14)\n    at renderWithHooks (react-dom.js:14985:18)'

/** Nouns for ambientui's own command families; hosts set AmbientCommand.noun. */
const HINT_NOUNS: Record<string, string> = {
  Components: "component",
  Documentation: "document",
  Demos: "demo",
}

/** "mod+k" → the keycaps to draw, for this platform. */
function hotkeyCaps(hotkey: string) {
  const mac =
    typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform)
  return hotkey.split("+").map((part) => {
    const p = part.toLowerCase()
    if (p === "mod") return mac ? "⌘" : "Ctrl"
    if (p === "meta") return "⌘"
    if (p === "ctrl") return "Ctrl"
    if (p === "shift") return "⇧"
    if (p === "alt") return mac ? "⌥" : "Alt"
    return part.toUpperCase()
  })
}

type PaletteItem = {
  id: string
  section: string
  label: string
  desc?: string
  trailing?: string
  iconKind: "recent" | "prompt" | "avatar" | "nav" | "ask" | "command"
  navIcon?: typeof SparklesIcon
  /** A vocabulary icon name, drawn by the configured library. */
  iconName?: string
  run: () => void
}

/** Every AI form stands the same height, whichever surface it sits in. */
const AI_FORM_ROW = "flex min-h-14 items-center gap-3"

/** Heuristic: is the palette input a question for the AI rather than a nav search? */
/**
 * Does what was typed read as a question rather than a search?
 *
 * THE OPENING WORD MUST BE THE WHOLE WORD. This was a bare prefix test, so
 * every word beginning with an interrogative was read as one: "do" matched
 * documentation, "can" matched canvas, "is" matched isolation, "are" matched
 * area. Typing the name of the thing you wanted hid the command that went
 * there, which is the one query the palette must not lose.
 *
 * "summar" stays a stem because summarize and summary are the same intent
 * wearing different endings; the rest are whole words, because showcase is
 * not show and domain is not do.
 *
 * This only decides what leads the list. A question no longer SUPPRESSES
 * matching commands — see paletteItems.
 */
/**
 * Words that carry intent but never identify a command. Dropped before
 * matching so the way a request is phrased cannot hide what it names.
 */
const FILLER_WORDS = new Set([
  "a", "an", "and", "for", "go", "in", "into", "it", "jump", "me", "my", "of",
  "on", "open", "please", "show", "take", "that", "the", "this", "to", "with",
])

const INTERROGATIVE =
  /^(what|why|how|which|where|when|who|can|should|does|do|is|are|explain|compare|show)\b/i

function looksLikeQuestion(q: string) {
  const t = q.trim()
  if (!t) return false
  if (t.endsWith("?")) return true
  if (t.split(/\s+/).length >= 4) return true
  return INTERROGATIVE.test(t) || /^summar\w*/i.test(t)
}

export function Assistant({
  hotkeys = true,
}: {
  /**
   * Claim the global shortcuts (⌘K, Escape). Default true — the app's one
   * ambient layer owns the keyboard. An EMBEDDED instance (a product demo
   * framed inside another page) passes false, so the frame's layer never
   * fights the page's own for the same keystroke.
   */
  hotkeys?: boolean
} = {}) {
  // Surfaces move on the motion system (DESIGN.md §5): transforms ride the
  // configured character's spring — instantly responsive, settles naturally —
  // while opacity fades on the micro tween. Exits are a quick micro fade.
  const runtime = useAmbientRuntime()
  const microT = useMotionTransition("micro")
  const surfaceSpring = useMotionSpring()
  const enterT = { ...surfaceSpring, opacity: microT }
  const {
    mode,
    setMode,
    orbState,
    setOrbState,
    pageChip,
    pageIntel,
    commands,
    navItems: navTargets,
    chips,
    removeChip,
    seedVersion,
    consumeSeededPrompt,
    consumeAutoSend,
    navigate,
    api,
    suggestions,
    recents: recentChats,
    announceEffect,
    hotkey,
    yieldHotkey,
    zIndex,
    dark,
    messages: t,
    locale,
  } = useAssistant()

  const [input, setInput] = React.useState("")
  const [messages, setMessages] = React.useState<Msg[]>([])
  // The hotkey always opens search, even mid-conversation, so the palette
  // stays a palette; the conversation is one row away.
  const [searchOver, setSearchOver] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  // Page context is attached by default — the chip names what the page is about
  const [pagePinned, setPagePinned] = React.useState(true)
  // Palette keyboard selection
  const [selIdx, setSelIdx] = React.useState(0)
  // A new query or a new surface starts the selection over. Adjusted DURING
  // render rather than from an effect, so the palette never paints one frame
  // with the previous row highlighted.
  const selScope = `${mode}\u0000${input}`
  const [selScopeSeen, setSelScopeSeen] = React.useState(selScope)
  if (selScope !== selScopeSeen) {
    setSelScopeSeen(selScope)
    setSelIdx(0)
  }
  const [panelPos, setPanelPos] = React.useState<{
    x: number
    y: number
  } | null>(null)
  const [panelDrag, setPanelDrag] = React.useState<{
    dx: number
    dy: number
  } | null>(null)
  const [hotZone, setHotZone] = React.useState<"dock" | "spotlight" | null>(
    null
  )

  // THE SURFACES MEASURE THEIR CONTAINING BLOCK (same lesson as orb.tsx):
  // fixed coordinates resolve against the nearest transformed ancestor, so
  // an embedded layer must convert pointer (viewport) coordinates into
  // frame space and clamp against the FRAME — otherwise a drag inside a
  // product-demo window computes positions off the whole screen and the
  // panel walks out of the shell.
  const frameProbeRef = React.useRef<HTMLDivElement | null>(null)
  const getFrame = () => {
    const parent = frameProbeRef.current?.offsetParent as HTMLElement | null
    if (!parent)
      return { left: 0, top: 0, w: window.innerWidth, h: window.innerHeight }
    const r = parent.getBoundingClientRect()
    return { left: r.left, top: r.top, w: r.width, h: r.height }
  }

  /**
   * THE FRAME'S SIZE, WATCHED — because `vw`/`vh` describe the VIEWPORT.
   *
   * The surfaces cap themselves with viewport units (`max-w-[92vw]`), which
   * is right when the layer owns the screen and wrong the moment it is
   * embedded: inside a 327px demo frame on a 375px phone, 92vw resolves to
   * 345px and the panel hangs 18px over the edge. Same family as the
   * quick-ask row's fixed 420 — a number that was true on the author's
   * screen and false in the frame it was handed.
   *
   * `null` when the layer is NOT embedded: a fixed element's offsetParent
   * is null when its containing block is the viewport, and in that case the
   * viewport units are already the correct answer, so nothing overrides.
   */
  const [frameBox, setFrameBox] = React.useState<{
    w: number
    h: number
  } | null>(null)
  React.useEffect(() => {
    const parent = frameProbeRef.current?.offsetParent as HTMLElement | null
    if (!parent) return
    const ro = new ResizeObserver(([e]) => {
      if (e) setFrameBox({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(parent)
    return () => ro.disconnect()
  }, [])

  /**
   * The inset a surface keeps from its frame's edges — it is the same 16px
   * the panel already offsets itself by, doubled for the pair of edges.
   */
  const framedCap = frameBox
    ? { maxWidth: frameBox.w - 32, maxHeight: frameBox.h - 32 }
    : undefined

  const startPanelDrag = (e: React.PointerEvent) => {
    if (mode !== "panel" && mode !== "dock") return
    if ((e.target as HTMLElement).closest("button,input")) return
    const f = getFrame()
    if (mode === "dock") {
      // detach the dock into a floating panel under the pointer, keep dragging
      const px = e.clientX - f.left
      const py = e.clientY - f.top
      const x = Math.min(Math.max(8, px - 220), f.w - 200)
      const y = Math.max(8, py - 16)
      setPanelPos({ x, y })
      setPanelDrag({ dx: px - x, dy: py - y })
      setMode("panel")
      return
    }
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    setPanelPos({ x: rect.left - f.left, y: rect.top - f.top })
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
      const f = getFrame()
      const px = e.clientX - f.left
      const py = e.clientY - f.top
      setPanelPos({
        x: Math.min(Math.max(8, px - panelDrag.dx), f.w - 200),
        y: Math.min(Math.max(8, py - panelDrag.dy), f.h - 80),
      })
      const zone =
        px > f.w - 140
          ? ("dock" as const)
          : py < 180 && Math.abs(px - f.w / 2) < 320
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

  // Global shortcuts: the hotkey toggles the palette; Esc clears the query,
  // then closes.
  // Capture phase, so a host handler that stops propagation cannot swallow
  // the key; `yieldHotkey` is how the host takes a keystroke back.
  React.useEffect(() => {
    if (!hotkeys) return
    const onKey = (e: KeyboardEvent) => {
      if (hotkey && matchesHotkey(e, hotkey)) {
        if (yieldHotkey?.(e)) return
        e.preventDefault()
        e.stopPropagation()
        if (mode === "spotlight") {
          setInput("")
          setSearchOver(false)
          setMode(messages.length > 0 ? "panel" : "line")
        } else {
          setInput("")
          setSearchOver(messages.length > 0)
          setMode("spotlight")
        }
      } else if (e.key === "Escape") {
        if (mode === "spotlight" && input !== "") {
          setInput("")
          return
        }
        if (mode === "spotlight") setSearchOver(false)
        // history closes all the way to rest: it is a full-screen surface,
        // and dropping from it into a floating panel leaves two things open
        // when the user asked to put one away
        if (mode === "history") {
          setMode("line")
          return
        }
        setMode(mode === "spotlight" && messages.length > 0 ? "panel" : "line")
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [hotkeys, hotkey, yieldHotkey, mode, messages.length, input, setMode])

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const asking = messages.length > 0

  // In the palette, entering answer mode swaps the top search bar for a bottom
  // follow-up bar — move focus there. preventScroll everywhere the layer
  // focuses: its surfaces are already in view by construction, and an
  // embedded layer must never scroll the page that hosts it.
  React.useEffect(() => {
    if (mode === "spotlight") {
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    }
  }, [asking, mode, searchOver])

  const [conversationId, setConversationId] = React.useState(newConversationId)
  const clearConversation = () => {
    setMessages([])
    setConversationId(newConversationId())
  }

  // AI activation while typing: the moment the input reads as a question
  // (the "Ask ambientui" path), the ambient state turns to listening —
  // the orb and every live border lean in before send is even pressed.
  const busyRef = React.useRef(false)
  // busy must also RENDER (the composer's orb yields to Stop), so the ref
  // gains a state twin; the ref stays for handlers that must not re-bind
  const [busy, setBusy] = React.useState(false)
  // the turn in flight: aborting it is how Stop, a newer turn, and unmount
  // all tell the responder its answer is no longer wanted
  const turnRef = React.useRef<AbortController | null>(null)
  /**
   * The answer being said, when it is not the last message. Regenerate can
   * target any answer, and one above a later message — a failed turn, say —
   * used to be neither live nor settled: its branch never streamed, never
   * announced settle, and the layer stayed busy for good.
   */
  const [regeneratingId, setRegeneratingId] = React.useState<number | null>(
    null
  )
  React.useEffect(() => () => turnRef.current?.abort(), [])
  // the settled answer's workspace effect, relayed to whichever surface owns
  // the product state — the layer never learns what "fix-composer" means
  const pendingEffect = React.useRef<string | null>(null)
  const beginWork = () => {
    busyRef.current = true
    setBusy(true)
  }
  /**
   * SCENARIO: queue work while the agent is busy. A send that lands mid-run
   * does not interrupt and does not block — it stacks, visibly, and drains
   * when the running turn settles. The queue stays editable (cancel, or
   * send-now which re-queues the running prompt behind it).
   */
  const [queued, setQueued] = React.useState<{ id: string; text: string }[]>([])
  const queuedRef = React.useRef(queued)
  React.useEffect(() => {
    queuedRef.current = queued
  })
  const [runningPrompt, setRunningPrompt] = React.useState("")
  /**
   * PASTED MATERIAL IS CONTEXT, NOT THE QUESTION. A stack trace dropped into
   * a one-line input buries whatever was being written; it becomes an
   * attachment instead, named by its first line so it is identifiable
   * without being read, and removable until the turn is sent.
   */
  const [pasted, setPasted] = React.useState<MessageAttachment[]>([])
  const attachText = (text: string) => {
    const trimmed = text.trim()
    const firstLine = trimmed.split("\n")[0]?.slice(0, 60) ?? t.pastedText
    const lines = trimmed.split("\n").length
    setPasted((a) => [
      ...a,
      {
        id: `paste-${a.length}-${trimmed.length}`,
        name: firstLine || t.pastedText,
        kind: "text" as const,
        meta: t.pastedMeta({ lines, chars: trimmed.length }),
      },
    ])
  }
  // mirrored so the ambient effect below can consult the current state
  // without taking it as a dependency (which would loop)
  const orbStateRef = React.useRef(orbState)
  React.useEffect(() => {
    orbStateRef.current = orbState
  })
  React.useEffect(() => {
    // WHILE THE PIPELINE OWNS THE CHARACTER, THIS EFFECT KEEPS OUT. Typing
    // and surface changes decide listening-vs-still only between turns; a
    // cleared input at the moment of sending must not cancel the thinking
    // state the send just set.
    if (busyRef.current) return
    if (orbStateRef.current === "thinking" || orbStateRef.current === "answer")
      return
    if (mode === "line") {
      setOrbState("still")
      return
    }
    setOrbState(looksLikeQuestion(input) ? "listening" : "still")
  }, [input, mode, setOrbState])

  /**
   * ONE TURN, HOWEVER IT WAS ASKED. Send, regenerate and retry all come
   * through here: the question, the conversation so far and what the person
   * is looking at go to the host's API, and the character thinks for exactly
   * as long as the API takes. The layer adds no wait of its own and never
   * learns whether the API is a server or stubs.
   *
   * The answer arrives as events — one, for an API that answers whole; many,
   * for one that streams. The first event puts the answer on screen (`start`);
   * each later one updates it in place, and the prose follows what has
   * arrived. Only the newest turn may land: an answer arriving after Stop,
   * or after another turn replaced it, is dropped.
   */
  const updateArriving = (
    patch: (msg: Msg) => Partial<Msg>
  ) =>
    setMessages((m) =>
      m.map((msg) => (msg.arriving ? { ...msg, ...patch(msg) } : msg))
    )
  const withKit = (kit: AmbientAnswer) => (msg: Msg): Partial<Msg> => ({
    kits: msg.kits ? [...msg.kits.slice(0, -1), kit] : [kit],
  })

  const runTurn = (
    question: string,
    history: AmbientTurn[],
    start: (kit: AmbientAnswer) => void,
    fail: (detail: string) => void
  ) => {
    turnRef.current?.abort()
    const turn = new AbortController()
    turnRef.current = turn
    beginWork()
    setOrbState("thinking")
    const current = () => turnRef.current === turn
    const endWork = () => {
      turnRef.current = null
      busyRef.current = false
      setBusy(false)
      setOrbState("still")
    }
    void (async () => {
      let kit: AmbientAnswer | null = null
      try {
        const events = api.ask(
          { question, conversationId, history, pageChip, chips, locale },
          { signal: turn.signal }
        )
        for await (const event of events) {
          if (!current()) return
          const first = kit === null
          kit = applyAnswerEvent(kit ?? EMPTY_ANSWER, event)
          pendingEffect.current = kit.effect ?? null
          // NOT "answer" here — the block has only been composed; its
          // evidence still has to run. ResponseBlock announces the handover.
          if (first) start(kit)
          else updateArriving(withKit(kit))
        }
        if (!current()) return
        if (!kit) {
          endWork()
          fail(t.emptyAnswer)
          return
        }
        turnRef.current = null
        // the stream has ended: the prose may now finish and settle
        updateArriving((msg) => ({ ...withKit(kit!)(msg), arriving: false }))
      } catch (error) {
        if (!current() || turn.signal.aborted) return
        // a failed turn ends the work but does NOT drain the queue: the next
        // instruction probably meets the same failure, so the person sees
        // this one first and decides — retry, or send the next deliberately
        endWork()
        const detail = failureDetail(error)
        if (kit)
          // it failed partway: what arrived stays, finished, with the reason
          updateArriving(() => ({ arriving: false, settled: true, failed: detail }))
        else fail(detail)
      }
    })()
  }

  /** Mark a message failed, keeping whatever versions it already has. */
  const failMessage = (id: number) => (detail: string) =>
    setMessages((m) =>
      m.map((msg) => (msg.id === id ? { ...msg, failed: detail } : msg))
    )

  /** The conversation before the question that produced message `id`. */
  const historyBefore = (id: number) => {
    const before = messages.slice(
      0,
      Math.max(0, messages.findIndex((msg) => msg.id === id))
    )
    if (before[before.length - 1]?.role === "user") before.pop()
    return historyOf(before)
  }

  /** A fresh answer to `question`, landing as a new assistant message. */
  const answer = (question: string, history: AmbientTurn[]) =>
    runTurn(
      question,
      history,
      (kit) => {
        // a fresh answer is always the last message; an earlier regenerate
        // that was stopped mid-stream no longer owns the live slot
        setRegeneratingId(null)
        setMessages((m) => [
          ...m,
          {
            id: nextId(m),
            role: "assistant",
            text: kit.text,
            kits: [kit],
            prompt: question,
            arriving: true,
          },
        ])
      },
      (detail) =>
        setMessages((m) => [
          ...m,
          {
            id: nextId(m),
            role: "assistant",
            text: "",
            prompt: question,
            failed: detail,
          },
        ])
    )

  /**
   * REGENERATE — compose the same question again and keep both. The ambient
   * states run exactly as they do for a first answer, because from the
   * layer's point of view it IS one.
   */
  const regenerate = (id: number) => {
    if (busyRef.current) return
    const target = messages.find((msg) => msg.id === id)
    if (!target?.kits) return
    runTurn(
      target.prompt ?? target.text,
      historyBefore(id),
      (kit) => {
        setRegeneratingId(id)
        setMessages((m) =>
          m.map((msg) =>
            msg.id === id && msg.kits
              ? {
                  ...msg,
                  settled: false,
                  failed: undefined,
                  arriving: true,
                  kits: [...msg.kits, kit],
                }
              : msg
          )
        )
      },
      failMessage(id)
    )
  }

  /**
   * RETRY — a failed turn asks again. A message with earlier versions
   * regenerates in place; one that never got an answer is replaced by the
   * next attempt, so a failure does not stay in the transcript once fixed.
   */
  const retry = (id: number) => {
    if (busyRef.current) return
    const target = messages.find((msg) => msg.id === id)
    if (!target) return
    if (target.kits) {
      setMessages((m) =>
        m.map((msg) => (msg.id === id ? { ...msg, failed: undefined } : msg))
      )
      regenerate(id)
      return
    }
    const history = historyBefore(id)
    setMessages((m) => m.filter((msg) => msg.id !== id))
    answer(target.prompt ?? target.text, history)
  }

  const send = (textOverride?: string) => {
    const text = (
      typeof textOverride === "string" ? textOverride : input
    ).trim()
    if (!text) return
    // asking anything from search brings the conversation back on top
    setSearchOver(false)
    if (busyRef.current) {
      // the agent is mid-run: the new instruction stacks behind it
      setInput("")
      setQueued((q) => [...q, { id: `${Date.now()}-${q.length}`, text }])
      return
    }
    setInput("")
    setPasted([])
    setRunningPrompt(text)
    setMessages((m) => [...m, { id: nextId(m), role: "user", text }])
    if (mode === "line") setMode("panel")
    // THE RESPONSE KIT: page context + question → a composed answer object,
    // driving the real ambient pipeline — thinking while the API works,
    // answer while streaming, still on settle. The history is the
    // conversation BEFORE this question: `messages` has not taken it yet.
    answer(text, historyOf(messages))
  }
  /**
   * Focus the input when a surface opens, and drain any prompt handed over by
   * another surface (right-click → Explain, quick ask).
   *
   * DECLARED AFTER `send` ON PURPOSE. It used to reach `send` through a ref
   * refreshed by a later effect, which meant this one ran a render behind —
   * so a prompt seeded in the same click as `addChip` composed its answer
   * against the PREVIOUS chip list, and an explain-this-file answer came back
   * generic. Effects run in declaration order; being below `send` is the fix.
   */
  React.useEffect(() => {
    if (mode !== "line") {
      const seeded = consumeSeededPrompt()
      // a quick-ask arrives already asked; an explain arrives as a draft
      // Draining a queue handed over by another surface is exactly what an
      // effect is for: the seed lives outside React, consuming it is a side
      // effect, and it cannot be derived during render without making render
      // impure. The cascading render is the intended cost — one extra commit
      // when a surface hands over.
      /* eslint-disable react-hooks/set-state-in-effect */
      // null means nothing was handed over; "" is a REAL seed meaning
      // "open clean". The truthy check conflated the two, so a surface
      // could never ask for the at-rest state — the input kept whatever
      // the last visit typed.
      if (seeded !== null) {
        if (seeded && consumeAutoSend()) send(seeded)
        else setInput(seeded)
      }
      /* eslint-enable react-hooks/set-state-in-effect */
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, seedVersion, consumeSeededPrompt])

  /**
   * STOP — the composer's other meaning. Composing: the turn is aborted,
   * the responder's request with it, and nothing was said. Streaming: the
   * stream settles where it is; what has arrived stays, because it was
   * already said.
   */
  const stop = () => {
    turnRef.current?.abort()
    turnRef.current = null
    // a stream stopped partway ends where it is: what arrived was said
    updateArriving(() => ({ arriving: false }))
    busyRef.current = false
    setBusy(false)
    setOrbState("still")
    // an explicit stop does NOT drain the queue — stopping means stop; the
    // queued turns stay visible and the user sends the next one deliberately
  }

  /** MessageQueue's send-now: the picked turn runs, the running one re-queues. */
  const interruptWith = (id: string) => {
    const item = queuedRef.current.find((q) => q.id === id)
    if (!item) return
    const displaced = runningPrompt
    stop()
    setQueued((q) => [
      ...(displaced ? [{ id: `req-${Date.now()}`, text: displaced }] : []),
      ...q.filter((x) => x.id !== id),
    ])
    window.setTimeout(() => send(item.text), 60)
  }

  const settleResponse = () => {
    busyRef.current = false
    setBusy(false)
    // the answer is now history: mark it, so changing surface re-renders it
    // settled instead of replaying the stream
    setMessages((m) =>
      m.map((msg, i) =>
        (regeneratingId !== null
          ? msg.id === regeneratingId
          : i === m.length - 1) && msg.role === "assistant"
          ? { ...msg, settled: true }
          : msg
      )
    )
    setRegeneratingId(null)
    if (pendingEffect.current) {
      announceEffect(pendingEffect.current)
      pendingEffect.current = null
    }
    // drain: the next queued turn sends itself once this one has settled
    const next = queuedRef.current[0]
    if (next) {
      setQueued((q) => q.slice(1))
      window.setTimeout(() => send(next.text), 450)
    }
    setOrbState("still")
  }

  /**
   * WHAT THIS CONVERSATION IS ABOUT. A panel titled with the product's name
   * says nothing the surface has not already said — the identity lives in
   * the character, which now sits in the composer. The useful title is the
   * subject: the question that started it, and while a turn runs, the
   * instruction being executed.
   */
  const firstAsk = messages.find((m) => m.role === "user")?.text
  const sessionTitle = busy
    ? runningPrompt || firstAsk || t.working
    : (firstAsk ?? t.newChat)

  let surfaceEl: React.ReactNode = null

  /**
   * `columnClass` caps the message column. Only a surface wider than a
   * comfortable reading measure needs it — history, which is full-screen. The
   * panel, dock and spotlight are already narrower than any cap, so applying
   * one there just inset their content from their own edges.
   */
  const renderTranscript = (columnClass = "") => (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      {messages.length === 0 && (
        <div className={cn("px-1 pt-3", columnClass)}>
          {/* the character opens the conversation, then the same
              FollowUpSuggestions the answers use — an empty state that
              hand-rolls its own list is a second component nobody maintains */}
          <AssistantMark size={44} />
          <h3 className="mt-3 text-base font-semibold">
            {pageChip ? t.askAboutPage : t.askAboutProduct}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {pageChip ? t.canSeePage({ page: pageChip.label }) : t.canSeeProduct}
          </p>
          <FollowUpSuggestions
            suggestions={suggestions}
            onPick={(text) => send(text)}
          />
        </div>
      )}
      <div className={cn("flex flex-col gap-3", columnClass)}>
        {messages.map((m) =>
          m.role === "user" ? (
            <UserMessage key={m.id} text={m.text} />
          ) : m.kits || m.failed ? (
            <React.Fragment key={m.id}>
              {m.kits && (
                <MessageBranches
                  branches={m.kits}
                  arriving={m.arriving}
                  live={
                    !m.settled &&
                    m.id ===
                      (regeneratingId ?? messages[messages.length - 1]?.id)
                  }
                  onSettled={settleResponse}
                  // the work is not over when the answer was composed — it
                  // is over when the answer starts being said
                  onAnswerStart={() => setOrbState("answer")}
                  onRegenerate={() => regenerate(m.id)}
                  onFollowUp={(text) => send(text)}
                />
              )}
              {m.failed && (
                <ErrorState
                  title={t.couldNotAnswer}
                  detail={m.failed}
                  onRetry={busy ? undefined : () => retry(m.id)}
                />
              )}
            </React.Fragment>
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
  /**
   * The heat field and the translucency over it, as ONE named decision.
   *
   * Two knobs — how present the field is, and how much veil covers it — but
   * only three combinations mean anything, so the surface picks a PLACE
   * rather than setting both and hoping:
   *
   *   panel  — low presence under the full frost. Behind a floating
   *            surface's content, where the field is atmosphere.
   *   ground — full presence under the thin stage veil. The field IS the
   *            wallpaper (the canvas page); nothing is meant to sit over it.
   *   screen — full presence under the FULL frost. A full-screen ambient
   *            surface: the field has to carry a whole window, and the
   *            translucent layer still has to sit on top of it. Pairing full
   *            presence with the thin veil instead left the shader raw, which
   *            is the ground's recipe applied where it does not belong.
   */
  const renderField = (place: "panel" | "ground" | "screen" = "panel") => (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <OrbField
        state={orbState}
        strength={place === "panel" ? "ambient" : "stage"}
        colors={runtime.orb.useAccent ? undefined : runtime.orb.colors}
        speeds={runtime.orb.speeds}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          place === "ground"
            ? "ambient-stage-frost"
            : place === "screen"
              ? "ambient-screen-frost"
              : "ambient-field-frost"
        )}
      />
    </div>
  )

  const surface = (
    <div className="ambient-glass relative flex h-full min-h-0 flex-col rounded-[inherit] border border-(--glass-border)">
      {renderField()}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* header — the drag handle IS the form switcher: drag to float, dock, or spotlight */}
        <div
          onPointerDown={startPanelDrag}
          className={cn(
            "group/header relative flex items-center gap-2 border-b border-border px-3 py-2 select-none",
            panelDrag ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          {/* the session's subject, not the product's name; it shimmers
              while the instruction it names is running */}
          <span
            title={sessionTitle}
            className={cn(
              "min-w-0 truncate text-sm font-medium transition-opacity group-hover/header:opacity-0",
              busy && "ambient-shimmer"
            )}
          >
            {sessionTitle}
          </span>
          <span className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-muted-foreground/70 group-hover/header:inline-flex">
            <HugeiconsIcon
              icon={DragDropHorizontalIcon}
              size={15}
              strokeWidth={1.8}
            />
          </span>
          <div className="ms-auto flex items-center gap-1 text-muted-foreground">
            <HeaderBtn label={t.history} onClick={() => setMode("history")}>
              <Icon name="history" size={15} />
            </HeaderBtn>
            <HeaderBtn label={t.minimize} onClick={() => setMode("line")}>
              <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={1.8} />
            </HeaderBtn>
          </div>
        </div>

        {renderTranscript()}

        {/* input */}
        <div className="border-t border-(--glass-border) px-4 py-2">
          <ContextRow
            pageChip={pageChip}
            pagePinned={pagePinned}
            onTogglePage={setPagePinned}
            chips={chips}
            removeChip={removeChip}
            attachments={pasted}
            onRemoveAttachment={(id) =>
              setPasted((a) => a.filter((x) => x.id !== id))
            }
          />
          {queued.length > 0 && (
            <MessageQueue
              running={busy ? runningPrompt : undefined}
              queued={queued}
              onInterrupt={interruptWith}
              onCancel={(id) => setQueued((q) => q.filter((x) => x.id !== id))}
              className="pb-2"
            />
          )}
          <Composer
            inputRef={inputRef}
            value={input}
            onChange={setInput}
            onSend={send}
            onStop={stop}
            busy={busy}
                onAttach={() => attachText(SAMPLE_ATTACHMENT)}
            onPasteText={attachText}
            placeholder={busy ? t.queuePlaceholder : t.followUpPlaceholder}
          />
        </div>
      </div>
    </div>
  )

  if (mode === "spotlight") {
    const q = input.trim()
    // the page's own invitation, or the app-wide one
    const askLine = pageIntel?.askPlaceholder ?? t.askPlaceholder
    const question = looksLikeQuestion(input)
    // the conversation stays behind the search until asked for (see
    // searchOver); the transcript shows only when search is not on top
    const transcriptView = asking && !searchOver

    // Every way out of the palette leaves it closed and empty, so the next
    // hotkey opens a fresh search.
    const leave = () => {
      setInput("")
      setSearchOver(false)
      setMode("line")
    }
    const goNav = (id: string) => {
      navigate?.(id)
      leave()
    }
    const askItem: PaletteItem = {
      id: "ask",
      section: "",
      label: t.askAction,
      desc: `“${q}”`,
      iconKind: "ask",
      run: () => {
        setSearchOver(false)
        send()
      },
    }
    // The page's own workspace wins over the app's routes: inside the dev
    // tool, "Jump to" opens files. Both shapes collapse to the same item.
    const jumpTargets: {
      id: string
      label: string
      desc?: string
      icon?: NavItem["icon"]
      go: () => void
    }[] = pageIntel?.jumps
      ? pageIntel.jumps.map((j) => ({
          id: j.id,
          label: j.label,
          desc: j.desc,
          icon: j.icon ?? (SourceCodeIcon as NavItem["icon"]),
          go: () => {
            pageIntel.onJump?.(j.id)
            leave()
          },
        }))
      : navTargets.map((s) => ({
          id: s.id,
          label: s.label,
          desc: s.desc,
          icon: s.icon,
          go: () => goNav(s.id),
        }))
    const navItems = (list: typeof jumpTargets): PaletteItem[] =>
      list.map((j) => ({
        id: `nav-${j.id}`,
        section: pageIntel?.jumpLabel ?? t.jumpTo,
        label: j.label,
        desc: j.desc,
        iconKind: "nav" as const,
        // a NAME goes through <Icon>, like every icon in the system; an icon
        // object is the legacy HugeIcons form
        ...(typeof j.icon === "string"
          ? { iconName: j.icon }
          : { navIcon: j.icon as typeof SparklesIcon | undefined }),
        run: j.go,
      }))
    // The matching sections, kept as DATA: every palette item carries a `run`
    // closure, so anything derived from the item list drags those closures
    // along. The empty-state copy below needs a count, not a list of actions.
    const ql = q.toLowerCase()
    const queryMatches = q
      ? jumpTargets.filter(
          (t) =>
            t.label.toLowerCase().includes(ql) ||
            (t.desc ?? "").toLowerCase().includes(ql)
        )
      : []
    // EVERYTHING ⌘K CAN DO, matched on what was typed. Commands are
    // registered by the app (see CommandRegistry) — the palette matches and
    // runs them without knowing what any of them means. Sections keep their
    // registered order so Components never buries Switch form.
    // MATCHED ON TERMS, NOT ON THE WHOLE STRING. A substring match means the
    // query has to be a fragment of the command, so anything phrased the way
    // people actually ask — "go to the documentation", "jump to component" —
    // matched nothing at all: no command contains that sentence. Every
    // meaningful word must appear, which keeps precision without demanding
    // that the user guess the label. Registered order is preserved (no
    // relevance sort), so Components still never buries Switch form.
    const terms = ql.split(/\s+/).filter((t) => t && !FILLER_WORDS.has(t))
    const matched = q
      ? commands.filter((c) => {
          const hay = `${c.label} ${c.desc ?? ""} ${c.keywords ?? ""} ${c.section}`.toLowerCase()
          // all filler ("show me") leaves nothing to match on; fall back to
          // the literal query rather than matching everything
          return terms.length
            ? terms.every((t) => hay.includes(t))
            : hay.includes(ql)
        })
      : []
    // CAPPED PER SECTION, not overall. A single cap over the whole list let
    // the first family spend the entire budget — forty components matching
    // "panel" pushed Switch form off the end, so the one command the word
    // most obviously meant was the one you could not reach.
    const groupedCommands: PaletteItem[] = [
      ...new Set(matched.map((c) => c.section)),
    ].flatMap((sec) =>
      matched
        .filter((c) => c.section === sec)
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          section: c.section,
          label: c.label,
          desc: c.desc,
          iconKind: "command" as const,
          iconName: c.icon,
          run: () => {
            leave()
            c.run()
          },
        }))
    )

    // One expression, not a binding filled across branches: reassigning
    // mid-render reads as a mutable box, and hiding the same branches behind
    // a call reads as passing one around. What the palette shows is a pure
    // function of the query — so it is written as one.
    const backItem: PaletteItem[] = searchOver
      ? [
          {
            id: "back-to-conversation",
            section: "",
            label: t.backToConversation,
            desc: sessionTitle,
            iconKind: "recent" as const,
            run: () => setSearchOver(false),
          },
        ]
      : []
    const paletteItems: PaletteItem[] = transcriptView
      ? []
      : question
        ? // asking leads, but whatever matched still follows: the phrasing
          // that most obviously names a command ("go to the documentation")
          // is also long enough to read as a question
          [askItem, ...groupedCommands]
        : q
          ? [askItem, ...groupedCommands, ...navItems(queryMatches)]
          : [
              ...backItem,
              ...recentChats.map((r) => ({
                id: `recent-${r.text}`,
                section: t.recentChats,
                label: r.text,
                trailing: r.when,
                iconKind: "recent" as const,
                run: () => send(r.text),
              })),
              ...suggestions.map((p) => ({
                id: `prompt-${p}`,
                section: pageIntel?.suggestLabel ?? t.suggestedForPage,
                label: p,
                iconKind: "prompt" as const,
                run: () => send(p),
              })),
              {
                id: "open-chat",
                section: pageIntel?.suggestLabel ?? t.suggestedForPage,
                // the surface has a name, and it is the panel (DESIGN.md §8)
                label: t.openPanelWithContext,
                desc: pageChip?.label,
                iconKind: "avatar" as const,
                run: () => setMode("panel"),
              },
              // Switch form belongs in the RESTING list: five rows, always
              // relevant, and the only family small enough to show whole.
              ...commands
                .filter((c) => c.section === "Switch form")
                .map((c) => ({
                  id: c.id,
                  section: c.section,
                  label: c.label,
                  desc: c.desc,
                  iconKind: "command" as const,
                  iconName: c.icon,
                  run: () => {
                    leave()
                    c.run()
                  },
                })),
              ...navItems(jumpTargets),
            ]
    /**
     * WHAT TYPING WOULD FIND. The big command families — components,
     * documents, demos — cannot be listed at rest without burying everything
     * else, and a capability nobody can see is one that does not exist as far
     * as the user is concerned. So the palette states the shape of them, with
     * counts derived from what is actually registered rather than written
     * down: a family that goes away takes its own hint with it.
     */
    const hint = [
      ...new Set(
        commands
          .filter((c) => c.section !== "Switch form")
          .map((c) => c.section)
      ),
    ].map((sec) => {
      const inSection = commands.filter((c) => c.section === sec)
      const n = inSection.length
      // a section NAME is a heading, not a countable noun — "10
      // documentation" is what happens when you lowercase one and hope. The
      // registering host names its own noun; ours are in HINT_NOUNS.
      // the host's plural when it gave one; English falls back to "s"
      const declared = inSection.find((c) => c.noun)
      const singular = declared?.noun ?? HINT_NOUNS[sec]
      if (!singular) return t.sectionCount({ n, noun: sec.toLowerCase() })
      const one = new Intl.PluralRules(locale).select(n) === "one"
      const plural = declared?.nounPlural ?? `${singular}s`
      return t.sectionCount({ n, noun: one ? singular : plural })
    })

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
        else {
          setSearchOver(false)
          send()
        }
      } else if (e.key === "Backspace" && input === "" && chips.length > 0) {
        removeChip(chips[chips.length - 1].id)
      }
    }
    surfaceEl = (
      <motion.div
        key="spotlight"
        data-ambient-surface="spotlight"
        // a glass-tinted scrim: the product dims behind a translucent veil
        // (the scrim token, a background-derived wash) so the palette reads
        // as the hero of the moment; the layer still catches outside clicks
        className="bg-(--scrim) fixed inset-0 z-50 flex flex-col items-center backdrop-blur-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: microT }}
        transition={microT}
        onClick={() => {
          setSearchOver(false)
          setMode(messages.length ? "panel" : "line")
        }}
      >
        {/* fraction spacers, not vh margins: the overlay is the containing
            block, so the palette holds its 9% head-margin inside a framed
            layer exactly as it does on the full page */}
        <div aria-hidden className="h-1/12 shrink-0" />
        <motion.div
          className="flex max-h-5/6 w-[720px] min-h-0 max-w-11/12 flex-col"
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99, transition: microT }}
          transition={enterT}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="ambient-glass ambient-live-border relative flex max-h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-(--glass-border) shadow-[0_32px_100px_-16px_rgba(0,0,0,0.6),0_8px_32px_-12px_rgba(0,0,0,0.4)]"
            data-orb-state={orbState}
            data-ambient-panel
          >
            {renderField()}
            <div className="relative flex min-h-0 flex-col">
              {/* search / ask input — hidden in answer mode (follow-up bar takes over) */}
              {!transcriptView && (
                <>
                  <div className="border-b border-(--glass-border) px-4 py-2">
                    <div className={AI_FORM_ROW}>
                      <MiniAvatar />
                      <div className="relative min-w-0 flex-1">
                        <input
                          ref={inputRef}
                          data-ambient-input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={onPaletteKeyDown}
                          aria-label={askLine}
                          className="w-full bg-transparent text-base outline-none"
                        />
                        <ShimmerPlaceholder show={input === ""}>
                          {askLine}
                        </ShimmerPlaceholder>
                      </div>
                    </div>

                    {/* attached context lives inside the header band — one hairline */}
                    {(pageChip || chips.length > 0 || pasted.length > 0) && (
                      <div className="pt-2">
                        <ContextRow
                          pageChip={pageChip}
                          pagePinned={pagePinned}
                          onTogglePage={setPagePinned}
                          chips={chips}
                          removeChip={removeChip}
                          attachments={pasted}
                          onRemoveAttachment={(id) =>
                            setPasted((a) => a.filter((x) => x.id !== id))
                          }
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {transcriptView ? (
                <>
                  <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                    {/* the session's subject, not a character and not the
                        product's name — same header rule as the panel */}
                    <span
                      title={sessionTitle}
                      className={cn(
                        "min-w-0 truncate text-sm font-medium",
                        busy && "ambient-shimmer"
                      )}
                    >
                      {sessionTitle}
                    </span>
                    <div className="ms-auto flex items-center gap-1 text-muted-foreground">
                      <HeaderBtn
                        label={t.history}
                        onClick={() => setMode("history")}
                      >
                        <Icon name="history" size={14} />
                      </HeaderBtn>
                      <HeaderBtn label={t.dockIt} onClick={() => setMode("dock")}>
                        <Icon name="sidebar" size={14} />
                      </HeaderBtn>
                      <HeaderBtn
                        label={t.openInChatWindow}
                        onClick={() => setMode("panel")}
                      >
                        <HugeiconsIcon
                          icon={PictureInPictureOnIcon}
                          size={14}
                          strokeWidth={1.8}
                        />
                      </HeaderBtn>
                      <HeaderBtn
                        label={t.backToSearch}
                        onClick={clearConversation}
                      >
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          size={14}
                          strokeWidth={1.8}
                        />
                      </HeaderBtn>
                    </div>
                  </div>
                  {renderTranscript()}
                  {/* follow-up bar at the bottom, with context attached — like the panel */}
                  <div className="border-t border-(--glass-border) px-4 py-2">
                    <ContextRow
                      pageChip={pageChip}
                      pagePinned={pagePinned}
                      onTogglePage={setPagePinned}
                      chips={chips}
                      removeChip={removeChip}
                      attachments={pasted}
                      onRemoveAttachment={(id) =>
                        setPasted((a) => a.filter((x) => x.id !== id))
                      }
                    />
                    {queued.length > 0 && (
                      <MessageQueue
                        running={busy ? runningPrompt : undefined}
                        queued={queued}
                        onInterrupt={interruptWith}
                        onCancel={(id) =>
                          setQueued((q) => q.filter((x) => x.id !== id))
                        }
                        className="pb-2"
                      />
                    )}
                    <Composer
                      inputRef={inputRef}
                      value={input}
                      onChange={setInput}
                      onSend={send}
                      onStop={stop}
                      busy={busy}
                      onPasteText={attachText}
                      placeholder={busy ? t.queuePlaceholder : t.followUpPlaceholder}
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
                      <p className="px-2 pt-2 pb-1 text-[12px] text-muted-foreground">
                        {t.groundedFootnote}
                      </p>
                    ) : q && queryMatches.length === 0 ? (
                      <p className="text-muted-foreground px-2 py-3 text-sm">
                        {t.noMatches}
                      </p>
                    ) : !q && hint.length > 0 ? (
                      <p className="text-muted-foreground px-2 pt-3 pb-1 text-sm">
                        {t.startTypingHint({ families: hint.join(", ") })}
                      </p>
                    ) : null
                  }
                />
              )}

              <div className="flex items-center gap-3 border-t border-(--glass-border) px-3 py-2 text-xs text-muted-foreground">
                {/* no character down here either: the palette already
                    carries one in the row you type into, and a second mark on
                    the same surface is the shell signing itself twice */}
                <span className="flex items-center gap-2">{t.footerName}</span>
                <span className="ms-auto flex items-center gap-1.5">
                  {t.select} <PaletteKey>↵</PaletteKey>
                </span>
                {hotkey && (
                  <>
                    <span className="h-3.5 w-px bg-(--glass-border)" />
                    <span className="flex items-center gap-1.5">
                      {t.toggle}
                      {hotkeyCaps(hotkey).map((cap) => (
                        <PaletteKey key={cap}>{cap}</PaletteKey>
                      ))}
                    </span>
                  </>
                )}
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
        data-ambient-surface="dock"
        data-orb-state={orbState}
        // inset on the spacing grid (2 = 8px at the default unit) and
        // rounded: the dock is a surface the layer put there, not a pane
        // welded to the window edge
        className="ambient-live-border fixed top-2 right-2 bottom-2 z-50 w-[420px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl shadow-[-24px_0_70px_-16px_rgba(0,0,0,0.4)]"
        // the dock is inset 8px per side, so its cap is the frame less 16 —
        // the class behind it stays right for an unembedded layer
        style={frameBox ? { maxWidth: frameBox.w - 16 } : undefined}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40, transition: microT }}
        transition={enterT}
      >
        {surface}
      </motion.div>
    )
  }

  /**
   * HISTORY — the fifth mode, and the only one that takes the whole screen.
   *
   * The other four are sized to how much attention a single exchange
   * deserves. This one is not about an exchange at all: it is about the
   * RECORD of them, which is a different question ("what have I asked here?")
   * and the only one that legitimately wants the room. It floats translucent
   * over the product rather than navigating away, because the work you were
   * doing is the reason you are looking at the history in the first place.
   *
   * Adding it was a governance event (DESIGN.md §8). It composes the
   * sanctioned Sidebar for the record and the same transcript and Composer as
   * every other mode — a new mode is a new GEOMETRY, never new parts.
   */
  if (mode === "history") {
    // THE CONVERSATION YOU ARE HAVING IS PART OF THE RECORD. Without this the
    // list showed only past questions, so the session actually on screen —
    // the one that might still be running — was the one thing missing from
    // the history of it.
    const past = recentChats
    const live = messages.find((m) => m.role === "user")?.text
    const recents =
      live && !past.some((r) => r.text === live)
        ? [{ text: live, when: busy ? "now" : "just now" }, ...past]
        : past
    // the buckets a person actually thinks in; anything with "ago" happened
    // within the day, and the rest keeps whatever the source called it
    const groups = [
      {
        label: "Today",
        items: recents.filter((r) => /ago|now/i.test(r.when)),
      },
      {
        label: "Yesterday",
        items: recents.filter((r) => /yesterday/i.test(r.when)),
      },
      {
        label: "Earlier",
        items: recents.filter(
          (r) => !/ago|now/i.test(r.when) && !/yesterday/i.test(r.when)
        ),
      },
    ].filter((g) => g.items.length > 0)

    surfaceEl = (
      <motion.div
        key="history"
        data-ambient-surface="history"
        data-orb-state={orbState}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: microT }}
        transition={microT}
        // the scrim, not the panel's glass: this one covers the product
        className="ambient-scrim fixed inset-0 z-50 flex flex-col"
      >
        {/* THE SAME HEAT FIELD THE PANELS WEAR. History is a surface of
            the ambient layer, not a page it opened — the field is how a
            surface says so, and a full-screen one going flat was the
            loudest possible place to drop the identity. Self-clipped, and
            mounted only while this mode is (one shader instance, not one
            per mode kept alive). */}
        <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="border-(--glass-border) flex shrink-0 items-center gap-3 border-b px-4 py-3">
          <span className="text-sm font-medium">{t.history}</span>
          <span className="text-muted-foreground font-mono text-xs">
            {t.conversations({ n: recents.length })}
          </span>
          <div className="ms-auto flex items-center gap-1 text-muted-foreground">
            {/* keep the conversation, put the record away — the panel to
                float it, the dock to park it beside the work */}
            <HeaderBtn
              label={t.openInChatWindow}
              onClick={() => setMode("panel")}
            >
              <HugeiconsIcon
                icon={PictureInPictureOnIcon}
                size={14}
                strokeWidth={1.8}
              />
            </HeaderBtn>
            <HeaderBtn label={t.dockIt} onClick={() => setMode("dock")}>
              <Icon name="sidebar" size={15} />
            </HeaderBtn>
            <HeaderBtn label={t.closeHistory} onClick={() => setMode("line")}>
              <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={1.8} />
            </HeaderBtn>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <SidebarProvider className="min-h-0! w-auto! flex-none">
            <Sidebar
              collapsible="none"
              // NOTHING INSIDE AN AMBIENT SURFACE IS OPAQUE (DESIGN.md §8),
              // and the veil sits over the field. The rail wore bg-sidebar to
              // read as a pane you navigate, and it did — while punching a
              // solid hole through the field and the work behind it. It wears
              // the same frost as the surface's other chrome instead:
              // translucent, and the shader stays veiled under it.
              className="w-72 shrink-0 border-e border-(--glass-border) bg-transparent"
            >
              <SidebarHeader>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={clearConversation}>
                      <Icon name="plus" size={15} />
                      <span>{t.newChat}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarHeader>
              <SidebarContent>
                {groups.map((g) => (
                  <SidebarGroup key={g.label}>
                    <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {g.items.map((r) => {
                          // the row IS the conversation, so it carries its
                          // state: open while it is the one on screen,
                          // shimmering while that one is still working
                          const open = live === r.text || runningPrompt === r.text
                          const working = open && busy
                          return (
                            <SidebarMenuItem key={r.text}>
                              <SidebarMenuButton
                                isActive={open}
                                onClick={() => {
                                  // opens in place: the record is somewhere
                                  // you can work, not a launcher that ejects
                                  clearConversation()
                                  send(r.text)
                                }}
                                className="h-auto flex-col items-start gap-0.5 py-2"
                              >
                                <span
                                  className={cn(
                                    "w-full truncate",
                                    working && "ambient-shimmer"
                                  )}
                                >
                                  {r.text}
                                </span>
                                <span className="text-muted-foreground font-mono text-xs">
                                  {working ? "Working…" : r.when}
                                </span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                ))}
              </SidebarContent>
            </Sidebar>
          </SidebarProvider>

          {/* THE FIELD BELONGS TO THE CONVERSATION, not to the window. Run
              across the whole surface it lit the record and the chrome too,
              which are lists — they are read, not felt, and a shader behind
              them is just noise under text. Scoped here it does what it is
              for: it is the ground the answer arrives on.

              The composer OVERLAYS the transcript on that same ground: a bar
              the content cannot pass behind has nothing to be translucent
              about, and seeing the answer move under it is what says the
              conversation continues. */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            {renderField("screen")}
            <div className="relative flex min-h-0 flex-1 flex-col">
            {renderTranscript("mx-auto w-full max-w-2xl pb-28")}
            {/* TWO DIFFERENT JOBS, and removing this frost confused them. The
                surface's veil covers the FIELD; this one covers the CONTENT
                scrolling behind the bar, which is painted above that veil and
                so cannot be reached by it. Without it the transcript passes
                straight through the composer and collides with the input. */}
            <div className="ambient-field-frost border-(--glass-border) absolute inset-x-0 bottom-0 border-t px-4 py-2">
              <div className="mx-auto w-full max-w-2xl">
              <ContextRow
                pageChip={pageChip}
                pagePinned={pagePinned}
                onTogglePage={setPagePinned}
                chips={chips}
                removeChip={removeChip}
                attachments={pasted}
                onRemoveAttachment={(id) =>
                  setPasted((a) => a.filter((x) => x.id !== id))
                }
              />
              <Composer
                value={input}
                onChange={setInput}
                onSend={send}
                onStop={stop}
                busy={busy}
                onAttach={() => attachText(SAMPLE_ATTACHMENT)}
                onPasteText={attachText}
                placeholder={busy ? t.queuePlaceholder : t.followUpPlaceholder}
              />
              </div>
            </div>
            </div>
          </div>
        </div>
        </div>
      </motion.div>
    )
  }

  // panel — draggable, with snap zones for dock / spotlight
  if (mode === "panel") {
    surfaceEl = (
      <motion.div
        key="panel"
        data-ambient-surface="panel"
        ref={panelRef}
        data-orb-state={orbState}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.99, transition: microT }}
        transition={enterT}
        className="ambient-live-border fixed z-50 h-[560px] max-h-[80vh] w-[440px] max-w-[92vw] overflow-hidden rounded-xl shadow-[0_32px_90px_-12px_rgba(0,0,0,0.5),0_8px_28px_-8px_rgba(0,0,0,0.35)]"
        style={{
          ...framedCap,
          ...(panelPos
            ? { left: panelPos.x, top: panelPos.y }
            : { right: 16, bottom: 16 }),
        }}
      >
        {surface}
      </motion.div>
    )
  }

  // The layer's one root: `data-ambient-root` lets tests and verify find
  // it, `ambient-scope` is where a scoped preflight applies, and with a
  // `zIndex` it becomes a stacking context (otherwise layout-neutral).
  return (
    <div
      data-ambient-root=""
      className={cn("ambient-scope", dark && "dark")}
      style={
        zIndex === undefined
          ? { display: "contents" }
          : { position: "relative", zIndex }
      }
    >
      {/* zero-size fixed probe: its offsetParent IS the containing block
          (the frame when embedded, the viewport otherwise) */}
      <div ref={frameProbeRef} aria-hidden className="fixed" />
      {/* Only render the orb in its own mode: kept mounted-but-hidden it
          held a WebGL context and a 60fps loop behind every open surface. */}
      {mode === "line" && <AssistantOrb />}
      {mode === "panel" && panelDrag && <SnapZones hot={hotZone} />}
      <AnimatePresence>{surfaceEl}</AnimatePresence>
    </div>
  )
}

/** The AI avatar, pulled in close to the palette input. */
function MiniAvatar({ small }: { small?: boolean }) {
  const runtime = useAmbientRuntime()
  // `small` is the list-row variant: incidental, so it wears the CSS twin.
  // The surface's own mark (the input avatar) keeps the real character.
  if (small)
    return (
      <OrbGlyph
        size={24}
        color={
          runtime.orb.useAccent
            ? undefined
            : runtime.orb.colors[Math.min(1, runtime.orb.colors.length - 1)]
        }
      />
    )
  return <AssistantMark size={32} />
}

/** Raycast-style keycap chip — a neutral wash square on the glass. */
function PaletteKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded-sm bg-(--glass-wash) px-1 py-0.5 font-mono text-[10px]">
      {children}
    </kbd>
  )
}

const rowClass =
  "hover:bg-(--glass-wash) flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-start text-sm"

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pt-3.5 pb-1.5 text-xs font-medium text-muted-foreground first:pt-1.5">
      {children}
    </div>
  )
}

function PaletteItemIcon({ item }: { item: PaletteItem }) {
  if (item.iconKind === "avatar") return <MiniAvatar small />
  if (item.iconKind === "command")
    return (
      <span className="text-muted-foreground">
        <Icon name={(item.iconName ?? "arrow-up-right") as IconName} size={16} />
      </span>
    )
  if (item.iconKind === "prompt" || item.iconKind === "ask")
    return (
      <span className="text-muted-foreground">
        <HugeiconsIcon icon={SparklesIcon} size={16} strokeWidth={1.8} />
      </span>
    )
  return (
    <span className="text-muted-foreground">
      <HugeiconsIcon
        icon={
          item.iconKind === "recent"
            ? Message01Icon
            : (item.navIcon ?? Message01Icon)
        }
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
  // SCOPED TO THIS LIST, not the document: several layers can be mounted
  // at once (embedded demos), and a document-wide id lookup can land on a
  // sibling instance's row — scrollIntoView then walks every scrollable
  // ancestor and drags the HOST PAGE to the other window. The list only
  // ever needs to scroll itself.
  const listRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const list = listRef.current
    const row = list?.querySelector<HTMLElement>(
      `[data-palette-item="${selected}"]`
    )
    if (!list || !row) return
    const top = row.offsetTop - list.offsetTop
    const bottom = top + row.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight
  }, [selected])
  // headers derived up front: a `let` reassigned inside map() is render-phase
  // mutation, and it silently breaks if React ever renders the list twice
  const headers = items.map((item, i) =>
    item.section && item.section !== items[i - 1]?.section ? item.section : null
  )
  return (
    <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
      {items.map((item, i) => {
        const header = headers[i]
        return (
          <React.Fragment key={item.id}>
            {header && <SectionLabel>{header}</SectionLabel>}
            <button
              data-palette-item={i}
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
                <span className="text-muted-foreground min-w-0 truncate text-xs">
                  {item.desc}
                </span>
              )}
              {item.trailing && (
                <span className="text-muted-foreground ms-auto shrink-0 text-xs">
                  {item.trailing}
                </span>
              )}
              {/* the keycap is ALWAYS in the row and only ever fades: rendered
                  on selection it changed the row's height, so every row the
                  pointer touched grew and the list flinched underneath it */}
              {!item.trailing && (
                <kbd
                  aria-hidden={i !== selected}
                  className={cn(
                    "text-muted-foreground ms-auto shrink-0 rounded-sm bg-(--glass-wash) px-1.5 py-0.5 text-xs transition-opacity",
                    i === selected ? "opacity-100" : "opacity-0"
                  )}
                >
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
  const t = useAmbientMessages()
  const zone = (active: boolean) =>
    cn(
      // glass: translucent fill + backdrop blur keeps the labels readable over content
      "pointer-events-none fixed z-40 flex items-center justify-center rounded-lg border border-dashed text-xs font-medium backdrop-blur-md",
      active
        ? "border-[var(--ambient-accent)] bg-[var(--ambient-accent-wash)] text-[var(--ambient-accent)]"
        : "border-muted-foreground/40 bg-(--scrim) text-muted-foreground"
    )
  return (
    <>
      <div className={cn(zone(hot === "dock"), "inset-y-2 right-2 w-28")}>
        {t.snapDock}
      </div>
      <div
        className={cn(
          zone(hot === "spotlight"),
          "top-2 left-1/2 h-28 w-[640px] max-w-[80vw] -translate-x-1/2"
        )}
      >
        {t.snapSpotlight}
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
      className="flex size-7 items-center justify-center rounded-[4px] hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  )
}

/**
 * THE CONTEXT ROW — everything the question is about, in ONE slider above
 * the input.
 *
 * The page's chip, anything explicitly attached, and any pasted text are the
 * same kind of object: material the answer will rest on. They were drawn in
 * two stacked rows — context in one, attachments in another — which read as
 * two different kinds of thing and cost twice the height above an input that
 * is already the smallest part of the surface. One run, one owner.
 *
 * It SCROLLS rather than wraps. Wrapping grew the composer upward as context
 * accumulated, pushing the transcript around while the user was still
 * writing; a single scrolling row costs the same height whether it holds one
 * chip or nine, and ChipSlider's arrows say when there is more.
 *
 * THIS ROW OWNS ATTACHMENTS wherever it appears. Composer can draw its own
 * for a composer standing alone (the /ds playground, a bare embed) — but the
 * two must never both be given them, or every attachment gets two remove
 * buttons. Where there is a context row, the composer is handed none.
 */
function ContextRow({
  pageChip,
  pagePinned,
  onTogglePage,
  chips,
  removeChip,
  attachments = [],
  onRemoveAttachment,
}: {
  pageChip: ContextChip | null
  pagePinned: boolean
  onTogglePage: (pinned: boolean) => void
  chips: ContextChip[]
  removeChip: (id: string) => void
  /** Staged attachments — see the ownership note above. */
  attachments?: MessageAttachment[]
  onRemoveAttachment?: (id: string) => void
}) {
  const t = useAmbientMessages()
  if (!pageChip && chips.length === 0 && attachments.length === 0) return null
  return (
    <ChipSlider
      deps={chips.length + attachments.length}
      className="pb-2"
    >
      {pageChip &&
        (pagePinned ? (
          <ContextChipView
            chip={pageChip}
            onRemove={() => onTogglePage(false)}
          />
        ) : (
          <button
            type="button"
            title={t.attachPageTitle}
            onClick={() => onTogglePage(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-popover py-1 ps-1.5 pe-2.5 text-[12.5px] font-medium transition-colors hover:bg-(--wash-strong)"
          >
            <IconTile icon="document" />
            {t.attachContext}
            <span className="text-muted-foreground">
              <HugeiconsIcon icon={PlusSignIcon} size={13} strokeWidth={1.8} />
            </span>
          </button>
        ))}
      {chips.map((c) => (
        <ContextChipView
          key={c.id}
          chip={c}
          onRemove={() => removeChip(c.id)}
        />
      ))}
      {attachments.map((a) => (
        <AttachmentChip
          key={a.id}
          attachment={a}
          onRemove={onRemoveAttachment}
        />
      ))}
    </ChipSlider>
  )
}

/**
 * CONTEXT PILL — one attached thing the assistant can see. The page's own
 * chip is muted (it arrived automatically); anything the user attached
 * carries the ambient accent and a remove control.
 */
