## Invariants before save

- `target_llm_queries`: exactly **5–8** items, non-empty **`query`** on each entry.
- `evidence`: at least **one** row whenever claims exist (schema requires ledger coverage).
- `source_of_truth`: non-empty structured object reflecting user-provided anchors.
- `claims[]`: unique `id`; no invented statements—copy user/source text.
- **`evidenced`** claims MUST list existing `evidence_ids` referencing `evidence[].id`.

## Forbidden

- Invented metrics, benchmarks, reviews, certifications, roadmap dates, competitor slights without evidence rows.
- Blurring `hypothesis` with `evidenced` wording in `statement`.

## Minimal shape reminder

Mirror `schema/product-truth-model.schema.json` for required fields (`schema_version`, `product_id`, `updated_at`, `brief.*`, arrays for claims, evidence, constraints, queries).
