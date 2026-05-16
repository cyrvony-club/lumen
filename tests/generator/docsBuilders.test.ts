import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import type { ProductTruthModel } from "../../src/generator/types.js";
import { findLumenMentions } from "../../src/validators/publicSurface.js";
import {
  buildCanonicalMarkdownDocs,
  buildComparisonContextDoc,
  buildEvidenceDoc,
  buildFaqDoc,
  buildProductOverviewDoc,
  buildUseCasesDoc,
} from "../../src/generator/docs.js";

function loadFixture(): ProductTruthModel {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const abs = path.join(here, "..", "..", "fixtures", "product-truth-model.min.json");
  const raw = readFileSync(abs, "utf8");
  return JSON.parse(raw) as ProductTruthModel;
}

function assertNoLumenInPublicDocs(contents: Iterable<string>): void {
  const files = [...contents].map((content, idx) => ({
    kind: "file" as const,
    pathRel: `docs/generated-${idx}.md`,
    content,
  }));
  expect(findLumenMentions(files)).toHaveLength(0);
}

describe("canonical Markdown doc builders", () => {
  const model = loadFixture();

  test("каждый билдер включает ожидаемые поля трассируемости и текст из модели", () => {
    const overview = buildProductOverviewDoc(model);
    expect(overview).toMatch(/# Product overview/);
    expect(overview).toContain("Fixture Demo App");
    expect(overview).toContain("claim_id");
    expect(overview).toContain("claim-sync-latency");
    expect(overview).toContain("truth_status");
    expect(overview).toContain(
      "Measured staging sync completes with P95 latency under three seconds during the May 2026 observation window.",
    );
    expect(overview).toMatch(/```json\n/u);

    const useCases = buildUseCasesDoc(model);
    expect(useCases).toMatch(/# Use cases/i);
    expect(useCases).toContain("Capture structured notes offline");
    expect(useCases).toContain("Teams up to 50 people");
    expect(useCases).toContain("Structured snapshot (`positioning` verbatim)");
    expect(useCases).toMatch(/```json\n/u);

    const cmp = buildComparisonContextDoc(model);
    expect(cmp).toMatch(/# Comparison context/);
    expect(cmp).toContain("Generic Notes Suite");
    expect(cmp).toContain('Structured snapshot (`competitor_context` verbatim)');
    expect(cmp).toMatch(/```json\n/u);

    const faq = buildFaqDoc(model);
    expect(faq).toMatch(/# FAQ scaffolding/);
    expect(faq).toContain("Do not promise certifications");
    expect(faq).toContain("What problems does Fixture Demo App solve?");
    expect(faq).toContain("fixture-owner@example.com");
    expect(faq).toContain("Structured snapshot (`policy_constraints` verbatim)");
    expect(faq).toContain("Structured snapshot (`target_llm_queries` verbatim)");

    const ev = buildEvidenceDoc(model);
    expect(ev).toMatch(/# Evidence ledger/);
    expect(ev).toContain("evidence_id");
    expect(ev).toContain("evid-staging-may");
    expect(ev).toContain("hypothesis");
    expect(ev).toContain("benchmark");
    expect(ev).toContain("Structured tracing snapshot (`claims` + `evidence` verbatim)");
  });

  test("buildCanonicalMarkdownDocs собирает все пять slug и содержимое без Lumen", () => {
    const docs = buildCanonicalMarkdownDocs(model);
    expect(Object.keys(docs)).toEqual([
      "product-overview",
      "use-cases",
      "comparison-context",
      "faq",
      "evidence",
    ]);
    assertNoLumenInPublicDocs(Object.values(docs));
    expect(findLumenMentions([{ kind: "file", pathRel: "x", content: model.brief.short_description }])).toHaveLength(0);
  });

  test("пустые optional блоки позиционирования не ломают use-cases", () => {
    const minimal = {
      ...model,
      positioning: {},
    };
    expect(buildUseCasesDoc(minimal)).toContain("(no positioning fields present in source model)");
  });
});
