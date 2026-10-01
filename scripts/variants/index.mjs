/**
 * THE VARIANT AXES — every way a host project can differ that changes WHAT
 * FILES we ship, as opposed to how they are configured once installed.
 *
 * The layer is written once, for the reference environment (Tailwind v4,
 * full-colour shadcn tokens, Radix primitives, the five icon libraries).
 * Every other environment is a VARIANT: the same source, rewritten at build
 * time by one module per variant, and published as its own registry item.
 * Nothing is maintained by hand in two dialects.
 *
 * An axis is one question about the host. Each has a default (the reference
 * environment, published under the plain item name) and zero or more
 * variants. A variant declares:
 *
 *   suffix     appended to the item name it produces (`ambient-layer-tw3`)
 *   label      how the docs and start.md name it
 *   detect     how a person or an agent tells the host needs it
 *   source     (text, fileName) => text, applied to .ts/.tsx files
 *   css        (text) => text, applied to shipped stylesheets
 *   check      the gate script that proves the rewrite is complete
 *
 * ADDING A VARIANT is: write the module, add it here, list the items it
 * applies to in build-registry.mjs, and give it a gate check.
 */
import { sourceToTailwind3 } from "./tailwind-v3.mjs"
import { cssToHslTokens } from "./hsl-tokens.mjs"
import { ICON_LIBRARIES } from "./icons.mjs"

/**
 * PRIMITIVES THE v3 DOOR SHIPS ITSELF. The layer uses button sizes
 * (`icon-sm`, `icon-xs`) that only shadcn's v4 button has, so the v3 door
 * carries its own copy under components/ambient/ui/ and never touches the
 * product's button.
 */
const BUNDLED_TW3 = ["button"]

/** Point the layer's imports of bundled primitives at its own copies. */
function bundlePrimitives(text, names) {
  for (const n of names) {
    text = text.replaceAll(`"@/components/ui/${n}"`, `"@/components/ambient/ui/${n}"`)
  }
  return text
}

export const AXES = {
  styling: {
    question: "Which Tailwind major does the project compile with?",
    default: { id: "tailwind-v4", label: "Tailwind v4" },
    variants: {
      "tailwind-v3": {
        suffix: "tw3",
        label: "Tailwind v3 (3.4+)",
        detect:
          "package.json has tailwindcss 3.x, and the CSS uses `@tailwind base/components/utilities` with a tailwind.config.{js,ts}",
        // v3 tokens are HSL triplets, so roles inside arbitrary values need
        // the same hsl() wrap as the stylesheet.
        source: (text, file) =>
          bundlePrimitives(cssToHslTokens(sourceToTailwind3(text, file)), BUNDLED_TW3),
        bundles: BUNDLED_TW3,
        check: "scripts/check-tailwind3.mjs",
      },
    },
  },
  tokens: {
    question: "What format are the project's shadcn colour tokens in?",
    default: {
      id: "color",
      label: "full colours (`--popover: oklch(1 0 0)`)",
    },
    variants: {
      "hsl-triplet": {
        suffix: "hsl",
        label: "HSL triplets (`--popover: 0 0% 100%`)",
        detect:
          "the token block declares bare channels (`--popover: 0 0% 100%`) and the project reads them as `hsl(var(--popover))`",
        css: cssToHslTokens,
        check: "scripts/check-tailwind3.mjs",
      },
    },
  },
  // Declared for a future Base UI or bundled-primitive variant.
  primitives: {
    question: "Which primitive library do the project's shadcn components use?",
    default: { id: "radix", label: "Radix (shadcn default)" },
    variants: {},
  },
  icons: {
    question: "Which icon library does the project use?",
    default: { id: "all", label: "all five, chosen at runtime" },
    variants: Object.fromEntries(
      Object.keys(ICON_LIBRARIES).map((lib) => [
        lib,
        { suffix: lib, label: `${lib} only`, check: "scripts/check-icons.mjs" },
      ])
    ),
  },
}

/** A variant by axis and id, or a clear failure — never a silent default. */
export function variant(axis, id) {
  const v = AXES[axis]?.variants[id]
  if (!v) throw new Error(`no ${axis} variant "${id}"`)
  return { axis, id, ...v }
}
