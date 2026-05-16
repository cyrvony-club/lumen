#!/usr/bin/env node
/** Проверка JSONL экспортов против schema/entity.schema.json и schema/chunk.schema.json */

import path from "node:path";
import { pathUp } from "../lib/paths.js";
import { compileSchemaFolder } from "../validators/schemaBundle.js";
import { validateJsonlFileAgainstSchema } from "../validators/jsonlAgainstSchema.js";
import { emitIssues, throwExpected, runCli, type Issue } from "../lib/exit.js";

const SCOPE = "validate:exports";

async function main(): Promise<number> {
  const repoRootAbs = pathUp(import.meta.url, 2);
  const bundle = await compileSchemaFolder(path.join(repoRootAbs, "schema"));

  const entityCompile = bundle.compilers.entity;
  const chunkCompile = bundle.compilers.chunk;
  if (!entityCompile || !chunkCompile) {
    throwExpected("компиляторы entity/chunk не найдены в schema/");
  }

  const issuesAccumulator: Issue[] = [];

  const entities = await validateJsonlFileAgainstSchema({
    repoRootAbs,
    relPath: "exports/entities.jsonl",
    validateFn: entityCompile,
  });

  entities.issues.forEach((issue) => issuesAccumulator.push(issue));

  const chunks = await validateJsonlFileAgainstSchema({
    repoRootAbs,
    relPath: "exports/chunks.jsonl",
    validateFn: chunkCompile,
  });

  chunks.issues.forEach((issue) => issuesAccumulator.push(issue));

  const genEntities = await validateJsonlFileAgainstSchema({
    repoRootAbs,
    relPath: "generated/product-data/entities.jsonl",
    validateFn: entityCompile,
    silentIfMissing: true,
  });
  genEntities.issues.forEach((issue) => issuesAccumulator.push(issue));

  const genChunks = await validateJsonlFileAgainstSchema({
    repoRootAbs,
    relPath: "generated/product-data/chunks.jsonl",
    validateFn: chunkCompile,
    silentIfMissing: true,
  });
  genChunks.issues.forEach((issue) => issuesAccumulator.push(issue));

  return emitIssues(SCOPE, issuesAccumulator);
}

runCli(SCOPE, () => main());
