/**
 * TWO READERS, ONE REPORT. The CLI is driven by an AI agent and read by a
 * person, often in the same terminal. `--json` gives the agent one JSON
 * document on stdout and nothing else; without it, the person gets short
 * lines, one fact each, prefixed so the eye can sort them:
 *
 *   ✔  true / done / passed        ✗  false / failed / blocked
 *   !  worth attention             ?  a question for the owner
 *
 * Every human report ends with ONE "Next: …" line naming the command to run
 * next, because an agent that finishes a step without knowing the next one
 * improvises, and improvising is what this tool replaces.
 */
export function createOutput({ json = false } = {}) {
  const lines = []
  const out = {
    json,
    ok: (s) => lines.push(`✔ ${s}`),
    fail: (s) => lines.push(`✗ ${s}`),
    warn: (s) => lines.push(`! ${s}`),
    ask: (s) => lines.push(`? ${s}`),
    info: (s) => lines.push(`  ${s}`),
    head: (s) => lines.push("", s),
    raw: (s) => lines.push(s),
    /** Stream a line now (install progress), not at the end. */
    live: (s) => {
      if (!json) process.stdout.write(s + "\n")
      else process.stderr.write(s + "\n")
    },
    /** Flush: the human lines plus Next, or the JSON document. */
    done(result, next) {
      if (json) {
        process.stdout.write(JSON.stringify({ ...result, next: next ?? null }, null, 2) + "\n")
      } else {
        const body = lines.join("\n").replace(/^\n+/, "")
        if (body) process.stdout.write(body + "\n")
        if (next) process.stdout.write(`\nNext: ${next}\n`)
      }
    },
  }
  return out
}
