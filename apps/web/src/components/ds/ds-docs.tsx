import * as React from "react"
import { createPortal } from "react-dom"

import {
  ArrowDown01Icon,
  Cancel01Icon,
  FavouriteIcon,
  Search01Icon,
  Settings01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import {
  ORB_STATES,
  OrbCharacter,
  type OrbState,
} from "@/components/assistant/orb-character"
import { useFoundation } from "@/foundation/foundation-context"

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
  description: string
  behavior: string[]
  whenToUse: string[]
  whenNotToUse: string[]
  stories: Story[]
  /** Interactive playground with prop controls, when the component has a meaningful prop surface. */
  playground?: React.ComponentType
}

/* ---------------------------------- controls helpers ---------------------------------- */

export function ControlRow({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  return (
    <div className="border-border flex min-h-11 items-center justify-between gap-4 border-b px-3 py-2 last:border-b-0">
      <span className="text-muted-foreground font-mono text-[12px]">{name}</span>
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="xs" variant="outline" className="gap-1.5 font-normal">
          {value}
          <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={1.8} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={option === value}
            onCheckedChange={() => onChange(option)}
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
      <div className="border-border flex min-h-44 items-center justify-center rounded-xl border p-8">
        {preview}
      </div>
      {host && createPortal(controls, host)}
    </>
  )
}

/* ---------------------------------- playgrounds ---------------------------------- */

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
              className="h-7 w-36 text-[13px]"
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
              className="h-7 w-36 text-[13px]"
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
              className="h-7 w-36 text-[13px]"
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
              <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.8} />
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
                { icon: Search01Icon, label: "Canvas", active: true },
                { icon: UserIcon, label: "Design system", active: false },
                { icon: Settings01Icon, label: "Settings", active: false },
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
                  <HugeiconsIcon icon={item.icon} size={15} strokeWidth={1.8} />
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
                <HugeiconsIcon icon={FavouriteIcon} size={16} strokeWidth={1.8} />
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
  return (
    <div className="grid grid-cols-2 gap-ambient-5 sm:grid-cols-4">
      {ORB_STATES.map((s) => (
        <div key={s} className="flex flex-col items-center gap-ambient-3">
          <OrbCharacter
            state={s}
            size={72}
            colors={orb.useAccent ? undefined : orb.colors}
            speeds={orb.speeds}
          />
          <span className="text-muted-foreground font-mono text-[11px]">
            {s}
          </span>
        </div>
      ))}
    </div>
  )
}

function OrbPlayground() {
  const { config, setConfig, dirty, save } = useFoundation()
  const orb = config.orb
  const [state, setState] = React.useState<OrbState>("still")
  const [size, setSize] = React.useState<(typeof ORB_SIZES)[number]>("96")
  const [justSaved, setJustSaved] = React.useState(false)

  const setOrb = (patch: Partial<typeof orb>) =>
    setConfig({ orb: { ...orb, ...patch } })

  const COLOR_ROLES = ["cold", "mid", "warm", "hot"]

  return (
    <Playground
      preview={
        <div className="flex flex-col items-center gap-ambient-4">
          <OrbCharacter
            state={state}
            size={Number(size)}
            colors={orb.useAccent ? undefined : orb.colors}
            speeds={orb.speeds}
          />
          <span className="text-muted-foreground font-mono text-[11px]">
            {state}
          </span>
        </div>
      }
      controls={
        <>
          <ControlRow name="state">
            <ChoiceControl
              options={ORB_STATES}
              value={state}
              onChange={setState}
            />
          </ControlRow>
          <ControlRow name="size">
            <ChoiceControl options={ORB_SIZES} value={size} onChange={setSize} />
          </ControlRow>
          {state === "answer" && (
            <ControlRow name="replay">
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
                      <HugeiconsIcon
                        icon={Cancel01Icon}
                        size={12}
                        strokeWidth={1.8}
                      />
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
          <ControlRow name="save">
            <Button
              size="xs"
              disabled={!dirty && !justSaved}
              onClick={() => {
                save()
                setJustSaved(true)
                setTimeout(() => setJustSaved(false), 1600)
              }}
            >
              {justSaved ? "Saved" : dirty ? "Save config" : "Saved"}
            </Button>
          </ControlRow>
          <p className="text-muted-foreground px-3 py-2 text-[11px]">
            Saves the whole theme config — same commit as Save Theme on the
            Foundation page.
          </p>
        </>
      }
    />
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
    ],
    whenToUse: [
      "As the assistant's face — the floating orb is this character at 52px.",
      "Anywhere the AI's lifecycle needs to be visible: avatars, processing surfaces.",
    ],
    whenNotToUse: [
      "As decoration on pages where no AI is present — the character means the AI is here.",
      "There is one assistant: within ambient surfaces the mark IS the character (header, palette avatar, input rows all render it, sharing one state); never render a competing character elsewhere.",
    ],
    playground: OrbPlayground,
    stories: [
      {
        label: "The four states",
        render: <OrbStatesStory />,
      },
    ],
  },
]
