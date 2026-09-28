/**
 * `ambientui doctor` — SURVEY, THEN PLAN, THEN SAY WHAT IS IN THE WAY.
 *
 * Read-only on the host (it writes only `.ambientui/`). The output is three
 * lists in a fixed order — facts, blockers, decisions — and the plan built
 * from them. Nothing is asked: every decision is the best case the survey
 * supports, with its reason and its alternatives, and lands in
 * AMBIENTUI-NOTES.md at the end. The agent then reviews the survey against
 * the code (docs/doctor.md) and corrects the plan where it is wrong.
 *
 * `--baseline` runs the host's own typecheck/lint/test/build ONCE, before
 * anything is installed, so `verify` can tell a failure the install caused
 * from one the project already had. It never fails doctor: a host whose
 * build is already red is exactly the host that needs a baseline.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { load, openBrowser, snapshotStyles } from "../browser.mjs"
import { evidenceFor, formatEvidence } from "../survey/confidence.mjs"
import { applyOverrides, buildPlan, blockers as blockersOf } from "../plan.mjs"
import { survey } from "../survey/index.mjs"
import { readState, run, statePath, tail, writeState } from "../util.mjs"

export const registryFromEnv = () => process.env.AMBIENTUI_REGISTRY || undefined

/** The scripts a baseline runs, with a tsc fallback for typecheck. */
export function checkCommands(profile) {
  const s = profile.scripts ?? {}
  const pre = profile.packageManager?.runPrefix ?? "npm run"
  const out = []
  const script = (id) => s[id] && out.push({ id, command: `${pre} ${s[id].name}`, fromRoot: s[id].where === "root" })
  if (s.typecheck) script("typecheck")
  else if (profile.typescript?.tsconfig) {
    out.push({ id: "typecheck", command: `npx tsc --noEmit -p ${profile.typescript.tsconfig}`, fromRoot: true })
  }
  script("lint")
  script("test")
  script("build")
  return out
}

/** Run one check in the app dir with CI=1 (no watch modes, no prompts). */
export function runCheck(root, profile, check, timeoutMs) {
  const cwd = check.fromRoot ? root : join(root, profile.repo?.appDirFromRoot ?? ".")
  const r = run("sh", ["-c", check.command], { cwd, timeout: timeoutMs, env: { CI: "1", FORCE_COLOR: "0" } })
  return {
    id: check.id,
    command: check.command,
    code: r.timedOut ? null : r.code,
    timedOut: r.timedOut,
    ms: r.ms,
    tail: tail((r.stdout + "\n" + r.stderr).trim(), 40),
  }
}

export async function doctor(opts, out) {
  const root = opts.cwd
  const profile = survey(root)

  if (opts.baseline) {
    const timeout = Number(opts.timeout ?? 600) * 1000
    profile.baseline = { takenAt: new Date().toISOString(), checks: [] }
    for (const c of checkCommands(profile)) {
      out.live(`… baseline ${c.id}: ${c.command}`)
      const r = runCheck(root, profile, c, timeout)
      profile.baseline.checks.push(r)
      out.live(`${r.code === 0 ? "✔" : "✗"} baseline ${c.id} exited ${r.timedOut ? "(timed out)" : r.code} in ${Math.round(r.ms / 1000)}s`)
    }
  } else {
    // Keep a baseline taken by an earlier run; it is still the pre-install truth.
    try {
      const prev = readState(root, "profile.json")
      if (prev?.baseline) profile.baseline = prev.baseline
    } catch {
      /* an unreadable old profile is simply replaced */
    }
  }

  let urlResult = null
  if (opts.url) {
    const b = await openBrowser()
    if (!b.ok) {
      urlResult = { skipped: true, reason: b.reason, hint: b.hint }
    } else {
      try {
        const page = await b.browser.newPage()
        // Errors the product already logs, so verify blames only new ones.
        const consoleErrors = []
        page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()))
        page.on("pageerror", (e) => consoleErrors.push(String(e.message ?? e)))
        await load(page, opts.url)
        const styles = await snapshotStyles(page)
        const dir = statePath(root, "baseline")
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, "styles.json"), JSON.stringify({ schema: 1, url: opts.url, viewport: "1280x800", takenAt: new Date().toISOString(), consoleErrors, elements: styles }, null, 2) + "\n")
        await page.screenshot({ path: join(dir, "page.png"), fullPage: false })
        urlResult = { elements: Object.keys(styles).length, file: ".ambientui/baseline/styles.json" }
      } finally {
        await b.browser.close()
      }
    }
  }

  writeState(root, "profile.json", profile)

  // An owner's explicit choices and the agent's corrections persist in
  // plan.json; doctor re-plans with both, so neither is silently undone.
  let answers = {}
  let overrides = []
  try {
    const prev = readState(root, "plan.json")
    answers = prev?.given ?? {}
    overrides = prev?.overrides ?? []
  } catch {
    answers = {}
  }
  const plan = applyOverrides(buildPlan(profile, answers, { registry: registryFromEnv() }), overrides)
  writeState(root, "plan.json", { ...plan, given: answers })

  const bl = blockersOf(profile, answers)
  printFacts(profile, out)
  if (urlResult?.skipped) out.warn(`SKIPPED style baseline: ${urlResult.reason}. Run: ${urlResult.hint}`)
  else if (urlResult) out.ok(`style baseline: ${urlResult.elements} elements → ${urlResult.file}`)

  out.head("BLOCKERS")
  if (!bl.length) out.ok("none")
  for (const b of bl) out.fail(`${b.message} → ${b.fix}`)

  printDecisions(plan, out)
  printPlanSummary(plan, out)

  const next = bl.length
    ? `fix the blockers above, then run \`ambientui doctor\` again`
    : "review this survey against the code (doctor.md, beside start.md), correct the plan with `ambientui plan --set key=value --because \"…\"`, then `ambientui begin`"
  out.done({ profile, plan, blockers: bl, decisions: plan.decisions, url: urlResult }, next)
  return 0
}

