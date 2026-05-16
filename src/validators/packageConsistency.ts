import type { Issue } from "../lib/exit.js";

export type MinimalEntityRow = Readonly<
  Partial<Record<"type" | "id" | "truth_status", string>> & {
    relations?: unknown;
  }
>;

export type ChunkRow = Readonly<
  Partial<Record<"entity_ids" | "claim_ids" | "evidence_ids", string[]>>
  & Partial<Record<"chunk_id", string>>
>;

const REL_EXPECTED_SOURCES: Readonly<
  Record<string, ReadonlyArray<string>>
> = {
  product_has_feature: ["Product"],
  product_has_claim: ["Product"],
  product_has_use_case: ["Product"],
  feature_serves_use_case: ["Feature"],
  claim_supported_by: ["Claim"],
  evidences_product: ["Evidence"],
  evidenced_by: ["Evidence", "Claim"],
  compares_to: ["Product", "Competitor", "Comparison"],
  audience_for: ["Audience"],
  faq_answers_about: ["FAQ"],
  comparison_context_includes_competitor: ["Comparison"],
};

/** Проверка согласованности relations[] как subject (текущая сущность) → target_id. */

export function checkRelationsDirection(params: {
  entities: MinimalEntityRow[];
}): Iterable<Issue> {
  function* emit(): IterableIterator<Issue> {
    const byId = new Map<string, MinimalEntityRow>();
    for (const entity of params.entities) {
      const id = entity.id !== undefined ? String(entity.id).trim() : "";
      const type =
        entity.type !== undefined ? String(entity.type).trim() : undefined;
      if (!id.length) continue;
      if (type?.length) byId.set(id, entity);
    }

    for (const entity of params.entities) {
      const sid = entity.id !== undefined ? String(entity.id).trim() : "";
      const st =
        entity.type !== undefined ? String(entity.type).trim() : undefined;
      if (!sid.length || !st?.length) continue;

      const relsUnknown = entity.relations;
      if (!Array.isArray(relsUnknown)) continue;

      let idx = 0;
      for (const raw of relsUnknown) {
        idx++;
        const relRaw = typeof raw === "object" && raw !== null ? raw : {};
        const typeUnknown = Reflect.get(relRaw as object, "type");
        const targetUnknown = Reflect.get(relRaw as object, "target_id");
        const rtype =
          typeof typeUnknown === "string"
            ? typeUnknown.trim()
            : `${String(typeUnknown)}`;
        const targetId =
          typeof targetUnknown === "string"
            ? targetUnknown.trim()
            : `${String(targetUnknown)}`;

        const allowed = REL_EXPECTED_SOURCES[rtype];
        if (!allowed) {
          yield {
            severity: "warn",
            code: "relation_unknown_type",
            message: `${sid}: связь №${idx} типа "${rtype}" — направление не проверено (неизвестный тип)`,
          };
          continue;
        }
        const ok = allowed.includes(st);
        if (!ok)
          yield {
            severity: "error",
            code: "relation_wrong_subject",
            message: `${sid}: связь "${rtype}" исходит от сущности типа "${st}", допустимо только: ${allowed.join(", ")}`,
          };

        const target = byId.get(targetId);
        if (!target?.type) {
          yield {
            severity: "error",
            code: "relation_missing_target_entity",
            message: `${sid}: связь "${rtype}" указывает на неизвестный target_id="${targetId}"`,
          };
        }
      }
    }

    const seen = new Set<string>();
    for (const entity of params.entities) {
      const id = entity.id !== undefined ? String(entity.id).trim() : "";
      if (!id.length) continue;
      if (seen.has(id))
        yield {
          severity: "error",
          code: "entity_duplicate_id",
          message: `дублируется id="${id}" в entities.jsonl`,
        };
      seen.add(id);
    }
  }

  return emit();
}

/** Claim со статусом evidenced / по умолчанию требует claim_supported_by → Evidence */

