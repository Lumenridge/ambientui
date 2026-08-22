import * as React from "react"

/**
 * The icon vocabulary, kept OUT of the component module on purpose.
 *
 * A file that exports both components and values breaks Fast Refresh for
 * everything that imports it — and this one is imported by nearly every
 * component in the package. The names and the library context are data, so
 * they live in lib; icon.tsx stays a component module.
 *
 * Every name here must be mapped in ALL FIVE libraries (DESIGN.md §4).
 * Adding one is a governance event, not a convenience.
 */
export type IconName =
  | "search"
  | "settings"
  | "user"
  | "heart"
  | "check"
  | "close"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "sidebar"
  | "sun"
  | "moon"
  | "play"
  | "pause"
  | "replay"
  | "sparkles"
  | "plus"
  | "calendar"
  | "document"
  | "link"
  | "globe"
  | "code"
  | "copy"
  | "thumbs-up"
  | "thumbs-down"
  | "more"
  | "quote"
  | "edit"
  | "alert"
  | "arrow-up"
  | "image"
  | "paperclip"

export const ICON_NAMES: IconName[] = [
  "search",
  "settings",
  "user",
  "heart",
  "check",
  "close",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "sidebar",
  "sun",
  "moon",
  "play",
  "pause",
  "replay",
  "sparkles",
  "plus",
  "calendar",
  "document",
  "link",
  "globe",
  "code",
  "copy",
  "thumbs-up",
  "thumbs-down",
  "more",
  "quote",
  "edit",
  "alert",
  "arrow-up",
  "image",
  "paperclip",
]

/**
 * The active icon library. The app's FoundationProvider supplies the saved
 * config's choice; packages/ui primitives render through it without knowing
 * where the config lives.
 */
export const IconLibraryContext = React.createContext<string>("hugeicons")
