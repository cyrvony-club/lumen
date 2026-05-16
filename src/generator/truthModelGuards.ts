import { PackageGeneratorError } from "./errors.js";
import type { ProductTruthModel, TruthClaim } from "./types.js";
import { CANON_DOC_SLUGS } from "./docs.js";
import { normalizeArtifactSlug } from "./slug.js";

export function validateEvidencedClaimsHaveEvidenceLinks(
  model: ProductTruthModel,
): void {
  const evidSet = new Set(model.evidence.map((e) => e.id.trim()).filter(Boolean));
  const errs: string[] = [];

  for (const claim of model.claims)
    errs.push(...claimViolations({ claim, evidSet }));

  if (!errs.length) return;

  throw new PackageGeneratorError(
    `Некорректные evidenced claims: ${errs.join(" | ")}`,
  );
}

export function validateTargetQueryCoverage(model: ProductTruthModel): void {
  const allowed = new Set<string>(CANON_DOC_SLUGS);
  const covered = new Set<string>();
  const errs: string[] = [];

  model.target_llm_queries.forEach((query, idx) => {
    const label = `target_llm_queries[${idx}]`;
    const slugs = query.coverage_doc_slugs;

    if (!Array.isArray(slugs) || slugs.length === 0) {
      errs.push(`${label}: coverage_doc_slugs должен быть непустым массивом`);
      return;
    }

    slugs.forEach((slugUnknown) => {
      const slug = typeof slugUnknown === "string" ? slugUnknown.trim() : "";
      if (!slug.length || !allowed.has(slug)) {
        errs.push(
          `${label}: coverage_doc_slugs содержит неизвестный canonical doc "${slug || "<empty>"}"`,
        );
        return;
      }
      covered.add(slug);
    });
  });

  const missing = CANON_DOC_SLUGS.filter((slug) => !covered.has(slug));
  if (missing.length)
    errs.push(`target_llm_queries не покрывают canonical docs: ${missing.join(", ")}`);

  if (errs.length)
    throw new PackageGeneratorError(
      `Некорректное покрытие target_llm_queries: ${errs.join(" | ")}`,
    );
}

export function validateTruthModelPublicIdsUnique(model: ProductTruthModel): void {
  const seen = new Map<string, string>();
  const errs: string[] = [];

  function remember(idRaw: string, source: string): void {
    const id = idRaw.trim();
    if (!id.length) return;
    const prev = seen.get(id);
    if (prev !== undefined) {
      errs.push(`id="${id}" повторяется: ${prev} и ${source}`);
      return;
    }
    seen.set(id, source);
  }

  remember(model.product_id, "product_id");

  model.positioning?.use_cases?.forEach((label, idx) => {
    remember(
      `ent.feature.${normalizeArtifactSlug(label)}`,
      `positioning.use_cases[${idx}]`,
    );
  });

  model.claims.forEach((claim, idx) => {
    const explicit = typeof claim.entity_id === "string" ? claim.entity_id.trim() : "";
    const id = explicit.length ? explicit : `ent.claim.${normalizeArtifactSlug(claim.id)}`;
    remember(id, `claims[${idx}].${claim.id}`);
  });

  model.evidence.forEach((evidence, idx) => {
    const trimmed = evidence.id.trim();
    const lower = trimmed.toLowerCase();
    const id =
      lower.startsWith("ent.evidence.") && lower.length > "ent.evidence.".length
        ? trimmed
        : `ent.evidence.${normalizeArtifactSlug(trimmed)}`;
    remember(id, `evidence[${idx}].${evidence.id}`);
  });

  const competitorNames = [...(model.competitor_context ?? [])].flatMap((row) =>
    typeof row.name === "string" && row.name.trim().length ? [row.name.trim()] : [],
  );
  [...new Set(competitorNames)].forEach((name, idx) => {
    remember(`ent.competitor.${normalizeArtifactSlug(name)}`, `competitor_context[${idx}]`);
  });

  if (errs.length)
    throw new PackageGeneratorError(
      `Некорректные публичные id модели: ${errs.join(" | ")}`,
    );
}

function claimViolations(params: {
  claim: TruthClaim;
  evidSet: ReadonlySet<string>;
}): string[] {
  const { claim } = params;
  if (claim.truth_status !== "evidenced") return [];

  const ids = Array.isArray(claim.evidence_ids) ? [...claim.evidence_ids] : [];
  const nonempty = ids
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  if (!nonempty.length)
    return [
      `"${claim.id}": evidenced claim требует непустые evidence_ids, ссылающиеся на evidence`,
    ];

  const missing = nonempty.filter((id) => !params.evidSet.has(id));

  return missing.length
    ? [`"${claim.id}": evidence_ids содержит неизвестные id (${missing.join(", ")})`]
    : [];
}
