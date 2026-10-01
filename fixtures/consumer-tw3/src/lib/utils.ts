import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** What `npx shadcn init` writes. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
