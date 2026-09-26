import type { KitResponse } from "./response-kit"
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
 * This wraps any synchronous fixture in the behaviour of a network: it takes
 * time, it can be abandoned mid-flight, and it sometimes fails. Swapping it
 * for a real responder then changes what answers, not how the layer behaves.
 *
 * THE LAYER SHIPS NO SAMPLE ANSWERS OF ITS OWN. Answers belong to the product
 * they are about: setup writes each page's sample answers next to the page
 * (start.md), and a host's demo passes its own scenarios here. Without them,
 * the mock says plainly that nothing has been set up to answer — a canned
 * answer about some other product is worse than an honest placeholder.
 *
 * A host picks which one runs; the layer never reads an environment flag:
 *
 *   const responder = import.meta.env.VITE_ASSISTANT_MOCK === "false"
 *     ? liveResponder
 *     : createMockResponder({ respond: myFixtures })
 */
export type MockResponderOptions = {
  /** The canned judgement. Defaults to the placeholder below. */
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

/**
 * What the mock says when no page and no host has taught it anything. It
 * names the two places answers come from, because the person reading it is
 * almost always the developer who has not wired them yet.
 */
export function placeholderResponse(
  _question: string,
  { pageChip }: AskContext
): KitResponse {
  const ground = pageChip?.label ?? "this page"
  return {
    text:
      `There are no sample answers for ${ground} yet, and no backend is connected. ` +
      `A page adds its own with \`setPageIntel({ respond })\`; a backend connects through ` +
      `\`<AssistantProvider respond>\`.`,
    refs: pageChip ? [{ label: pageChip.label, icon: "document" }] : [],
  }
}

export function createMockResponder({
  respond = placeholderResponse,
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

/** The default: the placeholder over a plausible network. */
export const mockResponder: AssistantResponder = createMockResponder()
