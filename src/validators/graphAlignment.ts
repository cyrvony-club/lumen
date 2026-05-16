import type { ChunkRow } from "./packageConsistency.js";
import type { Issue } from "../lib/exit.js";

/** Сопоставляет relations[] экспортируемых сущностей с производным exports/graph.json. */

export type GraphPack = Readonly<
  Partial<Record<"nodes" | "edges", unknown[]>>
>;

export function diffGraphAgainstEntities(params: {
  entitiesJsonl: Record<string, unknown>[];
  graphUnknown: GraphPack | undefined;
  graphPathRel: string;
}): Iterable<Issue> {
  function* emit(): IterableIterator<Issue> {
    const edgesUnknown = params.graphUnknown?.edges;
    if (
      params.graphUnknown === undefined ||
      params.graphUnknown === null ||
      !Array.isArray(edgesUnknown)
    )
      return;

    type EdgeKey = `${string}:${string}->${string}`;

    const fromEntities = new Set<EdgeKey>();
    function keyOf(rtype: string, fromId: string, toId: string): EdgeKey {
      return `${rtype}:${fromId}->${toId}`;
    }

    for (const rowUnknown of params.entitiesJsonl) {
      const sid =
        typeof rowUnknown.id === "string" ? rowUnknown.id.trim() : undefined;
      if (!sid?.length) continue;
      const relsUnknown =
        Reflect.get(rowUnknown as object, "relations") ?? undefined;
      if (!Array.isArray(relsUnknown)) continue;

      for (const rawEdge of relsUnknown) {
        if (typeof rawEdge !== "object" || rawEdge === null) continue;
        const rtypeUnknown = Reflect.get(rawEdge as object, "type");
        const tgtUnknown = Reflect.get(rawEdge as object, "target_id");
        const rtype =
          typeof rtypeUnknown === "string"
            ? rtypeUnknown.trim()
            : `${String(rtypeUnknown)}`;
        const toId =
          typeof tgtUnknown === "string"
            ? tgtUnknown.trim()
            : `${String(tgtUnknown)}`;
        if (!rtype.length || !toId.length) continue;
        fromEntities.add(keyOf(rtype, sid, toId));
      }
    }

    const fromGraph = new Set<EdgeKey>();
    let edgeLine = 0;
    for (const raw of edgesUnknown) {
      edgeLine++;
      if (typeof raw !== "object" || raw === null) {
        yield {
          severity: "error",
          code: "graph_invalid_edge_shape",
          message: `${params.graphPathRel}: некорректная запись edge #${edgeLine}`,
        };
        continue;
      }
      const typeUnknown = Reflect.get(raw as object, "type");
      const fromUnknown = Reflect.get(raw as object, "from");
      const toUnknown = Reflect.get(raw as object, "to");
      const rtype =
        typeof typeUnknown === "string"
          ? typeUnknown.trim()
          : `${String(typeUnknown)}`;
      const fromId =
        typeof fromUnknown === "string"
          ? fromUnknown.trim()
          : `${String(fromUnknown)}`;
      const toId =
        typeof toUnknown === "string"
          ? toUnknown.trim()
          : `${String(toUnknown)}`;
      if (!rtype.length || !fromId.length || !toId.length) {
        yield {
          severity: "error",
          code: "graph_edge_fields",
          message: `${params.graphPathRel}: поле edge #${edgeLine} содержит пустые type/from/to`,
        };
        continue;
      }
      fromGraph.add(keyOf(rtype, fromId, toId));
    }

    const missingGraph = [...fromEntities].filter((key) => !fromGraph.has(key));
    const missingRel = [...fromGraph].filter(
      (key) => !fromEntities.has(key),
    );

    for (const key of missingGraph)
      yield {
        severity: "error",
        code: "graph_edge_missing",
        message: `${params.graphPathRel}: ребро ${key} есть в entities.jsonl, но отсутствует в графе`,
      };

    for (const key of missingRel)
      yield {
        severity: "warn",
        code: "graph_edge_orphan",
        message: `${params.graphPathRel}: ребро ${key} указано только в производном графе (нет relations[] в экспорте)`,
      };

    const nodeIdsKnown = new Set<string>();
    for (const entity of params.entitiesJsonl)
      if (typeof entity.id === "string" && entity.id.trim().length)
        nodeIdsKnown.add(entity.id.trim());

    const nodesUnknown = params.graphUnknown.nodes;
    if (!Array.isArray(nodesUnknown)) return;

    for (let line = 0; line < nodesUnknown.length; line++) {
      const rawUnknown = nodesUnknown[line];
      if (typeof rawUnknown !== "object" || rawUnknown === null) continue;
      const idUnknown = Reflect.get(rawUnknown as object, "id");
      const id =
        typeof idUnknown === "string" ? idUnknown.trim() : undefined;
      if (!id?.length) continue;
      if (!nodeIdsKnown.has(id))
        yield {
          severity: "warn",
          code: "graph_node_unknown_entity",
          message: `${params.graphPathRel}: узел #${line + 1} id="${id}" отсутствует среди сущностей текущего exports/entities.jsonl`,
        };
    }
  }

  return emit();
}

/** Уплощённые поля Chunk для проверки claim_ids/evidence_ids */

export function coerceChunkRecords(
  chunks: Record<string, unknown>[],
): ChunkRow[] {
  const out: ChunkRow[] = [];
  for (const row of chunks) {
    const entityIds = Reflect.get(row, "entity_ids");
    const claimIds = Reflect.get(row, "claim_ids");
    const evidIds = Reflect.get(row, "evidence_ids");
    const chunkId = Reflect.get(row, "chunk_id");
    const onlyStrings = (arr: unknown): string[] =>
      Array.isArray(arr)
        ? arr.filter((id): id is string => typeof id === "string")
        : [];

    out.push({
      chunk_id: typeof chunkId === "string" && chunkId.trim().length ? chunkId : undefined,
      entity_ids:
        Array.isArray(entityIds) && entityIds.length
          ? onlyStrings(entityIds)
          : undefined,
      claim_ids:
        Array.isArray(claimIds) && claimIds.length
          ? onlyStrings(claimIds)
          : undefined,
      evidence_ids:
        Array.isArray(evidIds) && evidIds.length
          ? onlyStrings(evidIds)
          : undefined,
    });
  }
  return out;
}
