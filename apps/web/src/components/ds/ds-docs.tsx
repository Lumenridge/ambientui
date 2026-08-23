import * as React from "react"
import { createPortal } from "react-dom"

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion"

import { Icon, type IconName } from "@ambientui/ui/components/icon"
import { SectionRail } from "@ambientui/ui/components/section-rail"

import { toast } from "sonner"

import { SaveReminder } from "@/components/ds/settings-kit"

import { Badge } from "@ambientui/ui/components/badge"
import { Button } from "@ambientui/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@ambientui/ui/components/card"
import { Checkbox } from "@ambientui/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ambientui/ui/components/dropdown-menu"
import { Input } from "@ambientui/ui/components/input"
import { Separator } from "@ambientui/ui/components/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@ambientui/ui/components/sheet"
import { Skeleton } from "@ambientui/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ambientui/ui/components/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ambientui/ui/components/collapsible"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ambientui/ui/components/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ambientui/ui/components/tooltip"
import { cn } from "@ambientui/ui/lib/utils"

import {
  OrbCharacter,
  type OrbState,
} from "@ambientui/ambient/orb-character"
import {
  ContextChipView,
  ShimmerPlaceholder,
} from "@ambientui/ambient/assistant"
import { useAssistant } from "@ambientui/ambient/assistant-context"
import { AskAI } from "@ambientui/ambient/attach-menu"
import { Composer } from "@ambientui/ambient/composer"
import {
  DayDivider,
  ErrorState,
  FeedbackDialog,
  FollowUpSuggestions,
  MessageActions,
  type MessageRating,
  MessageAttachments,
  type MessageAttachment,
  MessageQueue,
  MessageTime,
  QuoteReply,
  ReasoningEffort,
  ReasoningPanel,
  type ReasoningEffortLevel,
  ReviewComment,
} from "@ambientui/ambient/message-kit"
import { ViewMenu } from "@/components/view-menu"
import {
  CodeDiff,
  CodeRunner,
  ParallelTools,
  ReviewableDiff,
  TerminalBlock,
  ToolCall,
  ToolFailure,
  ToolTimeline,
} from "@ambientui/ambient/tool-kit"
import {
  InlineCitation,
  ResearchReport,
  WebSearch,
} from "@ambientui/ambient/knowledge-kit"
import {
  MessageBranches,
  MessagePair,
  ReferenceChips,
  StreamingText,
  type KitReference,
  type KitResponse,
  type MessageVariant,
} from "@ambientui/ambient/response-kit"
import { composeResponse } from "@ambientui/ambient/compose-response"
import {
  ORB_STATES,
  REASONING_EFFORTS,
} from "@ambientui/ambient/kit-vocabulary"
import {
  STREAM_SPEEDS,
  useFoundation,
} from "@ambientui/foundation"

/**
 * The design-system registry: every component installed from the shadcn
 * preset, with its stories, behavior documentation, and (where the prop
 * surface warrants it) an interactive controls playground.
 *
 * This is also the component vocabulary the AI layer reasons over.
 */

export type Story = { label: string; render: React.ReactNode }

export type ComponentEntry = {
  id: string
  name: string
  /** Section heading in the /ds rail; entries without one lead the list. */
  group?: string
  description: string
  behavior: string[]
  whenToUse: string[]
  whenNotToUse: string[]
  stories: Story[]
  /** Interactive playground with prop controls, when the component has a meaningful prop surface. */
  playground?: React.ComponentType
}

/* ---------------------------------- controls helpers ---------------------------------- */

/**
 * ⛔ THE RAIL RULE — every control row raises the save reminder.
 *
 * Anything the user changes in the Inspect rail is an unsaved edit until
 * they save it. That is enforced HERE, in the row primitive, rather than in
 * each playground: a rule that depends on the next playground remembering to
 * call touch() is not a rule, it is a habit.
 *
 * `action` opts a row out — and only rows that fire a one-shot action and
 * change no value may use it (Replay, Add a version). Reaching for it on a
 * row that sets something is the drift this rule exists to stop.
 */
export function ControlRow({
  name,
  action,
  children,
}: {
  name: string
  /** This row triggers a one-shot action rather than setting a value. */
  action?: boolean
  children: React.ReactNode
}) {
  const { touch } = useFoundation()
  const mark = React.useCallback(
    (e: React.SyntheticEvent) => {
      if (action) return
      // A menu TRIGGER only opens a menu — the choice itself is a change, and
      // ChoiceControl marks it (its items render in a portal, out of reach of
      // this handler).
      if ((e.target as HTMLElement).closest?.("[aria-haspopup]")) return
      touch()
    },
    [action, touch]
  )
  return (
    <div
      onClickCapture={mark}
      onChangeCapture={mark}
      className="border-border flex min-h-11 items-center justify-between gap-4 border-b px-3 py-2 last:border-b-0">
      <span className="text-muted-foreground font-mono text-xs">{name}</span>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {children}
      </div>
    </div>
  )
}

