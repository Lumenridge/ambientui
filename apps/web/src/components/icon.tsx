/**
 * The semantic icon component lives in packages/ui so the primitives
 * (checkbox, dropdown, sheet, sidebar) can draw through the configured
 * library too. This module re-exports it; the FoundationProvider supplies
 * the saved config's library via IconLibraryProvider.
 */
export {
  Icon,
  IconLibraryProvider,
  type IconName,
  type IconProps,
} from "@workspace/ui/components/icon"
// the name vocabulary is data, not a component — see lib/icon-library
export { ICON_NAMES } from "@workspace/ui/lib/icon-library"
