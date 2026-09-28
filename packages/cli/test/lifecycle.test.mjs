/**
 * BEGIN → INSTALL → END → VERIFY → UNINSTALL, WITHOUT THE NETWORK.
 *
 * The real install runs the shadcn CLI against the registry; here the plan's
 * commands are replaced by one shell line that does what the CLI does wrong
 * — overwrites the product's button, and lands the layer at `<app>/components`
 * while `@/` points at `./src`. The test then holds install to its promises
 * (restore, move), end to its commit (by name, with the trailer), and
 * uninstall to its revert.
 */
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { after, describe, it } from "node:test"

import { begin } from "../src/commands/begin.mjs"
import { doctor } from "../src/commands/doctor.mjs"
import { end } from "../src/commands/end.mjs"
import { install } from "../src/commands/install.mjs"
import { uninstall } from "../src/commands/uninstall.mjs"
import { verify } from "../src/commands/verify.mjs"
import { readState, writeState } from "../src/util.mjs"

/** An output sink that records instead of printing. */
function sink() {
  const lines = []
  const push = (p) => (s) => lines.push(`${p}${s}`)
  return {
    json: false,
    lines,
    ok: push("✔ "),
    fail: push("✗ "),
    warn: push("! "),
    ask: push("? "),
    info: push("  "),
    head: push(""),
    raw: push(""),
    live: push(""),
    done(result, next) {
      this.result = result
      this.next = next
    },
  }
}

const BUTTON = 'export const Button = () => <button className="the-products-own" />\n'

const dir = mkdtempSync(join(tmpdir(), "ambientui-life-"))
after(() => rmSync(dir, { recursive: true, force: true }))
const files = {
  "package.json": JSON.stringify({ name: "shop", type: "module", dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" }, devDependencies: { tailwindcss: "^4.1.0", vite: "^7" } }),
  "vite.config.ts": 'export default { resolve: { alias: { "@": "./src" } } }\n',
  "tsconfig.json": JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } }, include: ["src"] }),
  "components.json": JSON.stringify({ aliases: { ui: "@/components/ui", utils: "@/lib/utils" } }),
  "index.html": '<title>Shop</title><script type="module" src="/src/main.tsx"></script>',
  "src/main.tsx": 'import "./index.css"\n',
  "src/index.css": '@import "tailwindcss";\n:root { --popover: oklch(1 0 0); }\n',
  "src/components/ui/button.tsx": BUTTON,
  "src/lib/utils.ts": "export function cn() {}\n",
}
for (const [p, c] of Object.entries(files)) {
  mkdirSync(dirname(join(dir, p)), { recursive: true })
  writeFileSync(join(dir, p), c)
}
const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" })
git("init", "-q")
git("config", "user.email", "t@t")
git("config", "user.name", "t")
git("add", "-A")
git("commit", "-qm", "base")

describe("the install lifecycle", () => {
  it("doctor writes profile and plan under .ambientui/ only", async () => {
    const code = await doctor({ cwd: dir }, sink())
    assert.equal(code, 0)
    assert.equal(readState(dir, "profile.json").schema, 1)
    assert.deepEqual(readState(dir, "plan.json").doors.slice(0, 1), ["start"])
    assert.equal(git("status", "--porcelain", "--", ".", ":(exclude).ambientui").trim(), "")
  })

  it("begin records the base; install restores the button and moves misplaced files", async () => {
    const plan = readState(dir, "plan.json")
    const { schema, ...rest } = plan
    void schema
    writeState(dir, "plan.json", {
      ...rest,
      // the product serves static files from static/, not public/
      staticDir: "static",
      adapt: [
        { id: "strip-use-client", dir: "src/components/ambient", why: "vite" },
        { id: "orb-assets", to: "static", why: "served from static/" },
      ],
      commands: [
        {
          cwd: ".",
          door: "fake-layer",
          run: "mkdir -p components/ambient styles && printf '\"use client\"\\n\\nexport const Assistant = 1\\n' > components/ambient/assistant.tsx && echo '.ambient-glass{}' > styles/ambient.css && echo CLOBBERED > src/components/ui/button.tsx && mkdir -p public && echo '<svg/>' > public/orb-circle.svg",
        },
      ],
    })
    assert.equal(await begin({ cwd: dir }, sink()), 0)
    const o = sink()
    assert.equal(await install({ cwd: dir }, o), 0)
    assert.equal(readFileSync(join(dir, "src/components/ui/button.tsx"), "utf8"), BUTTON, "the product's button is restored")
    assert.deepEqual(o.result.restored, ["src/components/ui/button.tsx"])
    assert.ok(existsSync(join(dir, "src/components/ambient/assistant.tsx")), "moved under the source root")
    assert.ok(existsSync(join(dir, "src/styles/ambient.css")))
    assert.ok(!existsSync(join(dir, "components/ambient/assistant.tsx")))
    assert.ok(existsSync(join(dir, "static/orb-circle.svg")), "orb artwork moved to the served static dir")
    assert.equal(readFileSync(join(dir, "src/components/ambient/assistant.tsx"), "utf8"), "export const Assistant = 1\n", '"use client" stripped')
    assert.ok(!existsSync(join(dir, "public/orb-circle.svg")))
  })

  it("verify --static-only: placement and primitives pass; the missing mount fails loudly", async () => {
    const o = sink()
    const code = await verify({ cwd: dir, staticOnly: true, noScripts: true }, o)
    const by = Object.fromEntries(o.result.checks.map((c) => [c.id, c.status]))
    assert.equal(by.placement, "PASS")
    assert.equal(by.primitives, "PASS")
    assert.equal(by.mount, "FAIL")
    assert.equal(by.runtime, "SKIPPED")
    assert.equal(code, 1)
  })

  it("end --commit commits exactly the install's files with the trailer", async () => {
    const o = sink()
    assert.equal(await end({ cwd: dir, commit: true }, o), 0)
    const m = readState(dir, "manifest.json")
    assert.deepEqual(m.files.added, ["src/components/ambient/assistant.tsx", "src/styles/ambient.css", "static/orb-circle.svg"])
    assert.equal(m.commitTrailer, "Ambientui-Install: 1")
    const msg = git("log", "-1", "--format=%B")
    assert.match(msg, /Ambientui-Install: 1/)
    const changed = git("show", "--name-only", "--format=", "HEAD").trim().split("\n").sort()
    assert.deepEqual(changed, [".ambientui/.gitignore", ".ambientui/manifest.json", ".ambientui/plan.json", ".ambientui/profile.json", "src/components/ambient/assistant.tsx", "src/styles/ambient.css", "static/orb-circle.svg"].sort())
  })

  it("uninstall reverts the install commit", async () => {
    const dry = sink()
    assert.equal(await uninstall({ cwd: dir, dryRun: true }, dry), 0)
    assert.equal(dry.result.commits.length, 1)
    assert.equal(await uninstall({ cwd: dir }, sink()), 0)
    assert.ok(!existsSync(join(dir, "src/components/ambient/assistant.tsx")))
    assert.match(git("log", "-1", "--format=%s"), /^Revert/)
  })
})
