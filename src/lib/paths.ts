import { fileURLToPath } from "node:url";
import path from "node:path";

/** Поднимается от файла модул ES на указанное число уровней (2 — из src/cli или src/lib в корень). */

export function pathUp(importMetaUrl: string, levels: number): string {
  const rel = [...Array(levels)].map(() => "../").join("");
  const base = `${rel}${rel.length ? "" : "."}`;
  return path.resolve(fileURLToPath(new URL(base, importMetaUrl)));
}
