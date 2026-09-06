# Where the registry lives

The install commands this project prints (`npx shadcn add @ambientui/…`)
fetch JSON from one host. That host is a **Cloudflare Worker on this
repo** (`wrangler.jsonc`, serving static assets), separate from the website — component installs must not depend on
the site's deploys, and after the site moves to its own repo they cannot.

## The one variable

Every URL in the published registry is built from `AMBIENTUI_REGISTRY_HOST`
(`scripts/build-registry.mjs`). The default is `https://registry.ambientui.ai`,
a subdomain of the product's own domain, attached to the Worker. Moving hosts
again is: attach the new domain, change that one default (or set the env
var), run `npm run registry:build`, commit.

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

## The Worker (one-time setup)

Create a Cloudflare Workers project from the Git integration, connected to
this repo:

- **Project name:** `ambientui-registry` (must match `wrangler.jsonc`)
- **Build command:** `npm run build && npm run registry:build`
- **Deploy command:** `npx wrangler deploy` (reads `wrangler.jsonc`, which
  points at `registry-dist/`)
- Then attach the custom domain **`registry.ambientui.ai`** on the Worker
  (Settings → Domains & Routes → Custom domain) — that is the host baked
  into the committed registry, so commands do not work until it resolves.

## How we know it works

`npm run verify:install` serves `registry-dist` over localhost and runs the
real `npx shadcn add` for every door into a scratch project — the printed
commands are executed, not trusted. The nightly workflow does the same
against upstream shadcn's latest.
