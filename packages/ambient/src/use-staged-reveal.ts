import * as React from "react"

import { StageQueueContext } from "./stage-queue"

/**
 * STAGED ARRIVAL — how every evidence block admits that it took time.
 *
 * A reasoning trace, a batch of tool calls, a list of sources: all of them
 * arrive complete in the code and would paint in one frame. Painting them
 * instantly is a small lie — it says the work was free — and it also robs the
 * reader of the one thing the block is for, which is watching the assistant
 * think.
 *
 * So every block stages the same way:
 *
 *   1. SHIMMER while there is nothing yet. The placeholder carries the
 *      ambient accent (see .ambient-shimmer), so waiting is the assistant's
 *      identity rather than generic grey.
 *   2. HOLD, because a beat of nothing is what makes the arrival read as an
 *      arrival.
 *   3. ONE AT A TIME, each item on the control motion role.
 *
 * And blocks wait for EACH OTHER: inside a response the hook claims a slot in
 * the stage queue and holds at its shimmer until every earlier block has
 * finished (see stage-queue.ts). Thinking completes, then the next block
 * works, then the answer streams — one sequence rather than a race.
 *
 * This lives in one place so the blocks cannot drift into three different
 * ideas of what waiting looks like.
 */

export interface StageOptions {
  /** How long the shimmer holds before the first item lands. */
  delay?: number
  /** Gap between items. */
  interval?: number
  /** Pass false to render settled — history is written, not replayed. */
  enabled?: boolean
  /** Bump to perform the arrival again — a re-run is a new arrival. */
  replay?: number
  /**
   * Hold the working state for at least this long, even after every item has
   * landed. Thinking that finishes in a blink reads as a lookup, not as work
   * — and because the hold is REAL, the counter measuring it stays honest.
   */
  minDuration?: number
}

/**
 * Returns how many of `count` items should be visible, and whether the block
 * is still in its shimmer. Settled when `enabled` is false, so a re-rendered
 * older message never performs its arrival again.
 */
export function useStagedReveal(count: number, options: StageOptions = {}) {
  const {
    delay = 700,
    interval = 320,
    enabled = true,
    replay = 0,
    minDuration = 0,
  } = options
  const [shown, setShown] = React.useState(enabled ? 0 : count)

  // THE QUEUE. A slot is claimed on mount, so slots are handed out in mount
  // order — which for the sibling blocks of one answer is reading order. With
  // no provider above (a /ds playground, a lone block) there is no queue and
  // the block simply stages.
  const queue = React.useContext(StageQueueContext)
  const id = React.useId()
  // Depend on the CALLBACKS, never on the queue object: its identity changes
  // every time any block registers or finishes (isTurn closes over the
  // order), so an effect keyed on it would unregister and re-register this
  // block on every change — shuffling it to the back of a line it is already
  // standing in, forever.
  const register = queue?.register
  const unregister = queue?.unregister
  React.useEffect(() => {
    if (!register || !unregister) return
    register(id)
    return () => unregister(id)
  }, [register, unregister, id])
  const waiting = enabled && Boolean(queue) && !queue!.isTurn(id)
  // running = this block's turn has come AND it stages at all
  const running = enabled && !waiting

  // A changed input starts the arrival over. Adjusted DURING render, not from
  // an effect: resetting to 0 after the fact paints one frame of the finished
  // list before the shimmer.
  const scope = `${count}|${delay}|${interval}|${running}|${replay}|${minDuration}`
  const [floorMet, setFloorMet] = React.useState(!minDuration)
  const [scopeSeen, setScopeSeen] = React.useState(scope)
  if (scope !== scopeSeen) {
    setScopeSeen(scope)
    setShown(enabled ? 0 : count)
    setFloorMet(!minDuration)
  }

  React.useEffect(() => {
    if (!running || !minDuration) return
    const id = window.setTimeout(() => setFloorMet(true), minDuration)
    return () => window.clearTimeout(id)
  }, [scope, running, minDuration])

  React.useEffect(() => {
    if (!running) return
    const timers: number[] = []
    for (let i = 0; i < count; i++) {
      timers.push(
        window.setTimeout(() => setShown(i + 1), delay + i * interval)
      )
    }
    return () => timers.forEach(window.clearTimeout)
  }, [scope, count, delay, interval, running])

  // hand the queue on the moment this block has nothing left to reveal — a
  // settled block (enabled false) was never in the running, so it yields at once
  const complete = !enabled || (shown >= count && floorMet)
  const finish = queue?.finish
  React.useEffect(() => {
    if (finish && complete) finish(id)
  }, [finish, complete, id])

  return {
    shown,
    pending: shown === 0,
    /** Holding for an earlier block. Shimmering, but not yet working. */
    waiting,
    /**
     * Actually producing something right now — its turn has come and it has
     * items left to reveal. THIS is what an elapsed counter runs on: false
     * while queued (someone else's time) and false once complete (so the
     * settled summary quotes a measurement that has stopped moving).
     */
    working: running && (shown < count || !floorMet),
  }
}

/**
 * Seconds elapsed since `active` became true, ticking once a second.
 *
 * Pass the block's WORKING flag, never just `staged`: a block held in the
 * stage queue is not working yet, and a counter that ran through the wait
 * would quote someone else's time as its own.
 *
 * The count is REAL: a trace that claims "thought for 5s" while it took two is
 * a decoration pretending to be a measurement. It freezes at the final value
 * when the work ends, which is the number the settled summary then quotes.
 */
export function useElapsedSeconds(active: boolean) {
  const [elapsed, setElapsed] = React.useState(0)
  const startedRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (!active) return
    startedRef.current = performance.now()
    const id = window.setInterval(() => {
      const started = startedRef.current
      if (started !== null) setElapsed(Math.round((performance.now() - started) / 1000))
    }, 250)
    return () => window.clearInterval(id)
  }, [active])

  return elapsed
}
