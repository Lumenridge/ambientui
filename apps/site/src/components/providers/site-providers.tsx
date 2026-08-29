"use client"

import { TooltipProvider } from "@ambientui/ui/components/tooltip"
import { FoundationProvider } from "@ambientui/foundation"

import { ThemeProvider } from "@/components/theme-provider"

/**
 * WHAT THE WHOLE SITE SITS INSIDE.
 *
 * The Foundation is the site's theme, not a demo's — every page reads its
 * motion roles, its radius window and its colour tokens, including the
 * switcher in the chrome. Mounting it per-surface meant a component in the
 * layout could not use a motion hook without throwing, which is how the
 * nav pill broke the build the moment it moved into the root.
 *
 * These are client providers and the layout is a server component; that is
 * fine, and it does not stop the pages prerendering — `output: export`
 * renders client trees to HTML too.
 *
 * assetBase: the layer's shader shapes are served from the host's public
 * root, and a root-absolute URL resolves against the domain rather than an
 * app mounted under a prefix.
 */
export function SiteProviders({ children }: { children: React.ReactNode }) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "/"
  return (
    <ThemeProvider>
      <TooltipProvider>
        <FoundationProvider assetBase={base}>{children}</FoundationProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
