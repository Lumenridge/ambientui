"use client"

import { AssistantProvider } from "ambientui/assistant-context"

/**
 * What a surface that mounts the ASSISTANT needs, on top of the site's own
 * providers (see SiteProviders, in the root layout).
 *
 * It is only the assistant context now: theme, tooltips and the Foundation
 * moved to the root once the site's own chrome needed them. A page that
 * shows the layer wraps itself in this; a page of prose does not.
 */
export function DemoProviders({ children }: { children: React.ReactNode }) {
  return <AssistantProvider>{children}</AssistantProvider>
}
