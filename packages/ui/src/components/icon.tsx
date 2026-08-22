"use client"

import * as React from "react"

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  Alert02Icon,
  ArrowUp01Icon,
  Attachment01Icon,
  Cancel01Icon,
  CodeIcon,
  Copy01Icon,
  Edit02Icon,
  FavouriteIcon,
  File01Icon,
  GlobalIcon,
  Image01Icon,
  Link01Icon,
  MoreHorizontalIcon,
  Moon02Icon,
  PauseIcon,
  PlayIcon,
  PlusSignIcon,
  QuoteDownIcon,
  ReplayIcon,
  Search01Icon,
  Settings01Icon,
  SidebarLeftIcon,
  SparklesIcon,
  Sun03Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconAlertCircle,
  IconArrowUp,
  IconCode,
  IconCopy,
  IconDots,
  IconFileText,
  IconHeart,
  IconLayoutSidebar,
  IconLink,
  IconMoon,
  IconPaperclip,
  IconPencil,
  IconPhoto,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconQuote,
  IconReload,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconSun,
  IconThumbDown,
  IconThumbUp,
  IconUser,
  IconWorld,
  IconX,
} from "@tabler/icons-react"
import {
  ArrowCounterClockwise,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  Code,
  Copy,
  DotsThree,
  FileText,
  Gear,
  Globe,
  Heart,
  MagnifyingGlass,
  Moon,
  Paperclip,
  Pause,
  PencilSimple,
  Play,
  Plus,
  ArrowUp as PhArrowUp,
  Image as PhImage,
  Link as PhLink,
  Quotes,
  Sidebar as PhSidebar,
  ThumbsDown,
  ThumbsUp,
  WarningCircle,
  Sparkle,
  Sun,
  User,
  X,
} from "@phosphor-icons/react"
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowUpLine,
  RiAttachment2,
  RiCalendarLine,
  RiCodeSSlashLine,
  RiDoubleQuotesL,
  RiErrorWarningLine,
  RiFileCopyLine,
  RiFileTextLine,
  RiGlobalLine,
  RiImageLine,
  RiLinkM,
  RiMoreFill,
  RiPencilLine,
  RiThumbDownLine,
  RiThumbUpLine,
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
  Code as LCode,
  ChevronDown as LChevronDown,
  ArrowUp as LArrowUp,
  ChevronLeft as LChevronLeft,
  CircleAlert as LCircleAlert,
  Copy as LCopy,
  Image as LImage,
  MoreHorizontal as LMoreHorizontal,
  Paperclip as LPaperclip,
  Pencil as LPencil,
  Quote as LQuote,
  ThumbsDown as LThumbsDown,
  ThumbsUp as LThumbsUp,
  FileText as LFileText,
  Globe as LGlobe,
  Link as LLink,
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
    "chevron-left": hi(ArrowLeft01Icon),
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
    document: hi(File01Icon),
    link: hi(Link01Icon),
    globe: hi(GlobalIcon),
    code: hi(CodeIcon),
    "copy": hi(Copy01Icon),
    "paperclip": hi(Attachment01Icon),
    "image": hi(Image01Icon),
    "arrow-up": hi(ArrowUp01Icon),
    "alert": hi(Alert02Icon),
    "edit": hi(Edit02Icon),
    "quote": hi(QuoteDownIcon),
    "more": hi(MoreHorizontalIcon),
    "thumbs-down": hi(ThumbsDownIcon),
    "thumbs-up": hi(ThumbsUpIcon),
  },
  lucide: {
    search: lu(LSearch),
    settings: lu(LSettings),
    user: lu(LUser),
    heart: lu(LHeart),
    check: lu(LCheck),
    close: lu(LX),
    "chevron-down": lu(LChevronDown),
    "chevron-left": lu(LChevronLeft),
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
    document: lu(LFileText),
    link: lu(LLink),
    globe: lu(LGlobe),
    code: lu(LCode),
    "copy": lu(LCopy),
    "paperclip": lu(LPaperclip),
    "image": lu(LImage),
    "arrow-up": lu(LArrowUp),
    "alert": lu(LCircleAlert),
    "edit": lu(LPencil),
    "quote": lu(LQuote),
    "more": lu(LMoreHorizontal),
    "thumbs-down": lu(LThumbsDown),
    "thumbs-up": lu(LThumbsUp),
  },
  tabler: {
    search: tb(IconSearch),
    settings: tb(IconSettings),
    user: tb(IconUser),
    heart: tb(IconHeart),
    check: tb(IconCheck),
    close: tb(IconX),
    "chevron-down": tb(IconChevronDown),
    "chevron-left": tb(IconChevronLeft),
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
    document: tb(IconFileText),
    link: tb(IconLink),
    globe: tb(IconWorld),
    code: tb(IconCode),
    "copy": tb(IconCopy),
    "paperclip": tb(IconPaperclip),
    "image": tb(IconPhoto),
    "arrow-up": tb(IconArrowUp),
    "alert": tb(IconAlertCircle),
    "edit": tb(IconPencil),
    "quote": tb(IconQuote),
    "more": tb(IconDots),
    "thumbs-down": tb(IconThumbDown),
    "thumbs-up": tb(IconThumbUp),
  },
  phosphor: {
    search: ph(MagnifyingGlass),
    settings: ph(Gear),
    user: ph(User),
    heart: ph(Heart),
    check: ph(Check),
    close: ph(X),
    "chevron-down": ph(CaretDown),
    "chevron-left": ph(CaretLeft),
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
    document: ph(FileText),
    link: ph(PhLink),
    globe: ph(Globe),
    code: ph(Code),
    "copy": ph(Copy),
    "paperclip": ph(Paperclip),
    "image": ph(PhImage),
    "arrow-up": ph(PhArrowUp),
    "alert": ph(WarningCircle),
    "edit": ph(PencilSimple),
    "quote": ph(Quotes),
    "more": ph(DotsThree),
    "thumbs-down": ph(ThumbsDown),
    "thumbs-up": ph(ThumbsUp),
  },
  remix: {
    search: rx(RiSearchLine),
    settings: rx(RiSettings3Line),
    user: rx(RiUserLine),
    heart: rx(RiHeartLine),
    check: rx(RiCheckLine),
    close: rx(RiCloseLine),
    "chevron-down": rx(RiArrowDownSLine),
    "chevron-left": rx(RiArrowLeftSLine),
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
    document: rx(RiFileTextLine),
    link: rx(RiLinkM),
    globe: rx(RiGlobalLine),
    code: rx(RiCodeSSlashLine),
    "copy": rx(RiFileCopyLine),
    "paperclip": rx(RiAttachment2),
    "image": rx(RiImageLine),
    "arrow-up": rx(RiArrowUpLine),
    "alert": rx(RiErrorWarningLine),
    "edit": rx(RiPencilLine),
    "quote": rx(RiDoubleQuotesL),
    "more": rx(RiMoreFill),
    "thumbs-down": rx(RiThumbDownLine),
    "thumbs-up": rx(RiThumbUpLine),
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
