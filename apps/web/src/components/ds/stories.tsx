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
} from "ambientui/orb-character"
import {
  ContextChipView,
  ShimmerPlaceholder,
} from "ambientui/ambient-marks"
import { useAssistant } from "ambientui/assistant-context"
import { AskAI } from "ambientui/attach-menu"
import { Composer } from "ambientui/composer"
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
} from "ambientui/message-kit"
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
} from "ambientui/tool-kit"
import {
  InlineCitation,
  ResearchReport,
  WebSearch,
} from "ambientui/knowledge-kit"
import {
  MessageBranches,
  MessagePair,
  ReferenceChips,
  StreamingText,
  type KitReference,
  type KitResponse,
  type MessageVariant,
} from "ambientui/response-kit"
import { composeResponse } from "ambientui/compose-response"
import {
  ORB_STATES,
  REASONING_EFFORTS,
} from "ambientui/kit-vocabulary"
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

/** The live half of one catalog entry: what it DOES, on screen. */
export type StoryEntry = {
  stories: Story[]
  /** Interactive playground with prop controls, when the prop surface warrants it. */
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

/** Live so the story shows the point: selecting a segment expands it. */
function ViewMenuStory() {
  const [view, setView] = React.useState("playbook")
  return (
    <div className="flex min-h-24 w-full items-start justify-center">
      <ViewMenu
        items={[
          { id: "playbook", label: "Playbook", icon: "home" },
          { id: "devtool", label: "Dev tool", icon: "code" },
          { id: "canvas", label: "Canvas", icon: "image" },
        ]}
        value={view}
        onSelect={setView}
      />
    </div>
  )
}

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

/**
 * The live half of the catalog: stories and playgrounds, keyed by the id
 * their prose carries in catalog.ts. Importing this module pulls the whole
 * demo kit — framer-motion, the shader, sonner, the ambient layer — which
 * is exactly why the prose does not live here.
 */
export const STORIES: Record<string, StoryEntry> = {
  "badge": {
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
  "button": {
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
  "card": {
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
  "checkbox": {
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
  "collapsible": {
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
  "dropdown-menu": {
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
  "input": {
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
  "section-rail": {
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
  "view-menu": {
    stories: [
      {
        label: "Active segment expanded",
        render: <ViewMenuStory />,
      },
    ],
  },
  "save-reminder": {
    stories: [{ label: "States", render: <SaveReminderStory /> }],
  },
  "sonner": {
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
  "separator": {
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
  "sheet": {
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
  "sidebar": {
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
  "skeleton": {
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
  "table": {
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
  "tabs": {
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
  "tooltip": {
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
  "orb-character": {
    playground: OrbPlayground,
    stories: [
      {
        label: "The four states",
        render: <OrbStatesStory />,
      },
    ],
  },
  "streaming-text": {
    stories: [],
    playground: StreamingTextPlayground,
  },
  "message-branches": {
    stories: [],
    playground: MessageBranchesPlayground,
  },
  "message-pair": {
    stories: [],
    playground: MessagePairPlayground,
  },
  "reference-chips": {
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
  "shimmer-placeholder": {
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
  "context-chip": {
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
  "command-palette": {
    stories: [
      {
        label: "Open",
        render: <CommandPaletteStory />,
      },
    ],
  },
  "composer": {
    stories: [],
    playground: ComposerPlayground,
  },
  "review-comment": {
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
  "attach-menu": {
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
  "message-actions": {
    stories: [],
    playground: MessageActionsPlayground,
  },
  "follow-up-suggestions": {
    stories: [],
    playground: FollowUpSuggestionsPlayground,
  },
  "error-state": {
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
  "message-queue": {
    stories: [],
    playground: MessageQueuePlayground,
  },
  "reasoning-panel": {
    stories: [],
    playground: ReasoningPanelPlayground,
  },
  "reasoning-effort": {
    stories: [],
    playground: ReasoningEffortPlayground,
  },
  "message-attachments": {
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
  "quote-reply": {
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
  "feedback-dialog": {
    stories: [
      {
        label: "What went wrong?",
        render: <FeedbackDialog onSubmit={() => {}} onDismiss={() => {}} />,
      },
    ],
  },
  "timestamps": {
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
  "tool-call": {
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
  "tool-timeline": {
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
  "terminal-block": {
    stories: [],
    playground: TerminalBlockPlayground,
  },
  "code-diff": {
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
  "reviewable-diff": {
    stories: [],
    playground: ReviewableDiffPlayground,
  },
  "parallel-tools": {
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
  "tool-failure": {
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
  "code-runner": {
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
  "web-search": {
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
  "inline-citation": {
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
  "research-report": {
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
}


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


