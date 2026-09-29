/**
 * THE LAYER'S COPY, IN ENGLISH — every word the ambient layer says on its
 * own behalf. The words inside an answer are the host's, from its API; these
 * are only the chrome's.
 *
 * Ten languages ship: en, zh, hi, es, fr, ar, pt, ru, ja, de. The layer
 * picks one from `locale` (exact tag, then language, then English).
 *
 * TO ADD A LANGUAGE (this file is written to be copied):
 *
 *   1. Copy it to `messages.<locale>.ts`, rename the export
 *      (`ambientMessagesIt`), and register it in `ambientCatalogs`
 *      (messages.ts).
 *   2. Translate the VALUES. Keep every key, every `{placeholder}` exactly as
 *      written, and the plural syntax around the words:
 *        "{n, plural, one {# conversation} other {# conversations}}"
 *      becomes, in Spanish,
 *        "{n, plural, one {# conversación} other {# conversaciones}}"
 *      `#` is the number; the categories are the language's own CLDR
 *      plural rules (Arabic uses zero/one/two/few/many/other).
 *   3. A product can also override any subset without a file:
 *        <AssistantProvider locale="it" messages={{ askAction: "Chiedi a {assistant}" }}>
 *      Missing keys fall back to the shipped catalog, then English. A
 *      product that translates through i18next, next-intl or react-intl can
 *      keep these keys in its own locale files (ICU MessageFormat).
 *
 * `{product}` is the product's name (`productName`); `{assistant}` is what
 * the assistant is called (`assistantName`, which defaults to the product's
 * name). Keep the copy plain:
 * no markup, sentence case, the ellipsis character (…) for "more to come".
 */
export const ambientMessagesEn = {
  // the spotlight
  askPlaceholder: "Search or ask a question in {product}…",
  askAction: "Ask {assistant}",
  noMatches: "No pages match — ↵ asks {assistant} instead.",
  footerName: "{assistant}",
  suggestedForPage: "Suggested for this page",
  jumpTo: "Jump to",
  recentChats: "Recent chats",
  openPanelWithContext: "Open the panel with this context",
  backToConversation: "Back to the conversation",
  groundedFootnote: "Answers are grounded in the attached context.",
  startTypingHint: "Start typing to search {families}.",
  /** One counted command family in that hint: `{noun}` is already singular or plural. */
  sectionCount: "{n} {noun}",
  select: "Select",
  toggle: "Toggle",

  // the orb
  openOrb: "Open {assistant}",
  quickAskPlaceholder: "Ask {assistant}…",

  // the conversation surfaces
  askAboutPage: "Ask about this page",
  askAboutProduct: "Ask about {product}",
  canSeePage: "I can see {page} and what is open around it. Right-click anything — a line, a file, a control — to attach it as context.",
  canSeeProduct: "I can see the page you are on. Right-click anything — a row, a control, a value — to attach it as context.",
  newChat: "New chat",
  pastedText: "Pasted text",
  pastedMeta: "{lines, plural, one {# line} other {# lines}} · {chars} chars",
  working: "Working…",
  followUpPlaceholder: "Ask a follow-up…",
  queuePlaceholder: "Queue another instruction…",
  history: "History",
  conversations: "{n, plural, one {# conversation} other {# conversations}}",
  minimize: "Minimize",
  dockIt: "Dock it",
  openInChatWindow: "Open in chat window",
  backToSearch: "Back to search",
  closeHistory: "Close history",
  snapDock: "Dock",
  snapSpotlight: "Spotlight",

  // attaching context
  attachContext: "Attach context",
  attachContextTitle: "Attach a file, a selection, or paste text",
  attachPageTitle: "Attach this page as context",
  remove: "Remove",
  scrollBack: "Scroll back",
  scrollForward: "Scroll forward",

  // the composer
  queueInstruction: "Queue this instruction",
  queueTitle: "Queue — sends when the running turn finishes",
  stopAnswer: "Stop the answer",
  stop: "Stop",
  send: "Send",
  sendNow: "Send now — interrupts the running turn",

  // answers
  couldNotAnswer: "Couldn't answer",
  emptyAnswer: "The assistant sent an empty answer.",
  generationStopped: "Generation stopped",
  retry: "Retry",
  tryAgain: "Try again",
  copy: "Copy",
  copied: "Copied",
  goodAnswer: "Good answer",
  badAnswer: "Bad answer",
  moreActions: "More actions",
  showMoreActions: "Show more actions",
  showFewerActions: "Show fewer actions",
  askMore: "Ask more",
  previousVersion: "Previous version",
  nextVersion: "Next version",
  describeEdits: "Describe edits",
  sendEdit: "Send edit instruction",
  quoteExplain: "Explain",
  quoteImprove: "Improve",
  quoteShorten: "Shorten",
  quoteTone: "Tone",
  quoteGrammar: "Grammar",
  busyExplain: "Explaining",
  busyImprove: "Improving",
  busyShorten: "Shortening",
  busyTone: "Changing tone",
  busyGrammar: "Fixing grammar",
  busyPrompt: "Editing",
  reviewComment: "Comment",
  reviewChangeRequested: "Change requested",
  reviewResolved: "Resolved",
  leaveReply: "Leave a reply…",
  whatWentWrong: "What went wrong?",
  anythingElse: "Anything else?",

  // thinking and tools
  thinking: "Thinking",
  thinkingFor: "Thinking… {n}s",
  thoughtFor: "Thought for {n}s",
  reasoning: "Reasoning",
  running: "Running",
  run: "Run",
  succeeded: "Succeeded",
  failed: "Failed",
  applied: "Applied",
  applyCount: "Apply {n}",
}

/** The shape every locale's catalog has: the same keys, each an ICU string. */
export type AmbientCatalog = { [K in keyof typeof ambientMessagesEn]: string }
