"use client"

import { Assistant } from "ambientui/assistant"

import { OverviewView } from "@/components/home/overview-view"
import { DemoProviders } from "@/components/providers/demo-providers"

/**
 * The landing page's client shell: the providers the layer needs, the
 * overview itself, and the page's own resting assistant.
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
        <Assistant />
      </div>
    </DemoProviders>
  )
}
