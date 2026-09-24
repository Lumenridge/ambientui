import { composeResponse } from "./compose-response"
import {
  wait,
  type AskContext,
  type AssistantResponder,
  type ResponderResult,
} from "./responder"

/**
 * THE MOCK BACKEND — the canned scenarios, served the way a real one would
 * serve them.
 *
 * The layer ships no model and needs none to be demonstrated, but it must
 * never be built around a backend that answers instantly and never fails.
 * This wraps any synchronous fixture (by default the scenario router in
 * compose-response.ts) in the behaviour of a network: it takes time, it
 * can be abandoned mid-flight, and it sometimes fails. Swapping it for a
 * real responder then changes what answers, not how the layer behaves.
 *
 * A host picks which one runs; the layer never reads an environment flag:
 *
 *   const responder = import.meta.env.VITE_ASSISTANT_MOCK === "false"
 *     ? liveResponder
 *     : createMockResponder({ respond: myFixtures })
 */
export type MockResponderOptions = {
  /** The canned judgement. Defaults to the dev-tool scenario router. */
  respond?: (question: string, context: AskContext) => ResponderResult
  /** How long an answer takes, in ms: fixed, or a [min, max] range. */
  latency?: number | [number, number]
  /** 0–1: the share of turns that fail, for exercising the error path. */
  failRate?: number
  /** What a failed turn reports. */
  failWith?: string
}

/**
 * Asking the mock to fail is a scenario like any other, so the failure state
 * can be walked on purpose rather than waited for.
 */
const ASKS_FOR_FAILURE =
  /simulate (an? )?(error|failure|outage)|fail on purpose/i

export function createMockResponder({
  respond = (question, { pageChip, chips }) =>
    composeResponse(question, pageChip, chips),
  latency = [300, 800],
  failRate = 0,
  failWith = "The assistant is unreachable right now.",
}: MockResponderOptions = {}): AssistantResponder {
  return async (question, context, { signal }) => {
    const [min, max] =
      typeof latency === "number" ? [latency, latency] : latency
    await wait(min + Math.random() * (max - min), signal)
    if (ASKS_FOR_FAILURE.test(question) || Math.random() < failRate)
      throw new Error(failWith)
    return respond(question, context)
  }
}

/** The default: the scenario router over a plausible network. */
export const mockResponder: AssistantResponder = createMockResponder()
