import registry from "../../../../registry.json"

/**
 * WHAT THE REGISTRY ACTUALLY SHIPS — read from the built registry, never
 * composed from a component id.
 *
 * A page that prints `npx shadcn add @ambientui/<id>` for every documented
 * component would confidently hand out commands that 404: `command-palette`
 * is documented and deliberately not installable, and the eighteen product
 * entries are shadcn's own primitives. The registry knows which is which;
 * this asks it.
 */
type RegistryItem = { name: string; meta?: { vocabulary?: string } }
const items = (registry as { items: RegistryItem[] }).items

export const REGISTRY_HOST = (registry as { homepage: string }).homepage

const installable = new Set(items.map((i) => i.name))

export function installCommandFor(id: string): string | null {
  return installable.has(id) ? `npx shadcn add @ambientui/${id}` : null
}

export const INSTALLABLE_COMPONENTS = items.filter(
  (i) => i.meta?.vocabulary === "ambient"
).length
