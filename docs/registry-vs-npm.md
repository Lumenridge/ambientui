# Registry or npm

There are two ways to get ambientui, and they are not two package formats for
the same thing. They differ in who owns the code afterward, which is the only
question that actually matters here.

## The short version

**Use the registry if you will restyle it.** Which, given what this project
argues, is most people. `npx shadcn add` copies real source files into your
repo. They become yours: your imports, your conventions, your git history, your
edits. Nothing upgrades them, and nothing needs to.

**Use npm if you want upgrades and will not touch it.** `npm i ambientui`
gives you a versioned dependency that you import and configure through props.
You get fixes by bumping a number. You cannot change the inside.

> The npm route is described here so the choice is understood, but the first
> release has not been published yet. Until it ships, the registry is the only
> door that opens.

## Why the registry is the default here

The layer's whole claim is that an assistant should be built from your design
system rather than dropped on top of it wearing someone else's. A dependency
you cannot open is exactly the thing that claim is against. The registry
installs the layer *as source composed from your tokens*, so the first thing
you do after installing is legitimately to change it.

There is also a practical reason. The components consume semantic tokens
(`--primary`, `--muted-foreground`, the radius window, the motion roles). When
they live in your repo, your Foundation configuration reaches them the same way
it reaches everything else you wrote. As a compiled dependency they would need
a parallel styling channel, and that channel is how design systems fork.

## What each one actually gives you

|  | Registry | npm |
|---|---|---|
| What lands | TypeScript source in your `src/` | a built package in `node_modules` |
| Who owns it after | you | the maintainers |
| Upgrades | re-run `add`, resolve by hand | `npm update` |
| Editing it | expected | not possible |
| Token wiring | your Foundation, directly | props and CSS variables |
| Tree shaking | you only add what you add | your bundler's job |

## The commands

Register the namespace once so the names stay short:

```bash
npx shadcn registry add @ambientui=https://registry.ambientui.ai/r/{name}.json
```

Then take a door:

```bash
npx shadcn add @ambientui/ambient-layer
```

Or the npm route (once the first release is published):

```bash
npm i ambientui
```

## Mixing them

You can, in one direction. Taking the Foundation from the registry while
consuming the layer from npm is coherent: the Foundation is configuration, and
the layer reads its output through the runtime interface either way. The
reverse (layer as source, Foundation as a dependency) works too but buys you
little, since the Foundation is small and the parts you would want to change
are the accent list and the radius window, both of which are data.

What does not work is installing the same component through both routes.
Two copies of a component that both define the same tokens is a conflict your
bundler will not warn you about.

## How we know the commands work

Every install command printed in this repo, on the site, or in the README is
executed by `npm run verify:install` against a scratch project that is not this
repository. It runs the real CLI, then typechecks and builds the result. A
command that has not been run does not get printed. That rule exists because
the registry once shipped for weeks with a missing import rewrite, and it was
invisible here for exactly as long as nobody installed it anywhere else.