/**
 * The facts, one per line — what the agent would otherwise have guessed.
 * Each line ends with its evidence (`← file:line` or a package), and a fact
 * graded low confidence says so with the reason, so it is checked, not used.
 */
export function printFacts(p, out) {
  out.head("FACTS")
  const tag = (fact, override) => {
    const e = override ?? formatEvidence(evidenceFor(p, fact))
    const c = p.confidence?.[fact]
    return `${e ? `  ← ${e}` : ""}${c?.level === "low" ? `  [low confidence: ${c.reason}]` : ""}`
  }
  const say = (mark, text, fact, override) => {
    const low = p.confidence?.[fact]?.level === "low"
    ;(low && mark === out.ok ? out.warn : mark)(`${text}${fact ? tag(fact, override) : ""}`)
  }
  const yes = (b, s, f) => say(b ? out.ok : out.fail, s, f)
  say(out.ok, `app: ${p.repo.appDirFromRoot}${p.repo.monorepo ? ` (monorepo: ${p.repo.monorepo.join(", ")})` : ""}${p.repo.alternatives.length ? `; also: ${p.repo.alternatives.join(", ")}` : ""}`, "app")
  const pm = p.packageManager
  say(pm.onPath ? out.ok : out.warn, `package manager: ${pm.name}${pm.version ? `@${pm.version}` : ""}${pm.onPath ? "" : ` — not on PATH, use \`${pm.invoke}\``}; runner: ${pm.runner}`, "packageManager")
  yes(p.git.isRepo, p.git.isRepo ? `git: ${p.git.branch ?? "(detached)"} ${p.git.clean ? "clean" : `dirty (${p.git.dirtyCount} paths)`}` : "git: not a repository", "git")
  if (p.git.ignored?.[".claude"]) out.warn(`.claude/ is gitignored — the start/governance doors land there and would not be committed  ← ${(p.evidence["git.ignored..claude"]?.[0]?.note ?? "git check-ignore").split("\t")[0]}`)
  if (p.git.ignored?.[".ambientui"]) out.warn(`.ambientui/ is gitignored — end force-adds the manifest  ← ${(p.evidence["git.ignored..ambientui"]?.[0]?.note ?? "git check-ignore").split("\t")[0]}`)
  say(out.ok, `framework: ${p.framework.name}${p.framework.router ? ` (${p.framework.router} router${p.framework.rsc ? ", RSC" : ""})` : ""}`, "framework")
  say(out.ok, `entry: ${p.entry.file ?? "?"}; root component: ${p.entry.rootComponent ?? "?"}`, "entry")
  yes(p.react && p.react.major >= 18, p.react ? `react ${p.react.version} (${p.react.source})${p.react.typesMajor ? `, @types/react ${p.react.typesMajor}` : ""}` : "react: not found", "react")
  if (p.typescript.present) say(out.ok, `typescript ${p.typescript.version ?? "?"}${p.typescript.strict ? " strict" : " (not strict)"}`, "typescript")
  say(out.ok, `module type: ${p.moduleType}; dependency convention: ${p.deps.convention}`, "moduleType")
  if (p.jest.present) say(p.jest.cjs ? out.warn : out.ok, `jest ${p.jest.config ?? ""}${p.jest.cjs ? " — CommonJS (no ESM transform)" : ""}`, "jest")
  const tw = p.styling.tailwind
  say(tw ? out.ok : out.warn, tw ? `tailwind ${tw.version} (${tw.source})${tw.config ? `, config ${tw.config}` : ""}` : "tailwind: none", "tailwind")
  say(out.ok, `global css: ${p.styling.entry ?? "not found"}${p.styling.directive ? ` (${p.styling.directive.text})` : ""}; preflight: ${p.styling.preflight ? "yes" : "no"}`, "cssEntry")
  if (p.styling.cssInJs.length) out.info(`css-in-js: ${p.styling.cssInJs.join(", ")}  ← ${p.styling.cssInJs[0]}`)
  if (p.styling.scss.files) out.info(`scss: ${p.styling.scss.files} files${p.styling.scss.dep ? " (sass)" : ""}`)
  if (p.styling.cssModules) out.info(`css modules: ${p.styling.cssModules} files`)
  for (const c of p.styling.otherTailwindConsumers) out.warn(`another Tailwind consumer: ${c.text}  ← ${c.file}:${c.line}`)
  say(out.ok, `tokens: ${p.tokens.format}${p.tokens.sample ? ` (--popover: ${p.tokens.sample.value})` : ""}${p.tokens.missing.length && p.tokens.present.length ? `; missing ${p.tokens.missing.join(", ")}` : ""}`, "tokens")
  say(out.ok, `shadcn: ${p.shadcn.componentsJson ? `${p.shadcn.componentsJson} (style ${p.shadcn.style ?? "?"})` : "no components.json"}; ui dir ${p.shadcn.uiDir}${p.shadcn.uiDirExists ? "" : " (absent)"}`, "shadcn")
  const prim = Object.entries(p.shadcn.primitives).filter(([, v]) => v).map(([k]) => k)
  if (prim.length) out.info(`existing primitives: ${prim.join(", ")}${p.shadcn.primitives.button ? ` (button icon-sm: ${p.shadcn.primitives.button.iconSm}, icon-xs: ${p.shadcn.primitives.button.iconXs})` : ""}`)
  if (p.shadcn.utils.file) out.info(`cn: ${p.shadcn.utils.file}${p.shadcn.utils.definesCn ? "" : " (no cn export)"}${p.shadcn.cnPackage ? "; `cn` npm package also a dependency" : ""}`)
  say(out.ok, `source root: ${p.srcRoot}`, "srcRoot")
  say(p.aliases.atResolves && p.aliases.bundler.hasAt && (!p.aliases.test || p.aliases.test.hasAt) ? out.ok : out.warn, `@/ alias — tsconfig: ${p.aliases.atResolves}, ${p.aliases.bundler.kind}: ${p.aliases.bundler.hasAt}${p.aliases.bundler.via ? ` (${p.aliases.bundler.via})` : ""}${p.aliases.test ? `, ${p.aliases.test.kind}: ${p.aliases.test.hasAt}` : ""}`, "aliases")
  if (p.aliases.subpathImports) out.info(`package.json "#" subpath imports: ${p.aliases.subpathImportCount}  ← ${formatEvidence(p.evidence["aliases.subpathImports"]?.[0])}`)
  for (const f of p.aliases.forbidsAt) out.warn(`@/ restricted by lint  ← ${f.file}:${f.line}`)
  say(out.ok, `env flag: ${p.env.stubFlag} (read as ${p.env.read})${p.env.alreadyDefined ? " — already defined" : ""}`, "env")
  say(out.ok, `static dir: ${p.staticDir}`, "staticDir")
  if (p.bundle.precacheLimit) out.warn(`PWA precache limit: ${p.bundle.precacheLimit.expr}${p.bundle.precacheLimit.bytes ? ` (${(p.bundle.precacheLimit.bytes / 1024 / 1024).toFixed(1)} MB)` : ""}  ← ${p.bundle.precacheLimit.file}:${p.bundle.precacheLimit.line}`)
  if (p.bundle.coep) out.warn(`COEP ${p.bundle.coep.value}  ← ${p.bundle.coep.file}:${p.bundle.coep.line}`)
  if (!p.bundle.precacheLimit && !p.bundle.coep) say(out.ok, `bundle constraints: ${p.bundle.pwa ? `PWA (${p.bundle.pwa.plugin}), no precache limit found` : "none"}`, "bundle")
  say(out.ok, `component library: ${p.componentLibrary.join(", ")}`, "componentLibrary")
  say(out.ok, `icons: ${p.icons.map((i) => `${i.id}@${i.version}${i.legacyNames ? " (pre-0.300 names)" : ""}`).join(", ") || "none"}`, "icons")
  say(out.ok, `file naming: ${p.naming.convention}`, "naming")
  say(p.darkMode.mechanism === "html-class" ? out.ok : out.warn, `dark mode: ${p.darkMode.mechanism}${p.darkMode.signal?.note ? ` (${p.darkMode.signal.note})` : ""}`, "darkMode", p.darkMode.signal?.file ? `${p.darkMode.signal.file}:${p.darkMode.signal.line}` : undefined)
  if (p.hotkeys.conflict) {
    say(out.warn, `⌘K already owned (${p.hotkeys.owners.length}):`, "hotkeys")
    for (const o of p.hotkeys.owners.slice(0, 6)) out.info(`${o.kind}: ${o.name ?? o.text ?? ""}  ← ${o.file ?? ""}${o.line ? `:${o.line}` : ""}`)
  } else say(out.ok, "⌘K: free", "hotkeys")
  say(out.ok, `z-index: max ${p.zIndex.max ?? "none"}${p.zIndex.maxAt ? ` (${p.zIndex.maxAt})` : ""}${p.zIndex.modal != null ? `; modal layer ${p.zIndex.modal} (${p.zIndex.modalAt})` : ""}${p.zIndex.outliers.length ? `; ${p.zIndex.outliers.length} outlier(s) > 1e6 ignored` : ""}`, "zIndex")
  if (p.fixedBottom.length) say(out.warn, `fixed bottom UI: ${p.fixedBottom.slice(0, 3).map((h) => `${h.file}:${h.line}`).join(", ")}${p.fixedBottom.length > 3 ? ` (+${p.fixedBottom.length - 3})` : ""}`, "fixedBottom")
  else say(out.ok, "fixed bottom UI: none found", "fixedBottom")
  if (p.i18n) say(out.ok, `i18n: ${p.i18n.lib}${p.i18n.count ? `, ${p.i18n.count} locales` : " (locale files not found in the app)"}${p.i18n.rtl.length ? `, RTL: ${p.i18n.rtl.join(", ")}` : ""}`, "i18n")
  else say(out.ok, "i18n: none", "i18n")
  const net = [...p.network.clients, ...p.network.transports.map((t) => (t.module ? `${t.kind} (${t.module})` : t.kind))]
  say(out.ok, `network: ${net.join(", ") || "none"}${p.network.helper ? `; helper ${p.network.helper.name}()` : p.network.wrapper ? `; busiest fetch module ${p.network.wrapper}` : ""}`, "network")
  const auth = Object.entries(p.network.auth ?? {}).filter(([, v]) => v).map(([k, v]) => (typeof v === "string" ? `${k} ${v}` : `${k} ← ${v.file}:${v.line}`))
  if (auth.length) out.info(`auth: ${auth.join("; ")}`)
  say(out.ok, `ai engine: ${p.ai.kind}${[...p.ai.sdk, ...p.ai.provider, ...p.ai.envNames].length ? ` (${[...p.ai.sdk, ...p.ai.provider, ...p.ai.envNames].join(", ")})` : ""}`, "ai")
  say(out.ok, `tests: ${p.tests.runners.join(", ") || "none"}${p.tests.vrt ? `; visual regression: ${p.tests.vrt}` : ""}`, "tests")
  const lints = ["eslint", "oxlint", "biome", "prettier", "oxfmt"].filter((k) => p.lint[k])
  say(out.ok, `lint/format: ${lints.join(", ") || "none"}${p.lint.reactHooks ? " (+react-hooks)" : ""}${p.lint.checkerOverlay ? "; vite-plugin-checker overlay" : ""}`, "lint")
  for (const h of p.lint.agentHooks) out.warn(`agent hook autofixes on edit: ${h.command}  ← ${h.file}:${h.line ?? "?"}`)
  const ag = [["claudeMd", "CLAUDE.md"], ["agentsMd", "AGENTS.md"], ["designMd", "DESIGN.md"]].filter(([k]) => p.agent[k]).map(([, f]) => f)
  say(out.ok, `agent config: ${ag.join(", ") || "none"}${p.agent.claudeSkills ? "; .claude/skills" : ""}${p.agent.agentsSkills ? "; .agents/skills" : ""}`, "agent")
  say(out.ok, `product name: ${p.product.name ?? "?"}`, "product")
  const sc = ["typecheck", "lint", "test", "build", "dev"].filter((k) => p.scripts[k]).map((k) => `${k}=${p.scripts[k].name}${p.scripts[k].where === "root" ? " (root)" : ""}`)
  say(out.ok, `scripts: ${sc.join(", ") || "none"}; dev port ${p.scripts.port ?? "?"}`, "scripts")
  if (p.existingInstall.present) say(out.warn, `an earlier ambientui install is present: ${p.existingInstall.paths.join(", ")}`, "existingInstall")
  if (p.baseline) for (const c of p.baseline.checks) (c.code === 0 ? out.ok : out.warn)(`baseline ${c.id}: exit ${c.timedOut ? "timeout" : c.code}  ← ${c.command}`)
}

/** The decisions made for the owner, each with its reason and alternatives. */
export function printDecisions(plan, out) {
  out.head("DECISIONS (made for the owner; all recorded in AMBIENTUI-NOTES.md)")
  if (!plan.decisions?.length) out.ok("none needed")
  for (const d of plan.decisions ?? []) {
    const chosen = d.options.find((o) => o.value === d.chosen)
    out.ok(`[${d.id}] ${d.chosen}${chosen ? `: ${chosen.label}` : ""}${d.source === "owner" ? " (the owner's choice)" : ""}`)
    out.info(d.why)
    const others = d.options.filter((o) => o.value !== d.chosen).map((o) => o.value)
    if (others.length) out.info(`alternatives: ${others.join(", ")} — reinstall with \`ambientui plan --${d.id} <value>\``)
  }
  for (const o of plan.overrides ?? []) out.warn(`corrected by the agent: ${o.key} = ${JSON.stringify(o.value)}${o.because ? ` — ${o.because}` : ""}`)
}

