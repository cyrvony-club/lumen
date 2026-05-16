/** Поиск упоминаний имени локального инструмента на публичной поверхности артефактов. */

import type { Issue } from "../lib/exit.js";

const LUMEN_RE = /\blumen\b/i;

export type PublicScanTarget =
  | { kind: "file"; pathRel: string; content: string }
  | {
      kind: "jsonl_line";
      pathRel: string;
      lineNo: number;
      content: string;
    };

export function findLumenMentions(files: Iterable<PublicScanTarget>): Issue[] {
  const hits: Issue[] = [];
  for (const entry of files) {
    const text = scanText(entry.content);
    if (!text.hit) continue;
    hits.push({
      severity: "error",
      code: "public_forbidden_tool_name",
      message:
        entry.kind === "jsonl_line"
          ? `${entry.pathRel}:${entry.lineNo}: в публичном артефакте недопустимо упоминание «Lumen»`
          : `${entry.pathRel}: в публичном артефакте недопустимо упоминание «Lumen»`,
      detail: text.snippet,
    });
  }
  return hits;
}

function scanText(content: string): { hit: boolean; snippet?: string } {
  const idx = content.search(LUMEN_RE);
  if (idx === -1) return { hit: false };
  const start = Math.max(0, idx - 48);
  const end = Math.min(content.length, idx + 72);
  return { hit: true, snippet: `${content.slice(start, end)}\n(...)` };
}
