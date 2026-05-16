import { describe, expect, test } from "vitest";
import {
  checkChunkEvidenceLinks,
  checkDuplicateChunkIds,
  checkRelationsDirection,
} from "../src/validators/packageConsistency.js";

describe("checkRelationsDirection", () => {
  test("сообщает ошибку когда product_has_feature исходит не от Product", () => {
    const issues = [
      ...checkRelationsDirection({
        entities: [
          {
            id: "feat",
            type: "Feature",
            relations: [{ type: "product_has_feature", target_id: "prod" }],
          },
        ],
      }),
    ];

    expect(issues.some((i) => i.code === "relation_wrong_subject")).toBe(true);
  });

  test("пропускает нейтральную цепочку Product → Claim → Evidence", () => {
    const issues = [
      ...checkRelationsDirection({
        entities: [
          {
            id: "p",
            type: "Product",
            relations: [{ type: "product_has_claim", target_id: "c" }],
          },
          {
            id: "c",
            type: "Claim",
            relations: [{ type: "claim_supported_by", target_id: "e" }],
          },
          { id: "e", type: "Evidence", relations: [] },
        ],
      }),
    ];

    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });
});

describe("checkChunkEvidenceLinks", () => {
  test("сообщает, если entity_ids упоминает Claim, но не в claim_ids", () => {
    const map = new Map<string, string>([
      ["c1", "Claim"],
      ["e1", "Evidence"],
    ]);

    const issues = [
      ...checkChunkEvidenceLinks({
        entitiesById: map,
        chunks: [{ entity_ids: ["c1", "e1"], evidence_ids: ["e1"] }],
      }),
    ];

    expect(issues.some((i) => i.code === "chunk_claim_ids_incomplete")).toBe(
      true,
    );

    expect(
      issues.some((i) => i.code === "chunk_evidence_ids_incomplete"),
    ).toBe(false);
  });
});

describe("checkDuplicateChunkIds", () => {
  test("сообщает о повторном chunk_id", () => {
    const issues = [
      ...checkDuplicateChunkIds({
        chunks: [
          { chunk_id: "chunk.docs.faq" },
          { chunk_id: "chunk.docs.faq" },
        ],
      }),
    ];

    expect(issues.some((i) => i.code === "chunk_duplicate_id")).toBe(true);
  });
});
