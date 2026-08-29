# Security

ambientui is a design system and UI layer. It ships no server, stores no
credentials, and talks to no network service of its own. The most likely
security issues are the client-side kind: XSS through rendered content,
dependency vulnerabilities, or unsafe patterns in the components.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's security
advisories: open the repository's Security tab and choose "Report a
vulnerability". Do not open a public issue for something exploitable.

We will acknowledge the report, work out a fix, and credit you in the
advisory unless you prefer otherwise.

## Scope

- Code in `packages/` (the published surface) is in scope.
- The demo app under `apps/web` is in scope where a flaw would carry into
  a consumer through the registry.
- Vulnerabilities in upstream dependencies belong upstream, but we will
  bump pinned versions promptly when a fix exists.
