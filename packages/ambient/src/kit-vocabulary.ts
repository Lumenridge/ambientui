/**
 * THE AMBIENT LAYER'S VOCABULARY — the fixed sets its components read from.
 *
 * These live outside the component modules for the same reason the icon names
 * do: a file that exports both a component and a value loses Fast Refresh for
 * everything importing it, and these are imported by the /ds registry as well
 * as by the components themselves.
 *
 * They are also, genuinely, data: the four orb states ARE the assistant's
 * lifecycle, and adding one is a change to the contract (DESIGN.md §8), not a
 * new constant.
 */

export type OrbState = "still" | "listening" | "thinking" | "answer"

export const ORB_STATES: OrbState[] = [
  "still",
  "listening",
  "thinking",
  "answer",
]

/** The designed cadence of each state — overridable via the speeds prop. */
export const DEFAULT_STATE_SPEEDS: Record<OrbState, number> = {
  still: 1,
  listening: 0.8,
  thinking: 2.8,
  answer: 0.5,
}

export const REASONING_EFFORTS = ["low", "medium", "high", "max"] as const
export type ReasoningEffortLevel = (typeof REASONING_EFFORTS)[number]

export const FEEDBACK_REASONS = [
  "Not factual",
  "Didn't follow instructions",
  "Too long",
  "Unsafe",
] as const
