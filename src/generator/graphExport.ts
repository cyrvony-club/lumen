import type { EntityRecord } from "./entities.js";

export type GraphArtifacts = Record<string, unknown>;

function labelEntity(rowUnknown: Record<string, unknown>): string {
  const title = Reflect.get(rowUnknown, "title");
  if (typeof title === "string" && `${title}`.trim().length) return `${title}`.trim();
  const name = Reflect.get(rowUnknown, "name");
  if (typeof name === "string" && `${name}`.trim().length) return `${name}`.trim();
  const fallback = Reflect.get(rowUnknown, "id");
  return `${String(fallback)}`.trim();
}

export function buildGraphArtifacts(params: {
  readonly entities: readonly EntityRecord[];
  readonly schemaVersionSuffix: string;
  readonly packageId: string;
  readonly packageVersion: string;
  readonly generatedAtIso: string;
}): GraphArtifacts {
  const nodes = [...params.entities].flatMap((rowUnknown) => {
    const idCandidate = Reflect.get(rowUnknown as object, "id");
    const typeCandidate = Reflect.get(rowUnknown as object, "type");
    const id = typeof idCandidate !== "undefined" ? `${String(idCandidate)}`.trim() : "";
    const entityType =
      typeof typeCandidate !== "undefined" ? `${String(typeCandidate)}`.trim() : "";
    if (!(id.length && entityType.length)) return [] as const;

    const labelCombined = labelEntity(rowUnknown as Record<string, unknown>);
    const node = {
      id,
      kind: "entity",
      type: entityType,
      label: labelCombined,
    } as const;

    return [node];
  });

  const edges = [...params.entities].flatMap((rowUnknown) => {
    const subjectCandidate = Reflect.get(rowUnknown as object, "id");
    const subjectId = `${String(subjectCandidate)}`.trim();
    if (!(subjectId.length > 0)) return [] as const;

    const relUnknown = Reflect.get(rowUnknown as object, "relations");
    const relArray = Array.isArray(relUnknown) ? [...relUnknown] : [];

    return relArray.flatMap((relCandidate) => {
      if (typeof relCandidate !== "object" || relCandidate === null) return [] as const;
      const relObject = relCandidate as Record<string, unknown>;
      const typeRaw = Reflect.get(relObject, "type");
      const targetRaw = Reflect.get(relObject, "target_id");
      const relType = typeof typeRaw !== "undefined" ? `${String(typeRaw)}`.trim() : "";
      const targetId =
        typeof targetRaw !== "undefined" ? `${String(targetRaw)}`.trim() : "";
      if (!(relType.length > 0 && targetId.length > 0)) return [] as const;

      return [{
        type: relType,
        from: subjectId,
        to: targetId,
      }];
    });
  });

  const suffixTrimmed = `${params.schemaVersionSuffix}`.trim();

  return {
    schema_version: `generated.graph.${suffixTrimmed}`,
    package_id: `${params.packageId}`.trim(),
    package_version: `${params.packageVersion}`.trim(),
    generated_at: `${params.generatedAtIso}`.trim(),
    nodes,
    edges,
  };
}

