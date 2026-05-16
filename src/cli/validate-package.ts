#!/usr/bin/env node
/** Синтаксис фидов, запрет упоминаний локального имени инструмента и типичных локальных абсолютных путей в публичных артефактах, согласованность связей и графа. */

import path from "node:path";
import { parse as parseYaml } from "yaml";
import { pathUp } from "../lib/paths.js";
import { readUtf8Maybe } from "../lib/fs.js";
import { emitIssues, runCli, type Issue } from "../lib/exit.js";
import {
  jsonlProblemsToIssues,
  parseJsonLines,
} from "../validators/readJsonlLines.js";
import {
  findLumenMentions,
  type PublicScanTarget,
} from "../validators/publicSurface.js";
import { findLocalFilesystemPathLeaks } from "../validators/localPathLeaks.js";
import {
  checkRelationsDirection,
  checkClaimEvidenceGraph,
  checkChunkEvidenceLinks,
  checkDuplicateChunkIds,
  type MinimalEntityRow,
} from "../validators/packageConsistency.js";
import {
  coerceChunkRecords,
  diffGraphAgainstEntities,
  type GraphPack,
} from "../validators/graphAlignment.js";
import { CANON_DOC_SLUGS } from "../generator/docs.js";

const OPTIONAL_PUBLIC_REL = [
  "product-truth-model.json",
  "llms.txt",
  "index.json",
] as const;

async function addWholeFileTargets(
  repoRootAbs: string,
  relPath: string,
  targets: PublicScanTarget[],
): Promise<void> {
  const text = await readUtf8Maybe(path.join(repoRootAbs, relPath));
  if (text === undefined) return;
  targets.push({
    kind: "file",
    pathRel: relPath,
    content: text,
  });
}

async function parseJsonLinesForPackage(
  repoRootAbs: string,
  relPath: string,
  targets: PublicScanTarget[],
  silentMissing = false,
): Promise<{ parsed: Record<string, unknown>[]; issues: Issue[] }> {
  const text = await readUtf8Maybe(path.join(repoRootAbs, relPath));
  if (text === undefined)
    return {
      parsed: [],
      issues:
        silentMissing
          ? ([] as Issue[])
          : [
              {
                severity: "warn" as const,
                code: "jsonl_missing",
                message: `${relPath} отсутствует — связанные проверки пропущены`,
              },
            ],
    };

  targets.push({
    kind: "file",
    pathRel: relPath,
    content: text,
  });

  const { okLines, problems } = parseJsonLines(text, (rowUnknown, lineNo) => {
    const lineTextRaw = text.split("\n");
    const lineText = `${lineTextRaw[lineNo - 1] ?? ""}`.trimEnd();
    targets.push({
      kind: "jsonl_line",
      pathRel: relPath,
      lineNo,
      content: lineText,
    });

    if (
      typeof rowUnknown === "object" &&
      rowUnknown !== null &&
      !Array.isArray(rowUnknown)
    )
      return { ok: true, value: rowUnknown as Record<string, unknown> };

    return {
      ok: false,
      issues: [
        {
          severity: "error" as const,
          code: "package_json_shape",
          message: `${relPath}:${lineNo}: JSONL ожидал объект верхнего уровня`,
        },
      ],
    };
  });

  const issues = jsonlProblemsToIssues(relPath, problems);

  return { parsed: okLines, issues };
}

const SCOPE = "validate-package";

