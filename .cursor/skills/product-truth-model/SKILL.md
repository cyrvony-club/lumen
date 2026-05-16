---
name: product-truth-model
description: >-
  Guides the agent through staged user interviews to author a validated local
  product-truth-model.json without inventing claims or evidence, separating
  evidenced facts, hypotheses, and policy constraints. Use when creating,
  filling in, reviewing, or splitting work on product-truth-model.json before
  running schema validation or generating the neutral product knowledge package.
disable-model-invocation: true
---

# Product truth model (interview workflow)

Collect **only** facts the user confirms. Every `claim.statement`, `evidence`, and citation must originate from supplied materials or direct user wording—**never fabricated**.

**Обязательное правило проекта:** [`.cursor/rules/lumen-product-truth-model.mdc`](../../rules/lumen-product-truth-model.mdc) — контракт оценки и структуры JSON; применяется при создании модели для нового продукта.

## Outputs and naming

- **Local file:** repo-root **`product-truth-model.json`** (or another path chosen with the user; still validate against [`schema/product-truth-model.schema.json`](../../../schema/product-truth-model.schema.json)).
- **Published output:** **`product knowledge package`** / **`LLM-readable product data package`** MUST **not** contain the internal tool brand name **`Lumen`**, paths like **`/lumen/*`**, or phrases **`Lumen package`**. Keep public URLs neutral (e.g. `/product-data/*`).

See [reference.md](reference.md) for block outline and honesty rules. See [examples.md](examples.md) for question phrasing stubs. User-facing guide: [`docs/guides/product-truth-model-authoring.md`](../../../docs/guides/product-truth-model-authoring.md).

## Interview progression (blocking order)

Proceed block by block. Summarize answers back before writing JSON.

1. **Product brief** — name, category, website, short description, audiences (if any).
2. **Positioning** — use cases; fit (`fit_for`); explicitly “not fit” (`not_fit_for`).
3. **Target LLM queries** — **5–8** short natural-language queries covering category, objections, comparisons, hypotheses vs facts, citations.
4. **Claims** — each with stable `id`, exact `statement` from the user/sources, **`truth_status`**.
5. **Evidence** — each with `id`, `citation`; optional `url`, `kind`, **`source_refs`** when traceability needs structured refs.
6. **Competitor context** — names and factual comparison notes **only** where backed or clearly labeled uncertainty.
7. **Policy constraints** — strings forbidding wording or promises (often maps to **`policy_forbidden`** claims elsewhere).
8. **Source of truth** — canonical owner/email or doc anchors for conflict resolution.

## Truth statuses (claims)

| `truth_status` | Meaning |
|----------------|---------|
| `evidenced` | User confirmed; requires **non-empty** `evidence_ids` linking to ledger rows |
| `hypothesis` | Intentionally uncertain hypothesis—**never** cite as settled fact downstream |
| `policy_forbidden` | Must not appear as a positive factual claim publicly |

Do not merge hypotheses into evidenced claims without new evidence IDs and explicit user acceptance.

## Post-draft loop (recommended)

After each substantive edit:

```bash
npm run validate:schema
npm run generate:package -- --input product-truth-model.json
npm run validate
```

If `product-truth-model.json` sits elsewhere, pass `--input` accordingly.
