#!/usr/bin/env node
/**
 * Компилирует JSON Schema каталог schema/, при наличии product-truth-model.json в корне проверяет его.
 */

import path from "node:path";
import { readUtf8Maybe } from "../lib/fs.js";
import { throwExpected, runCli } from "../lib/exit.js";
import { pathUp } from "../lib/paths.js";
import { compileSchemaFolder, stringifyAjvErrors } from "../validators/schemaBundle.js";

const SCOPE = "validate:schema";

async function main(): Promise<number> {
  const repoRootAbs = pathUp(import.meta.url, 2);
  console.error(`[${SCOPE}] compile schema/`);
  const bundle = await compileSchemaFolder(path.join(repoRootAbs, "schema"));
  const rel = "product-truth-model.json";
  const rawMaybe = await readUtf8Maybe(path.join(repoRootAbs, rel));
  if (!rawMaybe) {
    console.error(
      `[${SCOPE}] skip ${rel}: файл отсутствует (это допустимо на раннем этапе)`,
    );
    return 0;
  }

  const compilers = bundle.compilers;
  const validator = compilers["product-truth-model"];
  if (!validator) {
    console.error(`[${SCOPE}] ERR: компилятор product-truth-model не найден`);
    return 1;
  }

  let docUnknown: unknown;
  try {
    docUnknown = JSON.parse(rawMaybe);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throwExpected(`ошибка парсинга JSON: ${rel} (${detail})`);
  }

  if (typeof docUnknown !== "object" || docUnknown === null)
    throwExpected(`${rel}: документ должен быть JSON-объектом`);

  const ok = validator(docUnknown);
  if (ok) {
    console.error(`[${SCOPE}] OK ${rel}`);
    return 0;
  }

  console.error(`[${SCOPE}] FAIL ${rel}`);
  console.error(stringifyAjvErrors(validator.errors));
  return 1;
}

runCli(SCOPE, () => main());
