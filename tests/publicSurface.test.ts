import { describe, expect, test } from "vitest";
import { findLumenMentions } from "../src/validators/publicSurface.js";

describe("findLumenMentions", () => {
  test("нет ложных срабатываний на нейтральный текст", () => {
    expect(
      findLumenMentions([
        {
          kind: "file",
          pathRel: "exports/mock.json",
          content: `{ "slug": "/product-data/docs"}`,
        },
      ]),
    ).toHaveLength(0);
  });

  test("ловит упоминание бренда в публичном артефакте", () => {
    expect(
      findLumenMentions([
        {
          kind: "file",
          pathRel: "exports/bad.json",
          content: "Use Lumen to export data.",
        },
      ]),
    ).toHaveLength(1);
  });
});
