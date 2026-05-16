import type { ProductTruthModel } from "./types.js";
import type { ChunkRecord } from "./chunks.js";
import type { EntityRecord } from "./entities.js";

export type UpdatesArtifacts = Record<string, unknown>;

export function buildUpdatesManifest(params: {
  readonly model: ProductTruthModel;
  readonly packageVersion: string;
  readonly generatedAtIso: string;
  readonly entities: readonly EntityRecord[];
  readonly chunks: readonly ChunkRecord[];
}): UpdatesArtifacts {
  const entityIds = [...params.entities]
    .map((entityRow) => Reflect.get(entityRow as object, "id"))
    .flatMap((idUnknown) =>
      typeof idUnknown !== "undefined" ? [`${String(idUnknown)}`.trim()] : ([] as readonly string[]),
    )
    .filter((idCandidate) => idCandidate.length > 0);

  const chunkRows = [...params.chunks]

  const chunkIds = chunkRows
    .map((chunkRow) => Reflect.get(chunkRow as object, "chunk_id"))
    .flatMap((chunkCandidate) =>
      typeof chunkCandidate !== "undefined"
        ? [`${String(chunkCandidate)}`.trim()]
        : ([] as readonly string[]),
    )
    .filter((chunkCandidate) => chunkCandidate.length > 0);

  type ChangeRow = Record<string, unknown>;

  const entityChanges = [...params.entities].flatMap((entityRowUnknown) =>
    typeof entityRowUnknown !== "object" || entityRowUnknown === null ? ([] as ChangeRow[]) : (
      (): ChangeRow[] => {
        const typed = entityRowUnknown as Record<string, unknown>;
        const ids = Reflect.get(typed, "id");
        const typeField = Reflect.get(typed, "type");
        const canonical = Reflect.get(typed, "canonical_url");
        const refreshed = Reflect.get(typed, "updated_at");
        const idText = `${String(ids)}`.trim();
        if (!(idText.length > 0)) return [];

        return [
          {
            id: idText,
            type: `${String(typeField)}`,
            updated_at: `${String(refreshed)}`,
            canonical_url: canonical,
          },
        ];
      }
    )(),
  );

  const chunkChanges = chunkRows.flatMap((chunkCandidateUnknown): ChangeRow[] => {
    const typedChunk = chunkCandidateUnknown as Record<string, unknown>;
    const chunkIdCandidate = Reflect.get(typedChunk, "chunk_id");
    const chunkCanonical = Reflect.get(typedChunk, "canonical_url");
    const chunkUpdatedRaw = Reflect.get(typedChunk, "updated_at");

    const chunkResolved = `${String(chunkIdCandidate ?? "")}`.trim();
    if (!(chunkResolved.length > 0)) return [];

    return [
      {
        id: chunkResolved,
        type: "ChunkExport",
        updated_at: `${String(chunkUpdatedRaw)}`,
        canonical_url: chunkCanonical,
      },
    ];
  });

  const changedTotals = [...entityIds, ...chunkIds];

  return {
    package_id: `${params.model.product_id}`.trim(),
    package_version: `${params.packageVersion}`.trim(),
    generated_at: `${params.generatedAtIso}`.trim(),
    counts: {
      changed_total: changedTotals.length,
      changed_entities: entityIds.length,
      changed_chunks: chunkIds.length,
    },
    changed_entity_ids: [...entityIds],
    changed_chunk_ids: [...chunkIds],
    changes: [...entityChanges, ...chunkChanges],
  };
}

