import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { describe, expect, test } from "vitest";

import type { ProductTruthModel } from "../../src/generator/types.js";
import { composeProductDataPackage } from "../../src/generator/composePackage.js";
import { PackageGeneratorError } from "../../src/generator/errors.js";
import { publicArtifactUrl } from "../../src/generator/urlsManifest.js";
import {
  joinArtifactSubpath,
  normalizeArtifactSlug,
} from "../../src/generator/slug.js";
import { buildSitemapXml } from "../../src/generator/sitemap.js";
import {
  validateEvidencedClaimsHaveEvidenceLinks,
  validateTargetQueryCoverage,
  validateTruthModelPublicIdsUnique,
} from "../../src/generator/truthModelGuards.js";
import { findLumenMentions } from "../../src/validators/publicSurface.js";
import { CANON_DOC_SLUGS } from "../../src/generator/docs.js";

function loadFixture(): ProductTruthModel {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const abs = path.join(here, "..", "..", "fixtures", "product-truth-model.min.json");
  const raw = readFileSync(abs, "utf8");
  return JSON.parse(raw) as ProductTruthModel;
}

describe("normalizeArtifactSlug / joinArtifactSubpath", () => {
  test("slug удаляет .. и безопасен для имени файла", () => {
    expect(normalizeArtifactSlug("../Evil/../../../Segment")).not.toContain("..");
    expect(normalizeArtifactSlug("../../")).toBe("item");
  });

  test("join нормализует сегменты; сырого «..» в результате нет", () => {
    const out = joinArtifactSubpath(["..", "..", "safe", "slug"]);
    expect(out).not.toContain("..");
    expect(out.endsWith("safe/slug")).toBe(true);
  });
});

describe("validateEvidencedClaimsHaveEvidenceLinks", () => {
  test("evidenced без evidence_ids бросает PackageGeneratorError", () => {
    const ok = loadFixture();
    const bad: ProductTruthModel = {
      ...ok,
      claims: ok.claims.map((c) =>
        c.id === "claim-sync-latency"
          ? { ...c, truth_status: "evidenced" as const, evidence_ids: [] }
          : c,
      ),
    };

    expect(() => validateEvidencedClaimsHaveEvidenceLinks(bad)).toThrow(
      PackageGeneratorError,
    );
  });
});

describe("truth model guards", () => {
  test("coverage_doc_slugs должны ссылаться только на канонические docs", () => {
    const model = loadFixture();
    const bad: ProductTruthModel = {
      ...model,
      target_llm_queries: [
        {
          query: "Where is this covered?",
          coverage_doc_slugs: ["product-overview", "../private"],
        },
        ...model.target_llm_queries.slice(1),
      ],
    };

    expect(() => validateTargetQueryCoverage(bad)).toThrow(PackageGeneratorError);
  });

  test("ловит дубли публичных id после нормализации claim/evidence", () => {
    const model = loadFixture();
    const bad: ProductTruthModel = {
      ...model,
      claims: [
        ...model.claims,
        {
          id: "claim sync latency",
          statement: "Duplicate normalized claim id.",
          truth_status: "hypothesis",
        },
      ],
    };

    expect(() => validateTruthModelPublicIdsUnique(bad)).toThrow(
      PackageGeneratorError,
    );
  });
});

describe("publicArtifactUrl", () => {
  test("отклоняет traversal и внутренний сегмент lumen", () => {
    expect(() =>
      publicArtifactUrl("https://example.com/product-data", "../secret.json"),
    ).toThrow();
    expect(() =>
      publicArtifactUrl("https://example.com/product-data", "docs/lumen/readme.md"),
    ).toThrow();
  });
});

