"use client"

import { ColorsPage } from "@/components/ds/colors-page"
import { FormFactorsPage } from "@/components/ds/form-factors-page"
import { FoundationPage } from "@/components/ds/foundation-page"
import { MotionPage } from "@/components/ds/motion-page"
import { ShadowsPage } from "@/components/ds/shadows-page"
import { SpacingPage } from "@/components/ds/spacing-page"
import { TranslucencyPage } from "@/components/ds/translucency-page"
import { DemoProviders } from "@/components/providers/demo-providers"

/**
 * THE FOUNDATION TOOLS ARE INSTRUMENTS, NOT DOCUMENTS. Each reads the live
 * running theme and writes to it — there is nothing meaningful to prerender
 * beyond their headings, which is why they are client surfaces mounted
 * inside the providers rather than server-rendered prose.
 *
 * One switch rather than seven near-identical route files: the routes stay
 * one line each, and a new tool is a case here plus a folder.
 */
const TOOLS = {
  foundation: FoundationPage,
  colors: ColorsPage,
  spacing: SpacingPage,
  shadows: ShadowsPage,
  motion: MotionPage,
  translucency: TranslucencyPage,
  "form-factors": FormFactorsPage,
} as const

export type ToolId = keyof typeof TOOLS

export function FoundationTool({ id }: { id: ToolId }) {
  const Tool = TOOLS[id]
  return (
    <DemoProviders>
            {/* 108px of clearance at the top: the floating switcher sits over
          this column, and a heading that starts under it reads as clipped.
          pt-27 is 27 spacing steps, not a literal — so it re-densifies with
          the Foundation's grid like every other dimension. */}
      <div className="mx-auto w-full max-w-5xl px-6 pt-27 pb-16">
        <Tool />
      </div>
    </DemoProviders>
  )
}
