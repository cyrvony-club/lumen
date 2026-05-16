import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

export async function readUtf8Maybe(
  absolutePath: string,
): Promise<string | undefined> {
  if (!existsSync(absolutePath)) return undefined;
  return await readFile(absolutePath, "utf8");
}
