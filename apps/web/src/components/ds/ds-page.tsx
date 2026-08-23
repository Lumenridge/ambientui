import * as React from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Icon, type IconName } from "@workspace/ui/components/icon"
import { Separator } from "@workspace/ui/components/separator"

import { useAssistant } from "@ambientui/ambient/assistant-context"
import { OrbGlyph } from "@ambientui/ambient/orb-character"
import { useFoundation } from "@/foundation/foundation-context"
import {
  AMBIENT_COMPONENTS,
  ControlsHostContext,
  SHADCN_DEFAULT_COMPONENTS,
} from "@/components/ds/ds-docs"
import { ColorsPage } from "@/components/ds/colors-page"
import { toast } from "sonner"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarInput,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"

import { SaveReminder } from "@/components/ds/settings-kit"
import { MotionPage } from "@/components/ds/motion-page"
import { FormFactorsPage } from "@/components/ds/form-factors-page"
import { TranslucencyPage } from "@/components/ds/translucency-page"
import { ShadowsPage } from "@/components/ds/shadows-page"
import { SpacingPage } from "@/components/ds/spacing-page"
import { FoundationPage } from "@/foundation/foundation-page"
import { Markdown } from "@/components/ds/markdown"
import { DS_PARAM, dsHref } from "@/ds-route"
import { SYSTEM_DOCS } from "@/components/ds/system-docs"

/**
 * The design-system browser: component list, interactive controls
 * playground, stories, and behavior documentation — built strictly from
 * the installed shadcn preset.
 */