export function ChoiceControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
}) {
  // the rail rule, for the one control whose items escape ControlRow's reach
  const { touch } = useFoundation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="xs" variant="outline" className="gap-1.5 font-normal">
          {value}
          <Icon name="chevron-down" size={12} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={option === value}
            onCheckedChange={() => {
              touch()
              onChange(option)
            }}
          >
            {option}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The inspect rail's mount point. DsPage provides the host element; each
 * playground renders its preview in the canvas and portals its controls
 * into the rail, so both share one state.
 */
export const ControlsHostContext = React.createContext<HTMLElement | null>(null)

export function Playground({
  preview,
  controls,
}: {
  preview: React.ReactNode
  controls: React.ReactNode
}) {
  const host = React.useContext(ControlsHostContext)
  return (
    <>
      <div className="border-border bg-card flex min-h-44 items-center justify-center rounded-xl border p-8">
        {preview}
      </div>
      {host && createPortal(controls, host)}
    </>
  )
}

/* ---------------------------------- playgrounds ---------------------------------- */

function SaveReminderStory() {
  const [dirty, setDirty] = React.useState(false)
  return (
    <div className="flex flex-col items-center gap-4">
      <Button variant="outline" size="sm" onClick={() => setDirty(true)}>
        Make a change
      </Button>
      <SaveReminder
        className="static translate-x-0"
        open={dirty}
        onSave={() => {
          setDirty(false)
          toast("Saved")
        }}
        onDiscard={() => setDirty(false)}
      />
    </div>
  )
}

const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const
const BUTTON_SIZES = ["xs", "sm", "default", "lg"] as const

function ButtonPlayground() {
  const [label, setLabel] = React.useState("Add to cart")
  const [variant, setVariant] =
    React.useState<(typeof BUTTON_VARIANTS)[number]>("default")
  const [size, setSize] = React.useState<(typeof BUTTON_SIZES)[number]>("default")
  const [disabled, setDisabled] = React.useState(false)

  return (
    <Playground
      preview={
        <Button variant={variant} size={size} disabled={disabled}>
          {label || "Button"}
        </Button>
      }
      controls={
        <>
          <ControlRow name="children">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-7 w-36 text-sm"
            />
          </ControlRow>
          <ControlRow name="variant">
            <ChoiceControl
              options={BUTTON_VARIANTS}
              value={variant}
              onChange={setVariant}
            />
          </ControlRow>
          <ControlRow name="size">
            <ChoiceControl options={BUTTON_SIZES} value={size} onChange={setSize} />
          </ControlRow>
          <ControlRow name="disabled">
            <Checkbox
              checked={disabled}
              onCheckedChange={(v) => setDisabled(v === true)}
            />
          </ControlRow>
        </>
      }
    />
  )
}

const BADGE_VARIANTS = ["default", "secondary", "outline", "destructive"] as const

function BadgePlayground() {
  const [label, setLabel] = React.useState("Out of stock")
  const [variant, setVariant] =
    React.useState<(typeof BADGE_VARIANTS)[number]>("destructive")

  return (
    <Playground
      preview={<Badge variant={variant}>{label || "Badge"}</Badge>}
      controls={
        <>
          <ControlRow name="children">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-7 w-36 text-sm"
            />
          </ControlRow>
          <ControlRow name="variant">
            <ChoiceControl
              options={BADGE_VARIANTS}
              value={variant}
              onChange={setVariant}
            />
          </ControlRow>
        </>
      }
    />
  )
}

function InputPlayground() {
  const [placeholder, setPlaceholder] = React.useState("Search components…")
  const [disabled, setDisabled] = React.useState(false)
  const [invalid, setInvalid] = React.useState(false)

  return (
    <Playground
      preview={
        <Input
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className="max-w-56"
        />
      }
      controls={
        <>
          <ControlRow name="placeholder">
            <Input
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              className="h-7 w-36 text-sm"
            />
          </ControlRow>
          <ControlRow name="disabled">
            <Checkbox
              checked={disabled}
              onCheckedChange={(v) => setDisabled(v === true)}
            />
          </ControlRow>
          <ControlRow name="aria-invalid">
            <Checkbox
              checked={invalid}
              onCheckedChange={(v) => setInvalid(v === true)}
            />
          </ControlRow>
        </>
      }
    />
  )
}

function SkeletonPlayground() {
  const [shape, setShape] = React.useState<"circle" | "line" | "block">("line")

  return (
    <Playground
      preview={
        shape === "circle" ? (
          <Skeleton className="size-12 rounded-full" />
        ) : shape === "line" ? (
          <Skeleton className="h-4 w-48" />
        ) : (
          <Skeleton className="h-24 w-48 rounded-lg" />
        )
      }
      controls={
        <ControlRow name="shape">
          <ChoiceControl
            options={["circle", "line", "block"] as const}
            value={shape}
            onChange={setShape}
          />
        </ControlRow>
      }
    />
  )
}

/* ---------------------------------- registry ---------------------------------- */

export const SHADCN_DEFAULT_COMPONENTS: ComponentEntry[] = [
  {
    id: "badge",
    name: "Badge",
    description: "Compact status and metadata labels.",
    behavior: [
      "Variants: default, secondary, outline, destructive.",
      "Renders as a span; passes through to a link with asChild.",
      "Size is fixed — badges never grow with their container.",
    ],
    whenToUse: [
      "Status of an entity: active, pending, at risk, out of stock.",
      "Counts and short classifications inside tables and cards.",
    ],
    whenNotToUse: [
      "Interactive filtering — badges are not buttons.",
      "Long text — badges hold one or two words.",
      "Status colors outside the variant set — semantics come from variants, never custom colors.",
    ],
    playground: BadgePlayground,
    stories: [
      {
        label: "Variants",
        render: (
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        ),
      },
    ],
  },
  {
    id: "button",
    name: "Button",
    description: "The primitive for every explicit user action.",
    behavior: [
      "Variants: default, secondary, outline, ghost, destructive, link.",
      "Sizes: xs, sm, default, lg, plus icon sizes (icon-xs → icon-lg).",
      "Disabled buttons keep their variant but drop interactivity and dim.",
      "asChild renders any element (e.g. a link) with button styling.",
    ],
    whenToUse: [
      "Triggering an action: submit, save, open, confirm, create.",
      "One primary action per view; everything else is secondary, outline, or ghost.",
      "Destructive variant for irreversible actions, paired with a confirm step.",
    ],
    whenNotToUse: [
      "Navigation presented as content — use a plain link.",
      "Toggling a persistent setting — use Checkbox.",
    ],
    playground: ButtonPlayground,
    stories: [
      {
        label: "Variants",
        render: (
          <div className="flex flex-wrap items-center gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
        ),
      },
      {
        label: "Sizes",
        render: (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs" variant="outline">
              Extra small
            </Button>
            <Button size="sm" variant="outline">
              Small
            </Button>
            <Button variant="outline">Default</Button>
            <Button size="lg" variant="outline">
              Large
            </Button>
            <Button size="icon" variant="outline" aria-label="Settings">
              <Icon name="settings" size={16} />
            </Button>
          </div>
        ),
      },
    ],
  },
  {
    id: "card",
    name: "Card",
    description: "The basic grouping surface for related content.",
    behavior: [
      "Slots: CardHeader (title, description, action), CardContent, CardFooter.",
      "Radius, border, and background come from theme tokens.",
      "CardAction places a control in the header's top-right corner.",
    ],
    whenToUse: [
      "Grouping a coherent unit: a KPI, a settings section, an entity summary.",
      "As the container for composed/generated interface blocks.",
    ],
    whenNotToUse: [
      "Nesting cards inside cards — flatten instead.",
      "Full-page layout — cards group content, they don't structure pages.",
    ],
    stories: [
      {
        label: "With header, content, and footer",
        render: (
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Component coverage</CardTitle>
              <CardDescription>
                Vocabulary docs across the design system
              </CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              9 of 12 documented
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="outline">
                View gaps
              </Button>
            </CardFooter>
          </Card>
        ),
      },
    ],
  },
  {
    id: "checkbox",
    name: "Checkbox",
    description: "Independent on/off choices, often several at once.",
    behavior: [
      "States: checked, unchecked, indeterminate (for select-all), disabled.",
      "Controlled via checked/onCheckedChange or uncontrolled via defaultChecked.",
      "Clicking the wrapping label toggles it.",
    ],
    whenToUse: [
      "Multi-select lists, agreements, row selection in tables.",
      "Choices that are submitted with a form rather than applied instantly.",
    ],
    whenNotToUse: [
      "Immediate setting toggles — this preset has no Switch yet; prefer a labeled checkbox until one is installed.",
      "Mutually exclusive choices — use a single-select pattern.",
    ],
    stories: [
      {
        label: "States",
        render: (
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked /> Checked
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox /> Unchecked
            </label>
            <label className="text-muted-foreground flex items-center gap-2 text-sm">
              <Checkbox disabled /> Disabled
            </label>
          </div>
        ),
      },
    ],
  },
  {
    id: "collapsible",
    name: "Collapsible",
    description:
      "A region that folds behind its trigger — disclosure as a primitive, not a re-implementation.",
    behavior: [
      "Radix underneath: the trigger carries aria-expanded and data-state, keyboard works, and the content unmounts collapsed.",
      "Controlled or uncontrolled — pass `open` to force it (the /ds rail holds groups open while a search is live), `defaultOpen` otherwise.",
      "Style the disclosure chevron off data-state (`group-data-[state=open]/collapsible:rotate-90`) rather than tracking your own boolean.",
    ],
    whenToUse: [
      "Long indexes and secondary detail — anything worth hiding until asked for (the /ds rail's kit groups).",
      "As the fold inside other components: sidebar groups, tool-call disclosures could migrate here.",
    ],
    whenNotToUse: [
      "For a set of peer panels where one is always open — that is Tabs.",
      "To hide required content; collapsed must never mean missing.",
    ],
    stories: [
      {
        label: "Fold",
        render: (
          <Collapsible defaultOpen className="w-full max-w-sm">
            <CollapsibleTrigger className="text-sm font-medium">
              Details
            </CollapsibleTrigger>
            <CollapsibleContent className="text-muted-foreground pt-2 text-sm">
              Folded content mounts only while open.
            </CollapsibleContent>
          </Collapsible>
        ),
      },
    ],
  },
  {
    id: "dropdown-menu",
    name: "DropdownMenu",
    description: "Contextual actions behind a trigger.",
    behavior: [
      "Opens on trigger click; closes on selection, outside click, or Esc.",
      "Supports labels, separators, groups, checkbox/radio items, and submenus.",
      "Item variant \"destructive\" styles irreversible actions.",
      "Fully keyboard navigable (arrows, type-ahead, Enter).",
    ],
    whenToUse: [
      "Row actions, overflow menus, per-entity operations.",
      "Grouping 3+ actions that don't deserve individual buttons.",
    ],
    whenNotToUse: [
      "Choosing a form value — a menu is for actions, not selection state.",
      "One or two actions — show them as buttons instead.",
    ],
    stories: [
      {
        label: "With label, items, and separator",
        render: (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Component</DropdownMenuLabel>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
  },
  {
    id: "input",
    name: "Input",
    description: "Single-line text entry.",
    behavior: [
      "Standard text input with theme-token styling for focus, invalid, and disabled states.",
      "aria-invalid switches the ring and border to the destructive tokens.",
      "Sizing is controlled by the surrounding layout, not the component.",
    ],
    whenToUse: [
      "Free-form single-line values: names, emails, search queries.",
      "Always paired with a visible label, or an aria-label for search fields.",
    ],
    whenNotToUse: [
      "Choosing from known options — use a selection control.",
      "Multi-line text — this preset has no Textarea installed yet.",
    ],
    playground: InputPlayground,
    stories: [
      {
        label: "States",
        render: (
          <div className="flex w-full max-w-sm flex-col gap-3">
            <Input placeholder="Search components…" />
            <Input defaultValue="AmbientPill" />
            <Input placeholder="Disabled" disabled />
          </div>
        ),
      },
    ],
  },
  {
    id: "section-rail",
    name: "SectionRail",
    description:
      "Right-edge dash rail for jumping between page sections — an ambientui extension to the product vocabulary (promoted via the watchlist).",
    behavior: [
      "One dash per section; the active section's dash grows and shows its label. Others reveal labels on hover.",
      "Clicking a dash smooth-scrolls its section into view (native smooth scroll; sections carry scroll-mt).",
      "Active tracking follows the nearest scroll container — works inside the /ds inset card or the window.",
      "Motion rides the control role (CSS transitions on --motion-control / --motion-ease).",
      "Fixed to the right edge by default; pass className to reposition (the story renders it static).",
    ],
    whenToUse: [
      "Long single-column settings or document pages with 4+ named sections (the Foundation page).",
      "When the reader needs a sense of place plus one-click jumps without a full sidebar.",
    ],
    whenNotToUse: [
      "Pages that already have a navigation rail for their sections — one wayfinding system per page.",
      "Fewer than three sections — a rail for two items is noise.",
    ],
    stories: [
      {
        label: "Sections",
        render: (
          <SectionRail
            className="static translate-y-0 items-end"
            sections={[
              { id: "story-a", label: "General" },
              { id: "story-b", label: "Color" },
              { id: "story-c", label: "Motion" },
              { id: "story-d", label: "Figma" },
            ]}
          />
        ),
      },
    ],
  },
  {
    id: "view-menu",
    name: "ViewMenu",
    description:
      "The app's destinations as a disclosure that morphs from a pill into a card — an ambientui extension to the product vocabulary (promoted via the watchlist).",
    behavior: [
      "Collapsed, it is one pill naming the view you are on. Opening is what costs space, and only while you are choosing — a tab strip spends room proportional to how many destinations exist, permanently, on a surface whose argument is that chrome should get out of the way.",
      "ONE FORM IN TWO SHAPES: closed, the pill is the width of the view's own name; open, it takes the width of the list beneath it, animated on the surface spring, so the pair reads as a single object changing shape rather than two panels that happen to be stacked.",
      "The width is MEASURED FROM THE MENU, never guessed — the list is sized by its longest row, and that changes with whatever destinations an app registers. The menu is therefore sized by its own content only; if it also took the pill's width, neither would have anything driving it.",
      "The list drops beneath the pill rather than pushing it, and both pill controls are the same icon box, so opening never changes the row's HEIGHT. A control that walks out from under the pointer vertically makes closing a game of catch-up.",
      "The pill carries its icon-only controls in ONE treatment, because they are peers: none of them is a destination in the list. The disclosure shows a menu mark closed and a close mark open; appearance shows the step it takes.",
      "HOME LEADS, when the app gives it one. It is the only control that leaves the set of views entirely, so it sits outside the list and ahead of everything — a way back is not one destination among others. The component is TOLD where home is (`home={{ label, onSelect }}`) and knows nothing about what is there; omit the prop and no home control appears, because a component that invents a destination is one that will send someone somewhere wrong.",
      "Both carry a real Tooltip, not a native `title`. The name of an icon-only control is not optional, and `title` waits a second, cannot be styled, and never appears on keyboard focus. The disclosure's tooltip is suppressed while open — the menu it describes is already on screen, and a hint floating over that list is noise.",
      "It carries no character mark. The assistant's identity belongs to the assistant; a navigation control wearing it says the wrong thing about what it does.",
      "Closes on Escape or an outside pointer-down — a menu you cannot dismiss the ordinary way is a trap.",
      "The current view is marked with aria-current and carries the foreground weight; the others sit muted.",
      "It is the pointer twin of the spotlight's \"Jump to\" — same destinations, reached by hand rather than ⌘K. They read the same list, so they cannot disagree.",
      "APPEARANCE RIDES AT THE HEAD OF THE PILL, as an icon naming the step it takes. It is the one control here that is not a destination, and it lived inside the menu — one click deep and drawn exactly like the three places you could go, which made a two-state setting read as a fourth destination. Outside, it is always one press away and cannot be mistaken for somewhere to be.",
    ],
    whenToUse: [
      "Switching between a small set of top-level views on a surface where permanent chrome would compete with the content.",
    ],
    whenNotToUse: [
      "Tabbed panes INSIDE a page — that is Tabs, and the relationship there is between siblings, not destinations.",
      "More than a handful of destinations, or anything needing search — that is the spotlight.",
      "Anywhere the current location must stay visible while a menu is open; this one covers itself when it expands.",
      "As a home for settings. Appearance earns its place because it is reached without meaning to go anywhere; a second one would turn a list of destinations into a menu bar.",
    ],
    stories: [
      {
        label: "Collapsed and open",
        render: (
          <div className="flex min-h-44 w-full items-start justify-center">
            <ViewMenu
              items={[
                { id: "canvas", label: "Canvas" },
                { id: "layer", label: "The ambient layer" },
                { id: "devtool", label: "Dev tool" },
              ]}
              value="canvas"
              onSelect={() => {}}
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "save-reminder",
    name: "SaveReminder",
    description:
      "A save bar that rises from the bottom only while there are unsaved changes — the settings-kit's save affordance (promoted via the watchlist).",
    behavior: [
      "Hidden when everything is stored — the page carries no save chrome at rest.",
      "While open: message + Save + optional Discard. `saved` swaps the actions for a brief confirmation before it slides away.",
      "Enters on the configured character's spring, exits with a quick micro fade (AnimatePresence).",
      "Fixed bottom-center by default; pass className to reposition (the story renders it static).",
    ],
    whenToUse: [
      "Pages with explicit save semantics where edits apply live but persist on save (the Foundation page).",
      "Any form where forgetting to save loses work on reload.",
    ],
    whenNotToUse: [
      "Autosaving surfaces — a reminder for something already saved erodes trust.",
      "Modal flows with their own confirm/cancel footer.",
    ],
    stories: [{ label: "States", render: <SaveReminderStory /> }],
  },
  {
    id: "sonner",
    name: "Sonner",
    description:
      "Toast notifications — transient feedback after an action completes (saves, syncs, errors).",
    behavior: [
      "One <Toaster> outlet at the app root, themed by the appearance and dressed in the popover role (surface, text, border, radius all follow the role map).",
      "Fire with toast(\"Title\") or toast(title, { description }); variants: toast.success / toast.error / toast.promise.",
      "Toasts self-dismiss; they never require interaction and never block the page.",
      "The system's save-feedback pattern: SaveReminder dismisses on save, the toast confirms it.",
    ],
    whenToUse: [
      "Confirming a completed action the user shouldn't have to watch for — Save Theme, a finished sync.",
      "Non-blocking errors where the page state already shows the recovery path.",
    ],
    whenNotToUse: [
      "Anything requiring a decision — use a dialog-pattern surface (Sheet) instead.",
      "Persistent states (unsaved changes) — that's SaveReminder's job; a toast disappears.",
    ],
    stories: [
      {
        label: "Toast",
        render: (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast("Theme saved", {
                description: "Every surface now builds from this configuration.",
              })
            }
          >
            Show toast
          </Button>
        ),
      },
    ],
  },
  {
    id: "separator",
    name: "Separator",
    description: "Visual divider between content regions.",
    behavior: [
      "Horizontal by default; orientation=\"vertical\" for inline dividers.",
      "Purely presentational — hidden from the accessibility tree.",
    ],
    whenToUse: ["Separating sections where spacing alone is ambiguous."],
    whenNotToUse: ["Everywhere — prefer whitespace first."],
    stories: [
      {
        label: "Horizontal and vertical",
        render: (
          <div className="w-full max-w-sm text-sm">
            <p>Above the line</p>
            <Separator className="my-3" />
            <div className="flex h-5 items-center gap-3">
              <span>Docs</span>
              <Separator orientation="vertical" />
              <span>Stories</span>
              <Separator orientation="vertical" />
              <span>Source</span>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "sheet",
    name: "Sheet",
    description: "A panel that slides in from the edge of the screen.",
    behavior: [
      "Slides from right by default; side prop accepts top/right/bottom/left.",
      "Modal: traps focus, dims the page, closes on Esc or overlay click.",
      "Slots mirror Dialog: header, title, description, footer, close.",
    ],
    whenToUse: [
      "Side tasks that keep page context visible: details, quick edit, filters.",
    ],
    whenNotToUse: [
      "Short confirmations — a sheet is too heavy; keep those inline.",
      "Primary navigation — that's the Sidebar's job.",
    ],
    stories: [
      {
        label: "From the right",
        render: (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Component details</SheetTitle>
                <SheetDescription>
                  Sheets host focused side tasks without leaving the page.
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        ),
      },
    ],
  },
  {
    id: "sidebar",
    name: "Sidebar",
    description:
      "The app-shell navigation rail. Structural — the real thing wraps the whole app.",
    behavior: [
      "Wraps the app in SidebarProvider; SidebarInset holds the page.",
      "Collapsible modes: offcanvas, icon, or none (static).",
      "Composed from SidebarHeader/Content/Group/Menu building blocks.",
      "State persists via cookie; ⌘B toggles it by default.",
    ],
    whenToUse: ["Primary app navigation — one per application."],
    whenNotToUse: [
      "Side content panels — use Sheet.",
      "Anything inside a page — it is an app-shell frame, not a page component.",
    ],
    stories: [
      {
        label: "Static preview",
        render: (
          <div className="border-border bg-sidebar text-sidebar-foreground w-56 overflow-hidden rounded-lg border">
            <div className="px-3 py-2.5 text-sm font-semibold">ambientui</div>
            <div className="flex flex-col gap-0.5 px-2 pb-2">
              {[
                { icon: "search" as IconName, label: "Canvas", active: true },
                { icon: "user" as IconName, label: "Design system", active: false },
                { icon: "settings" as IconName, label: "Settings", active: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm",
                    item.active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80"
                  )}
                >
                  <Icon name={item.icon} size={15} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "skeleton",
    name: "Skeleton",
    description: "Placeholder shape while content loads.",
    behavior: [
      "A pulsing block; shape and size come entirely from className.",
      "Mirrors the final layout so nothing jumps when content arrives.",
    ],
    whenToUse: ["Any async region with a predictable layout."],
    whenNotToUse: ["Unknown-shape content — indicate loading in context instead."],
    playground: SkeletonPlayground,
    stories: [
      {
        label: "Mirroring a list row",
        render: (
          <div className="flex w-full max-w-sm items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "table",
    name: "Table",
    description: "Rows of structured, comparable records.",
    behavior: [
      "Semantic table elements with theme styling; horizontal scroll on overflow.",
      "Rows highlight on hover and support a selected state.",
      "Numeric columns right-align; status renders as Badge.",
    ],
    whenToUse: [
      "Entity lists: components, deals, users — anything scannable by column.",
    ],
    whenNotToUse: [
      "Single records — use Card.",
      "Heterogeneous content — use a list of cards.",
    ],
    stories: [
      {
        label: "With status badges",
        render: (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead className="text-right">Stories</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Button</TableCell>
                <TableCell>
                  <Badge variant="secondary">Documented</Badge>
                </TableCell>
                <TableCell className="text-right">3</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Table</TableCell>
                <TableCell>
                  <Badge variant="destructive">Drifting</Badge>
                </TableCell>
                <TableCell className="text-right">1</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ),
      },
    ],
  },
  {
    id: "tabs",
    name: "Tabs",
    description:
      "Peer views of one subject, switched in place — the panel changes, the page does not.",
    behavior: [
      "Radix underneath: roving focus, arrow-key navigation, and the right ARIA wiring come free. Never rebuild a tab strip from buttons.",
      "Two shapes — the default pill list for a self-contained control, and `line` for tabs that sit against a page edge.",
      "orientation=\"vertical\" turns the list into a rail; the same component, no second implementation.",
      "The tab is component state by default. Anything a user might link to or reload into should be driven from the URL instead (the home page does this with ?view=).",
    ],
    whenToUse: [
      "Peer views of ONE subject, where switching should not feel like navigating.",
      "Three to five destinations. Beyond that the list becomes a menu that happens to be horizontal.",
    ],
    whenNotToUse: [
      "For steps in a sequence — tabs claim the views are independent and equal.",
      "As primary navigation between unrelated sections; that is the app's own nav.",
      "To hide content the user must see, since only one panel is ever visible.",
    ],
    stories: [
      {
        label: "Line variant",
        render: (
          <Tabs defaultValue="a" className="w-full max-w-md">
            <TabsList variant="line">
              <TabsTrigger value="a">Changes</TabsTrigger>
              <TabsTrigger value="b">Checks</TabsTrigger>
            </TabsList>
            <TabsContent value="a" className="text-muted-foreground text-sm">
              Sits against an edge; the active tab is marked by a rule, not a pill.
            </TabsContent>
            <TabsContent value="b" className="text-muted-foreground text-sm">
              Same component, different weight.
            </TabsContent>
          </Tabs>
        ),
      },
    ],
    playground: TabsPlayground,
  },
  {
    id: "tooltip",
    name: "Tooltip",
    description: "Hover hint naming or explaining a control.",
    behavior: [
      "Appears on hover/focus after a short delay; never traps the pointer.",
      "Positioned by side/align props with collision handling.",
      "Requires a TooltipProvider ancestor (mounted once at the app root).",
    ],
    whenToUse: ["Icon-only buttons, truncated values, shortcut hints."],
    whenNotToUse: [
      "Interactive content — tooltips are read-only.",
      "Essential information users must see — it must live on the page.",
    ],
    stories: [
      {
        label: "On an icon button",
        render: (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Favorite">
                <Icon name="heart" size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add to favorites</TooltipContent>
          </Tooltip>
        ),
      },
    ],
  },
]

/* ---------------------------------- ambient vocabulary ---------------------------------- */

const ORB_SIZES = ["48", "96", "160"] as const
const ORB_SPEED_OPTIONS = ["0.5", "0.8", "1", "1.6", "2.8", "4"] as const

function OrbStatesStory() {
  const { config } = useFoundation()
  const orb = config.orb
  // Four shaders side by side is four WebGL contexts and four render loops
  // running for as long as the page is open. They only need to run while
  // they're actually on screen.
  const ref = React.useRef<HTMLDivElement>(null)
  const [visible, setVisible] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setVisible(!!entry?.isIntersecting),
      { rootMargin: "120px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className="grid grid-cols-2 gap-6 sm:grid-cols-4">
      {ORB_STATES.map((s) => (
        <div key={s} className="flex flex-col items-center gap-2">
          {visible ? (
            <OrbCharacter
              state={s}
              size={72}
              colors={orb.useAccent ? undefined : orb.colors}
              speeds={orb.speeds}
            />
          ) : (
            <div className="size-[72px] rounded-full" />
          )}
          <span className="text-muted-foreground font-mono text-xs">
            {s}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Seconds each state holds during a lifecycle run. */
const LIFECYCLE_DWELL = 3

/**
 * A run plays the TRANSITIONS, not the states: three moves for four states.
 * Starting on `still` — the state the orb is already resting in — spent the
 * first dwell showing nothing changing, which reads as stuck rather than as
 * a beat. Pressing play now moves immediately.
 */
const LIFECYCLE_STEPS = ORB_STATES.length - 1

function LifecycleSegment({
  progress,
  index,
}: {
  progress: MotionValue<number>
  index: number
}) {
  const scaleX = useTransform(progress, (p) =>
    Math.min(1, Math.max(0, p - index))
  )
  return (
    <div className="bg-muted relative h-1 flex-1 overflow-hidden rounded-full">
      <motion.div
        className="bg-primary absolute inset-y-0 left-0 w-full origin-left"
        style={{ scaleX }}
      />
    </div>
  )
}

/**
 * The lifecycle seek bar: plays the whole state journey (still →
 * listening → thinking → answer) in one continuous run, dwelling a few
 * seconds per state so every transition is seen in sequence. One segment
 * per state; click or drag anywhere to scrub.
 */
function OrbLifecycleBar({
  progress,
  playing,
  ended,
  onToggle,
  onSeek,
}: {
  progress: MotionValue<number>
  playing: boolean
  /** The run finished — the button reads as replay until the next action. */
  ended: boolean
  onToggle: () => void
  onSeek: (p: number) => void
}) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const seekFromEvent = (e: React.PointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    onSeek(f * LIFECYCLE_STEPS)
  }
  return (
    <div className="flex w-64 items-center gap-3">
      <Button
        size="xs"
        variant="outline"
        className="size-6 p-0"
        aria-label={
          playing ? "Pause lifecycle" : ended ? "Replay lifecycle" : "Play lifecycle"
        }
        onClick={onToggle}
      >
        <Icon name={playing ? "pause" : ended ? "replay" : "play"} size={12} />
      </Button>
      <div
        ref={trackRef}
        className="flex flex-1 cursor-pointer items-center gap-1 py-2"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          seekFromEvent(e)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) seekFromEvent(e)
        }}
      >
        {ORB_STATES.slice(1).map((st, i) => (
          <LifecycleSegment key={st} progress={progress} index={i} />
        ))}
      </div>
    </div>
  )
}

function OrbPlayground() {
  const { config, setConfig } = useFoundation()
  const orb = config.orb
  const [state, setState] = React.useState<OrbState>("still")
  const [size, setSize] = React.useState<(typeof ORB_SIZES)[number]>("96")

  // Lifecycle playback: progress runs 0..4 across the four states; the
  // integer part is the active state, so a run walks every transition.
  const [playing, setPlaying] = React.useState(false)
  const [ended, setEnded] = React.useState(false)
  const progress = useMotionValue(0)
  const stateRef = React.useRef(state)
  React.useEffect(() => {
    stateRef.current = state
  })
  // p is measured in TRANSITIONS: at p=0 the orb is already moving to the
  // second state, so the run has something to show from its first frame.
  const syncState = (p: number) => {
    const st =
      ORB_STATES[Math.min(ORB_STATES.length - 1, Math.floor(p) + 1)] ?? "still"
    if (st !== stateRef.current) setState(st)
  }
  useAnimationFrame((_, delta) => {
    if (!playing) return
    let p = progress.get() + delta / 1000 / LIFECYCLE_DWELL
    if (p >= LIFECYCLE_STEPS) {
      p = LIFECYCLE_STEPS
      setPlaying(false)
      setEnded(true)
    }
    progress.set(p)
    syncState(p)
  })
  const seek = (p: number) => {
    setPlaying(false)
    setEnded(false)
    progress.set(p)
    syncState(p)
  }
  const togglePlay = () => {
    // restarting rewinds to the resting state, so the first move is a real
    // transition rather than a jump-cut into the middle of the journey
    if (!playing && progress.get() >= LIFECYCLE_STEPS - 0.001) {
      progress.set(0)
      setState("still")
      stateRef.current = "still"
    }
    setEnded(false)
    setPlaying((v) => !v)
  }

  const setOrb = (patch: Partial<typeof orb>) =>
    setConfig({ orb: { ...orb, ...patch } })

  const COLOR_ROLES = ["cold", "mid", "warm", "hot"]

  return (
    <Playground
      preview={
        <div className="flex flex-col items-center gap-4">
          <OrbCharacter
            state={state}
            size={Number(size)}
            colors={orb.useAccent ? undefined : orb.colors}
            speeds={orb.speeds}
          />
          <span className="text-muted-foreground font-mono text-xs">
            {state}
          </span>
          <OrbLifecycleBar
            progress={progress}
            playing={playing}
            ended={ended}
            onToggle={togglePlay}
            onSeek={seek}
          />
        </div>
      }
      controls={
        <>
          <ControlRow name="state">
            <ChoiceControl
              options={ORB_STATES}
              value={state}
              onChange={(v) => {
                setPlaying(false)
                progress.set(ORB_STATES.indexOf(v))
                setState(v)
              }}
            />
          </ControlRow>
          <ControlRow name="size">
            <ChoiceControl options={ORB_SIZES} value={size} onChange={setSize} />
          </ControlRow>
          {state === "answer" && (
            <ControlRow name="replay" action>
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setState("still")
                  setTimeout(() => setState("answer"), 350)
                }}
              >
                Play again
              </Button>
            </ControlRow>
          )}
          {ORB_STATES.map((st) => (
            <ControlRow key={st} name={"speed." + st}>
              <ChoiceControl
                options={ORB_SPEED_OPTIONS}
                value={
                  (ORB_SPEED_OPTIONS.find(
                    (o) => Number(o) === orb.speeds[st]
                  ) ?? "1") as (typeof ORB_SPEED_OPTIONS)[number]
                }
                onChange={(v) =>
                  setOrb({ speeds: { ...orb.speeds, [st]: Number(v) } })
                }
              />
            </ControlRow>
          ))}
          <ControlRow name="accent-linked">
            <Checkbox
              checked={orb.useAccent}
              onCheckedChange={(v) => setOrb({ useAccent: v === true })}
            />
          </ControlRow>
          {!orb.useAccent && (
            <>
              {orb.colors.map((c, i) => (
                <ControlRow key={i} name={COLOR_ROLES[i] ?? "color " + (i + 1)}>
                  <input
                    type="color"
                    value={c}
                    onChange={(e) => {
                      const next = [...orb.colors]
                      next[i] = e.target.value
                      setOrb({ colors: next })
                    }}
                    className="border-border h-6 w-9 cursor-pointer rounded border bg-transparent p-0"
                  />
                  {orb.colors.length > 1 && (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Remove color"
                      onClick={() =>
                        setOrb({
                          colors: orb.colors.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <Icon name="close" size={12} />
                    </Button>
                  )}
                </ControlRow>
              ))}
              {orb.colors.length < 4 && (
                <ControlRow name="add">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      setOrb({ colors: [...orb.colors, "#8bd8ff"] })
                    }
                  >
                    Add color
                  </Button>
                </ControlRow>
              )}
            </>
          )}
          <p className="text-muted-foreground px-3 py-2 text-xs">
            These controls write to the saved theme — the save reminder
            appears whenever there is something to keep.
          </p>
        </>
      }
    />
  )
}

function StreamingTextPlayground() {
  const [runId, setRunId] = React.useState(0)
  // the pace is saved with the theme — the assistant writes at this speed
  // everywhere, not only in this preview
  const { config, setConfig } = useFoundation()
  const speed = config.components.streamCharsPerSecond
  const setSpeed = (v: string) =>
    setConfig({
      components: { ...config.components, streamCharsPerSecond: Number(v) },
    })
  const [live, setLive] = React.useState(true)
  const text =
    "Here is what changed in the latest release: the composer restores drafts per thread, tool calls collapse to a single line, and every answer carries its sources."

  return (
    <Playground
      preview={
        <p className="w-full max-w-lg text-sm leading-relaxed">
          {/* no charsPerSecond prop: the component reads the saved pace, which
              is what proves the config actually reaches it */}
          <StreamingText key={`${runId}-${speed}-${live}`} text={text} live={live} />
        </p>
      }
      controls={
        <>
          <ControlRow name="charsPerSecond">
            <ChoiceControl
              options={STREAM_SPEEDS.map(String)}
              value={String(speed)}
              onChange={setSpeed}
            />
          </ControlRow>
          <ControlRow name="live">
            <Checkbox checked={live} onCheckedChange={(v) => setLive(v === true)} />
          </ControlRow>
          <ControlRow name="replay" action>
            <Button size="xs" variant="outline" onClick={() => setRunId((n) => n + 1)}>
              Replay
            </Button>
          </ControlRow>
          <p className="text-muted-foreground px-3 py-2 text-xs">
            charsPerSecond writes to the saved theme — the assistant writes at
            this pace everywhere. live and replay only drive this preview.
          </p>
        </>
      }
    />
  )
}

const REF_MARKS = ["none", "icon", "logo", "mixed"] as const

function ReferenceChipsPlayground() {
  const [mark, setMark] = React.useState<(typeof REF_MARKS)[number]>("mixed")
  const [linked, setLinked] = React.useState(true)

  // a real favicon, so the fallback path is exercised honestly rather than
  // demonstrated with an image we know resolves
  const logo = "https://www.google.com/s2/favicons?domain=tailwindcss.com&sz=64"
  const href = linked ? "https://tailwindcss.com/docs/theme" : undefined

  const refs: KitReference[] =
    mark === "none"
      ? [
          { label: "Design system · Foundation" },
          { label: "Motion" },
          { label: "Response kit v0" },
        ]
      : mark === "icon"
        ? [
            { label: "DESIGN.md · §5 Motion", icon: "document" },
            { label: "foundation-context.tsx", icon: "code" },
            { label: "tailwindcss.com/docs/theme", icon: "globe", href },
          ]
        : mark === "logo"
          ? [
              { label: "Tailwind CSS · Theme", logo, href },
              { label: "A source whose logo 404s", logo: "/nope.png" },
            ]
          : [
              { label: "Tailwind CSS · Theme", logo, href },
              { label: "DESIGN.md · §5 Motion", icon: "document" },
              { label: "Response kit v0" },
            ]

  return (
    <Playground
      preview={
        <div className="w-full max-w-lg">
          <ReferenceChips refs={refs} />
        </div>
      }
      controls={
        <>
          <ControlRow name="mark">
            <ChoiceControl options={REF_MARKS} value={mark} onChange={setMark} />
          </ControlRow>
          <ControlRow name="href">
            <Checkbox
              checked={linked}
              onCheckedChange={(v) => setLinked(v === true)}
            />
          </ControlRow>
          <p className="text-muted-foreground px-3 py-2 text-xs">
            The second chip under “logo” points at a missing image — the
            monogram you see is the fallback, not a third variant.
          </p>
        </>
      }
    />
  )
}

const TAB_VARIANTS = ["default", "line"] as const
const TAB_ORIENTATIONS = ["horizontal", "vertical"] as const

function TabsPlayground() {
  const [variant, setVariant] =
    React.useState<(typeof TAB_VARIANTS)[number]>("default")
  const [orientation, setOrientation] =
    React.useState<(typeof TAB_ORIENTATIONS)[number]>("horizontal")

  return (
    <Playground
      preview={
        <Tabs defaultValue="overview" orientation={orientation} className="w-full max-w-md">
          <TabsList variant={variant}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="text-muted-foreground text-sm">
            Three views of one subject — the panel changes, the page does not.
          </TabsContent>
          <TabsContent value="activity" className="text-muted-foreground text-sm">
            Peer content: everything here belongs to the same object.
          </TabsContent>
          <TabsContent value="settings" className="text-muted-foreground text-sm">
            If a panel needs its own URL to be shareable, give it one.
          </TabsContent>
        </Tabs>
      }
      controls={
        <>
          <ControlRow name="variant">
            <ChoiceControl
              options={TAB_VARIANTS}
              value={variant}
              onChange={setVariant}
            />
          </ControlRow>
          <ControlRow name="orientation">
            <ChoiceControl
              options={TAB_ORIENTATIONS}
              value={orientation}
              onChange={setOrientation}
            />
          </ControlRow>
        </>
      }
    />
  )
}

function ComposerPlayground() {
  const [value, setValue] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [mark, setMark] = React.useState(true)
  const [offering, setOffering] = React.useState(false)
  const [attachments, setAttachments] = React.useState<MessageAttachment[]>([])
  const attach = (text: string) => {
    const trimmed = text.trim()
    const lines = trimmed.split("\n").length
    setAttachments((a) => [
      ...a,
      {
        id: `paste-${a.length}-${trimmed.length}`,
        name: trimmed.split("\n")[0]?.slice(0, 60) || "Pasted text",
        kind: "text" as const,
        meta: `${lines} line${lines === 1 ? "" : "s"} · ${trimmed.length} chars`,
      },
    ])
  }
  return (
    <Playground
      preview={
        <div className="border-border w-full max-w-lg rounded-xl border px-4">
          <Composer
            value={value}
            onChange={setValue}
            onSend={() => {
              if (!value.trim()) return
              setValue("")
              setBusy(true)
            }}
            onStop={() => setBusy(false)}
            busy={busy}
            mark={mark}
            attachments={attachments}
            onPasteText={attach}
            onRemoveAttachment={(id) =>
              setAttachments((a) => a.filter((x) => x.id !== id))
            }
            suggestion={
              offering ? "Fix all the problems in this workspace" : undefined
            }
            onAcceptSuggestion={
              offering
                ? () => setValue("Fix all the problems in this workspace")
                : undefined
            }
            placeholder="Ask a follow-up…"
          />
        </div>
      }
      controls={
        <>
          <ControlRow name="mark">
            <Checkbox
              checked={mark}
              onCheckedChange={(v) => setMark(v === true)}
            />
          </ControlRow>
          <ControlRow name="suggestion">
            <Checkbox
              checked={offering}
              onCheckedChange={(v) => setOffering(v === true)}
            />
          </ControlRow>
          <ControlRow name="busy">
            <Checkbox
              checked={busy}
              onCheckedChange={(v) => setBusy(v === true)}
            />
          </ControlRow>
          {/* `action`: a one-shot that sets no value, so it does not raise
              the save reminder (CLAUDE.md rule 9's only exemption) */}
          <ControlRow name="paste a stack trace" action>
            <Button
              size="xs"
              variant="outline"
              onClick={() =>
                attach(
                  'TypeError: Cannot read properties of undefined (reading "draft")\n    at Composer (composer.tsx:9:14)\n    at renderWithHooks (react-dom.js:14985:18)'
                )
              }
            >
              Attach
            </Button>
          </ControlRow>
          <p className="text-muted-foreground px-3 py-2 text-xs">
            The mark defaults on for the panel variant. With a suggestion and
            an empty field, Tab accepts it. Pasting multi-line text into the
            input attaches it instead of filling the field — the button above
            does the same thing without a clipboard.
          </p>
        </>
      }
    />
  )
}

function MessageActionsPlayground() {
  const [rating, setRating] = React.useState<MessageRating>(null)
  const [log, setLog] = React.useState("—")
  return (
    <Playground
      preview={
        <div className="flex flex-col items-center gap-3">
          <MessageActions
            text="The composer restores drafts per thread."
            rating={rating}
            onRate={setRating}
            onRegenerate={() => setLog("regenerate")}
            onMore={() => setLog("more")}
          />
          <span className="text-muted-foreground font-mono text-xs">
            rating: {rating ?? "none"} · last: {log}
          </span>
        </div>
      }
      controls={
        <>
          <ControlRow name="rating" action>
            <Button size="xs" variant="outline" onClick={() => setRating(null)}>
              Clear
            </Button>
          </ControlRow>
          <p className="text-muted-foreground px-3 py-2 text-xs">
            Copy confirms itself for a beat rather than raising a toast — the
            user is already looking at the thing they copied.
          </p>
        </>
      }
    />
  )
}

const SUGGESTIONS = [
  "Add optimistic updates",
  "Show me the diff",
  "Why not React context?",
  "Write a regression test",
]

function FollowUpSuggestionsPlayground() {
  const [runId, setRunId] = React.useState(0)
  const [picked, setPicked] = React.useState<string | null>(null)
  return (
    <Playground
      preview={
        <div className="w-full max-w-md">
          <FollowUpSuggestions
            key={runId}
            suggestions={SUGGESTIONS}
            onPick={setPicked}
          />
          <p className="text-muted-foreground mt-3 text-center font-mono text-xs">
            {picked ?? "pick one"}
          </p>
        </div>
      }
      controls={
        <>
          <ControlRow name="replay" action>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setRunId((n) => n + 1)}
            >
              Replay
            </Button>
          </ControlRow>
          <p className="text-muted-foreground px-3 py-2 text-xs">
            One shape only. A pill row was tried and removed: a real follow-up
            is a sentence, and a pill can hold neither the wrap nor the target.
          </p>
        </>
      }
    />
  )
}

const TRACE = [
  {
    title: "Reading the request",
    detail:
      "The user wants drafts restored per thread, so the composer state has to move out of component state.",
  },
  {
    title: "Locating the seam",
    detail:
      "Draft state already flows through the runtime; persisting it per thread id avoids a parallel store.",
  },
  {
    title: "Settling on an approach",
    detail:
      "Keep a map keyed by thread id, hydrate on switch, and clear the entry once a message is sent.",
  },
]

function ReasoningPanelPlayground() {
  const [running, setRunning] = React.useState(false)
  const [staged, setStaged] = React.useState(true)
  const [runId, setRunId] = React.useState(0)
  return (
    <Playground
      preview={
        <div className="w-full max-w-md">
          <ReasoningPanel
            key={`${runId}-${staged}`}
            steps={TRACE}
            seconds={5}
            running={running}
            staged={staged}
            defaultOpen
          />
        </div>
      }
      controls={
        <>
          <ControlRow name="staged">
            <Checkbox
              checked={staged}
              onCheckedChange={(v) => setStaged(v === true)}
            />
          </ControlRow>
          <ControlRow name="running">
            <Checkbox
              checked={running}
              onCheckedChange={(v) => setRunning(v === true)}
            />
          </ControlRow>
          <ControlRow name="replay" action>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setRunId((n) => n + 1)}
            >
              Replay
            </Button>
          </ControlRow>
          <p className="text-muted-foreground px-3 py-2 text-xs">
            Staged: shimmer, a beat of nothing, then one step at a time. Turn
            it off and the trace renders settled — which is what an older
            message must do, since history is written, not re-thought.
          </p>
        </>
      }
    />
  )
}

function ReasoningEffortPlayground() {
  const [level, setLevel] = React.useState<ReasoningEffortLevel>("high")
  const spent = { low: 1840, medium: 6200, high: 13920, max: 23100 }[level]
  return (
    <Playground
      preview={
        <div className="w-full max-w-sm">
          <ReasoningEffort
            level={level}
            onChange={setLevel}
            spent={spent}
            budget={24000}
          />
        </div>
      }
      controls={
        <>
          <ControlRow name="level">
            <ChoiceControl
              options={REASONING_EFFORTS}
              value={level}
              onChange={setLevel}
            />
          </ControlRow>
          <p className="text-muted-foreground px-3 py-2 text-xs">
            The meter is not decoration: an effort setting without a spend
            reading is a preference with invisible consequences.
          </p>
        </>
      }
    />
  )
}

const HUNKS = [
  {
    header: "@@ -12,6 +12,7",
    lines: [
      { sign: " " as const, text: "  const composer = useComposer();" },
      { sign: "-" as const, text: '  const [draft, setDraft] = useState("");' },
      { sign: "+" as const, text: "  const draft = useDraft(threadId);" },
    ],
  },
  {
    header: "@@ -31,4 +32,5",
    lines: [
      { sign: " " as const, text: "  useEffect(() => {" },
      { sign: "+" as const, text: "    if (!threadId) return;" },
      { sign: " " as const, text: "    hydrate(draft);" },
    ],
  },
]

function ReviewableDiffPlayground() {
  const [applied, setApplied] = React.useState<number[] | null>(null)
  const [runId, setRunId] = React.useState(0)
  return (
    <Playground
      preview={
        <div className="w-full max-w-lg">
          <ReviewableDiff
            key={runId}
            path="composer.tsx"
            hunks={HUNKS}
            onApply={setApplied}
          />
          <p className="text-muted-foreground mt-2 text-center font-mono text-xs">
            {applied ? `applied hunks ${applied.join(", ")}` : "nothing applied"}
          </p>
        </div>
      }
      controls={
        <>
          <ControlRow name="reset" action>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setApplied(null)
                setRunId((n) => n + 1)
              }}
            >
              Reset
            </Button>
          </ControlRow>
          <p className="text-muted-foreground px-3 py-2 text-xs">
            Apply is disabled at zero kept, so “apply” can never quietly mean
            “apply nothing”.
          </p>
        </>
      }
    />
  )
}

function TerminalBlockPlayground() {
  const [tone, setTone] = React.useState<"paper" | "ink">("paper")
  const [running, setRunning] = React.useState(true)
  return (
    <Playground
      preview={
        <div className="w-full max-w-lg">
          <TerminalBlock
            tone={tone}
            running={running}
            exitCode={running ? undefined : 0}
            command="pnpm vitest run composer"
            lines={[
              "RUN  v4.0.5 /apps/docs",
              "✓ composer restores draft on switch (12ms)",
              "✓ composer clears draft after send (9ms)",
              "✓ composer keeps attachments per thread (11ms)",
            ]}
          />
        </div>
      }
      controls={
        <>
          <ControlRow name="tone">
            <ChoiceControl
              options={["paper", "ink"] as const}
              value={tone}
              onChange={setTone}
            />
          </ControlRow>
          <ControlRow name="running">
            <Checkbox
              checked={running}
              onCheckedChange={(v) => setRunning(v === true)}
            />
          </ControlRow>
        </>
      }
    />
  )
}

const QUEUE_SEED = [
  { id: "q1", text: "Also add a changeset" },
  { id: "q2", text: "Then run the full suite" },
  { id: "q3", text: "And open the PR when it's green" },
]

function MessageQueuePlayground() {
  const [queued, setQueued] = React.useState(QUEUE_SEED)
  const [running, setRunning] = React.useState("Fix the converter and add a guard")
  return (
    <Playground
      preview={
        <div className="w-full max-w-md">
          <MessageQueue
            running={running}
            queued={queued}
            // interrupting SWAPS: the picked turn runs, and the turn it
            // displaced goes back to the head of the queue
            onInterrupt={(id) =>
              setQueued((q) => {
                const item = q.find((x) => x.id === id)
                if (!item) return q
                setRunning(item.text)
                return [
                  { id: `req-${item.id}`, text: running },
                  ...q.filter((x) => x.id !== id),
                ]
              })
            }
            onCancel={(id) => setQueued((q) => q.filter((x) => x.id !== id))}
          />
        </div>
      }
      controls={
        <>
          <ControlRow name="queue" action>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setQueued(QUEUE_SEED)
                setRunning("Fix the converter and add a guard")
              }}
            >
              Refill
            </Button>
          </ControlRow>
          <p className="text-muted-foreground px-3 py-2 text-xs">
            The arrow does not reorder — it INTERRUPTS: the picked turn runs
            now and the one it displaced goes back to the head of the queue.
          </p>
        </>
      }
    />
  )
}

function MessageBranchesPlayground() {
  const { pageChip, chips } = useAssistant()
  const question = "How do I persist composer drafts across threads?"
  const [branches, setBranches] = React.useState<KitResponse[]>(() => [
    {
      text: "Persist the composer draft in the runtime with the thread id as its key. When the active thread changes, read that value back into the composer.",
      refs: [{ label: "Response kit v0" }],
    },
  ])

  return (
    <Playground
      preview={
        <div className="w-full max-w-lg">
          <MessageBranches branches={branches} live={false} />
        </div>
      }
      controls={
        <>
          <ControlRow name="regenerate" action>
            <Button
              size="xs"
              variant="outline"
              onClick={() =>
                setBranches((b) => [...b, composeResponse(question, pageChip, chips)])
              }
            >
              Add a version
            </Button>
          </ControlRow>
          <ControlRow name="versions">
            <span className="text-muted-foreground font-mono text-xs">
              {branches.length}
            </span>
          </ControlRow>
          <p className="text-muted-foreground px-3 py-2 text-xs">
            A new version becomes the one you are looking at; the pager keeps
            the others reachable.
          </p>
        </>
      }
    />
  )
}

function MessagePairPlayground() {
  const { pageChip, chips, setOrbState } = useAssistant()
  // variant is COMPONENT-LAYER CONFIG, not demo state: it decides how every
  // exchange is presented product-wide, so it lives in the theme and Save
  // persists it. What the playground is currently doing (has it answered
  // yet, replay) stays local.
  const { config, setConfig } = useFoundation()
  const variant = config.components.messageVariant
  const setVariant = (v: MessageVariant) =>
    setConfig({ components: { ...config.components, messageVariant: v } })
  const [runId, setRunId] = React.useState(0)
  const [response, setResponse] = React.useState<KitResponse | null>(null)
  const question = "How do I persist composer drafts across threads?"

  const run = () => {
    setResponse(null)
    setOrbState("thinking")
    window.setTimeout(() => {
      setResponse(composeResponse(question, pageChip, chips))
      setOrbState("answer")
      setRunId((n) => n + 1)
    }, 900)
  }

  return (
    <Playground
      preview={
        <div className="w-full max-w-xl">
          <MessagePair
            key={runId}
            question={question}
            response={response ?? undefined}
            variant={variant}
            onSettled={() => setOrbState("still")}
          />
          {!response && (
            <p className="text-muted-foreground mt-3 text-center text-sm">
              Answer the question to watch the pair complete.
            </p>
          )}
        </div>
      }
      controls={
        <>
          <ControlRow name="variant">
            <ChoiceControl
              options={["bubble", "flat"] as const}
              value={variant}
              onChange={setVariant}
            />
          </ControlRow>
          <ControlRow name="answer" action>
            <Button size="xs" variant="outline" onClick={run}>
              {response ? "Replay" : "Answer"}
            </Button>
          </ControlRow>
          <p className="text-muted-foreground px-3 py-2 text-xs">
            variant writes to the saved theme — every exchange in the real
            assistant is presented this way once you save.
          </p>
        </>
      }
    />
  )
}

function CommandPaletteStory() {
  const { setMode } = useAssistant()
  return (
    <div className="flex flex-col items-center gap-3">
      <Button variant="outline" size="sm" onClick={() => setMode("spotlight")}>
        Open the palette
      </Button>
      <p className="text-muted-foreground text-xs">
        Or press <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono">⌘K</kbd>{" "}
        anywhere — the palette is global, so it opens over this page.
      </p>
    </div>
  )
}

export const AMBIENT_COMPONENTS: ComponentEntry[] = [
  {
    id: "orb-character",
    name: "OrbCharacter",
    description:
      "The assistant's animated identity — an iridescent sphere whose palette derives from the theme accent, with four states covering the AI's lifecycle.",
    behavior: [
      "still — at rest with its own movement: counter-rotating swirls and a gentle breathe. Present, not demanding.",
      "listening — digesting what the user said: swirls quiet down and a soft ring repeatedly draws inward.",
      "thinking — retrieving and reasoning: fast, saturated counter-rotating churn.",
      "answer — \"found it\": one bright ring lands with a flash, then the swirls settle into a slow, confident glide. The flash replays on re-entering the state.",
      "Palette derives from --app-blue (the accent bridge) — the character re-tints with the Foundation accent, zero configuration.",
      "Rendered by the system's one sanctioned shader surface — the Paper Design heatmap shader wrapped around a circle: thermal energy flowing around the orb's edge, over a frosted-glass wrapper (--ambient-blur).",
      "Each state moves differently, not just faster: still breathes a balanced rim glow; listening draws the heat inward; thinking runs hot — high contour, grain, racing flow; answer blooms outward once and settles.",
      "State changes are transitions, never cuts — per-state weights and tempo ease continuously (~0.5s).",
      "Every state has its own configurable cadence (speed.still/listening/thinking/answer), persisted with the theme.",
      "Palette is accent-linked by default (a thermal ramp derived from the accent); uncheck accent-linked to set custom colors — they become the heat ramp, cold to hot (up to four, add/remove).",
      "State is driven through the assistant context (orbState) — the response pipeline sets it, components read it.",
      "THE PIPELINE OWNS IT WHILE A TURN IS RUNNING. thinking holds until the prose actually starts — not until the answer was composed, because the evidence blocks still have to run — then answer, then still on settle. Ambient input states (listening / still) only apply between turns; typing cannot cancel a thinking state mid-run.",
    ],
    whenToUse: [
      "As the assistant's face — the floating orb is this character at 52px.",
      "Anywhere the AI's lifecycle needs to be visible: avatars, processing surfaces.",
    ],
    whenNotToUse: [
      "As decoration on pages where no AI is present — the character means the AI is here.",
      "ONE CHARACTER PER SURFACE, in the row you speak to it: the composer mark, the quick-ask pill, and the resting orb. Not headers, not footers, not navigation. A shell that stamps the character on every bar is signing itself once per component, and the mark stops meaning \"the assistant is listening here\" and starts meaning \"logo\".",
    ],
    playground: OrbPlayground,
    stories: [
      {
        label: "The four states",
        render: <OrbStatesStory />,
      },
    ],
  },
  {
    id: "streaming-text",
    name: "StreamingText",
    description:
      "Text that arrives rather than appears — the assistant writing, with a warm tail and a blurred leading edge.",
    behavior: [
      "Three zones travel with the write head: settled text in the foreground, a warm tail in the ambient accent, and a blurred edge behind a fading mask.",
      "The reveal runs on the FRAME CLOCK and derives the write head from ELAPSED TIME rather than by counting ticks. A hidden tab pauses the frame loop either way; what this buys is the recovery — coming back, the head is where the clock says it should be, not wherever a throttled timer had counted to.",
      "charsPerSecond sets the pace; the default reads as deliberate writing rather than a printer.",
      "live={false} renders the whole string settled, so a re-rendered older message never re-types itself — history is written, not replayed.",
      "A finished message RECORDS that it finished, so live={false} survives the surface changing. Dragging panel → dock remounts the transcript; without the record, position alone would say \"newest message\" and the answer would perform itself again.",
      "onSettled fires shortly after the last character, which is what returns the ambient layer to rest.",
      "Purely presentational: the characters are already in the DOM, so selection and copy give the full text at any point.",
    ],
    whenToUse: [
      "Any assistant text that is genuinely being produced as you watch.",
      "When the pace of arrival is information — a slow answer should look slow.",
    ],
    whenNotToUse: [
      "Text that is already known — faking a stream is a lie about latency.",
      "Long documents or code; use a settled block and show progress elsewhere.",
      "Product copy of any kind: this treatment says an assistant is writing.",
    ],
    stories: [],
    playground: StreamingTextPlayground,
  },
  {
    id: "message-branches",
    name: "MessageBranches",
    description:
      "Regenerated versions of the same answer, navigable without losing your place.",
    behavior: [
      "Wired into the real transcript: MessageActions' regenerate composes the same question again and APPENDS the result, so the assistant's own answers branch exactly as this component describes.",
      "A regenerated answer does not replace its predecessor — it joins it, and the newest becomes the one you are looking at.",
      "The pager sits under the answer it belongs to, so a branch reads as a version of THIS reply rather than as a new turn.",
      "Quiet by design: ghost controls and a monospaced count, because this is navigation, not content. It hides entirely at one version.",
      "Only a freshly generated branch streams; stepping back to one you have already read shows it settled — history is written, not replayed.",
      "Arrows disable at the ends rather than wrapping, so the extent of the set is felt.",
    ],
    whenToUse: [
      "Wherever regeneration is offered — the alternative is silently destroying an answer the user might have preferred.",
      "When comparing phrasings or approaches matters more than the latest attempt.",
    ],
    whenNotToUse: [
      "Across different questions; branches are versions of one answer, not a history.",
      "For editing a sent message — that is a different object, with its own consequence disclosure.",
    ],
    stories: [],
    playground: MessageBranchesPlayground,
  },
  {
    id: "message-pair",
    name: "MessagePair",
    description:
      "The unit of a conversation: one question and the answer it produced, presented together.",
    behavior: [
      "Pairing is what makes a transcript readable — an undifferentiated list of messages is a log, not a conversation.",
      "Two presentations, one anatomy: BUBBLE gives each side a surface (the question on the accent wash, the answer on an inset card); FLAT sets both directly on the transcript, separated by alignment and tone alone.",
      "The answer streams in place: settled text in the foreground, the last words warm in the ambient accent, and the leading edge blurred behind a fading mask — a stream reads as writing rather than as text appearing.",
      "NO AUTHOR MARK on the answer: the identity lives in the shell — the orb, the live border, the surface's own brand mark — so a message never signs itself. Alignment alone says who is speaking.",
      "onSettled fires when the answer finishes, which is what returns the ambient layer (orb, borders, field) to rest.",
    ],
    whenToUse: [
      "Any assistant exchange in a conversation surface — panel, dock, or the spotlight's AI Overview.",
      "When the question needs to stay visible next to its answer, which is nearly always.",
    ],
    whenNotToUse: [
      "A one-shot answer with no question worth showing — render the answer alone.",
      "System notices or confirmations; those are toasts or an error object.",
    ],
    stories: [],
    playground: MessagePairPlayground,
  },
  {
    id: "reference-chips",
    name: "ReferenceChips",
    description:
      "Numbered provenance chips under an answer — what the assistant grounded its reply in.",
    behavior: [
      "Numbered in order: the page context first, then attached chips, then the kit's own sources. The number is the citation's identity in the text, so it always shows.",
      "ONE anatomy with an optional mark slot — number · mark · label — not a set of variants, so a row mixing a web source, an internal document, and an unmarked reference still reads as one list.",
      "The mark has a fixed precedence: the source's own logo, else a typed icon, else nothing. A logo that fails to load falls back to a monogram, so a dead image never leaves a hole.",
      "A logo is DATA the caller supplies — the system never invents or fetches one. Icons come from the Foundation's configured library like everywhere else.",
      "A reference with an href is a link, opens in a new tab, and says so on hover; without one it stays inert text.",
      "Renders nothing when there are no references — grounding is never implied by an empty row.",
      "Sits on the neutral glass wash (--glass-wash) so it reads as part of the answer object.",
    ],
    whenToUse: [
      "Under any composed answer that used page context or attached items.",
      "For citations — give web sources their logo and internal ones a typed icon, so provenance is recognizable before it is read.",
      "When the user needs to audit what the assistant saw — the governance habit applied to answers.",
    ],
    whenNotToUse: [
      "As navigation through the product — a reference opens its source, it is not a menu.",
      "For attaching context, which is the AI form's ContextRow.",
      "To dress up an unsourced claim: a mark makes a reference look authoritative, so never add one the answer did not actually use.",
    ],
    stories: [
      {
        label: "Citations — logo, icon, and unmarked in one row",
        render: (
          <ReferenceChips
            refs={[
              {
                label: "Tailwind CSS · Theme",
                logo: "https://www.google.com/s2/favicons?domain=tailwindcss.com&sz=64",
                href: "https://tailwindcss.com/docs/theme",
              },
              { label: "DESIGN.md · §5 Motion", icon: "document" },
              { label: "Response kit v0" },
            ]}
          />
        ),
      },
      {
        label: "Unmarked — the original anatomy, unchanged",
        render: (
          <ReferenceChips
            refs={[
              { label: "Design system · Foundation" },
              { label: "Motion" },
              { label: "Response kit v0" },
            ]}
          />
        ),
      },
    ],
    playground: ReferenceChipsPlayground,
  },
  {
    id: "shimmer-placeholder",
    name: "ShimmerPlaceholder",
    description:
      "The placeholder every AI form wears — text with a highlight travelling through it, the ambient layer's way of saying the assistant is listening before anything is typed.",
    behavior: [
      "A light band sweeps the glyphs on a 2.8s loop (ambient-shimmer in theme.css), built from a gradient clipped to the text — the letters are the mask, so nothing sits on top of them.",
      "Rendered as an overlay, not the input's own placeholder attribute: a real placeholder cannot carry a background-clipped gradient. The input keeps an aria-label, so screen readers still announce it.",
      "Shown only while the field is empty; it disappears the moment the first character lands, so it never competes with what the user is writing.",
      "The travelling highlight is the ambient accent (--app-blue), blended into the foreground on its shoulders, with secondary text as the resting tone — so the placeholder carries the assistant's own colour and re-tints when the Foundation accent changes.",
      "Every ambient form uses it — the palette's search, the panel and dock follow-ups, and the quick ask pill — which is what makes an AI input recognisable as one.",
    ],
    whenToUse: [
      "Any input that talks to the assistant, in any form factor.",
      "When a field should feel awake before it is used — the shimmer is presence, not decoration.",
    ],
    whenNotToUse: [
      "Product inputs (settings, forms, filters) — a shimmering placeholder there claims an AI is listening when none is.",
      "Fields that already have a value, or read-only text; motion on stable content is noise.",
      "As a loading indicator — the orb's states carry progress, this only carries availability.",
    ],
    stories: [
      {
        label: "Placeholder",
        render: (
          // hugs its text: an invisible copy sizes the box, the shimmer
          // overlays it exactly
          <span className="relative inline-flex items-center">
            <span className="invisible text-base">Ask ambientui…</span>
            <ShimmerPlaceholder show>Ask ambientui…</ShimmerPlaceholder>
          </span>
        ),
      },
    ],
  },
  {
    id: "context-chip",
    name: "ContextChip",
    description:
      "One attached thing the assistant can see — the chip that makes context visible instead of implied.",
    behavior: [
      "ONE anatomy everywhere: an icon tile typed by what was attached, the label, and a squared remove control. Two sizes only — default where the composer has a row of its own, compact where chips share the input's line — and a surface picks the size, never the look.",
      "The tile is typed by KIND: page → document, control → sliders, target and cell → layers, file and symbol → code, selection → type. Names from the icon vocabulary, so chips redraw with the Foundation's configured library like everything else.",
      "A chip may override that with its own `icon`. Every page is kind \"page\", which is too coarse to tell an editor from a colour map from an essay, and the page is the only thing that knows which — so /ds sends the icon of the rail row you are standing on, and the dev tool sends `code`.",
      "SPARKLES IS NEVER A CHIP ICON. In this system that mark means the assistant — its character, AskAI, the follow-up heading — and a chip is what the assistant can SEE, not the assistant. It was the page kind's icon and the component page's icon until both were caught; an icon is a word, and lending the assistant's word to a page costs that word its precision.",
      "The page's own chip arrives automatically (setPageChip); anything else is something the user attached by right-clicking an element.",
      "Every chip carries a remove control, because everything here is a decision that can be undone — including keeping the page attached.",
      "Truncates rather than wraps: a chip names its source, it does not quote it.",
      "Chips ride every AI form factor, so what the assistant can see is the same wherever you ask from.",
      "ONE ROW ABOVE THE INPUT, and everything the question is about rides in it — the page chip, attached chips, and staged attachments, in a single ChipSlider that pages with arrows. Context and attachments were two stacked rows, which read as two different kinds of thing and cost twice the height above the smallest part of the surface. They are one kind of thing: material the answer will rest on.",
      "It SCROLLS rather than wraps. Wrapping grew the composer upward as context accumulated, pushing the transcript around while the user was still writing; one scrolling row costs the same height whether it holds one chip or nine.",
      "Removing one takes it out of the next question's grounding, and the answer's references will show the difference.",
    ],
    whenToUse: [
      "Above any AI input, to show what the answer will be grounded in before it is asked.",
      "Whenever the assistant gains access to something new mid-conversation.",
    ],
    whenNotToUse: [
      "For filters or tags in product UI — this pill claims 'the assistant can see this', which is a specific promise.",
      "For results or citations after an answer — that is ReferenceChips.",
    ],
    stories: [
      {
        label: "Attached context",
        render: (
          <div className="flex flex-wrap items-center gap-1.5">
            <ContextChipView
              chip={{ id: "p", kind: "page", label: "Design system · Foundation" }}
              onRemove={() => {}}
            />
            <ContextChipView
              chip={{
                id: "o",
                kind: "page",
                label: "Editor · composer.tsx",
                icon: "code",
              }}
              onRemove={() => {}}
            />
            <ContextChipView
              chip={{ id: "a", kind: "control", label: "Accent color" }}
              onRemove={() => {}}
            />
            <ContextChipView
              chip={{ id: "b", kind: "target", label: "Semantic mapping" }}
              onRemove={() => {}}
            />
          </div>
        ),
      },
      {
        label: "Compact — chips sharing the input's line",
        render: (
          <div className="flex flex-wrap items-center gap-1.5">
            <ContextChipView
              chip={{ id: "p", kind: "page", label: "Design system · Foundation" }}
              compact
            />
            <ContextChipView
              chip={{ id: "a", kind: "control", label: "Accent color" }}
              compact
              onRemove={() => {}}
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "command-palette",
    name: "CommandPalette",
    description:
      "The assistant's spotlight mode: one input that both searches the product and asks the AI, over a glass surface with the ambient identity in its edge and background.",
    behavior: [
      "⌘K opens it from anywhere and toggles it closed; Esc clears the query first, then closes — so a mistyped search never costs the surface.",
      "One input, two intents: the query is read as a QUESTION (4+ words, a leading interrogative, or a trailing ?) or as navigation. Questions put \"Ask ambientui\" first; anything else ranks matching pages.",
      "Sections are a flat, keyboard-navigable model — Recent chats, Suggested for this page, Jump to — with ↑↓ moving across section boundaries and ↵ running the selected row.",
      "WHAT IT CAN DO IS REGISTERED BY THE APP (see CommandRegistry): components, documentation, demos and the assistant's own form factors, each with a `run` the palette calls without knowing what it means. That is the context-chip contract pointed the other way — a surface hands the layer a chip, the app hands it a command — and it is why the palette can reach a product the layer knows nothing about. The lists are DERIVED from the registry that documents them, so a command for something that does not exist is impossible to write.",
      "Matches are CAPPED PER SECTION, not overall: one cap across the whole list let the first family spend the entire budget, so forty components matching \"panel\" pushed Switch form off the end — the one command the word most obviously meant was the one you could not reach.",
      "AT REST IT SAYS WHAT IT CAN DO. Switch form shows in full because five rows are small enough and always relevant; the big families are advertised by a counted hint (\"50 components, 10 documents, 5 demos\") derived from what is actually registered. A capability nobody can see is one that does not exist as far as the user is concerned — and a hint written by hand would outlive the family it describes.",
      "WHAT IT OFFERS COMES FROM THE PAGE. setPageIntel supplies the suggestions, the recents, where \"Jump to\" goes, and the input's own invitation; pages that stay quiet get the app-wide defaults. The dev tool publishes its LIVE problem inventory there, so every suggestion is a question one of its errors deserves — and a problem that gets fixed leaves the palette, because the list is derived from workspace state rather than written twice.",
      "A page with its own workspace takes over \"Jump to\" entirely: inside the dev tool it lists open files, each subtitled with its actual problem, instead of the app's routes.",
      "The page's own context rides along as a chip in the header band; right-clicking anything on the page attaches it as another chip.",
      "A chip may carry its own `icon`: every page is kind \"page\", which is too coarse to tell an editor from a colour map, and the page is the only thing that knows which. Omitted, the kind's icon stands in. Sparkles is never one of them — in this system that mark means the assistant, and a chip is what the assistant can SEE, not the assistant itself.",
      "Asking transitions the surface in place into the AI Overview — the answer arrives where the question was asked, with a follow-up form replacing the search input.",
      "No backdrop: the palette floats on the page at full brightness, with the glass, its shadow, and the live border carrying the separation.",
      "Ambient state is live: typing a question turns the layer to listening before send; the border and background field follow.",
      "Selection and keycaps use the neutral glass wash, not the accent — on glass, accent marks actions, not focus position.",
      "Dragging the floating panel to the top-center zone becomes this mode; dragging out of it returns to a panel.",
    ],
    whenToUse: [
      "The product's primary entry point for both finding and asking — one keystroke from anywhere.",
      "When the answer and the destination are the same question: \"where is X\" and \"what is X\" resolve in one surface.",
    ],
    whenNotToUse: [
      "A conversation the user wants to keep while working — that's the panel or dock; the palette is for a single exchange.",
      "Scoped search inside a page's own data — a local filter belongs in the page, not in the global palette.",
      "Confirming or undoing an action — use a toast or the save reminder.",
    ],
    stories: [
      {
        label: "Open",
        render: <CommandPaletteStory />,
      },
    ],
  },
  {
    id: "composer",
    group: "Messages",
    name: "Composer",
    description:
      "The one place a question is written: an optional character mark, context chips, the input, and one control.",
    behavior: [
      "ONE CONTROL, TWO MEANINGS: send while idle, Stop while an answer runs. Send only lights up once there is text — the affordance states its own availability. (An orb was tried in this slot and removed: the identity lives in the shell, and a character where a control belongs reads as decoration.)",
      "While an answer is running the same position becomes STOP — one control, two meanings, always the one that applies. Stopping mid-compose cancels cleanly; stopping mid-stream settles what has already arrived, because it was already said.",
      "Every form factor shares this anatomy: `panel` for the in-surface row (panel and dock), `quick` inside quick ask's pill — the pill supplies the glass and the height — and `inline` for a composer standing inside another object (a review thread), which brings its own frame and the smaller type size. The spotlight band is next.",
      "`mark` puts the assistant's CHARACTER at the head of the row, reacting through still / listening / thinking / answer. It is an identity mark, never the control: the send slot stays a control, which is the distinction that made the orb-as-send experiment fail.",
      "The mark DEFAULTS PER VARIANT, not per caller: `panel` carries it because it is the row that stands alone; `quick` does not, because the orb it would duplicate is the pill it sits in; `inline` does not, because it belongs to the object hosting it. Pass `mark` only to override the usual answer.",
      "`suggestion` offers what to do next as ghost text in the empty field, with Tab to accept and run it. The offer stands only while the field is empty — the moment the user types, their words win.",
      "PASTING BULK TEXT ATTACHES IT rather than filling the field (onPasteText). A stack trace dropped into a one-line input buries the question being written under material the user only meant to REFER to; it becomes a MessageAttachments row above the input, removable until the turn is sent. Short pastes stay in the field, because a short paste is almost always part of the sentence being typed.",
      "Context chips ride in compact size ahead of the input; the shimmer placeholder says the assistant is listening.",
    ],
    whenToUse: [
      "Anywhere a question is typed to the assistant — it is the only sanctioned composer.",
    ],
    whenNotToUse: [
      "For product search or filters; this control promises an AI on the other end.",
      "Never rebuild the input row inline in a surface — that is exactly the drift this extraction removes.",
    ],
    stories: [],
    playground: ComposerPlayground,
  },
  {
    id: "review-comment",
    group: "Messages",
    name: "ReviewComment",
    description:
      "A teammate's note threaded into the code it is about, with the assistant reachable from inside it.",
    behavior: [
      "ANCHORED, NOT ADJACENT: the note renders under the line it questions. A review comment in a side panel makes the reader hold a line number in their head and scroll; threaded, the question and the code are one object.",
      "That anchoring is what makes the reply seam honest — \"resolve this\" has an unambiguous referent, so replying attaches the line as context and hands the work to the ambient panel rather than answering about a whole file.",
      "The reply row is the Composer's `inline` variant, not a lookalike input: one instrument everywhere a question is written.",
      "Status is STATED, not implied by color alone — a red tint is not a word, and \"Change requested\" is the difference between an opinion and a blocker.",
      "Wears the ambient glass: a thread the assistant can act on belongs to the layer's material, not the host surface's chrome.",
      "Replying HANDS THE THREAD OVER: the host closes the comment (it is the assistant's business now) and puts the line it pointed at into the working state, so the handover is visible in the code and not only in the panel that just opened. The component reports the reply; what closing and highlighting mean is the host's decision.",
      "Omit onReply and it is a read-only record, with no reply affordance offered.",
    ],
    whenToUse: [
      "Human review notes inside a diff or an editor, where the assistant may be asked to resolve them.",
      "Anywhere a comment's meaning depends on exactly which line it points at.",
    ],
    whenNotToUse: [
      "For the assistant's own output — that is the response kit; this component is for a person's words.",
      "As a general comment feed detached from code; without an anchor it is just a message list.",
    ],
    stories: [
      {
        label: "Change requested",
        render: (
          <div className="w-full max-w-lg">
            <ReviewComment
              author="mingjie"
              when="1h ago"
              status="change-requested"
              text="Should the draft live in the runtime store, or stay local and only persist on blur? Asking because the composer is the only consumer today."
              onReply={() => {}}
              replyPlaceholder="Reply, or ask ambientui to resolve it…"
            />
          </div>
        ),
      },
      {
        label: "Resolved, read-only",
        render: (
          <div className="w-full max-w-lg">
            <ReviewComment
              author="nan"
              when="Yesterday"
              status="resolved"
              text="Rounded the total after fee calculation so pricing and display use the same value."
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "attach-menu",
    group: "Messages",
    name: "AttachMenu · AskAI",
    description:
      "The attach gesture: right-click anything to make it context, or ask where the data is.",
    behavior: [
      "THE UNIVERSAL GESTURE of the ambient layer. Right-click any element and it becomes a ContextChip — this is how the assistant learns what you mean without you describing it.",
      "Two verbs, deliberately: Explain (attach, ask, open the panel) for the impatient path, Add to chat context (attach, say nothing) for the deliberate one. A third would make it a menu.",
      "AskAI is the inline entry point — it lives IN the row, revealed on hover, because a question asked where the thing is costs no navigation and no retyping. Requires `relative group/row` on the row.",
      "It FLOATS rather than sitting in flow: an affordance that resizes the thing being hovered makes the whole list flinch under the pointer. Revealing it costs no layout.",
      "Any click OUTSIDE, scroll, or Escape dismisses the menu: a context menu that survives the next interaction is a modal nobody asked for. Pointerdown inside it is the first half of choosing an item, so it must not dismiss — that is what made both verbs unreachable.",
      "openAt(x, y, chip) opens it without a pointer, so a guided tour can perform the gesture ON the real row rather than describe it. The user still picks the verb; nothing is executed for them.",
      "This is the whole product side of the contract. A surface hands over a chip; it never learns how an answer is rendered.",
    ],
    whenToUse: [
      "On any object a user might reasonably ask about — a row, a cell, a file, a line of code.",
      "Beside a problem or anomaly the product already surfaces; that is the moment the question exists.",
    ],
    whenNotToUse: [
      "On every element indiscriminately — if everything is attachable, the gesture stops meaning anything.",
      "As a replacement for the product's own actions; this attaches context, it does not perform work.",
    ],
    stories: [
      {
        label: "Inline entry point (hover the row)",
        render: (
          <div className="border-border bg-card group/row relative flex w-full max-w-sm items-center gap-2 rounded-lg border px-3 py-2">
            <Icon name="document" size={13} />
            <span className="flex-1 font-mono text-[12px]">composer.tsx</span>
            <AskAI
              chip={{ id: "demo", kind: "file", label: "composer.tsx" }}
              prompt="Review composer.tsx and tell me what is wrong"
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "message-actions",
    group: "Messages",
    name: "MessageActions",
    description:
      "Copy, rate, and regenerate — the quiet row under an answer, where each action confirms itself.",
    behavior: [
      "Each action confirms ITSELF rather than raising a toast: copy becomes a check for a beat, a rating stays lit. A toast for a copy is a notification about something the user is already looking at.",
      "Ratings toggle — pressing the lit thumb clears it, because a mis-tap should not become permanent signal.",
      "Copy only shows the check once the clipboard write actually resolved; a denied clipboard confirms nothing.",
      "Ghost weight throughout: these sit under every answer, so they must not compete with the answer itself.",
    ],
    whenToUse: [
      "Under any completed assistant answer.",
      "Anywhere the user's reaction is worth capturing at the moment they have it.",
    ],
    whenNotToUse: [
      "On a message still streaming — rating an unfinished answer measures patience, not quality.",
      "For destructive actions; put those behind the More control with their own confirmation.",
    ],
    stories: [],
    playground: MessageActionsPlayground,
  },
  {
    id: "follow-up-suggestions",
    group: "Messages",
    name: "FollowUpSuggestions",
    description:
      "A titled group of next turns, offered as prompts rather than performed.",
    behavior: [
      "They are OFFERS, not actions: picking one seeds the composer's next question rather than silently running it.",
      "They stagger in on the control motion role, because they arrive after the answer settles — a row that appears all at once reads as chrome that was always there.",
      "ONE SHAPE, deliberately. A pill row was the obvious second variant and it was removed: a real follow-up is a sentence, so it wraps to two lines and needs a target the width of the surface. A pill could hold neither.",
      "Each row carries the open-arrow that says picking it goes somewhere; the heading (\"Ask more\") names the group, and label={null} drops it.",
      "Renders nothing when there are no suggestions; an empty invitation row is worse than none.",
      "It is ALSO the panel's empty state — the character opens the conversation and this card carries the offers, drawing them from the page's own suggestions (setPageIntel). An empty state that hand-rolls its own list is a second component nobody maintains, and it drifts the moment this one changes.",
    ],
    whenToUse: [
      "After an answer that opens obvious next questions — a diff to review, a test to write.",
      "In an empty conversation, as the fastest way to show what the assistant can do.",
    ],
    whenNotToUse: [
      "As navigation to product features; that is the palette's job.",
      "More than about four at a time — a menu of prompts is a decision, not a shortcut.",
    ],
    stories: [],
    playground: FollowUpSuggestionsPlayground,
  },
  {
    id: "error-state",
    group: "Messages",
    name: "ErrorState",
    description:
      "A quiet failure banner with a retry path, not a modal in your face.",
    behavior: [
      "Sits in the transcript where the answer would have been: a failed generation is a turn that did not work, not a system-level event.",
      "States what happened and offers the single move that helps. No stack traces, no error codes the user cannot act on.",
      "Wears --destructive over --destructive-wash, the system's status pair — never a bespoke red.",
      "role=\"alert\", so a failure reaches a screen reader without the user going looking for it.",
    ],
    whenToUse: [
      "A generation that stopped, timed out, or hit a limit.",
      "Any failure where retrying is genuinely the right next step.",
    ],
    whenNotToUse: [
      "For a failed tool call inside an otherwise fine answer — that is ToolFailure, which is scoped to the call.",
      "For validation or empty states; a failure claim should be reserved for actual failures.",
    ],
    stories: [
      {
        label: "Generation stopped",
        render: (
          <div className="w-full max-w-md">
            <ErrorState
              detail="The model hit the output limit after 4,096 tokens."
              onRetry={() => {}}
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "message-queue",
    group: "Messages",
    name: "MessageQueue",
    description:
      "Turns you typed while a run was in flight, stacked and cancelable until it finishes.",
    behavior: [
      "The running turn sits on a raised card with a live pulse; queued turns are muted rows beneath it — one glance separates what is happening from what is waiting.",
      "The arrow INTERRUPTS, it does not reorder: the picked turn runs now and the running one goes back to the head of the queue. A queue whose items shuffle while one is mid-answer implies the running turn can be overtaken quietly, and it cannot.",
      "It is offered only while something is actually running — with nothing to interrupt, the control would be a lie.",
      "The running row wears the shimmer, because that is the treatment this system uses for work in progress everywhere else.",
      "Rows animate with layout so promoting reorders visibly rather than teleporting.",
    ],
    whenToUse: [
      "Whenever the composer accepts input during a run — the alternative is blocking the input and making the user hold a thought.",
    ],
    whenNotToUse: [
      "As a task list; these are unsent messages, not work items.",
      "When turns cannot actually be reordered or canceled — showing controls that do nothing is worse than a plain count.",
    ],
    stories: [],
    playground: MessageQueuePlayground,
  },
  {
    id: "reasoning-panel",
    group: "Messages",
    name: "ReasoningPanel",
    description:
      "A collapsible trace that streams reasoning steps, then settles into a summary.",
    behavior: [
      "STAGES ITS ARRIVAL: shimmer, a beat of nothing, then one step at a time. The block is complete in the data and would paint in a single frame — painting it instantly says the work was free, and robs the reader of the one thing a trace is for.",
      "staged={false} renders it settled, which is what a re-rendered older message must do: history is written, not re-thought.",
      "INSIDE A RESPONSE, BLOCKS WAIT FOR EACH OTHER: thinking finishes, then the next evidence block works, then the prose streams. The stage queue enforces the order in the shared hook, so a block inherits it by being staged at all — see DESIGN.md §8. On its own (this playground) a block has no queue and stages immediately.",
      "The counter is REAL — it ticks actual seconds while the trace is arriving, and the settled summary quotes what it measured rather than a prop. A trace that claims 'thought for 5s' when it took two is a decoration pretending to be a measurement.",
      "It runs on the block's WORKING state and freezes the moment the work stops: not while queued behind an earlier block (that is someone else's time) and not after the last item lands (a settled summary must quote a number that has stopped moving).",
      "Thinking holds to a floor (THINKING_FLOOR_MS) so an answer never appears to think for a blink and then know everything. The floor is a real wait, which is what keeps the counter a measurement.",
      "Each step's detail is WRITTEN, not revealed: it streams through the same StreamingText the answer itself uses.",
      "Opens itself while the run is live and collapses to one line when it finishes — reasoning is interesting WHILE it happens and reference material after.",
      "The settled summary states the cost in time (\"Thought for 5s\"), which is the part worth knowing at a glance.",
      "Steps are marked, not connected: they are ordered, not causally chained, and a connector would claim more than the model did.",
      "The user's own toggle wins — pass defaultOpen to opt out of the automatic behavior entirely.",
    ],
    whenToUse: [
      "Any run where thinking takes long enough that silence reads as a hang.",
      "When the reasoning is genuinely reviewable — a plan, a search strategy, a chain of constraints.",
    ],
    whenNotToUse: [
      "To pad a fast answer with theatre; a trace on a 200ms reply is a costume.",
      "For tool activity, which has its own objects (ToolCall, ToolTimeline).",
    ],
    stories: [],
    playground: ReasoningPanelPlayground,
  },
  {
    id: "reasoning-effort",
    group: "Messages",
    name: "ReasoningEffort",
    description:
      "How hard to think, and how much of that budget the run actually spent.",
    behavior: [
      "The control and the meter belong together: an effort setting with no spend reading is a preference with invisible consequences.",
      "A radiogroup, not a slider — the levels are named tiers, and a continuous control would imply precision the model does not offer.",
      "The meter fills on the surface motion role, so a spend that climbs during a run reads as accumulation rather than a jump.",
      "Omit spent/budget and the meter disappears; the control alone is still valid.",
    ],
    whenToUse: [
      "Wherever the user pays for thinking — in tokens, in latency, or in both.",
      "In settings AND beside a run, so the choice can be learned from its result.",
    ],
    whenNotToUse: [
      "When effort makes no observable difference; a control with no consequence teaches the user to ignore controls.",
    ],
    stories: [],
    playground: ReasoningEffortPlayground,
  },
  {
    id: "message-attachments",
    group: "Messages",
    name: "MessageAttachments",
    description:
      "What was attached, before or after sending — a pasted stack trace, an image to open, a document with its page count.",
    behavior: [
      "ONE COMPONENT FOR BOTH MOMENTS, because removability is the only honest difference: pass onRemove while the attachment is still staged in the composer, omit it once the message is sent and the attachment is a record. Two components would have drifted into two ideas of what an attachment looks like.",
      "A removable row is never also an openable one — it already contains a button, so it must not be one. While staged, removing wins.",
      "Pasted text is a `text` attachment: it is quoted material rather than a file, it says so with the quote mark, and its meta counts lines and characters so it is identifiable without being read.",
      "`compact` is the composer's density: chips in one row rather than stacked cards, because staged attachments sit beside context chips and mean the same thing. Four stacked cards pushed the input off the surface, which is the wrong trade for material you are only referring to.",
      "It is the SAME chip wherever it is drawn (AttachmentChip) inside the SAME slider (ChipSlider). The ambient layer's context row renders attachments beside the page chip in one run; `compact` here is for a composer standing alone, with no context row above it. Two components drawing an attachment is how two drawings of one thing drift apart.",
      "The row PAGES with arrows when it overflows, and carries none when it does not. A row that scrolls silently is one most people read as truncated — the arrows are the only thing separating \"there is more\" from \"that is all\".",
      "An openable attachment is a raised, bordered card; the rest sit on the quiet fill — affordance is carried by the surface, not by a hover-only cue.",
      "An image shows its thumbnail; everything else shows the icon for its kind, drawn by the configured icon library.",
      "Size and meta are formatted by the caller and shown in mono — they are facts about a file, not prose.",
    ],
    whenToUse: [
      "On a user turn that carried files, and on assistant turns that produced them.",
      "In a composer that stands alone (`compact`), for anything staged while the turn is still being written. Inside the ambient layer, the context row does this instead.",
    ],
    whenNotToUse: [
      "For links or references; those are ContextChip and ReferenceChips.",
      "As a second place to show what is already staged. ONE ROW OWNS THE STAGE: where a context row exists it draws the attachments itself, in its own slider, and the composer is handed none. Rendering them in both produced two of every chip, each with its own remove button — and later, when that was fixed by stacking them instead, two rows that read as two different kinds of thing.",
    ],
    stories: [
      {
        label: "Staged in the composer (compact)",
        render: (
          <div className="w-full max-w-md">
            <MessageAttachments
              compact
              onRemove={() => {}}
              attachments={[
                {
                  id: "t1",
                  name: 'TypeError: Cannot read properties of undefined',
                  kind: "text",
                  meta: "24 lines · 1,180 chars",
                },
                {
                  id: "t2",
                  name: "composer-regression.png",
                  kind: "image",
                  meta: "412 KB",
                },
                { id: "t3", name: "vitest-run.log", kind: "file", meta: "38 KB" },
              ]}
            />
          </div>
        ),
      },
      {
        label: "Received files",
        render: (
          <div className="w-full max-w-sm">
            <MessageAttachments
              attachments={[
                { id: "a", name: "composer-regression.png", size: "412 KB", kind: "image", onOpen: () => {} },
                { id: "b", name: "migration-0.14.pdf", size: "1.2 MB", meta: "14 pages", kind: "document" },
                { id: "c", name: "vitest-run.log", size: "38 KB", kind: "file" },
              ]}
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "quote-reply",
    group: "Messages",
    name: "QuoteReply",
    description:
      "Select a phrase and a contextual edit bar attaches beneath it — describe an edit, or pick one, and watch the rewrite arrive in place.",
    behavior: [
      "ANCHORED TO THE SELECTION: the bar measures the selected range and attaches beneath its last line, centred on the whole selection — a wrapped selection still reads as one object with its bar. It pops in on the control role and repositions through requestAnimationFrame.",
      "A STATE MACHINE, not a toolbar: idle (a Describe-edits prompt plus Explain / Improve, with Shorten / Tone / Grammar unfolding inside the pill) → thinking (spinner + shimmer with the real elapsed count) → streaming (the rewrite arrives INTO the selection through StreamingText) → result (Keep / Discard / Retry).",
      "Rewriting in place requires owning the prose: pass `text` and a `rewrite` seam. Without the seam, actions only report (onAction) — which is all a surface that cannot mutate its content should get.",
      "Typing in the prompt collapses the presets to a send control; the instruction IS the action.",
      "Appears on selection and nowhere else, and only for selections inside its own content.",
      "The selection stays the SUBJECT: Keep applies the replacement to the text, Discard restores it, Retry runs the same action again.",
    ],
    whenToUse: [
      "Around long assistant answers, especially ones mixing prose and code.",
    ],
    whenNotToUse: [
      "Around user messages — quoting yourself back to the assistant is what the composer is for.",
      "Where text is short enough to reference whole; a toolbar over one sentence is friction.",
    ],
    stories: [
      {
        label: "Select any phrase below",
        render: (
          <div className="w-full max-w-md pb-14">
            <QuoteReply
              text="The regression happens because the converter drops parts with no text, so an empty assistant turn never reaches the thread."
              // the canned model seam: a real one produces the rewrite
              rewrite={(action, selection) =>
                action === "shorten"
                  ? selection
                      .split(" ")
                      .slice(0, Math.max(3, Math.ceil(selection.split(" ").length / 2)))
                      .join(" ")
                  : `${selection.replace(/[.]$/, "")} — reworded by the ${action} action.`
              }
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "feedback-dialog",
    group: "Messages",
    name: "FeedbackDialog",
    description:
      "A thumbs-down that asks why, so the signal arrives with a reason attached.",
    behavior: [
      "Opens UNDER the answer it is about, not as a modal — the system has no Dialog (see the known gaps), and that constraint produced the better interaction.",
      "Every field is optional and the reasons are preset: free text is a tax on someone already doing you a favor.",
      "Reasons multi-select, because an answer can be both too long and wrong.",
      "A bare rating is a number nobody can act on; asking at the moment of the reaction is the only time the user knows the reason.",
    ],
    whenToUse: [
      "Immediately after a negative rating, in place.",
    ],
    whenNotToUse: [
      "After a positive rating — interrogating praise is how you stop receiving it.",
      "As a general support form; this is about one answer.",
    ],
    stories: [
      {
        label: "What went wrong?",
        render: <FeedbackDialog onSubmit={() => {}} onDismiss={() => {}} />,
      },
    ],
  },
  {
    id: "timestamps",
    group: "Messages",
    name: "DayDivider · MessageTime",
    description:
      "Chronology in a long thread: days marked, exact times on hover.",
    behavior: [
      "A day boundary is the only moment a reader actually needs orienting — a timestamp on every message is noise.",
      "Exact times live on hover or keyboard focus (MessageTime), so precision is available without being ambient.",
      "The divider is a real separator with an accessible label, not a decorative line with text over it.",
      "MessageTime reveals inside a group-hover container, so the whole row is the target rather than the timestamp itself.",
    ],
    whenToUse: [
      "Threads that span sessions or days.",
      "Anywhere the age of an answer changes how much to trust it.",
    ],
    whenNotToUse: [
      "In a short-lived surface — quick ask, the palette — where everything happened just now.",
    ],
    stories: [
      {
        label: "A thread across two days",
        render: (
          <div className="flex w-full max-w-md flex-col gap-2">
            <DayDivider label="Yesterday" />
            <div className="group flex items-baseline justify-end gap-2">
              <MessageTime time="4:12 PM" />
              <span className="bg-muted rounded-2xl px-3 py-2 text-[13px]">
                Why does the draft survive a reload?
              </span>
            </div>
            <DayDivider label="Today" />
            <div className="group flex items-baseline justify-end gap-2">
              <MessageTime time="9:03 AM" />
              <span className="bg-muted rounded-2xl px-3 py-2 text-[13px]">
                And across thread switches?
              </span>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "tool-call",
    group: "Tool use",
    name: "ToolCall",
    description:
      "One tool invocation with its request and result tucked behind a disclosure.",
    behavior: [
      "A TOOL CALL IS A CLAIM, AND A CLAIM MUST BE AUDITABLE: the collapsed row is the claim, the disclosure holds the evidence.",
      "The verb alone, in plain language. The exact argument is evidence, and evidence lives in the disclosure — a chip in the header duplicated the request one click away.",
      "Collapsed by default, EXCEPT on failure: a failure the user has to go looking for is a failure they will miss.",
      "Request and result are quoted verbatim in mono. Evidence is not paraphrased.",
      "With no request or result, the row stops pretending to be expandable.",
    ],
    whenToUse: [
      "Every tool invocation the user should be able to audit.",
    ],
    whenNotToUse: [
      "For several calls that went out together — that is ParallelTools, which collapses them to one row.",
      "For a whole session's activity — that is ToolTimeline.",
    ],
    stories: [
      {
        label: "Searched the docs",
        render: (
          <div className="w-full max-w-md">
            <ToolCall
              verb="Searched the docs"
              request={'{"query": "draft persistence"}'}
              result="3 matches, best hit /docs/runtime/drafts"
              defaultOpen
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "tool-timeline",
    group: "Tool use",
    name: "ToolTimeline",
    description:
      "A whole working session summarized as verbs, targets, and file stats.",
    behavior: [
      "Summarizes to \"N steps · M files changed\" — the only two questions worth answering at a glance about a long run.",
      "File stats sit at the bottom and carry +/− counts, because a change to your files is the part with consequences.",
      "Additions and removals use the status pair (--positive / --destructive), never bespoke greens and reds.",
      "Open by default: a session summary the user has to discover defeats the summary.",
      "Steps land one by one, each row growing in — the record admits it was assembled over time, and a row appearing at full height would shove the list in a single frame.",
      "Every step row is a ghost button: pass onStepSelect to make it a jump — open the file, reveal the diff — and the record reads as traversable either way.",
    ],
    whenToUse: [
      "After an agent run of more than a couple of steps.",
      "Wherever the user needs to know what was touched before they trust the result.",
    ],
    whenNotToUse: [
      "For a single call, which reads better as a ToolCall.",
      "As a progress indicator during the run — it is a record, not a spinner.",
    ],
    stories: [
      {
        label: "Four steps, two files",
        render: (
          <div className="w-full max-w-md">
            <ToolTimeline
              steps={[
                { verb: "Thinking", target: "planning the change", icon: "sparkles" },
                { verb: "Read", target: "thread.tsx", icon: "document" },
                { verb: "Ran", target: "pnpm vitest", icon: "code" },
                { verb: "Edited", target: "composer.tsx", icon: "edit" },
              ]}
              files={[
                { path: "composer.tsx", added: 14, removed: 3 },
                { path: "use-draft.ts", added: 42 },
              ]}
              onStepSelect={() => {}}
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "terminal-block",
    group: "Tool use",
    name: "TerminalBlock",
    description:
      "Command output that streams line by line and ends with an exit status.",
    behavior: [
      "Output is quoted verbatim: monospaced, unwrapped, horizontally scrollable. Never reflowed to fit.",
      "The cursor while a run is live earns its place — it is the difference between \"still going\" and \"produced nothing\".",
      "The exit code replaces the cursor when the run ends, colored by the status pair.",
      "tone=\"ink\" presents a run as an artifact; \"paper\" keeps it on the surface it lives in, which is right inside a conversation.",
    ],
    whenToUse: [
      "Any command the assistant ran on the user's behalf.",
    ],
    whenNotToUse: [
      "For code the assistant wrote — that is CodeRunner, where the output belongs to a snippet.",
      "For long logs; link to them rather than pasting a thousand lines into a conversation.",
    ],
    stories: [],
    playground: TerminalBlockPlayground,
  },
  {
    id: "code-diff",
    group: "Tool use",
    name: "CodeDiff",
    description:
      "A unified diff with tinted additions and removals, sized for chat.",
    behavior: [
      "Read-only by design: this is the assistant showing what it changed, not asking anything.",
      "Tint carries the sign so the eye finds the change before reading it — and the sign column stays anyway, because color alone is not a signal everyone receives.",
      "Counts are derived from the lines when not given, so a diff can never advertise a total it does not contain.",
      "Uses --positive-wash and --destructive-wash: the same status tokens as every other pass/fail surface.",
    ],
    whenToUse: [
      "Whenever an answer changed code the user has not seen yet.",
    ],
    whenNotToUse: [
      "When the change still needs the user's approval — that is ReviewableDiff, where each hunk is a decision.",
      "For whole files; a diff is an argument about what changed.",
    ],
    stories: [
      {
        label: "composer.tsx",
        render: (
          <div className="w-full max-w-lg">
            <CodeDiff
              path="composer.tsx"
              lines={[
                { sign: " ", text: "export function Composer() {" },
                { sign: " ", text: "  const threadId = useThreadId();" },
                { sign: "-", text: '  const [draft, setDraft] = useState("");' },
                { sign: "+", text: "  const draft = useDraft(threadId);" },
                { sign: "+", text: "  useEffect(() => hydrate(draft), [threadId]);" },
                { sign: " ", text: "  return (" },
              ]}
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "reviewable-diff",
    group: "Tool use",
    name: "ReviewableDiff",
    description:
      "The same diff, but each hunk is a decision: keep it, discard it, apply what survived.",
    behavior: [
      "The difference from CodeDiff is CONSEQUENCE, not appearance: here the assistant is asking permission, per hunk.",
      "Three states per hunk — kept, discarded, undecided — because defaulting undecided to either one decides for the user.",
      "It counts what is left to review and disables Apply at zero kept, so \"apply\" can never quietly mean \"apply nothing\".",
      "A discarded hunk dims rather than disappearing; you can still see what you turned down.",
    ],
    whenToUse: [
      "Any change the assistant proposes to files the user owns.",
      "Wherever partial acceptance is genuinely possible.",
    ],
    whenNotToUse: [
      "For changes already applied — showing decisions for a fait accompli is theatre.",
      "When the hunks are not independent; offering per-hunk choice on a change that only works whole invites a broken state.",
    ],
    stories: [],
    playground: ReviewableDiffPlayground,
  },
  {
    id: "parallel-tools",
    group: "Tool use",
    name: "ParallelTools",
    description:
      "Calls that went out together, collapsed to one row until you want the detail.",
    behavior: [
      "Concurrency is an implementation fact — stacking five rows makes it look like five decisions.",
      "One row states the batch and its outcome; the batch reads as failed if any call inside it did.",
      "Opening it shows each call with its own timing, which is the only reason anyone opens it.",
      "Closed by default: the summary is usually the whole story.",
    ],
    whenToUse: [
      "Any fan-out — reading several files, querying several sources at once.",
    ],
    whenNotToUse: [
      "For sequential calls, where order carries meaning that a batch hides.",
      "For two calls; a batch of two is just two rows.",
    ],
    stories: [
      {
        label: "Read 4 files in parallel",
        render: (
          <div className="w-full max-w-md">
            <ParallelTools
              summary="Read 4 files in parallel"
              defaultOpen
              calls={[
                { tool: "read_file", target: "packages/core/src/convertMessages.ts", duration: "42ms" },
                { tool: "read_file", target: "packages/ui/src/composer.tsx", duration: "38ms" },
                { tool: "grep", target: "useDraft", duration: "61ms" },
                { tool: "read_file", target: "packages/core/src/queue/messages.ts", duration: "55ms" },
              ]}
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "tool-failure",
    group: "Tool use",
    name: "ToolFailure",
    description:
      "One call failed. The error, the attempt count, and a retry that doesn't restart the turn.",
    behavior: [
      "The attempt count is the honest part: \"1/3\" tells the user a retry is already policy, not a suggestion.",
      "Skip exists because a failed call is often not fatal to the answer — forcing a retry to continue is how a transient blip becomes a dead conversation.",
      "The error is quoted verbatim in mono on the destructive wash; a paraphrased error is a second bug to debug.",
      "Scoped to the call, not the turn: the surrounding answer keeps its own state.",
      "Report (onFeedback) opens the same FeedbackDialog the message actions use, inline under the failure — what went wrong from the user's side is captured at the moment they know it, in the ambient visual language rather than a detached modal.",
    ],
    whenToUse: [
      "Any tool call that failed inside an otherwise live turn.",
    ],
    whenNotToUse: [
      "When the whole generation stopped — that is ErrorState.",
      "For expected empty results; \"no matches\" is an answer, not a failure.",
    ],
    stories: [
      {
        label: "fetch timed out",
        render: (
          <div className="w-full max-w-md">
            <ToolFailure
              tool="fetch"
              target="https://api.example.com/v1/issues"
              error="ETIMEDOUT after 30000ms"
              attempt={1}
              attempts={3}
              onRetry={() => {}}
              onSkip={() => {}}
              onFeedback={() => {}}
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "code-runner",
    group: "Tool use",
    name: "CodeRunner",
    description:
      "A snippet with a run button, and the output it produced attached below it.",
    behavior: [
      "Attachment is the whole idea: output that floats free of the code that made it is a screenshot.",
      "Re-running replaces the result rather than appending another orphan block.",
      "Pressing play performs a run: the old output clears, the clock restarts from zero, and the result streams back in — the same arrival every time, because every run took time.",
      "The run control disables itself while running — the object states its own availability instead of relying on the user to wait.",
      "Duration sits beside the control, because how long it took is part of the result.",
    ],
    whenToUse: [
      "Executable snippets the user is meant to try, not just read.",
    ],
    whenNotToUse: [
      "For code that changes files or state — that needs a ReviewableDiff and an explicit apply.",
      "For output with no code behind it; that is a TerminalBlock.",
    ],
    stories: [
      {
        label: "typescript",
        render: (
          <div className="w-full max-w-lg">
            <CodeRunner
              language="typescript"
              duration="38ms"
              code={'const queue = createMessageQueue(driver);\nqueue.enqueue("also add a changeset");\nconsole.log(queue.size);'}
              output={"1\n→ drains when the run settles"}
              onRun={() => {}}
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "web-search",
    group: "Knowledge",
    name: "WebSearch",
    description:
      "A search query and its results landing one by one as the agent reads.",
    behavior: [
      "Showing the QUERY is the part most search UIs skip: it is the assistant's interpretation of the question, and the first place an answer goes wrong.",
      "Results stagger in because they genuinely arrive that way — the animation is reporting, not decoration.",
      "The query itself shimmers while sources are still being read: the search is the thing currently happening, and it settles to plain text when the reading ends.",
      "Each source carries its own mark (a caller-supplied logo, else the domain's initial) and its domain in mono, so provenance is recognizable before it is read.",
      "A source with an href opens in a new tab; without one it stays a record of what was read.",
    ],
    whenToUse: [
      "Any answer grounded in a live search.",
      "Whenever the user should be able to challenge WHAT was searched, not just what was found.",
    ],
    whenNotToUse: [
      "As a final bibliography — that is ReferenceChips, under the answer.",
      "For internal retrieval with no user-visible sources.",
    ],
    stories: [
      {
        label: "Reading three sources",
        render: (
          <div className="w-full max-w-md">
            <WebSearch
              query="assistant-ui draft persistence"
              sources={[
                { title: "Persisting composer state across threads", domain: "assistant-ui.com" },
                { title: "Draft autosave patterns in chat UIs", domain: "patterns.dev" },
                { title: "useSyncExternalStore and derived state", domain: "react.dev" },
              ]}
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "inline-citation",
    group: "Knowledge",
    name: "InlineCitation",
    description:
      "Numbered references inside a sentence, each with a hover preview of its source.",
    behavior: [
      "Reference chips say the reply used these sources; a citation says THIS sentence rests on THIS one — the difference between provenance and a bibliography.",
      "The preview opens above the line, because a card below would cover the text still being read.",
      "It responds to focus as well as hover, so the preview is reachable by keyboard.",
      "The marker inverts while open — the only state it has, and enough to tell you which one you are reading.",
    ],
    whenToUse: [
      "Answers where individual claims have individual sources.",
      "Anywhere a reader may want to verify one sentence without auditing the whole reply.",
    ],
    whenNotToUse: [
      "On every sentence; a paragraph of superscripts is unreadable and reads as defensiveness.",
      "When the source does not actually support that specific claim — a citation is a promise.",
    ],
    stories: [
      {
        label: "Two claims, two sources",
        render: (
          <p className="w-full max-w-md text-[13px] leading-relaxed">
            Optimistic updates keep the composer responsive while the server
            confirms the write
            <InlineCitation
              citation={{
                n: 1,
                title: "Optimistic updates in the runtime",
                domain: "assistant-ui.com",
                excerpt:
                  "The runtime applies local edits immediately and reconciles them once the server acknowledges the write.",
              }}
            />
            . The store already exposes a consistent snapshot for every
            subscriber
            <InlineCitation
              citation={{
                n: 2,
                title: "useSyncExternalStore",
                domain: "react.dev",
                excerpt:
                  "Every subscriber reads the same snapshot for a given render pass.",
              }}
            />
            , so no extra reconciliation pass is needed.
          </p>
        ),
      },
    ],
  },
  {
    id: "research-report",
    group: "Knowledge",
    name: "ResearchReport",
    description:
      "An outline that fills in section by section, each carrying the sources behind it.",
    behavior: [
      "Declaring the outline first turns waiting into reading: you can see what is coming, what is being written now, and what has landed.",
      "Each finished section carries its own source count, so depth is legible per claim rather than as one total at the end.",
      "A pending section says so — muted, with an inert mark — instead of rendering an empty confident heading.",
      "Three marks, three meanings: a check for done, a spinner for the section being written, a dot for not yet.",
    ],
    whenToUse: [
      "Long-running research where the shape of the answer is known before its content.",
      "Any deliverable a user will read in pieces rather than all at once.",
    ],
    whenNotToUse: [
      "For a conversational answer; an outline over three sentences is bureaucracy.",
      "When the sections are not known upfront — a skeleton that keeps changing is worse than none.",
    ],
    stories: [
      {
        label: "Filling in",
        render: (
          <div className="w-full max-w-md">
            <ResearchReport
              title="Draft ownership in 0.14"
              sourcesRead={15}
              sections={[
                { title: "What changed in 0.14", status: "done", sources: 4, body: "Drafts moved from parent state into a per-thread slot owned by the composer." },
                { title: "Who is affected", status: "done", sources: 3, body: "Anyone mirroring the draft in their own useState reads a value that never updates." },
                { title: "Migration path", status: "running" },
                { title: "Open questions", status: "pending" },
              ]}
            />
          </div>
        ),
      },
    ],
  },
]
