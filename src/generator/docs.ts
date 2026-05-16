import type { ProductTruthModel, TruthClaim, TruthEvidence } from "./types.js";

export const CANON_DOC_SLUGS = [
  "product-overview",
  "use-cases",
  "comparison-context",
  "faq",
  "evidence",
] as const;

export type CanonDocSlug = (typeof CANON_DOC_SLUGS)[number];

export function jsonEncode(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "{}";
  } catch {
    return "{}";
  }
}

function fenced(title: string, body: unknown): string {
  return ["## " + title, "", "```json", jsonEncode(body), "```", ""].join("\n");
}

function bullet(title: string, value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return `- **${title}:** ${value}`;
}

function joinBlocks(blocks: readonly (string | undefined)[]): string {
  return blocks
    .filter((b): b is string => typeof b === "string" && b.length > 0)
    .join("\n\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trimEnd();
}

export function buildProductOverviewDoc(model: ProductTruthModel): string {
  const idLines =
    ([
      bullet("schema_version", model.schema_version),
      bullet("product_id", `\`${model.product_id}\``),
      bullet("updated_at", model.updated_at),
    ].filter(Boolean) as string[]).join("\n");

  const briefParts: string[] = [
    ...(bullet("name", model.brief.name) ? [bullet("name", model.brief.name)!] : []),
    ...(model.brief.category ?
      bullet("category", model.brief.category) ?
        [bullet("category", model.brief.category)!]
      : []
    : []),
    ...(model.brief.website ?
      bullet("website", model.brief.website) ? [bullet("website", model.brief.website)!] : []
    : []),
    bullet("short_description", model.brief.short_description)!,
    ...(model.brief.audiences?.length ?
      [
        "- **audiences:**",
        ...model.brief.audiences.map((a) => `  - ${a}`),
      ]
    : []),
  ];

  const claimsBlocks =
    model.claims.length ?
      model.claims.map((c) => renderClaimMarkdownSection(c))
    : ["_(none recorded in source model)_"];

  const traceSnapshot = {
    schema_version: model.schema_version,
    product_id: model.product_id,
    updated_at: model.updated_at,
    brief: model.brief,
    claims: model.claims,
  };

  const body = joinBlocks([
    "# Product overview",
    "### Identifier",
    idLines || "- _(no identifiers — unexpected)_",
    "### Brief",
    briefParts.join("\n"),
    "## Claims",
    claimsBlocks.join("\n\n---\n\n"),
    fenced("Structured tracing snapshot (`brief` + `claims` verbatim)", traceSnapshot),
  ]);

  return body.endsWith("\n") ? body : `${body}\n`;
}

function renderClaimMarkdownSection(c: TruthClaim): string {
  const lines: string[] = [
    `#### \`${c.id}\``,
    `- **claim_id:** \`${c.id}\``,
    `- **truth_status:** ${c.truth_status}`,
    `- **statement:** ${c.statement}`,
    ...(bullet("kind", c.kind) ? [bullet("kind", c.kind)!] : []),
    ...(c.entity_id ? [bullet("entity_id", `\`${c.entity_id}\``)!] : []),
    ...(c.evidence_ids?.length ?
      [
        `- **evidence_ids:**`,
        ...c.evidence_ids.map((eid) => `  - \`${eid}\``),
      ]
    : []),
  ];
  return lines.join("\n");
}

export function buildUseCasesDoc(model: ProductTruthModel): string {
  const p = model.positioning;
  const hasAny =
    p &&
    (Boolean(p.use_cases?.length) ||
      Boolean(p.fit_for?.length) ||
      Boolean(p.not_fit_for?.length));

  const sections =
    !hasAny ?
      [
        "### Use cases",
        "(none recorded in source model)",
        "### Fit profile",
        "(none recorded in source model)",
        "### Not-fit profile",
        "(none recorded in source model)",
        "(no positioning fields present in source model)",
      ]
    : [
        "### Use cases",
        ...(p!.use_cases?.length ?
          p.use_cases!.map((u) => `- ${u}`)
        : ["_(none)_"]),
        "### Fit profile",
        ...(p!.fit_for?.length ? p.fit_for!.map((u) => `- ${u}`) : ["_(none)_"]),
        "### Not-fit profile",
        ...(p!.not_fit_for?.length ?
          p!.not_fit_for!.map((u) => `- ${u}`)
        : ["_(none)_"]),
      ];

  const body = joinBlocks([
    "# Use cases",
    "## Positioning (source model)",
    sections.join("\n"),
    fenced("Structured snapshot (`positioning` verbatim)", model.positioning ?? {}),
  ]);

  return body.endsWith("\n") ? body : `${body}\n`;
}

export function buildComparisonContextDoc(model: ProductTruthModel): string {
  const ctx = model.competitor_context ?? [];
  let comparisonBody: string;
  if (!ctx.length) {
    comparisonBody = "_(none recorded in source model)_";
  } else {
    comparisonBody = ctx
      .map((row, idx) => {
        const name = row.name?.trim();
        const head =
          typeof name === "string" && name.length > 0 ?
            `### ${idx + 1}. ${name}`
          : `### ${idx + 1}. unnamed competitor`;
        const lines = [...(row.notes ? [`- **notes:** ${row.notes}`] : [])];
        return `${head}\n${lines.join("\n") || "- _(empty notes)_"}`;
      })
      .join("\n\n");
  }

  const body = joinBlocks([
    "# Comparison context",
    "## Competitive notes",
    comparisonBody,
    fenced("Structured snapshot (`competitor_context` verbatim)", ctx),
  ]);

  return body.endsWith("\n") ? body : `${body}\n`;
}

export function buildFaqDoc(model: ProductTruthModel): string {
  const constraints =
    model.policy_constraints.length ?
      model.policy_constraints.map((c, i) => `${i + 1}. ${c}`).join("\n")
    : "_(none recorded in source model)_";

  const queriesBlock = renderTargetQueries(model);

  const body = joinBlocks([
    "# FAQ scaffolding",
    "## Policy constraints (source model)",
    constraints,
    fenced("Structured snapshot (`policy_constraints` verbatim)", [
      ...model.policy_constraints,
    ]),
    "## Target LLM queries (source model)",
    queriesBlock.lines,
    fenced(
      "Structured snapshot (`target_llm_queries` verbatim)",
      verbatimQueries(model.target_llm_queries),
    ),
    "## Source of truth (source model)",
    "Values below mirror `source_of_truth` object without interpretation.",
    fenced("Structured snapshot (`source_of_truth` verbatim)", model.source_of_truth),
  ]);

  return body.endsWith("\n") ? body : `${body}\n`;
}

/** Построчно воспроизводит элементы массива из парсера (включая необязательные поля сверх минимальной TS-формы). */
function verbatimQueries(
  queries: readonly { readonly query: string }[],
): readonly unknown[] {
  return queries as readonly unknown[];
}

function renderTargetQueries(model: ProductTruthModel): { lines: string } {
  if (!model.target_llm_queries.length) {
    return { lines: "_(none recorded in source model)_" };
  }
  const numbered = verbatimQueries(model.target_llm_queries).map((raw, idx) => {
    const queryText =
      raw !== null && typeof raw === "object" && "query" in raw ?
        typeof (raw as { query?: unknown }).query === "string" ?
          (raw as { query: string }).query
        : jsonEncode(raw)
      : jsonEncode(raw);
    return `- **${idx + 1}.** ${queryText}`;
  });
  return { lines: numbered.join("\n") };
}

export function buildEvidenceDoc(model: ProductTruthModel): string {
  const claimParts =
    model.claims.length ?
      model.claims.map((c) =>
        [`### Claim \`${c.id}\``, renderClaimMarkdownSection(c)].join("\n"),
      )
    : ["_(none recorded in source model)_"];

  const evParts =
    model.evidence.length ?
      model.evidence.map((e) => renderEvidenceMarkdown(e))
    : ["_(no evidence rows)_"];

  const ledger = {
    claims: model.claims,
    evidence: model.evidence,
  };

  const body = joinBlocks([
    "# Evidence ledger",
    "## Claims (source model)",
    claimParts.join("\n\n"),
    "## Evidence (source model)",
    evParts.join("\n\n---\n\n"),
    fenced("Structured tracing snapshot (`claims` + `evidence` verbatim)", ledger),
  ]);

  return body.endsWith("\n") ? body : `${body}\n`;
}

function renderEvidenceMarkdown(e: TruthEvidence): string {
  const parts: string[] = [
    `#### \`${e.id}\``,
    `- **evidence_id:** \`${e.id}\``,
  ];

  const kindBullet = bullet("kind", e.kind);
  if (kindBullet !== undefined) parts.push(kindBullet);
  parts.push(`- **citation:** ${e.citation}`);
  if (e.url) parts.push(`- **url:** ${e.url}`);
  if (Array.isArray(e.source_refs) && e.source_refs.length > 0) {
    parts.push("- **source_refs:** verbatim JSON below");
    parts.push("```json");
    parts.push(jsonEncode(e.source_refs));
    parts.push("```");
  }
  return parts.join("\n");
}

/** Assembles all five canonical Markdown docs from the truth model (no extra prose). */
export function buildCanonicalMarkdownDocs(
  model: ProductTruthModel,
): Record<CanonDocSlug, string> {
  return {
    "product-overview": buildProductOverviewDoc(model),
    "use-cases": buildUseCasesDoc(model),
    "comparison-context": buildComparisonContextDoc(model),
    faq: buildFaqDoc(model),
    evidence: buildEvidenceDoc(model),
  };
}
