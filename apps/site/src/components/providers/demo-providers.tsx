"use client"

import * as React from "react"

import { TooltipProvider } from "@ambientui/ui/components/tooltip"
import { FoundationProvider } from "@ambientui/foundation"
import { AssistantProvider } from "ambientui/assistant-context"

import { ThemeProvider } from "@/components/theme-provider"

/**
 * What a demo surface needs mounted around it: the Foundation (which also
 * supplies the layer's runtime), tooltips, and an assistant context.
 *
 * It is a CLIENT boundary on purpose. These providers read storage, inject
 * a style tag and own animation state — none of which a server component
 * can do — and putting the boundary here keeps it off the prose routes,
 * where the whole point is that text renders without it.
 *
 * assetBase comes from the build's basePath: the layer's shader shapes are
 * served from the host's public root, and a root-absolute URL resolves
 * against the domain rather than an app mounted under a prefix.
 *
 * ThemeProvider is here rather than at the root because the palette class
 * is already stamped before paint by the boot script — what this adds is
 * the ability to CHANGE it, which only interactive surfaces need.
 */
export function DemoProviders({ children }: { children: React.ReactNode }) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "/"
  return (
    <ThemeProvider>
      <TooltipProvider>
        <FoundationProvider assetBase={base}>
          <AssistantProvider>{children}</AssistantProvider>
        </FoundationProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
