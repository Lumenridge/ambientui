# product-copy — reference

Context the skill points at. **Placeholders below are unfilled** — treat an
unfilled entry as "not available", never as licence to invent the answer.

## Role and company context

| | |
|---|---|
| Product | ambientui — an AI-native interface layer and design-system environment: one system, two vocabularies (product + ambient), governed so AI can compose UI without drifting |
| Primary surfaces | The canvas (host page), `/ds` (Foundation + component vocabulary), the assistant (orb / bar / panel / dock / spotlight) |
| Audience | Product engineers and designers building AI-native products on shadcn; secondarily the AI layer itself, which reads the vocabulary docs |
| Voice | *(placeholder — no brand voice doc yet)* Default to DESIGN.md §1: clear over clever, calm, confident, plain language |
| Reading level | Assume shadcn/React literacy, not ambientui literacy — someone who has never seen the thesis must still follow every string |

## Connected tools

| Tool | Status | Use for |
|---|---|---|
| Figma design file | **Not connected yet** — set on the Foundation page | In-design copy; component and variable names once it exists |
| Public site / paper (ambientui.ai) | *(placeholder — not built yet)* | Would be the voice of record for thesis language |
| Knowledge base / voice-and-tone doc | *(placeholder — none supplied)* | Would be the source of truth for voice |
| Copy doc / string catalogue | *(placeholder — none exists yet)* | Would hold reusable strings, error catalogue, glossary |
| Localisation | *(placeholder — unknown)* | Ask before writing copy that resists translation |

## In-repo sources of truth

- [DESIGN.md](../../../DESIGN.md) — §1 principles, §8 the ambient layer
  contract (surface names), §9 save semantics
- `packages/docs/src/catalog.ts` — the vocabulary docs (AI-facing
  copy of record)
- `apps/site/src/components/ds/foundation-page.tsx` — Foundation strings, Figma
  connection impact copy, Save Theme states
- `packages/ambient/src/assistant.tsx` — assistant strings,
  suggested prompts, palette hints

## Open questions

1. Is there a brand voice-and-tone document for ambientui.ai? Nothing supplied.
2. What is the public name of the assistant surface set — "the ambient layer"
   everywhere, or does the orb get a product name?
3. Will the paper's terminology (deterministic vs generative, "unimagined
   world") appear in product UI, or stay editorial?
