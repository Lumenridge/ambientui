/**
 * ONE ICON LIBRARY — `icon.tsx` cut down to the library the host already
 * uses, plus HugeIcons (the layer draws a few marks with it directly).
 *
 * The full `icon` item depends on all five libraries so the Foundation can
 * switch live; a host taking only the ambient layer never switches, so it
 * gets one library instead of four unused packages.
 *
 * icon.tsx keeps one import block, one renderer helper and one SETS entry
 * per library; this module removes the blocks of the libraries not kept.
 */

/** Per library: its packages, its SETS key, and the renderer helper it uses. */
export const ICON_LIBRARIES = {
  hugeicons: { packages: ["@hugeicons/core-free-icons", "@hugeicons/react"], set: "hugeicons", helper: "hi" },
  lucide: { packages: ["lucide-react"], set: "lucide", helper: "lu" },
  tabler: { packages: ["@tabler/icons-react"], set: "tabler", helper: "tb" },
  phosphor: { packages: ["@phosphor-icons/react"], set: "phosphor", helper: "ph" },
  remix: { packages: ["@remixicon/react"], set: "remix", helper: "rx" },
}

/** Helpers that are defined in terms of another (`const tb = lu`). */
const HELPER_NEEDS = { tb: ["lu"] }

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")

/**
 * Keep `library` only; drop the rest, and make it the fallback, so <Icon>
 * draws it with no IconLibraryProvider (the context's default names
 * hugeicons, which is no longer in SETS). The layer's own direct HugeIcons
 * marks keep that package installed either way. Throws if a block it
 * expects is missing, so a reshaped icon.tsx fails the build instead of
 * publishing a half-cut file.
 */
export function iconSourceFor(library, text) {
  if (!ICON_LIBRARIES[library]) throw new Error(`unknown icon library ${library}`)
  const keep = new Set([library])
  const helpers = new Set([...keep].map((l) => ICON_LIBRARIES[l].helper))
  for (const h of [...helpers]) for (const need of HELPER_NEEDS[h] ?? []) helpers.add(need)

  let out = text
  const cut = (re, what) => {
    if (!re.test(out)) throw new Error(`icon.tsx no longer has ${what}; update scripts/variants/icons.mjs`)
    out = out.replace(re, "")
  }

  for (const [name, lib] of Object.entries(ICON_LIBRARIES)) {
    if (keep.has(name)) continue
    for (const pkg of lib.packages) {
      cut(new RegExp(`^import \\{[^}]*\\} from "${escape(pkg)}"\\n`, "m"), `an import from ${pkg}`)
    }
    cut(new RegExp(`^  ${lib.set}: \\{\\n[\\s\\S]*?^  \\},?\\n`, "m"), `a SETS.${lib.set} block`)
  }
  for (const lib of Object.values(ICON_LIBRARIES)) {
    if (helpers.has(lib.helper)) continue
    // `const tb = lu` on one line, or a multi-line arrow ending at a blank line
    const oneLine = new RegExp(`^const ${lib.helper} = \\w+\\n`, "m")
    if (oneLine.test(out)) out = out.replace(oneLine, "")
    else cut(new RegExp(`^const ${lib.helper} =\\n[\\s\\S]*?\\n(?=const |\\n)`, "m"), `the ${lib.helper} helper`)
  }
  const fallback = "?? SETS.hugeicons!"
  if (!out.includes(fallback)) throw new Error("icon.tsx no longer falls back to SETS.hugeicons")
  return out.replace(fallback, `?? SETS.${ICON_LIBRARIES[library].set}!`)
}
