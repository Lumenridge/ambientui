/**
 * THE ROOT ENTRY — `import { Button } from "@ambient-ui/ui"`.
 *
 * Same reasoning as the ambient package's barrel: the per-module exports
 * (`@ambient-ui/ui/components/button`) are the documented form and still
 * work, but a bare import should not be a mistake someone discovers at
 * their first line.
 *
 * NO "use client" HERE — each component carries its own directive, and a
 * barrel declaring it would pull the pure modules (utils, icon-library)
 * across the boundary with them.
 */

export * from "./components/badge"
export * from "./components/button"
export * from "./components/card"
export * from "./components/checkbox"
export * from "./components/collapsible"
export * from "./components/dropdown-menu"
export * from "./components/icon"
export * from "./components/input"
export * from "./components/section-rail"
export * from "./components/separator"
export * from "./components/sheet"
export * from "./components/sidebar"
export * from "./components/skeleton"
export * from "./components/sonner"
export * from "./components/table"
export * from "./components/tabs"
export * from "./components/tooltip"

export * from "./hooks/use-mobile"
export * from "./lib/icon-library"
export * from "./lib/utils"
