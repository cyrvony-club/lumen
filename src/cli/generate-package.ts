#!/usr/bin/env node
/**
 * Генерация product knowledge package в `generated/product-data/` из `product-truth-model.json`.
 */

import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { pathUp } from "../lib/paths.js";
import { throwExpected, runCli } from "../lib/exit.js";
import { compileSchemaFolder, stringifyAjvErrors } from "../validators/schemaBundle.js";
import { composeProductDataPackage } from "../generator/composePackage.js";
import { PackageGeneratorError } from "../generator/errors.js";
import type { ProductTruthModel } from "../generator/types.js";

function argvValue(flag: string): string | undefined {
  const needle = `--${flag}`;
  const hit = process.argv.findIndex((a) => a === needle || a.startsWith(`${needle}=`));

  if (hit < 0) return undefined;
  const raw = process.argv[hit] ?? "";
  if (raw.includes("=")) return `${raw.split("=").slice(1).join("=").trim()}`;
  return `${process.argv[hit + 1] ?? ""}`.trim() || undefined;
}

const SCOPE = "generate:package";

async function main(): Promise<number> {
  const repoRoot = pathUp(import.meta.url, 2);
  const baseUrlFlag = argvValue("base-url");

  const packageVersionFlag = argvValue("package-version");

  const rawInput = argvValue("input") ?? "product-truth-model.json";
  const inputAbs = path.isAbsolute(rawInput)
    ? path.normalize(rawInput)
    : path.join(repoRoot, rawInput);

  const rawOutput = argvValue("output") ?? "generated/product-data";
  const outDir = path.isAbsolute(rawOutput)
    ? path.normalize(rawOutput)
    : path.join(repoRoot, rawOutput);

  const baseUrlDefault = "https://example.com/product-data";

  const baseUrl = (baseUrlFlag ?? baseUrlDefault).replace(/\/+$/u, "");

  const packageVersion = `${packageVersionFlag ?? "0.0.0-local"}`.trim() || "0.0.0-local";

  if (!existsSync(inputAbs)) {
    throwExpected(
      `Не найден входной файл: ${inputAbs}. Укажите путь через --input <path/to/product-truth-model.json>`,
    );
  }

  let rawText: string;
  try {
    rawText = await readFile(inputAbs, "utf8");
  } catch {
    throwExpected(`Не удалось прочитать файл: ${inputAbs}`);
  }

  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(rawText) as unknown;
  } catch {
    throwExpected("JSON.parse: повреждённый или не-JSON вход");
  }

  const schemaDir = path.join(repoRoot, "schema");

  try {
    const bundle = await compileSchemaFolder(schemaDir);
    const validateTruth = bundle.compilers["product-truth-model"];

    if (!validateTruth) {
      console.error(`[${SCOPE}] схема product-truth-model не скомпилирована`);
      return 1;
    }

    if (!validateTruth(parsedUnknown)) {
      console.error(`[${SCOPE}] Вход не проходит JSON Schema product-truth-model:`);
      console.error(stringifyAjvErrors(validateTruth.errors));
      return 1;
    }

    const model = parsedUnknown as ProductTruthModel;

    const generatedAtIso = new Date().toISOString();

    const payload = composeProductDataPackage({
      model,
      baseUrl,
      packageVersion,
      generatedAtIso,
    });

    await mkdir(outDir, { recursive: true });

    const entries = Object.entries(payload.files);

    for (const [relativePath, utf8] of entries) {
      const destination = path.join(outDir, relativePath);

      await mkdir(path.dirname(destination), { recursive: true });

      await writeFile(destination, utf8, "utf8");
    }

    console.error(`[${SCOPE}] OK → ${outDir}`);
    return 0;
  } catch (e) {
    if (e instanceof PackageGeneratorError) throwExpected(e.message);
    throw e;
  }
}

runCli(SCOPE, () => main());
