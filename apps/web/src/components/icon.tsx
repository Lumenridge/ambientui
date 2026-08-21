/**
 * The semantic icon component lives in packages/ui so the primitives
 * (checkbox, dropdown, sheet, sidebar) can draw through the configured
 * library too. This module re-exports it; the FoundationProvider supplies
 * the saved config's library via IconLibraryProvider.
 */
export {
  Icon,
  ICON_NAMES,
  IconLibraryProvider,
  type IconName,
  type IconProps,
} from "@workspace/ui/components/icon"
