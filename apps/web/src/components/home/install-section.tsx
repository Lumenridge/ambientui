import * as React from "react"

import { Button } from "@ambientui/ui/components/button"

import { CommandLine } from "@/components/command-line"
import { Icon } from "@/components/icon"

/**
 * HOW SOMEONE TAKES THIS — the section the whole site exists to reach.
 *
 * Everything above it argues; this is where a visitor stops reading and
 * starts typing. So it leads with ONE command — the layer, the thing the
 * page has just spent five sections demonstrating — and lets the narrower
 * doors sit beneath it as equals rather than as a menu you must classify
 * yourself into before you know what any of it is.
 *
 * The command block itself lives in components/command-line.tsx — composed,
 * not promoted (owner's call), but written once now that the gallery needs
 * it too.
 *
 * ONLY COMMANDS THAT RUN. Every command here was verified end to end by
 * installing into a scratch project that is not this repo. The design
 * infrastructure door has no registry item yet, so it links to the docs
 * instead of printing a command that would fail — a broken install command
 * on a landing page costs more trust than a missing one.
 */

const REGISTRY_HOST = "https://lumenridge.github.io/ambientui"

/** The one-off registry registration, so every later command can be short. */
const SETUP = `npx shadcn registry add @ambientui=${REGISTRY_HOST}/r/{name}.json`

type Door = {
  id: string
  label: string
  blurb: string
  command: string
  icon: React.ComponentProps<typeof Icon>["name"]
}

const DOORS: Door[] = [
  {
    id: "component",
    label: "One component",
    blurb:
      "Take the reasoning panel, the tool timeline, the diff — thirty-one of them, each with its behavior and its boundaries.",
    command: "npx shadcn add @ambientui/reasoning-panel",
    icon: "layers",
  },
  {
    id: "governance",
    label: "The rules your AI works under",
    blurb:
      "The constitution's hard rules and three review roles — design system, product design, copy. The part nobody else ships.",
    command: "npx shadcn add @ambientui/governance",
    icon: "document",
  },
]


export function InstallSection({ onDocs }: { onDocs?: () => void }) {
  return (
    <section id="install" className="flex scroll-mt-24 flex-col gap-10">
      <div className="flex flex-col gap-4">
        <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          Take it
        </span>
        <h2 className="max-w-2xl text-4xl leading-tight font-semibold tracking-tight text-balance">
          The whole layer, in one command
        </h2>
        <p className="text-muted-foreground max-w-xl text-base leading-relaxed">
          It installs as source you own and can edit — the shadcn model, because
          a system you cannot change is not yours. Built on shadcn/ui and
          Tailwind CSS, so it composes with what you already have.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <CommandLine
          size="lead"
          command="npx shadcn add @ambientui/ambient-layer"
        />
        <p className="text-muted-foreground text-sm leading-relaxed">
          Register the namespace once and every command stays short:
        </p>
        <CommandLine command={SETUP} />
      </div>

      <div className="border-border grid gap-x-12 gap-y-8 border-t pt-10 sm:grid-cols-2">
        {DOORS.map((d) => (
          <div key={d.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-muted-foreground">
                <Icon name={d.icon} size={15} />
              </span>
              <h3 className="text-sm font-semibold">{d.label}</h3>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {d.blurb}
            </p>
            <CommandLine command={d.command} />
          </div>
        ))}

        {/* the fourth door is real but has no command yet; say that plainly
            rather than printing one that fails */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-muted-foreground">
              <Icon name="sliders" size={15} />
            </span>
            <h3 className="text-sm font-semibold">
              A design system to build inside
            </h3>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The Foundation, the token master and the code-to-Figma contract —
            the configuration space this whole argument rests on. Documented
            now; a one-command setup is still being built.
          </p>
          <Button variant="outline" className="self-start" onClick={onDocs}>
            Read the Foundation
            <Icon name="arrow-up-right" size={14} />
          </Button>
        </div>
      </div>
    </section>
  )
}
