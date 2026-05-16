import path from "node:path";
import type { ValidateFunction } from "ajv";
import { readUtf8Maybe } from "../lib/fs.js";
import type { Issue } from "../lib/exit.js";
import { parseJsonLines } from "./readJsonlLines.js";
import { stringifyAjvErrors } from "./schemaBundle.js";

export async function validateJsonlFileAgainstSchema(params: {
  readonly repoRootAbs: string;
  readonly relPath: string;
  readonly validateFn: ValidateFunction<unknown>;
  readonly silentIfMissing?: boolean;
}): Promise<{
  parsedObjects: Record<string, unknown>[];
  issues: Issue[];
}> {
  const absolute = path.join(params.repoRootAbs, params.relPath);
  const textMaybe = await readUtf8Maybe(absolute);
  if (textMaybe === undefined) {
    return {
      parsedObjects: [],
      issues:
        params.silentIfMissing === true ?
          ([] as Issue[])
        : [
            {
              severity: "warn",
              code: "jsonl_missing",
              message: `файл ${params.relPath} отсутствует — экспорт можно пропустить`,
            },
          ],
    };
  }

  const result = parseJsonLines(textMaybe, (rowUnknown, lineNo) => {
    const row =
      rowUnknown !== null && typeof rowUnknown === "object"
        ? (rowUnknown as Record<string, unknown>)
        : undefined;
    if (!row)
      return {
        ok: false,
        issues: [
          {
            severity: "error",
            code: "json_shape",
            message: `${params.relPath}:${lineNo}: JSON-строка должна описывать объект`,
          },
        ],
      };
    const ok = params.validateFn(row);
    if (ok)
      return {
        ok: true,
        value: row,
      };
    return {
      ok: false,
      issues: [
        {
          severity: "error",
          code: "json_schema",
          message: `${params.relPath}:${lineNo}: не соответствует JSON Schema (${stringifyAjvErrors(params.validateFn.errors)})`,
        },
      ],
    };
  });

  const issues: Issue[] = [];
  result.problems.forEach((problem) =>
    problem.issues.forEach((issue) => issues.push(issue)),
  );

  return { parsedObjects: result.okLines, issues };
}
