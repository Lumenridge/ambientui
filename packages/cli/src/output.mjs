/**
 * TWO READERS, ONE REPORT. `--json` prints one JSON document on stdout for
 * the agent; otherwise the person gets short prefixed lines:
 *
 *   ✔  true / done / passed        ✗  false / failed / blocked
 *   !  worth attention             ?  a question for the owner
 *
 * Every report ends with one "Next: …" command so the agent never has to
 * guess the next step.
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
