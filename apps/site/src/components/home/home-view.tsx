"use client"

import { OverviewView } from "@/components/home/overview-view"
import { DemoProviders } from "@/components/providers/demo-providers"

/**
 * The landing page's client shell: the providers the layer needs, and the
 * overview itself.
 *
 * NO PAGE-LEVEL ASSISTANT. The page used to mount its own resting orb, so
 * the site demonstrated the layer by wearing it. It also meant a character
 * floating over the prose on every scroll position, and the page is now
 * dense with framed demos that each run their own. The orb belongs in the
 * frames, where it is the subject; over the copy it was furniture.
 *
 * The whole tree is a client component, which under `output: "export"`
 * STILL PRERENDERS TO HTML — that is the property this migration rests on.
 * What it does not survive is content gated behind mount, so the prose here
 * must never wait for an effect to appear. scripts/check-static-html.mjs is
 * the assertion that it does not.
 */
export function HomeView() {
  return (
    <DemoProviders>
      <div className="relative min-h-svh">
        <OverviewView />
      </div>
    </DemoProviders>
  )
}
