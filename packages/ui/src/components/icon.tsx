"use client"

import * as React from "react"

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  Cancel01Icon,
  FavouriteIcon,
  Moon02Icon,
  PauseIcon,
  PlayIcon,
  PlusSignIcon,
  ReplayIcon,
  Search01Icon,
  Settings01Icon,
  SidebarLeftIcon,
  SparklesIcon,
  Sun03Icon,
  Tick02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconHeart,
  IconLayoutSidebar,
  IconMoon,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconReload,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconSun,
  IconUser,
  IconX,
} from "@tabler/icons-react"
import {
  ArrowCounterClockwise,
  CalendarBlank,
  CaretDown,
  CaretRight,
  Check,
  Gear,
  Heart,
  MagnifyingGlass,
  Moon,
  Pause,
  Play,
  Plus,
  Sidebar as PhSidebar,
  Sparkle,
  Sun,
  User,
  X,
} from "@phosphor-icons/react"
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCalendarLine,
  RiCheckLine,
  RiCloseLine,
  RiHeartLine,
  RiLayoutLeftLine,
  RiMoonLine,
  RiPauseLine,
  RiPlayLine,
  RiRestartLine,
  RiSearchLine,
  RiSettings3Line,
  RiSparklingLine,
  RiSunLine,
  RiUserLine,
} from "@remixicon/react"
import {
  Calendar as LCalendar,
  Check as LCheck,
  ChevronDown as LChevronDown,
  ChevronRight as LChevronRight,
  Heart as LHeart,
  Moon as LMoon,
  PanelLeft as LPanelLeft,
  Pause as LPause,
  Play as LPlay,
  Plus as LPlus,
  RotateCcw as LRotateCcw,
  Search as LSearch,
  Settings as LSettings,
  Sparkles as LSparkles,
  Sun as LSun,
  User as LUser,
  X as LX,
} from "lucide-react"

/**
 * The system's icon component. Components name icons SEMANTICALLY; the
 * Foundation's icon-library choice — supplied through IconLibraryProvider —
 * decides which set draws them. The same governance shape as colors and
 * spacing: select the library once, everything follows. New names must be
 * mapped in every library or they don't exist.
 */

export type IconName =
  | "search"
  | "settings"
  | "user"
  | "heart"
  | "check"
  | "close"
  | "chevron-down"
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

type Renderer = (size: number, strokeWidth: number, className?: string) => React.ReactNode

const hi =
  (icon: typeof SparklesIcon): Renderer =>
  (size, strokeWidth, className) => (
    <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} className={className} />
  )
const lu =
  (C: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>): Renderer =>
  (size, strokeWidth, className) => <C size={size} strokeWidth={strokeWidth} className={className} />
const tb = lu
const ph =
  (C: React.ComponentType<{ size?: number; className?: string }>): Renderer =>
  (size, _sw, className) => <C size={size} className={className} />
const rx =
  (
    C: React.ComponentType<{ size?: number | string; className?: string }>
  ): Renderer =>
  (size, _sw, className) => <C size={size} className={className} />

const SETS: Record<string, Record<IconName, Renderer>> = {
  hugeicons: {
    search: hi(Search01Icon),
    settings: hi(Settings01Icon),
    user: hi(UserIcon),
    heart: hi(FavouriteIcon),
    check: hi(Tick02Icon),
    close: hi(Cancel01Icon),
    "chevron-down": hi(ArrowDown01Icon),
    "chevron-right": hi(ArrowRight01Icon),
    sidebar: hi(SidebarLeftIcon),
    sun: hi(Sun03Icon),
    moon: hi(Moon02Icon),
    play: hi(PlayIcon),
    pause: hi(PauseIcon),
    replay: hi(ReplayIcon),
    sparkles: hi(SparklesIcon),
    plus: hi(PlusSignIcon),
    calendar: hi(Calendar01Icon),
  },
  lucide: {
    search: lu(LSearch),
    settings: lu(LSettings),
    user: lu(LUser),
    heart: lu(LHeart),
    check: lu(LCheck),
    close: lu(LX),
    "chevron-down": lu(LChevronDown),
    "chevron-right": lu(LChevronRight),
    sidebar: lu(LPanelLeft),
    sun: lu(LSun),
    moon: lu(LMoon),
    play: lu(LPlay),
    pause: lu(LPause),
    replay: lu(LRotateCcw),
    sparkles: lu(LSparkles),
    plus: lu(LPlus),
    calendar: lu(LCalendar),
  },
  tabler: {
    search: tb(IconSearch),
    settings: tb(IconSettings),
    user: tb(IconUser),
    heart: tb(IconHeart),
    check: tb(IconCheck),
    close: tb(IconX),
    "chevron-down": tb(IconChevronDown),
    "chevron-right": tb(IconChevronRight),
    sidebar: tb(IconLayoutSidebar),
    sun: tb(IconSun),
    moon: tb(IconMoon),
    play: tb(IconPlayerPlay),
    pause: tb(IconPlayerPause),
    replay: tb(IconReload),
    sparkles: tb(IconSparkles),
    plus: tb(IconPlus),
    calendar: tb(IconCalendar),
  },
  phosphor: {
    search: ph(MagnifyingGlass),
    settings: ph(Gear),
    user: ph(User),
    heart: ph(Heart),
    check: ph(Check),
    close: ph(X),
    "chevron-down": ph(CaretDown),
    "chevron-right": ph(CaretRight),
    sidebar: ph(PhSidebar),
    sun: ph(Sun),
    moon: ph(Moon),
    play: ph(Play),
    pause: ph(Pause),
    replay: ph(ArrowCounterClockwise),
    sparkles: ph(Sparkle),
    plus: ph(Plus),
    calendar: ph(CalendarBlank),
  },
  remix: {
    search: rx(RiSearchLine),
    settings: rx(RiSettings3Line),
    user: rx(RiUserLine),
    heart: rx(RiHeartLine),
    check: rx(RiCheckLine),
    close: rx(RiCloseLine),
    "chevron-down": rx(RiArrowDownSLine),
    "chevron-right": rx(RiArrowRightSLine),
    sidebar: rx(RiLayoutLeftLine),
    sun: rx(RiSunLine),
    moon: rx(RiMoonLine),
    play: rx(RiPlayLine),
    pause: rx(RiPauseLine),
    replay: rx(RiRestartLine),
    sparkles: rx(RiSparklingLine),
    plus: rx(RiAddLine),
    calendar: rx(RiCalendarLine),
  },
}

export const ICON_NAMES: IconName[] = [
  "search",
  "settings",
  "user",
  "heart",
  "check",
  "close",
  "chevron-down",
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
]

/**
 * The active icon library. The app's FoundationProvider supplies the saved
 * config's choice; packages/ui primitives render through it without knowing
 * where the config lives.
 */
export const IconLibraryContext = React.createContext<string>("hugeicons")

export function IconLibraryProvider({
  library,
  children,
}: {
  library: string
  children: React.ReactNode
}) {
  return (
    <IconLibraryContext.Provider value={library}>
      {children}
    </IconLibraryContext.Provider>
  )
}

export interface IconProps {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
  /** Force a specific library (previews only — everything else follows the config). */
  library?: string
}

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.8,
  className,
  library,
}: IconProps) {
  const configured = React.useContext(IconLibraryContext)
  const set = SETS[library ?? configured] ?? SETS.hugeicons!
  return <>{set[name](size, strokeWidth, className)}</>
}