export function printPlanSummary(plan, out) {
  out.head(`PLAN (${plan.path === "full" ? "full design architecture" : "ambient layer only"})`)
  for (const s of plan.requiredSteps) out.warn(`required: ${s.title}${s.file ? ` (${s.file})` : ""}`)
  out.ok(`doors: ${plan.doors.join(" → ")}`)
  out.ok(`css: ${plan.css.mode} — ${plan.css.where}`)
  for (const l of plan.css.lines) out.info(l)
  out.ok(`env flag: ${plan.envFlag.name} → ${plan.envFlag.read}`)
  const pv = plan.provider
  out.ok(
    `provider: productName="${pv.productName}", hotkey=${JSON.stringify(pv.hotkey)}${pv.zIndex != null ? `, zIndex=${pv.zIndex}` : ""}${pv.defaultOrbAnchor ? `, defaultOrbAnchor="${pv.defaultOrbAnchor}"` : ""}${pv.dark !== "html-class" ? `, dark=<mirror ${pv.dark?.mirror ?? pv.dark}>` : ""}`
  )
  out.ok(`mount: ${plan.mount.file ?? "?"}${plan.mount.lazy ? " (lazy)" : ""}`)
  out.ok(`transport: ${plan.transport.kind}`)
  // ADAPT: what install changes in the landed files, for this product
  for (const a of plan.adapt ?? []) {
    const what =
      a.id === "accent" && !a.skip ? `accent → ${a.value}` : a.id === "orb-assets" ? `orb artwork → ${a.to}/` : a.id
    ;(a.skip ? out.info : out.ok)(`adapt: ${a.skip ? `${a.id} (kept as is)` : what} — ${a.why}${a.evidence ? `  ← ${a.evidence}` : ""}`)
  }
  for (const e of plan.aliasEdits) out.warn(`alias: ${e.where} ${e.file ?? ""}${e.note ? ` — ${e.note}` : ""}`)
  for (const w of plan.warnings) out.warn(w)
}

