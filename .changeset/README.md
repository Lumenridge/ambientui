# Changesets

Version and release the three published packages.

**They are `linked`, and that is deliberate.** `ambientui`, `@ambient-ui/ui` and
`@ambient-ui/foundation` are three halves of one contract: the layer states what
it needs from a design system, the Foundation implements that interface, and
both compose the primitives. A version number that could drift between them
would tell a user nothing about whether the three they installed fit together.

What is given up: you cannot patch the primitives without bumping the layer.
That is the intended trade — the number means something instead.

`@ambientui/site` is ignored; the website is not a package.

Add a changeset with `npx changeset` in your PR, then run
`npm run version-packages` and commit the version bump and changelog. The gate
fails a PR with an unversioned changeset. Merging the PR publishes to npm.
