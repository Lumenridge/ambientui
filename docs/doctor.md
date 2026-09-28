# Reviewing the doctor

`ambientui doctor` surveys the project with fixed checks: file patterns,
dependency names, config keys. It is fast and it cites its evidence, but it
only sees what it was written to look for. You can read the code. This page
is how you check the survey in spirit before anything is installed, and
correct the plan where the survey is wrong or missed something.

Do this after `doctor` and before `begin`. It takes a few minutes, and it
is not optional: every install so far had at least one thing no fixed
check would have found.

## How to review

1. **Read the doctor's output top to bottom.** Every fact ends in its
   evidence (`← file:line` or a package). Facts marked
   `[low confidence: …]` are guesses. Check every one of them.
2. **Open the evidence for anything the plan depends on.** Look at the
   file, not just the line: the mount point, the global stylesheet, the
   network helper, the hotkey owners, the dark-mode signal.
3. **Then look for what the survey cannot see**, using the list below.
4. **Correct the plan** for each thing that is wrong, one key at a time,
   always with the reason:

   ```bash
   npx -y @ambient-ui/cli plan --set provider.zIndex=10200 --because "CaptureHost sits at 10100; the 'modal layer' guess was a date picker"
   ```

   Keys are paths into `.ambientui/plan.json` (`provider.zIndex`,
   `provider.productName`, `mount.file`, `mount.lazy`, `css.entry`,
   `transport.kind`, `envFlag.name`, …). Corrections survive later doctor
   runs, and each one is written into the developer notes with its reason.
5. **Record anything you will do differently from the plan** as you do it
   (`ambientui note`, below).

Do not ask the owner anything here. The doctor decides, you verify and
correct, and the notes tell the owner afterwards what was chosen and how
to choose differently.

## What the survey cannot see

**Where the app really starts.** The doctor picks the root component from
the entry file. Check that it renders inside the router and the product's
providers (auth, theme, query client). If it renders before them, the
layer cannot navigate or read the theme: set `mount.file` to the layout
that sits inside them.

**Command palettes that are not ⌘K.** The survey finds `cmdk`, `kbar` and
handlers near `metaKey` + `k`. Look for a product search, a "/" shortcut, a
command menu built by hand, or a keyboard-shortcut library with its own
registry. If the product already has a palette, the layer's spotlight
should not become a second one silently: note what exists.

**An AI feature the product already has.** A chat sidebar, a "summarize"
button, an AI route. The assistant should sit behind the same backend and
model, not beside it. Check `transport.kind` against what you find, and
correct it.

**How requests really authenticate.** The survey sees `credentials`, CSRF
headers and 401 handling in one or two files. Read the product's own API
helper: base path, headers, refresh, error shape. The assistant's calls
must go through it.

**The product's own design system.** Tokens that are not shadcn's names
(`--brand-500`, a theme object in CSS-in-JS), a component library the
survey did not name, a DESIGN.md or Storybook. On the layer-only path the
layer still reads shadcn's roles, so check that `--primary` (and the rest)
exist or will be supplied, and that they match what the product actually
shows.

**Dark mode that is decided in JavaScript.** A preference store, a
`useTheme` hook, a system-follow setting. If `provider.dark` is a mirror,
find the exact value to pass.

**Where the language comes from.** The survey finds the i18n library and
the locale files. Check where the ACTIVE locale lives at runtime (a hook,
a route segment like `app/[locale]/`, a store, `<html lang>`) and that the
plan's `i18n.locale` line reads it from there; correct it if not. A
custom loader with no library is common: find its `t` and its files.

**Layering.** Sticky headers, toasts, modals, a cookie banner, an intercom
widget: anything fixed or high in the z-index order. The survey guesses
the modal layer from nearby words. Find the real values, and set
`provider.zIndex` above the product's chrome and below its modals.

**Fixed UI at phone width.** Bottom bars, floating action buttons, chat
widgets. The survey searches class names; verify measures it at 375px
later. If you can see one now, set `provider.defaultOrbAnchor` ("mr").

**Build, test and lint hooks the survey missed.** A pre-commit hook, an
agent hook that runs a formatter on every edit, a CI step that fails on
new files without licence headers, a bundle-size budget. Each can reject
the install after it lands.

**Anything that makes the project unusual.** A monorepo layout it did not
understand, a second app, generated code, a framework it named wrongly.
If a fact is wrong, correct the plan; if the plan cannot express it,
proceed by hand and note it.

## When the plan cannot do it

Doing something by hand is allowed. The point of this install is for the
owner to see ambientui working in their product before committing to it.
A best-effort layer they can press ⌘K in is worth more than a stop and a
question. Take the closest workable path, keep it reversible (everything
stays inside the install commit), and record it the moment you do it:

```bash
npx -y @ambient-ui/cli note "Mounted in src/Shell.tsx, not App.tsx: App renders outside the router" --kind judgement
npx -y @ambient-ui/cli note "Wired ask() to the existing /api/chat route by hand; the plan saw no AI backend" --kind manual
npx -y @ambient-ui/cli note "No design tokens exist; the layer uses ambientui's neutral roles" --kind unavailable
```

`ambientui end` writes these, with the doctor's decisions and your
corrections, into `AMBIENTUI-NOTES.md`. When anything strayed from the
happy path, that file recommends the owner try the layer, then uninstall
and reinstall with the right options chosen on purpose.

## Done when

- Every low-confidence fact the plan depends on is confirmed or corrected.
- The list above is checked, and each finding is either a correction
  (`plan --set`) or a note.
- `ambientui plan` prints the plan you intend to run.

Then run `ambientui begin`.
