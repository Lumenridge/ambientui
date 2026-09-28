import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * What `npx shadcn init` writes. The fixture models a project that has
 * ALREADY run init — which is what the install docs tell people to do —
 * so a door is tested as an addition to someone's app rather than as the
 * whole of it.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
