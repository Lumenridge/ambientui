/**
 * THE MOCK DATA — what the layer shows before a host has told it anything.
 *
 * These used to sit inline in assistant.tsx, mixed in with the component. They
 * are demo fixtures, so they live beside the mock backend instead. A page
 * replaces the suggestions and recents through PageIntel, and setup writes
 * those per page (start.md); nothing here is a default a product should ship
 * with.
 */

/** Questions offered before the page has said what is worth asking. */
export const MOCK_SUGGESTIONS = [
  "Summarize what's on this canvas",
  "Which vocabulary components fit a pipeline view?",
  "Compose a dashboard from existing components",
]

/** A working history for the palette and the history surface. */
export const MOCK_RECENTS = [
  { text: "Which components lack vocabulary docs?", when: "2h ago" },
  { text: "Show every surface using ad-hoc colors", when: "Yesterday" },
  { text: "Draft usage rules for the new table density", when: "Mon" },
]

/**
 * What the `+` attaches. A real file picker belongs to the host product, not
 * to the layer — the layer's job is to hold what it is given — so this stands
 * in for one until a host supplies the gesture.
 */
export const MOCK_ATTACHMENT =
  'TypeError: Cannot read properties of undefined (reading "draft")\n    at Composer (composer.tsx:9:14)\n    at renderWithHooks (react-dom.js:14985:18)'
