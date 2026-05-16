import { normalizeArtifactSlug } from "./slug.js";
import type { ProductTruthModel, TruthClaim } from "./types.js";
import { validateEvidencedClaimsHaveEvidenceLinks } from "./truthModelGuards.js";

export type EntityRecord = Record<string, unknown>;

type RelationPair = Readonly<{ type: string; target_id: string }>;

function entityCanonicalUrl(baseUrl: string, entityId: string): string {
  const trimmed = `${baseUrl}`.replace(/\/+$/u, "");
  return `${trimmed}/entities/${encodeURIComponent(entityId)}`;
}

function clampSummary(text: string, max = 2000): string {
  const clean = `${text}`.trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function clampTitle(text: string, max = 160): string {
  const clean = `${text}`.trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function claimEntityId(claim: TruthClaim): string {
  if (typeof claim.entity_id === "string") {
    const trimmed = claim.entity_id.trim();
    if (trimmed.length) return trimmed;
  }

  return `ent.claim.${normalizeArtifactSlug(claim.id)}`;
}

function evidenceEntityId(evidenceIdRaw: string): string {
  const trimmed = `${evidenceIdRaw}`.trim();
  const lower = trimmed.toLowerCase();

  return lower.startsWith("ent.evidence.") && lower.length > "ent.evidence.".length
    ? trimmed
    : `ent.evidence.${normalizeArtifactSlug(trimmed)}`;
}

/** Карта строкового id из модели правды на стабильный id сущности Evidence. */

export function evidenceIdToEntityIdMap(
  model: ProductTruthModel,
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const ev of model.evidence)
    map.set(ev.id.trim(), evidenceEntityId(ev.id));

  return map;
}

export function buildEntitiesFromTruthModel(params: {
  readonly model: ProductTruthModel;
  readonly baseUrl: string;
  readonly entityVersion?: string;
}): EntityRecord[] {
  validateEvidencedClaimsHaveEvidenceLinks(params.model);

  const model = params.model;
  const version =
    `${params.entityVersion ?? model.schema_version}`.trim() || "0.0.0";

  const updatedAt = model.updated_at;
  const productId = model.product_id.trim();
  const packBaseUrl = `${params.baseUrl}`.replace(/\/+$/u, "");

  const evidMap = evidenceIdToEntityIdMap(model);

  const rawUseCases = model.positioning?.use_cases ?? [];
  const useCases =
    typeof rawUseCases !== "object"
      ? []
      : [...rawUseCases].filter((x): x is string => typeof x === "string" && !!x.trim());

  const audienceTags = [...(model.brief.audiences ?? [])].flatMap((a) =>
    typeof a !== "string" || !`${a}`.trim() ? [] : [`audience:${normalizeArtifactSlug(`${a}`)}`],
  );

  const featureRows: EntityRecord[] = useCases.map((label) => {
    const trimmed = `${label}`.trim();
    const fid = `ent.feature.${normalizeArtifactSlug(trimmed)}`;

    return {
      id: fid,
      type: "Feature",
      title: clampTitle(trimmed, 240),
      summary: clampSummary(trimmed, 2400),
      tags: ["canonical"],
      updated_at: updatedAt,
      version,
      canonical_url: entityCanonicalUrl(packBaseUrl, fid),
      product_id: productId,
      relations: ([] as RelationPair[]),
    };
  });

  const claimRows: EntityRecord[] = model.claims.map((claim) => {
    const id = claimEntityId(claim);

    const relations: RelationPair[] =
      claim.truth_status !== "evidenced"
        ? ([] as RelationPair[])
        : [...(claim.evidence_ids ?? [])]
            .filter((rid): rid is string => typeof rid === "string" && !!rid.trim())
            .map((rid) => evidMap.get(rid.trim()))
            .filter((target): target is string => typeof target === "string" && !!target.length)
            .map((target_id) => ({ type: "claim_supported_by", target_id }));

    return {
      id,
      type: "Claim",
      title: clampTitle(`${claim.kind ?? "claim"} · ${claim.id}`),
      summary: clampSummary(claim.statement, 2600),
      tags: [`truth_status:${claim.truth_status}`, "canonical"],
      updated_at: updatedAt,
      version,
      canonical_url: entityCanonicalUrl(packBaseUrl, id),
      truth_status: claim.truth_status,
      product_id: productId,
      relations,
    };
  });

  const evidenceRows: EntityRecord[] = model.evidence.map((ev) => {
    const mapped = evidMap.get(ev.id.trim());
    const id =
      mapped !== undefined ? mapped : (() => {
        throw new Error(`Неизвестный evidence id после нормализации: ${ev.id}`);
      })();

    const row: EntityRecord = {
      id,
      type: "Evidence",
      title: clampTitle(`${ev.kind ?? "evidence"} · ${ev.id}`),
      summary: clampSummary(ev.citation, 3600),
      tags: [`evidence_kind:${normalizeArtifactSlug(ev.kind ?? "misc")}`, "canonical"],
      updated_at: updatedAt,
      version,
      canonical_url:
        typeof ev.url === "string" && ev.url.trim().length
          ? `${ev.url}`.trim()
          : entityCanonicalUrl(packBaseUrl, id),
      product_id: productId,
      relations: [{ type: "evidences_product", target_id: productId }] satisfies RelationPair[],
    };

    const refs = [...(ev.source_refs ?? [])].filter(Boolean);

    if (refs.length)
      Reflect.set(row, "source_refs", refs);

    return row;
  });

  const comps = [...(model.competitor_context ?? [])].flatMap((row) =>
    typeof row?.name !== "string" || !`${row.name}`.trim() ? [] : [row.name.trim()],
  );

  const uniqCompNames = [...new Set(comps)];

  const competitorRows: EntityRecord[] = uniqCompNames.map((name) => {
    const slug = normalizeArtifactSlug(`${name}`);
    const id =
      slug.length > 0 ? `ent.competitor.${slug}` : `ent.competitor.generic`;

    const ctx = [...(model.competitor_context ?? [])].find(
      (raw) =>
        typeof raw?.name === "string" &&
        `${raw.name}`.trim().toLowerCase() === `${name}`.trim().toLowerCase(),
    );

    const notesTextRaw = typeof ctx?.notes === "string" ? `${ctx.notes}`.trim() : "";
    const notesText =
      notesTextRaw.length > 0
        ? notesTextRaw
        : "Named competitor listed in competitor_context only";

    const row: EntityRecord = {
      id,
      type: "Competitor",
      name,
      summary: clampSummary(notesText, 3600),
      tags: ["canonical", "comparison"],
      updated_at: updatedAt,
      version,
      canonical_url: entityCanonicalUrl(packBaseUrl, id),
      product_id: productId,
      relations: ([] as RelationPair[]),
    };

    return row;
  });

  const productRelations: RelationPair[] = [
    ...featureRows.map((feat) => ({
      type: "product_has_feature",
      target_id: `${feat.id}`,
    })),
    ...claimRows.map((c) => ({ type: "product_has_claim", target_id: `${c.id}` })),
    ...competitorRows.map((c) => ({
      type: "compares_to",
      target_id: `${c.id}`,
    })),
  ];

  const websiteRaw = model.brief.website;
  const website =
    typeof websiteRaw === "string" && `${websiteRaw}`.trim().length > 0
      ? `${websiteRaw}`.trim()
      : undefined;

  const productRow: EntityRecord = {
    id: productId,
    type: "Product",
    title: clampTitle(`${model.brief.name}`, 240),
    summary: clampSummary(`${model.brief.short_description}`, 3600),
    tags: ["canonical", ...audienceTags.slice(0, 12)],
    updated_at: updatedAt,
    version,
    canonical_url: entityCanonicalUrl(packBaseUrl, productId),
    relations: productRelations,
    ...(website
      ? {
          source_refs: [
            {
              ref: "brief.website",
              uri: website,
              label: "Marketing website listed in brief",
            },
          ],
        }
      : {}),
  };

  return [productRow, ...featureRows, ...claimRows, ...evidenceRows, ...competitorRows];
}
