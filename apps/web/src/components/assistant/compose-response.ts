import type { ContextChip } from "./assistant-context"
import type { KitResponse } from "./response-kit"

/**
 * THE MODEL SEAM.
 *
 * Everything downstream of this function is real: the streaming, the states,
 * the objects an answer is made of. Only the composition is canned. Wiring a
 * model in replaces THIS FILE and nothing else — which is why it is a module
 * of its own rather than a function living beside the components it feeds.
 */
/** v0 composer: grounded in the attached context, honest about being canned. */
export function composeResponse(
  _question: string,
  pageChip: ContextChip | null,
  chips: ContextChip[]
): KitResponse {
  const ground = pageChip?.label ?? "this page"
  const extras =
    chips.length > 0
      ? ` plus ${chips.length} attached item${chips.length > 1 ? "s" : ""}`
      : ""
  return {
    text:
      `Grounded in ${ground}${extras}. ` +
      `This reply is the response kit composing itself end-to-end — ` +
      `thinking, streaming, settling — so the ambient states around it ` +
      `(the orb, the live border) are the real pipeline, not a mock. ` +
      `Wire a model into the composer and this text becomes the answer.`,
    refs: [
      ...(pageChip ? [{ label: pageChip.label }] : []),
      ...chips.map((c) => ({ label: c.label })),
      { label: "Response kit v0" },
    ],
  }
}
