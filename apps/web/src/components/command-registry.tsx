import * as React from "react"

import {
  useAssistant,
  type AmbientCommand,
  type AssistantMode,
} from "ambientui/assistant-context"
import {
  AMBIENT_COMPONENTS,
  SHADCN_DEFAULT_COMPONENTS,
} from "@/components/ds/ds-docs"
import { SYSTEM_DOCS } from "@/components/ds/system-docs"
import { withBase } from "@/base"
import { dsHref } from "@/ds-route"
import { sections } from "@/nav"

/**
 * WHAT ⌘K CAN DO, registered by the app.
 *
 * The palette renders commands and calls `run`; it never learns what one
 * means. That is the same contract as the context chip, pointed the other
 * way — a surface hands the layer a chip, the app hands it a command — and it
 * is why the assistant can sit above a product it knows nothing about. If
 * this file imported nothing, ⌘K would still work; it would just have less
 * to offer.
 *
 * The lists are DERIVED, never hand-kept: components come from the registry
 * that documents them, documents from the same list /ds renders, forms from
 * the mode union. A command for something that does not exist is impossible
 * to write here, which is the point.
 */

const FORMS: { mode: AssistantMode; label: string; desc: string }[] = [
  { mode: "line", label: "Orb", desc: "Rest — present, nothing open" },
  { mode: "panel", label: "Panel", desc: "A conversation you keep, floating" },
  { mode: "dock", label: "Dock", desc: "Beside the work; the page reflows" },
  { mode: "spotlight", label: "Spotlight", desc: "Find or ask, centred" },
  { mode: "history", label: "History", desc: "The record, full screen" },
]

const VIEWS: { id: string; label: string; desc: string }[] = [
  { id: "playbook", label: "Playbook", desc: "The paper as a guided read" },
  { id: "devtool", label: "Dev tool", desc: "The layer inside real work" },
  { id: "canvas", label: "Canvas", desc: "The ambient layer on a bare page" },
]

export function CommandRegistry() {
  const { setCommands, setMode, navigate } = useAssistant()

  React.useEffect(() => {
    // navigating to a /ds entry: put it in the URL, then tell the app to go.
    // The popstate keeps whichever page is already mounted in step, so this
    // works whether or not /ds is the current page.
    const openDs = (id: string) => {
      window.history.pushState(null, "", dsHref(id))
      window.dispatchEvent(new PopStateEvent("popstate"))
      navigate?.("ds")
    }
    const openHome = (view: string) => {
      window.history.pushState(
        null,
        "",
        withBase(view === "canvas" ? "/" : `/?view=${view}`)
      )
      window.dispatchEvent(new PopStateEvent("popstate"))
      navigate?.("canvas")
    }

    const commands: AmbientCommand[] = [
      ...AMBIENT_COMPONENTS.map((c) => ({
        id: `cmp-${c.id}`,
        section: "Components",
        label: c.name,
        desc: c.description,
        keywords: `ambient ${c.group ?? "core"}`,
        icon: "sparkles",
        run: () => openDs(c.id),
      })),
      ...SHADCN_DEFAULT_COMPONENTS.map((c) => ({
        id: `cmp-${c.id}`,
        section: "Components",
        label: c.name,
        desc: c.description,
        keywords: "shadcn product",
        icon: "layers",
        run: () => openDs(c.id),
      })),
      ...SYSTEM_DOCS.map((d) => ({
        id: `doc-cmd-${d.id}`,
        section: "Documentation",
        label: d.name,
        desc: d.summary,
        keywords: `${d.path} ${d.group}`,
        icon: "document",
        run: () => openDs(d.id),
      })),
      ...FORMS.map((f) => ({
        id: `form-${f.mode}`,
        section: "Switch form",
        label: f.label,
        desc: f.desc,
        keywords: "mode form factor surface assistant",
        icon: "sidebar",
        run: () => setMode(f.mode),
      })),
      ...VIEWS.map((v) => ({
        id: `demo-${v.id}`,
        section: "Demos",
        label: v.label,
        desc: v.desc,
        keywords: "demo view show me",
        icon: "play",
        run: () => openHome(v.id),
      })),
      ...sections.map((s) => ({
        id: `page-${s.id}`,
        section: "Demos",
        label: s.label,
        desc: s.description,
        keywords: "page navigate",
        icon: "arrow-up-right",
        run: () => navigate?.(s.id),
      })),
    ]
    setCommands(commands)
    return () => setCommands([])
  }, [setCommands, setMode, navigate])

  return null
}
