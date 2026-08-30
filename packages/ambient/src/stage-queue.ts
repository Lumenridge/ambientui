"use client"

import * as React from "react"

/**
 * THE ONE ORDERING RULE: an answer arrives in sequence, never all at once.
 *
 * Thinking finishes, THEN the next block does its work, THEN the prose
 * streams. Before this, every staged block ran its own private timer, so a
 * reasoning panel, a tool call and the answer text all raced — the sentence
 * explaining the work appeared while the work was still visibly spinning.
 * That reads as theatre, because it is: nothing was waiting on anything.
 *
 * The queue is a strict order, not a schedule. Each staged block claims a
 * slot in mount order and is held at its shimmer until every slot before it
 * has reported finished. `useStagedReveal` does the claiming, so a block
 * inherits the rule by being staged at all — there is nothing for an
 * individual block to remember, and nothing it can opt out of by accident.
 *
 * Outside a provider (a /ds playground, a lone block) `isTurn` is never
 * consulted and blocks stage immediately, which is the right behavior for a
 * block standing on its own.
 */

export type StageQueue = {
  register: (id: string) => void
  unregister: (id: string) => void
  finish: (id: string) => void
  /** True once every block that registered before `id` has finished. */
  isTurn: (id: string) => boolean
}

export const StageQueueContext = React.createContext<StageQueue | null>(null)

/**
 * Held by whatever owns the sequence (ResponseBlock). `settled` is the gate
 * for what comes AFTER the queue — the answer text waits on it.
 *
 * `expected` is how many blocks the owner actually rendered, and the gate is
 * counted against THAT rather than against the registration list. The list is
 * built from mount effects, so anything that perturbs it — a remount, a block
 * that leaves — could otherwise leave the gate waiting on a slot nobody is
 * standing in. The owner's count cannot drift: it is the array it mapped.
 */
export function useStageQueue(expected = 0) {
  // arrays, not Sets: the order IS the data, and a new array per change is
  // what makes `isTurn` recompute for the blocks waiting on it
  const [order, setOrder] = React.useState<string[]>([])
  const [done, setDone] = React.useState<string[]>([])

  const register = React.useCallback((id: string) => {
    setOrder((o) => (o.includes(id) ? o : [...o, id]))
  }, [])

  const unregister = React.useCallback((id: string) => {
    // a block that leaves must not hold the queue behind it forever
    setOrder((o) => o.filter((x) => x !== id))
    setDone((d) => d.filter((x) => x !== id))
  }, [])

  const finish = React.useCallback((id: string) => {
    setDone((d) => (d.includes(id) ? d : [...d, id]))
  }, [])

  const isTurn = React.useCallback(
    (id: string) => {
      const i = order.indexOf(id)
      // not registered yet: hold at the shimmer rather than jumping the line
      if (i < 0) return false
      return order.slice(0, i).every((x) => done.includes(x))
    },
    [order, done]
  )

  const queue = React.useMemo(
    () => ({ register, unregister, finish, isTurn }),
    [register, unregister, finish, isTurn]
  )

  return {
    queue,
    /** As many blocks have finished as the owner put in. */
    settled: expected > 0 && done.length >= expected,
  }
}