describe("composeProductDataPackage", () => {
  test("llms без Lumen; manifest содержит url и media_type; граф связей Product→Feature/Claim, Claim→Evidence", () => {
    const model = loadFixture();

    const { files, manifest } = composeProductDataPackage({
      model,
      baseUrl: "https://example.com/product-data",
      packageVersion: "9.9.9-test",
      generatedAtIso: "2026-05-17T12:00:00Z",
    });

    const llmsTxt = `${files["llms.txt"] ?? ""}`;
    expect(llmsTxt).not.toMatch(/lumen/i);

    const sitemapTxt = `${files["sitemap.xml"] ?? ""}`;
    expect(sitemapTxt.toLowerCase()).not.toMatch(/\/lumen(\/|$)/);
    expect(sitemapTxt).toContain("https://example.com/product-data/docs/product-overview.md");
    expect(sitemapTxt.toLowerCase()).not.toContain("/knowledge/product-overview");

    for (const slug of CANON_DOC_SLUGS) {
      expect(llmsTxt).toContain(`https://example.com/product-data/docs/${slug}.md`);
    }
    expect(llmsTxt.toLowerCase()).not.toMatch(/\/knowledge\//);

    const artifactsUnknown = Reflect.get(manifest as object, "artifacts");
    expect(Array.isArray(artifactsUnknown)).toBe(true);

    type Row = {
      type?: unknown;
      url?: unknown;
      media_type?: unknown;
      relative_path?: unknown;
      checksum?: unknown;
    };
    const rows = artifactsUnknown as Row[];
    rows.forEach((row) => {
      expect(typeof row.url).toBe("string");
      expect(`${String(row.url)}`.startsWith("https://example.com/product-data")).toBe(true);
      expect(typeof row.media_type).toBe("string");
      expect(`${String(row.media_type)}`).toMatch(/\S+/u);
    });

    const artifactPaths = rows.map((row) => `${String(row.relative_path)}`).sort();
    expect(artifactPaths).toEqual(Object.keys(files).sort());

    rows
      .filter((row) => row.relative_path !== "index.json")
      .forEach((row) => {
        const relativePath = `${String(row.relative_path)}`;
        const expected = createHash("sha256")
          .update(`${files[relativePath] ?? ""}`, "utf8")
          .digest("hex");
        expect(row.checksum).toBe(`sha256:${expected}`);
      });

    const canonicalDocs = rows.filter((row) => row.type === "canonical-doc");
    expect(canonicalDocs).toHaveLength(CANON_DOC_SLUGS.length);
    canonicalDocs.forEach((row) => {
      expect(row.media_type).toBe("text/markdown");
      expect(String(row.url)).toMatch(
        /^https:\/\/example\.com\/product-data\/docs\/[a-z0-9-]+\.md$/iu,
      );
      expect(String(row.url).toLowerCase()).not.toContain("/knowledge/");
    });

    type Ent = Record<string, unknown>;
    type Rel = { type?: unknown; target_id?: unknown };

    const evidenceMd = `${files["docs/evidence.md"] ?? ""}`;
    expect(evidenceMd).toContain("claim-sync-latency");
    expect(evidenceMd).toContain("evid-staging-may");

    const entityLines = `${files["entities.jsonl"] ?? ""}`
      .trim()
      .split("\n")
      .filter((ln) => ln.length > 0);

    const entities = entityLines.map((ln): Ent => JSON.parse(ln) as Ent);

    const product = entities.find((e) => e.type === "Product");

    expect(product).toBeTruthy();

    const relsUnknown = Reflect.get(product as Ent, "relations");
    const rels =
      Array.isArray(relsUnknown) ?
        relsUnknown.flatMap((r) =>
          typeof r === "object" && r !== null ?
            [(r as Rel)]
          : ([] as Rel[]))
      : ([] as Rel[]);

    expect(rels.some((r) => r.type === "product_has_claim")).toBe(true);
    expect(rels.some((r) => r.type === "product_has_feature")).toBe(true);

    const evidencedClaim = entities.find((eCandidate) =>
      Reflect.get(eCandidate as Ent, "type") === "Claim" &&
      Reflect.get(eCandidate as Ent, "truth_status") === "evidenced",
    );

    expect(evidencedClaim).toBeTruthy();

    const cRelsUnknown = Reflect.get(evidencedClaim as Ent, "relations");
    const supports =
      Array.isArray(cRelsUnknown) &&
      cRelsUnknown.some((rCandidate) =>
        typeof rCandidate !== "object" || rCandidate === null ?
          false
        : Reflect.get(rCandidate as Rel, "type") === "claim_supported_by",
      );

    expect(supports).toBe(true);

    const docTargets = Object.entries(files)
      .filter(([rel]) => rel.startsWith("docs/") && rel.endsWith(".md"))
      .map(([pathRel, content]) => ({
        kind: "file" as const,
        pathRel,
        content: `${content}`,
      }));
    expect(findLumenMentions(docTargets)).toHaveLength(0);
  });


});

describe("buildSitemapXml", () => {
  test("отклоняет URL с сегментом lumen в path", () => {
    expect(() =>
      buildSitemapXml(["https://evil.example/lumen/forbidden"]),
    ).toThrow();
  });


});
