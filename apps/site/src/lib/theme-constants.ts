/**
 * The theme's storage key and default, in a module with NO "use client".
 *
 * They are imported by both the provider (a client component) and the
 * pre-paint boot script (rendered by the SERVER layout). Reading them from
 * the client module made the boot script resolve across a client boundary
 * at server-render time and emit NOTHING — the flash returned and the page
 * still looked perfect, which is exactly the failure mode this pair keeps
 * producing. A neutral module has no boundary to cross.
 */
export const THEME_STORAGE_KEY = "ambientui-theme"
export const THEME_DEFAULT = "dark" as const

/**
 * The key that flips appearance, in one place because it is stated twice:
 * the handler that listens for it, and the tooltip that promises it. A
 * tooltip advertising a shortcut nobody bound is worse than no tooltip.
 * Plain letter, no modifier, and ignored while typing.
 */
export const THEME_TOGGLE_KEY = "d"
