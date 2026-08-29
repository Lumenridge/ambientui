/**
 * THE ROOT ENTRY — `import { Assistant } from "ambientui"`.
 *
 * The README has been telling people to run `npm i ambientui` for a while,
 * and until now the only thing that worked afterward was a deep import.
 * `./*` covers those and still does; this covers the line someone actually
 * writes first.
 *
 * It is a barrel over the same per-module files, not a bundle: tsup builds
 * one output per source, so a consumer who imports one name still gets one
 * module's worth of code. Deep imports remain the documented form for
 * anything inside a kit.
 *
 * NO "use client" HERE. A barrel that declares it would drag every module
 * behind it across the boundary in a Next App Router app, including the
 * pure ones (stage-queue, compose-response, kit-vocabulary). Each module
 * carries its own directive, which is where the truth about it lives.
 */

export * from "./ambient-runtime"
export * from "./assistant"
export * from "./assistant-context"
export * from "./orb"
export * from "./orb-character"
export * from "./composer"
export * from "./attach-menu"
export * from "./use-attach-menu"
export * from "./ambient-marks"
export * from "./staging"
export * from "./streaming-text"

// The response seam: the kits an answer is composed from, and the queue that
// decides the order it arrives in.
export * from "./response-kit"
export * from "./message-kit"
export * from "./tool-kit"
export * from "./knowledge-kit"
export * from "./kit-vocabulary"
export * from "./compose-response"
export * from "./stage-queue"
export * from "./use-staged-reveal"