export function checkClaimEvidenceGraph(params: {
  entities: MinimalEntityRow[];
}): Iterable<Issue> {
  function* emit(): IterableIterator<Issue> {
    const typesById = new Map<string, string>();
    for (const entity of params.entities) {
      const id = entity.id !== undefined ? String(entity.id).trim() : "";
      const t =
        entity.type !== undefined ? String(entity.type).trim() : undefined;
      if (!id.length || !t?.length) continue;
      typesById.set(id, t);
    }

    for (const entity of params.entities) {
      const sid = entity.id !== undefined ? String(entity.id).trim() : "";
      const st =
        entity.type !== undefined ? String(entity.type).trim() : undefined;
      if (!sid.length || st !== "Claim") continue;

      const truthUnknown = Reflect.get(entity, "truth_status");
      const ts =
        typeof truthUnknown === "string" ? truthUnknown.trim() : undefined;

      const relsUnknown = entity.relations;
      const relations = Array.isArray(relsUnknown) ? relsUnknown : [];

      const supportedBy = relations
        .flatMap((r) => {
          if (typeof r !== "object" || r === null) return [];
          const typeUnknown = Reflect.get(r, "type");
          const tgtUnknown = Reflect.get(r, "target_id");
          if (typeUnknown !== "claim_supported_by") return [];
          const tid =
            typeof tgtUnknown === "string" ? tgtUnknown.trim() : undefined;
          return tid !== undefined ? [tid] : [];
        })
        .filter(Boolean);

      for (const targetId of supportedBy) {
        const tt = typesById.get(targetId);
        if (tt !== undefined && tt !== "Evidence")
          yield {
            severity: "error",
            code: "claim_support_not_evidence",
            message: `${sid}: claim_supported_by ведёт в "${targetId}" с типом ${tt ?? "?"} (ожидается Evidence)`,
          };
      }

      if (
        ts === "hypothesis" ||
        ts === "policy_forbidden" ||
        supportedBy.length > 0
      )
        continue;

      yield {
        severity: "error",
        code: "claim_missing_evidence_link",
        message: `${sid}: Claim без truth_status=hypothesis|policy_forbidden должен содержать исходящую claim_supported_by на Evidence`,
      };
    }
  }

  return emit();
}

/** entity_ids должны включать те же Claim/Evidence id в специализированных массивах */

export function checkChunkEvidenceLinks(params: {
  entitiesById: Map<string, string>;
  chunks: ChunkRow[];
}): Iterable<Issue> {
  function* emit(): IterableIterator<Issue> {
    for (let i = 0; i < params.chunks.length; i++) {
      const chunk = params.chunks[i] ?? {};
      const entityIds = Array.isArray(chunk.entity_ids)
        ? chunk.entity_ids
        : [];
      const claims = Array.isArray(chunk.claim_ids) ? chunk.claim_ids : [];
      const evidences = Array.isArray(chunk.evidence_ids)
        ? chunk.evidence_ids
        : [];
      const claimSet = new Set(
        claims.filter((x): x is string => typeof x === "string"),
      );
      const evidSet = new Set(
        evidences.filter((x): x is string => typeof x === "string"),
      );

      for (const idUnknown of entityIds) {
        if (typeof idUnknown !== "string") continue;
        const id = idUnknown.trim();
        const ttype = params.entitiesById.get(id);
        if (ttype === "Claim" && !claimSet.has(id))
          yield {
            severity: "error",
            code: "chunk_claim_ids_incomplete",
            message: `chunk #${i + 1}: entity_ids содержит Claim "${id}", но claim_ids её не включает`,
          };
        if (ttype === "Evidence" && !evidSet.has(id))
          yield {
            severity: "error",
            code: "chunk_evidence_ids_incomplete",
            message: `chunk #${i + 1}: entity_ids содержит Evidence "${id}", но evidence_ids её не включает`,
          };
      }
    }
  }

  return emit();
}

export function checkDuplicateChunkIds(params: {
  chunks: ChunkRow[];
}): Iterable<Issue> {
  function* emit(): IterableIterator<Issue> {
    const seen = new Set<string>();

    for (const chunk of params.chunks) {
      const id = typeof chunk.chunk_id === "string" ? chunk.chunk_id.trim() : "";
      if (!id.length) continue;
      if (seen.has(id))
        yield {
          severity: "error",
          code: "chunk_duplicate_id",
          message: `дублируется chunk_id="${id}" в chunks.jsonl`,
        };
      seen.add(id);
    }
  }

  return emit();
}
