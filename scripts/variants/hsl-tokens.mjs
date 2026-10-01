/**
 * THE HSL-TRIPLET TOKEN FORMAT — the layer's material for a project whose
 * shadcn tokens are bare HSL channels (`--popover: 0 0% 100%`, read by the
 * project as `hsl(var(--popover))`).
 *
 * `ambient.css` mixes the standard roles inside `color-mix()`, and a triplet
 * is not a colour, so every mix would resolve to transparent. The rewrite
 * wraps each standard role in `hsl()`. The list is shadcn's
 * token set and nothing else: `--ambient-*`, `--glass-*` and `--positive`
 * are this system's own tokens, declared as full colours in every format.
 */
export const SHADCN_ROLES = [
  "background", "foreground",
  "card", "card-foreground",
  "popover", "popover-foreground",
  "primary", "primary-foreground",
  "secondary", "secondary-foreground",
  "muted", "muted-foreground",
  "accent", "accent-foreground",
  "destructive", "destructive-foreground",
  "border", "input", "ring",
  "sidebar", "sidebar-background", "sidebar-foreground",
  "sidebar-primary", "sidebar-primary-foreground",
  "sidebar-accent", "sidebar-accent-foreground",
  "sidebar-border", "sidebar-ring",
]

const ROLE = new RegExp(`var\\(--(${SHADCN_ROLES.join("|")})\\)`, "g")

export function cssToHslTokens(text) {
  return text.replace(ROLE, "hsl(var(--$1))")
}
