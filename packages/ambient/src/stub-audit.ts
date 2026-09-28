/**
 * THE STUB CONTRACT, AS A TEST — proof that every question the assistant
 * offers has its own answer.
 *
 * start.md asked the installing agent to open each page and ask every
 * suggested question by hand. Two installs found that slow and unreliable:
 * each answer reveals over several seconds, a question asked mid-reveal is
 * queued, and a scripted run through 21 questions gave false fallbacks
 * (Actual). Pattern collisions went unnoticed until someone happened to ask
 * the colliding question (Invoify: "Where is my saved address book stored?"
 * routed to the reuse-a-client answer). Both installs wrote the same small
 * test instead, in minutes, and it caught what the browser check missed.
 *
 * So the layer ships that test's logic. A host calls it from its own test
 * runner with its stub handlers (or its real API, against a test server):
 *
 *   const problems = await auditAmbientApi(stubs, [{ id: "items" }, { id: "users" }])
 *   expect(problems).toEqual([])
 *
 * It checks, per page: suggestions exist; every suggestion gets a
 * contract-valid answer that is NOT the fallback and not the same as another
 * suggestion's; every follow-up an answer offers also gets a real answer;
 * and "simulate an error" fails, so the error state can be seen. No DOM, no
 * timers of its own: it runs as fast as the handlers settle.
 */
import {
  applyAnswerEvent,
  createAmbientApi,
  EMPTY_ANSWER,
  type AmbientApiHandlers,
} from "./responder"
import type { AmbientAnswer } from "./response-kit"

export type StubAuditPage = { id: string; label?: string }
export type StubAuditProblem = { page: string; question?: string; problem: string }

export type StubAuditOptions = {
  /** A question no page should match; its answer is taken as the fallback. */
  fallbackProbe?: string
  /** The question that must fail. `false` skips the error check. */
  errorProbe?: string | false
}

export async function auditAmbientApi(
  handlers: AmbientApiHandlers,
  pages: StubAuditPage[],
  options: StubAuditOptions = {}
): Promise<StubAuditProblem[]> {
  const api = createAmbientApi(handlers)
  const problems: StubAuditProblem[] = []
  const fallbackProbe = options.fallbackProbe ?? "zq audit probe that matches nothing"
  const errorProbe = options.errorProbe ?? "simulate an error"

  for (const page of pages) {
    const pageChip = { id: page.id, label: page.label ?? page.id, kind: "page" as const }
    const ask = async (question: string): Promise<AmbientAnswer> => {
      const signal = new AbortController().signal
      let answer = EMPTY_ANSWER
      for await (const event of api.ask(
        { question, conversationId: "audit", history: [], pageChip, chips: [] },
        { signal }
      )) {
        answer = applyAnswerEvent(answer, event)
      }
      return answer
    }
    const note = (problem: string, question?: string) =>
      problems.push({ page: page.id, question, problem })

    let suggestions: string[] = []
    try {
      suggestions = await api.suggestions({ pageChip }, { signal: new AbortController().signal })
    } catch (error) {
      note(`suggestions failed: ${String(error)}`)
    }
    if (suggestions.length === 0) note("offers no suggestions")

    let fallback: string | undefined
    try {
      fallback = (await ask(fallbackProbe)).text
    } catch {
      // a page without a fallback answer fails its unmatched questions
      // instead; that is a choice, not a contract breach
    }

    const seen = new Map<string, string>()
    const followUps = new Set<string>()
    const check = async (question: string, kind: "suggestion" | "follow-up") => {
      try {
        const answer = await ask(question)
        if (!answer.text.trim()) note(`${kind} gets an empty answer`, question)
        else if (fallback !== undefined && answer.text === fallback)
          note(`${kind} gets the fallback answer`, question)
        else if (kind === "suggestion") {
          const other = seen.get(answer.text)
          if (other) note(`gets the same answer as "${other}"`, question)
          else seen.set(answer.text, question)
        }
        if (kind === "suggestion") for (const f of answer.followUps ?? []) followUps.add(f)
      } catch (error) {
        note(`${kind} fails: ${String(error instanceof Error ? error.message : error)}`, question)
      }
    }
    for (const q of suggestions) await check(q, "suggestion")
    for (const f of followUps) if (!suggestions.includes(f)) await check(f, "follow-up")

    if (errorProbe !== false) {
      try {
        await ask(errorProbe)
        note(`"${errorProbe}" answered instead of failing`)
      } catch {
        // the point: the error state is reachable on demand
      }
    }
  }
  return problems
}
