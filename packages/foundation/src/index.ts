/**
 * The package's root export, in three layers a consumer can take
 * separately:
 *
 *   tokens.ts            the configuration space — data, no React
 *   foundation-context   the live provider over it
 *   ambient-bridge       binds it to the ambient layer, for hosts with both
 *
 * The split is the point: door 4 ships the space, not the assistant.
 */
export * from "./tokens"
export * from "./foundation-context"
export * from "./ambient-bridge"
