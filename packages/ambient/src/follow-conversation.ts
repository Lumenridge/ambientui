import type { AmbientConversationTurn } from "./responder"
import type { AmbientAnswer } from "./response-kit"

/**
 * THE TRANSCRIPT, FOLLOWING A THREAD THE HOST KEEPS.
 *
 * A host whose chat stack owns the conversation hands the layer a view of
 * it (`conversation` on the Ambient API). The layer's transcript is then a
 * reading of that thread: a turn the product started somewhere else shows
 * here, and a thread the product cleared is cleared here.
 *
 * What the layer already shows is kept wherever it still agrees with the
 * thread, as the same objects, so an answer that was said is not said
 * again and its earlier versions stay reachable.
 */

/** One message of the layer's transcript. */
export type TranscriptMessage = {
  id: number
  role: "user" | "assistant"
  text: string
  /**
   * Composed response-kit payloads (assistant messages). A list, not one
   * object: regenerating APPENDS a version rather than overwriting, so the
   * answer the user may have preferred is still reachable (MessageBranches).
   */
  kits?: AmbientAnswer[]
  /** The question that produced this answer, so it can be asked again. */
  prompt?: string
  /**
   * This answer has finished arriving. It survives the surface changing —
   * dragging panel → dock remounts the transcript, and without this the
   * message would perform its stream again. An answer is said once.
   */
  settled?: boolean
  /**
   * The turn failed, and this is what went wrong. An assistant message can
   * carry this alone (the first answer never arrived) or beside its kits (a
   * regenerate failed, and the earlier versions are still worth keeping).
   */
  failed?: string
  /**
   * The API is still sending this answer (a stream). The prose may catch up
   * with what has arrived, but it does not settle until this clears.
   */
  arriving?: boolean
}

const isEmpty = (answer: AmbientAnswer) =>
  !answer.text && !answer.evidence?.length && !answer.artifacts?.length

const same = (a: AmbientAnswer, b: AmbientAnswer) =>
  a === b || JSON.stringify(a) === JSON.stringify(b)

/**
 * The transcript after reading the host's thread. Returns `messages` itself
 * when nothing differs, so following a thread that has not changed renders
 * nothing.
 */
export function followConversation(
  messages: TranscriptMessage[],
  turns: readonly AmbientConversationTurn[]
): TranscriptMessage[] {
  const next: TranscriptMessage[] = []
  let changed = false
  // once a turn stops lining up with what is shown, nothing after it is reused
  let aligned = true
  const freshId = () => (next.length ? next[next.length - 1]!.id + 1 : 1)

  turns.forEach((turn, index) => {
    const shown = aligned ? messages[index] : undefined
    if (shown && shown.role !== turn.role) aligned = false
    const prev = aligned ? shown : undefined

    if (turn.role === "user") {
      if (prev && prev.text === turn.text) return void next.push(prev)
      changed = true
      aligned = false
      return void next.push({ id: freshId(), role: "user", text: turn.text })
    }

    const running = Boolean(turn.running)
    const latest = prev?.kits?.[prev.kits.length - 1]
    // a turn that failed here before the thread recorded anything
    if (prev?.failed && !prev.kits && isEmpty(turn.answer) && !running)
      return void next.push(prev)
    if (prev && latest) {
      const agrees = prev.settled
        ? latest.text === turn.answer.text
        : same(latest, turn.answer)
      if (agrees && Boolean(prev.arriving) === running)
        return void next.push(prev)
      changed = true
      return void next.push({
        ...prev,
        text: turn.answer.text,
        // a settled answer the thread replaced is a new version of it;
        // one still arriving is the same version, further along
        kits: prev.settled
          ? [...prev.kits!, turn.answer]
          : [...prev.kits!.slice(0, -1), turn.answer],
        settled: prev.settled && agrees,
        arriving: running,
      })
    }
    changed = true
    const asked = next[next.length - 1]
    next.push({
      id: prev?.id ?? freshId(),
      role: "assistant",
      text: turn.answer.text,
      kits: [turn.answer],
      prompt: asked?.role === "user" ? asked.text : undefined,
      arriving: running,
      // history the layer was not there for is written, not performed
      settled: !running,
    })
  })

  // a failure the thread never recorded stays under the question it failed
  const tail = aligned ? messages[turns.length] : undefined
  if (tail?.role === "assistant" && tail.failed && !tail.kits) next.push(tail)

  if (!changed && next.length === messages.length) return messages
  return next
}
