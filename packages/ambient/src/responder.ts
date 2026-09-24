import type { ContextChip } from "./assistant-context"
import type { KitResponse } from "./response-kit"

/**
 * THE RESPONDER — the one shape everything that answers takes.
 *
 * A page answering for its own material, the host's backend, a model, and the
 * mock that stands in for all three are the same function: a question and
 * what the person is looking at in, a KitResponse out. `null` means "not
 * mine" and hands the question to the next responder in line.
 *
 * IT MAY BE ASYNC, AND THAT IS THE POINT. The seam used to be synchronous,
 * which meant a host with a real backend could not reach it without forking
 * the assistant. A sync responder still works unchanged; a Promise is simply
 * awaited. The signal is aborted when the person presses Stop or a newer turn
 * replaces this one — pass it to `fetch` and the request dies with the turn.
 */
export type AskContext = {
  pageChip: ContextChip | null
  chips: ContextChip[]
}

export type AskOptions = {
  signal: AbortSignal
}

export type ResponderResult = KitResponse | null | undefined

export type AssistantResponder = (
  question: string,
  context: AskContext,
  options: AskOptions
) => ResponderResult | Promise<ResponderResult>

/**
 * Ask each responder in order; the first answer wins. Absent responders are
 * skipped, so a caller can pass optional ones straight through.
 */
export async function resolveResponse(
  responders: (AssistantResponder | null | undefined)[],
  question: string,
  context: AskContext,
  options: AskOptions
): Promise<KitResponse> {
  for (const responder of responders) {
    if (!responder) continue
    options.signal.throwIfAborted()
    const answer = await responder(question, context, options)
    if (answer) return answer
  }
  throw new Error("Nothing here can answer that yet.")
}

/** A pause that ends early, as a rejection, when the turn is abandoned. */
export function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

/** What a failed turn says, when the error has anything worth saying. */
export function failureDetail(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return "The assistant could not answer."
}