function DocList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="text-muted-foreground flex flex-col gap-1.5 text-sm leading-relaxed">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-foreground/70 select-none">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** One rail row on the sanctioned SidebarMenuButton. */
function RailItem({
  id,
  label,
  selectedId,
  onSelect,
  icon,
}: {
  id: string
  label: string
  selectedId: string
  onSelect: (id: string) => void
  icon?: IconName
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="default"
        isActive={selectedId === id}
        onClick={() => onSelect(id)}
      >
        {icon && <Icon name={icon} size={15} />}
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function DsPage() {
  // THE SELECTION LIVES IN THE URL, so a component or a document can be
  // linked, reloaded into, and jumped to from ⌘K. Local state alone made
  // every entry unaddressable.
  const readSelection = () =>
    new URLSearchParams(window.location.search).get(DS_PARAM) ?? "foundation"
  const [selectedId, setSelectedIdState] = React.useState<string>(readSelection)
  const setSelectedId = React.useCallback((id: string) => {
    setSelectedIdState(id)
    const url = id === "foundation" ? "/ds" : dsHref(id)
    if (window.location.pathname + window.location.search !== url) {
      window.history.replaceState(null, "", url)
    }
  }, [])
  React.useEffect(() => {
    const onPop = () => setSelectedIdState(readSelection())
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])
  const { setMode } = useAssistant()

  // the rail's search: filters every list; groups with no matches hide, and
  // the collapsibles hold themselves open while a query is live
  const [railQuery, setRailQuery] = React.useState("")
  const q = railQuery.trim().toLowerCase()
  const railShow = (label: string) => !q || label.toLowerCase().includes(q)
  const railMatch = (labels: string) =>
    !q || labels.toLowerCase().includes(q)
  const ambientCore = AMBIENT_COMPONENTS.filter(
    (c) => !c.group && railShow(c.name)
  )
  const kitGroups = [
    ...new Set(AMBIENT_COMPONENTS.map((c) => c.group).filter(Boolean)),
  ].map((group) => ({
    group: group as string,
    items: AMBIENT_COMPONENTS.filter(
      (c) => c.group === group && railShow(c.name)
    ),
  }))
  const shadcnList = SHADCN_DEFAULT_COMPONENTS.filter((c) => railShow(c.name))
  // The governing documents, rendered from their real bytes — see
  // system-docs.ts. They are grouped like the rest of the rail.
  const docGroups = [...new Set(SYSTEM_DOCS.map((d) => d.group))].map(
    (group) => ({
      group,
      items: SYSTEM_DOCS.filter(
        (d) => d.group === group && (railShow(d.name) || railMatch(d.summary))
      ),
    })
  )
  const doc = SYSTEM_DOCS.find((d) => d.id === selectedId)
  const { setPageChip } = useAssistant()
  // Any control in the Inspect rail that writes to the Foundation config
  // raises the same reminder as the Foundation page — one save affordance
  // for the whole system, wherever the change was made.
  const { dirty, configDirty, generation, save, discard } = useFoundation()
  const entry =
    doc ||
    selectedId === "foundation" ||
    selectedId === "spacing" ||
    selectedId === "colors" ||
    selectedId === "shadows" ||
    selectedId === "motion" ||
    selectedId === "translucency" ||
    selectedId === "form-factors"
      ? null
      : [...AMBIENT_COMPONENTS, ...SHADCN_DEFAULT_COMPONENTS].find(
          (c) => c.id === selectedId
        )!
  const PlaygroundComponent = entry?.playground
  const [controlsHost, setControlsHost] = React.useState<HTMLElement | null>(
    null
  )

  // Declare this page (and the selected item) to the ambient layer.
  const chipLabel = doc
    ? doc.path
    : entry
    ? entry.name
    : selectedId === "spacing"
      ? "Spacing"
      : selectedId === "colors"
        ? "Colors"
        : selectedId === "shadows"
          ? "Shadows"
          : selectedId === "motion"
            ? "Motion"
            : selectedId === "translucency"
              ? "Translucency"
              : selectedId === "form-factors"
                ? "Form factors"
                : "Foundation"
  /**
   * The chip wears the SAME icon as the rail row you are standing on, so the
   * thing the assistant says it can see and the thing you clicked to get
   * here are visibly one object. A document is a document; a component is a
   * component; a foundation page is whatever that dimension is called.
   */
  const chipIcon: IconName = doc
    ? "document"
    : entry
      // NOT sparkles: that mark means the assistant, and a component page is
      // a thing the assistant can see, not the assistant
      ? "layers"
      : selectedId === "colors"
        ? "palette"
        : selectedId === "spacing"
          ? "ruler"
          : selectedId === "shadows"
            ? "layers"
            : selectedId === "motion"
              ? "play"
              : selectedId === "translucency"
                ? "moon"
                : selectedId === "form-factors"
                  ? "sidebar"
                  : "sliders"
  React.useEffect(() => {
    setPageChip({
      id: `ds-${selectedId}`,
      kind: "page",
      label: `Design system · ${chipLabel}`,
      icon: chipIcon,
    })
    return () => setPageChip(null)
  }, [selectedId, chipLabel, chipIcon, setPageChip])

  return (
    <div className="flex min-h-0 flex-1">
      {/* component list */}
      {/* THE RAIL IS THE SANCTIONED SIDEBAR, full anatomy: brand header,
          search that filters the vocabulary, iconed groups, collapsible kit
          sections with counts, and the assistant in the footer. The /ds page
          eats its own cooking. */}
      <SidebarProvider className="min-h-0! w-auto! flex-none">
        <Sidebar collapsible="none" className="w-64 shrink-0">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" className="pointer-events-none">
                  <OrbGlyph size={28} />
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold">ambientui</span>
                    <span className="text-muted-foreground text-xs">
                      Design system
                    </span>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarInput
              value={railQuery}
              onChange={(e) => setRailQuery(e.target.value)}
              placeholder="Search components…"
            />
          </SidebarHeader>
          <SidebarContent className="pb-2">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <RailItem icon="sliders" id="foundation" label="Foundation" selectedId={selectedId} onSelect={setSelectedId} />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {railMatch("Colors Spacing Shadows Motion Translucency") && (
              <SidebarGroup>
                <SidebarGroupLabel>Foundations</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {railShow("Colors") && <RailItem icon="palette" id="colors" label="Colors" selectedId={selectedId} onSelect={setSelectedId} />}
                    {railShow("Spacing") && <RailItem icon="ruler" id="spacing" label="Spacing" selectedId={selectedId} onSelect={setSelectedId} />}
                    {railShow("Shadows") && <RailItem icon="layers" id="shadows" label="Shadows" selectedId={selectedId} onSelect={setSelectedId} />}
                    {railShow("Motion") && <RailItem icon="play" id="motion" label="Motion" selectedId={selectedId} onSelect={setSelectedId} />}
                    {railShow("Translucency") && <RailItem icon="moon" id="translucency" label="Translucency" selectedId={selectedId} onSelect={setSelectedId} />}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {(railShow("Form factors") || ambientCore.length > 0) && (
              <SidebarGroup>
                <SidebarGroupLabel>Ambient vocabulary</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {railShow("Form factors") && (
                      <RailItem icon="sidebar" id="form-factors" label="Form factors" selectedId={selectedId} onSelect={setSelectedId} />
                    )}
                    {ambientCore.map((c) => (
                      <RailItem key={c.id} icon="sparkles" id={c.id} label={c.name} selectedId={selectedId} onSelect={setSelectedId} />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* the kits collapse — 46 rows is an index, and an index you can
                fold is one you can navigate. Searching holds them open. */}
            {kitGroups.map(({ group, items }) =>
              items.length === 0 ? null : (
                <Collapsible
                  key={group}
                  defaultOpen={group === "Messages"}
                  open={railQuery ? true : undefined}
                  className="group/collapsible"
                >
                  <SidebarGroup>
                    <SidebarGroupLabel asChild>
                      <CollapsibleTrigger>
                        <span>{group}</span>
                        <span className="text-muted-foreground ms-auto me-1 font-mono text-xs">
                          {items.length}
                        </span>
                        {/* the same disclosure chevron every fold in the app
                            wears: right closed, down open */}
                        <Icon
                          name="chevron-right"
                          size={13}
                          className="group-data-[state=open]/collapsible:hidden"
                        />
                        <Icon
                          name="chevron-down"
                          size={13}
                          className="hidden group-data-[state=open]/collapsible:block"
                        />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {items.map((c) => (
                            <RailItem key={c.id} id={c.id} label={c.name} selectedId={selectedId} onSelect={setSelectedId} />
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              )
            )}

            {docGroups.map(({ group, items }) =>
              items.length === 0 ? null : (
                <Collapsible
                  key={group}
                  defaultOpen={false}
                  open={railQuery ? true : undefined}
                  className="group/collapsible"
                >
                  <SidebarGroup>
                    <SidebarGroupLabel asChild>
                      <CollapsibleTrigger>
                        <span>{group}</span>
                        <span className="text-muted-foreground ms-auto me-1 font-mono text-xs">
                          {items.length}
                        </span>
                        <Icon
                          name="chevron-right"
                          size={13}
                          className="group-data-[state=open]/collapsible:hidden"
                        />
                        <Icon
                          name="chevron-down"
                          size={13}
                          className="hidden group-data-[state=open]/collapsible:block"
                        />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {items.map((d) => (
                            <RailItem
                              key={d.id}
                              id={d.id}
                              label={d.name}
                              icon="document"
                              selectedId={selectedId}
                              onSelect={setSelectedId}
                            />
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              )
            )}
            {shadcnList.length > 0 && (
              <Collapsible defaultOpen open={railQuery ? true : undefined} className="group/collapsible">
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger>
                      <span>Shadcn components</span>
                      <span className="text-muted-foreground ms-auto me-1 font-mono text-xs">
                        {shadcnList.length}
                      </span>
                      <Icon
                        name="chevron-right"
                        size={13}
                        className="group-data-[state=open]/collapsible:hidden"
                      />
                      <Icon
                        name="chevron-down"
                        size={13}
                        className="hidden group-data-[state=open]/collapsible:block"
                      />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {shadcnList.map((c) => (
                          <RailItem key={c.id} id={c.id} label={c.name} selectedId={selectedId} onSelect={setSelectedId} />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}
          </SidebarContent>
          <SidebarFooter className="border-border border-t">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setMode("spotlight")}>
                  <OrbGlyph size={18} />
                  <span>Ask ambientui</span>
                  <span className="text-muted-foreground ms-auto font-mono text-xs">
                    ⌘K
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>

      {/* canvas — the inset content card on the sidebar-tinted ground */}
      <main className="bg-sidebar min-w-0 flex-1 p-2">
        <div className="bg-background border-border h-full min-h-0 overflow-y-auto rounded-lg border px-8 py-6">
        {doc ? (
          /* THE REAL FILE. Rendered from its bytes, so the page cannot drift
             from the rules it is showing. */
          <div className="mx-auto max-w-3xl pb-12">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold">{doc.name}</h1>
              <Badge variant="outline" className="font-mono">
                {doc.path}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {doc.summary}
            </p>
            <div className="border-border mt-6 border-t pt-2">
              <Markdown source={doc.source} />
            </div>
          </div>
        ) : !entry ? (
          selectedId === "spacing" ? (
            <SpacingPage />
          ) : selectedId === "colors" ? (
            <ColorsPage />
          ) : selectedId === "shadows" ? (
            <ShadowsPage />
          ) : selectedId === "motion" ? (
            <MotionPage />
          ) : selectedId === "translucency" ? (
            <TranslucencyPage />
          ) : selectedId === "form-factors" ? (
            <FormFactorsPage />
          ) : (
            <FoundationPage />
          )
        ) : (
        <div className="mx-auto max-w-3xl pb-12">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{entry.name}</h1>
            <Badge variant="outline">
              {AMBIENT_COMPONENTS.some((c) => c.id === entry.id)
                ? "ambient"
                : "shadcn"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {entry.description}
          </p>

          <div className="mt-6 flex flex-col gap-6">
            {PlaygroundComponent && (
              <section>
                <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                  Playground
                </div>
                <ControlsHostContext.Provider value={controlsHost}>
                  {/* generation remounts rail state on Discard, so throwing
                      away edits is honest for playground props too */}
                  <PlaygroundComponent key={`${entry.id}:${generation}`} />
                </ControlsHostContext.Provider>
              </section>
            )}

            {entry.stories.map((story) => (
              <section key={story.label}>
                <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                  {story.label}
                </div>
                <div className="border-border bg-card flex min-h-32 items-center justify-center rounded-xl border p-8">
                  {story.render}
                </div>
              </section>
            ))}
          </div>

          <Separator className="my-8" />

          <div className="text-muted-foreground mb-4 text-xs font-medium tracking-wide uppercase">
            Documentation
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <DocList title="When to use" items={entry.whenToUse} />
              <DocList title="When not to" items={entry.whenNotToUse} />
            </div>
            <DocList title="Behavior" items={entry.behavior} />
          </div>

          <p className="text-muted-foreground mt-8 text-xs">
            This documentation doubles as the component vocabulary — the same
            descriptions the AI layer reasons over when composing interfaces.
          </p>
        </div>
        )}
        </div>
      </main>

      {/* inspect rail — the selected component's configuration */}
      {entry && (
        <aside className="border-border bg-sidebar text-sidebar-foreground flex w-72 shrink-0 flex-col overflow-y-auto border-l">
          <div className="border-border flex items-baseline justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Inspect</span>
            <span className="text-muted-foreground text-xs">
              {entry.name}
            </span>
          </div>
          <div className="text-muted-foreground border-border border-b px-4 py-2 text-xs font-medium tracking-wide uppercase">
            Controls
          </div>
          <div ref={setControlsHost} />
          {!PlaygroundComponent && (
            <p className="text-muted-foreground px-4 py-3 text-sm">
              No configurable props for this component — see its stories and
              documentation.
            </p>
          )}
        </aside>
      )}

      <SaveReminder
        open={dirty}
        onSave={() => {
          save()
          toast(configDirty ? "Theme saved" : "Configuration saved", {
            description: configDirty
              ? "Every surface now builds from this configuration."
              : "The Inspect rail's settings are committed.",
          })
        }}
        onDiscard={discard}
        saveLabel="Save Theme"
      />
    </div>
  )
}
