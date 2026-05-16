import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readdir } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Собираем Ajv 2020-12 и загружаем schema/*.schema.json. */

export type SchemaBundle = {
  ajv: Ajv2020;
  compilers: Record<string, ValidateFunction<unknown>>;
};

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors?.length) return "(unknown)";
  const lines = errors.map((err) =>
    `${err.instancePath || "/"} ${err.message ?? "?"} (${err.keyword})`.trim(),
  );
  return lines.join("\n");
}

export async function compileSchemaFolder(
  schemaDirAbsolute: string,
): Promise<SchemaBundle> {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
  });
  void (
    /** CJS-плагин `ajv-formats` под NodeNext требует явного bridge для типов. */
    addFormats as unknown as (instance: InstanceType<typeof Ajv2020>) => InstanceType<
      typeof Ajv2020
    >
  )(ajv);

  const files = await readdir(schemaDirAbsolute);
  const compilers: Record<string, ValidateFunction<unknown>> = {};

  for (const name of files.sort()) {
    if (!name.endsWith(".schema.json")) continue;
    const full = path.join(schemaDirAbsolute, name);
    const raw = await readFile(full, "utf8");
    let schemaUnknown: unknown;
    try {
      schemaUnknown = JSON.parse(raw);
    } catch (e) {
      throw new Error(
        `${full}: невалидный JSON (${e instanceof Error ? e.message : String(e)})`,
      );
    }
    const key = path.basename(name, ".schema.json").replace(/^.*\//, "");
    compilers[key] = ajv.compile(schemaUnknown as object);
  }

  const bundle = { ajv, compilers };
  return bundle;
}

export function stringifyAjvErrors(
  errors: ErrorObject[] | null | undefined,
): string {
  return formatAjvErrors(errors);
}
