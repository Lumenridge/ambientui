"use client"

import * as React from "react"

/**
 * EVERY WORD THE LAYER SAYS ON ITS OWN BEHALF — the chrome's copy, in one
 * object the host can replace.
 *
 * The layer's words were written inline, in English, and several of them
 * named the LIBRARY: "Ask ambientui", "Open ambientui", a footer reading
 * "ambientui". Every install hit it (tududi, Actual, Invoify, Excalidraw,
 * 2026-09-27/28): the product's users were shown the name of a component
 * library they had never heard of, and a product with eighteen locales got
 * English chrome with no way to pass its translations in.
 *
 * So the chrome reads its copy from here. `productName` fills the defaults,
 * and a host with its own i18n passes `messages` (any subset) to
 * AssistantProvider. The words INSIDE an answer are the host's, from its
 * API; these are only the layer's own.
 */
export type AmbientMessages = {
  /** The spotlight input's invitation when the page offers none. */
  askPlaceholder: string
  /** The row that sends what was typed as a question. */
  askAction: string
  /** The spotlight's empty-state line when no page matches. */
  noMatches: string
  /** The palette footer's name for what the user is talking to. */
  footerName: string
  /** The resting orb's accessible name. */
  openOrb: string
  /** The orb's quick-ask input. */
  quickAskPlaceholder: string
  /** The line surface's heading when a page announced itself / did not. */
  askAboutPage: string
  askAboutProduct: string
  suggestedForPage: string
  jumpTo: string
  recentChats: string
  openPanelWithContext: string
  backToConversation: string
  groundedFootnote: string
  /** `hint` receives the counted families, already joined: "12 components, 3 demos". */
  startTypingHint: (families: string) => string
  followUpPlaceholder: string
  queuePlaceholder: string
  select: string
  toggle: string
  history: string
  minimize: string
  dockIt: string
  openInChatWindow: string
  backToSearch: string
  closeHistory: string
  attachContext: string
  attachContextTitle: string
  attachPageTitle: string
  queueInstruction: string
  queueTitle: string
  stopAnswer: string
  stop: string
  send: string
  couldNotAnswer: string
  retry: string
  copy: string
  copied: string
  askMore: string
  thinking: string
  /** `n` is whole seconds. */
  thinkingFor: (n: number) => string
  thoughtFor: (n: number) => string
  reasoning: string
  remove: string
  sendNow: string
  running: string
  previousVersion: string
  nextVersion: string
  tryAgain: string
  describeEdits: string
  sendEdit: string
  whatWentWrong: string
  anythingElse: string
  snapDock: string
  snapSpotlight: string
}

/** The defaults, in English, naming the host's product rather than the library. */
export function defaultAmbientMessages(productName = "the assistant"): AmbientMessages {
  return {
    askPlaceholder: `Search or ask a question in ${productName}…`,
    askAction: `Ask ${productName}`,
    noMatches: `No pages match — ↵ asks ${productName} instead.`,
    footerName: productName,
    openOrb: `Open ${productName}`,
    quickAskPlaceholder: `Ask ${productName}…`,
    askAboutPage: "Ask about this page",
    askAboutProduct: `Ask about ${productName}`,
    suggestedForPage: "Suggested for this page",
    jumpTo: "Jump to",
    recentChats: "Recent chats",
    openPanelWithContext: "Open the panel with this context",
    backToConversation: "Back to the conversation",
    groundedFootnote: "Answers are grounded in the attached context.",
    startTypingHint: (families) => `Start typing to search ${families}.`,
    followUpPlaceholder: "Ask a follow-up…",
    queuePlaceholder: "Queue another instruction…",
    select: "Select",
    toggle: "Toggle",
    history: "History",
    minimize: "Minimize",
    dockIt: "Dock it",
    openInChatWindow: "Open in chat window",
    backToSearch: "Back to search",
    closeHistory: "Close history",
    attachContext: "Attach context",
    attachContextTitle: "Attach a file, a selection, or paste text",
    attachPageTitle: "Attach this page as context",
    queueInstruction: "Queue this instruction",
    queueTitle: "Queue — sends when the running turn finishes",
    stopAnswer: "Stop the answer",
    stop: "Stop",
    send: "Send",
    couldNotAnswer: "Couldn't answer",
    retry: "Retry",
    copy: "Copy",
    copied: "Copied",
    askMore: "Ask more",
    thinking: "Thinking",
    thinkingFor: (n) => `Thinking… ${n}s`,
    thoughtFor: (n) => `Thought for ${n}s`,
    reasoning: "Reasoning",
    remove: "Remove",
    sendNow: "Send now — interrupts the running turn",
    running: "Running",
    previousVersion: "Previous version",
    nextVersion: "Next version",
    tryAgain: "Try again",
    describeEdits: "Describe edits",
    sendEdit: "Send edit instruction",
    whatWentWrong: "What went wrong?",
    anythingElse: "Anything else?",
    snapDock: "Dock",
    snapSpotlight: "Spotlight",
  }
}

/**
 * A context of its own, NOT a field of the assistant context: the kits
 * (ReasoningPanel, ErrorState, Composer) render standalone — in the /ds
 * playground, in a host's own page — with no AssistantProvider above them,
 * and must still have words. With no provider they get the defaults.
 */
const MessagesContext = React.createContext<AmbientMessages>(defaultAmbientMessages())

export const AmbientMessagesProvider = MessagesContext.Provider

export function useAmbientMessages(): AmbientMessages {
  return React.useContext(MessagesContext)
}
