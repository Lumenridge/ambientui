# Fixtures

Small throwaway React apps that stand in for "somebody else's product".
Nothing here is shipped or run in production. They exist so the install can
be tested for real, in a project that is not this repo.

`npm run verify:install` (`scripts/verify-install.mjs`) copies a fixture to a
temp folder, installs its dependencies, serves the freshly built registry on
localhost, runs the real `npx shadcn add @ambientui/<door>` for each door,
then typechecks and builds the result and checks what landed. The CLI's tests
(`packages/cli/test`) also run the doctor against these folders.

Each fixture is a product shape the install supports:

| Fixture | Shape | Proves |
|---|---|---|
| `consumer` | Vite, React 19, Tailwind v4, shadcn initialised (full-colour tokens) | The reference environment: every door, including the Foundation, installs and builds |
| `consumer-tw3` | Tailwind v3.4 with `tailwind.config.js`, `tailwindcss-animate`, shadcn's v3 token block (HSL triplets) | `ambient-layer-tw3` and `ambient-styles-hsl`: the layer works without a Tailwind upgrade, and its rewritten classes reach the built CSS |
| `consumer-react18` | `consumer` on React 18 with React 18's own types | The layer compiles on React 18 |
| `consumer-bare` | No shadcn, no `lib/utils`, no token block, and Tailwind without its global reset | `ambient-base` gives the layer what it needs, and the built CSS contains no global reset rule, so the product's own screens are untouched |

Rules for a fixture:

- Start where a real product starts: what `npm create`, `shadcn init` or the
  product's own setup would leave, nothing more.
- Import nothing from ambientui. What the doors add is what gets tested;
  `verify-install.mjs` mounts the layer itself where a door says `mount: true`.
- `components.json` maps `@ambientui` to `{REGISTRY_HOST}`, a placeholder the
  script replaces, so no localhost URL is ever committed.
- A new fixture earns its place by a product shape the others do not cover.
  Say which, in the table.
