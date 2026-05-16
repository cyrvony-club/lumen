import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { findLumenMentions } from "../src/validators/publicSurface.js";
import { findLocalFilesystemPathLeaks } from "../src/validators/localPathLeaks.js";

describe("fixture product-truth-model", () => {
  test("не содержит бренд внутреннего инструмента в тексте, копируемом в публичный пакет", () => {
    const root = path.join(import.meta.dirname, "..");
    const raw = readFileSync(
      path.join(root, "fixtures/product-truth-model.min.json"),
      "utf8",
    );
    const issues = findLumenMentions([
      { kind: "file", pathRel: "fixtures/product-truth-model.min.json", content: raw },
    ]);
    expect(issues).toHaveLength(0);
  });

  test("не содержит утечек локальных файловых путей машины разработчика", () => {
    const root = path.join(import.meta.dirname, "..");
    const raw = readFileSync(
      path.join(root, "fixtures/product-truth-model.min.json"),
      "utf8",
    );
    const leaks = findLocalFilesystemPathLeaks([
      { kind: "file", pathRel: "fixtures/product-truth-model.min.json", content: raw },
    ]);
    expect(leaks).toHaveLength(0);
  });
});