async function main(): Promise<number> {
  const repoRootAbs = pathUp(import.meta.url, 2);
  const issues: Issue[] = [];

  const openapiText = await readUtf8Maybe(
    path.join(repoRootAbs, "api/openapi.yaml"),
  );
  if (!openapiText)
    issues.push({
      severity: "warn",
      code: "openapi_missing",
      message: `api/openapi.yaml отсутствует`,
    });
  else {
    try {
      const doc = parseYaml(openapiText) as unknown;
      if (typeof doc !== "object" || doc === null)
        issues.push({
          severity: "error",
          code: "openapi_yaml_shape",
          message: `api/openapi.yaml: YAML должен разбираться в объект`,
        });
      else {
        const openapiKey = Reflect.get(doc as object, "openapi");
        const swaggerKey = Reflect.get(doc as object, "swagger");
        const hasMarker =
          (typeof openapiKey === "string" && openapiKey.length > 0) ||
          typeof swaggerKey === "string";
        if (!hasMarker)
          issues.push({
            severity: "error",
            code: "openapi_marker",
            message: `api/openapi.yaml: ожидается openapi или swagger`,
          });
      }
    } catch (e) {
      issues.push({
        severity: "error",
        code: "openapi_yaml_parse",
        message: `api/openapi.yaml: ошибка YAML (${e instanceof Error ? e.message.replace(/\s+/g, " ") : String(e)})`,
      });
    }
  }

  const updatesText = await readUtf8Maybe(
    path.join(repoRootAbs, "feeds/updates.json"),
  );
  if (!updatesText)
    issues.push({
      severity: "warn",
      code: "updates_missing",
      message: `feeds/updates.json отсутствует`,
    });
  else {
    try {
      const parsed = JSON.parse(updatesText) as unknown;
      if (typeof parsed !== "object" || parsed === null)
        issues.push({
          severity: "error",
          code: "updates_json_shape",
          message: `feeds/updates.json ожидал JSON-объект`,
        });
    } catch (e) {
      issues.push({
        severity: "error",
        code: "updates_json_parse",
        message: `feeds/updates.json: ${e instanceof Error ? e.message.replace(/\s+/g, " ") : String(e)}`,
      });
    }
  }

  const graphTxt = await readUtf8Maybe(
    path.join(repoRootAbs, "exports/graph.json"),
  );
  let graphUnknown: GraphPack | undefined;
  if (!graphTxt)
    issues.push({
      severity: "warn",
      code: "graph_missing",
      message: `exports/graph.json отсутствует — diff с графом пропускается`,
    });
  else {
    try {
      graphUnknown = JSON.parse(graphTxt) as GraphPack;
    } catch (e) {
      issues.push({
        severity: "error",
        code: "graph_json_parse",
        message: `exports/graph.json: ${e instanceof Error ? e.message.replace(/\s+/g, " ") : String(e)}`,
      });
      graphUnknown = undefined;
    }
  }

  const targets: PublicScanTarget[] = [];

  for (const rel of OPTIONAL_PUBLIC_REL)
    await addWholeFileTargets(repoRootAbs, rel, targets);

  await addWholeFileTargets(repoRootAbs, "feeds/updates.json", targets);
  await addWholeFileTargets(repoRootAbs, "exports/graph.json", targets);

  const chunksOut = await parseJsonLinesForPackage(
    repoRootAbs,
    "exports/chunks.jsonl",
    targets,
  );

  issues.push(...chunksOut.issues);

  const entitiesOut = await parseJsonLinesForPackage(
    repoRootAbs,
    "exports/entities.jsonl",
    targets,
  );
  issues.push(...entitiesOut.issues);

  const generatedPrefix = "generated/product-data/";
  const genChunksOut = await parseJsonLinesForPackage(
    repoRootAbs,
    `${generatedPrefix}chunks.jsonl`,
    targets,
    true,
  );
  issues.push(...genChunksOut.issues);

  const genEntitiesOut = await parseJsonLinesForPackage(
    repoRootAbs,
    `${generatedPrefix}entities.jsonl`,
    targets,
    true,
  );
  issues.push(...genEntitiesOut.issues);

  const generatedWholeArtifacts = [
    `${generatedPrefix}llms.txt`,
    `${generatedPrefix}index.json`,
    `${generatedPrefix}product-truth-model.json`,
    `${generatedPrefix}updates.json`,
    `${generatedPrefix}graph.json`,
    `${generatedPrefix}sitemap.xml`,
  ] as const;

  for (const relUnknown of generatedWholeArtifacts)
    await addWholeFileTargets(repoRootAbs, relUnknown, targets);

  for (const slugUnknown of CANON_DOC_SLUGS)
    await addWholeFileTargets(
      repoRootAbs,
      `${generatedPrefix}docs/${slugUnknown}.md`,
      targets,
    );

  issues.push(...findLumenMentions(targets));
  issues.push(...findLocalFilesystemPathLeaks(targets));

  const entities = entitiesOut.parsed as MinimalEntityRow[];

  issues.push(...checkRelationsDirection({ entities }));
  issues.push(...checkClaimEvidenceGraph({ entities }));

  const idsToType = new Map<string, string>();
  entitiesOut.parsed.forEach((row) => {
    if (typeof row.id !== "string" || typeof row.type !== "string") return;
    const id = row.id.trim();
    const tt = row.type.trim();
    if (id.length && tt.length) idsToType.set(id, tt);
  });

  issues.push(
    ...checkChunkEvidenceLinks({
      entitiesById: idsToType,
      chunks: coerceChunkRecords(chunksOut.parsed),
    }),
  );
  issues.push(...checkDuplicateChunkIds({ chunks: coerceChunkRecords(chunksOut.parsed) }));

  if (graphUnknown && entitiesOut.parsed.length)
    issues.push(
      ...diffGraphAgainstEntities({
        entitiesJsonl: entitiesOut.parsed,
        graphUnknown,
        graphPathRel: "exports/graph.json",
      }),
    );

  if (genEntitiesOut.parsed.length) {

    const genEntities = genEntitiesOut.parsed as MinimalEntityRow[];
    issues.push(...checkRelationsDirection({ entities: genEntities }));
    issues.push(...checkClaimEvidenceGraph({ entities: genEntities }));

    const idsGen = new Map<string, string>();
    genEntitiesOut.parsed.forEach((row) => {
      if (typeof row.id !== "string" || typeof row.type !== "string") return;
      const id = row.id.trim();
      const tt = row.type.trim();
      if (id.length && tt.length) idsGen.set(id, tt);
    });

    issues.push(
      ...checkChunkEvidenceLinks({
        entitiesById: idsGen,
        chunks: coerceChunkRecords(genChunksOut.parsed),
      }),
    );
    issues.push(
      ...checkDuplicateChunkIds({ chunks: coerceChunkRecords(genChunksOut.parsed) }),
    );

    const genGraphTxt = await readUtf8Maybe(
      path.join(repoRootAbs, `${generatedPrefix}graph.json`),
    );

    if (genGraphTxt) {
      try {
        const parsedGraph = JSON.parse(genGraphTxt) as GraphPack;

        issues.push(
          ...diffGraphAgainstEntities({
            entitiesJsonl: genEntitiesOut.parsed,
            graphUnknown: parsedGraph,
            graphPathRel: `${generatedPrefix}graph.json`,
          }),
        );
      } catch (e) {

        issues.push({
          severity: "error",
          code: "graph_json_parse",
          message: `${generatedPrefix}graph.json: ${e instanceof Error ? e.message.replace(/\s+/g, " ") : String(e)}`,
        });


      }


    }



  }



  return emitIssues(SCOPE, issues);
}

runCli(SCOPE, () => main());
