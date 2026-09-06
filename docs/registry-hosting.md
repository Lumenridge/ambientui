# Where the registry lives

The install commands this project prints (`npx shadcn add @ambientui/…`)
fetch JSON from one host. That host is a **Cloudflare Pages project on this
repo**, separate from the website — component installs must not depend on
the site's deploys, and after the site moves to its own repo they cannot.

## The one variable

Every URL in the published registry is built from `AMBIENTUI_REGISTRY_HOST`
(`scripts/build-registry.mjs`). The default is the Pages project's own
subdomain, `https://ambientui-registry.pages.dev`. Moving to a custom domain
later is: add the domain to the Pages project, change that one default (or
set the env var in the Pages build), run `npm run registry:build`, commit.

## The artifact

`npm run registry:build` produces `registry-dist/` (gitignored):

```
registry-dist/
  _headers      CORS for /r/* — shadcn add fetches cross-origin
  index.html    one page saying what this host is
  r/*.json      the index and one file per installable item
```

`registry.json` at the repo root stays the committed, gate-checked source
the artifact is expanded from.

## The Pages project (one-time setup)

Create a Cloudflare Pages project named **`ambientui-registry`** connected
to this repo:

- **Build command:** `npm ci && npm run build && npm run registry:build`
- **Build output directory:** `registry-dist`
- **Environment:** none required (the default host is this project's own
  subdomain; set `AMBIENTUI_REGISTRY_HOST` only when a custom domain takes
  over)

The project name matters: it is what makes `ambientui-registry.pages.dev` —
the default host baked into the committed registry — resolve.

## How we know it works

`npm run verify:install` serves `registry-dist` over localhost and runs the
real `npx shadcn add` for every door into a scratch project — the printed
commands are executed, not trusted. The nightly workflow does the same
against upstream shadcn's latest.
