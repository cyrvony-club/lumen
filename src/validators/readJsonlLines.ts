/** Parse JSONL skipping empty lines; report line diagnostics. */

import type { Issue } from "../lib/exit.js";

export type JsonlProblem = {
  line: number;
  issues: Issue[];
};

export function parseJsonLines(
  text: string,
  lineIssue: (
    idx: unknown,
    lineNo: number,
  ) =>
    | { ok: true; value: Record<string, unknown> }
    | { ok: false; issues: Issue[] },
): { okLines: Record<string, unknown>[]; problems: JsonlProblem[] } {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const okLines: Record<string, unknown>[] = [];
  const problems: JsonlProblem[] = [];

  lines.forEach((raw, i) => {
    const trimmed = raw.trim();
    const lineNo = i + 1;
    if (trimmed === "") return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch (e) {
      const msg =
        e instanceof Error ? e.message.replace(/\n+/g, " ") : String(e);
      problems.push({
        line: lineNo,
        issues: [
          {
            severity: "error",
            code: "json_syntax",
            message: `строка ${lineNo}: невалидный JSON (${msg})`,
          },
        ],
      });
      return;
    }
    const verdict = lineIssue(parsed, lineNo);
    if (verdict.ok) okLines.push(verdict.value);
    else {
      problems.push({ line: lineNo, issues: verdict.issues });
    }
  });

  return { okLines, problems };
}

/** Собирает диагностики JSONL в Issues с понятным префиксом файла. */

export function jsonlProblemsToIssues(
  relPath: string,
  problems: JsonlProblem[],
): Issue[] {
  const out: Issue[] = [];
  for (const p of problems) {
    const lineLabel = `${relPath}:${p.line}`;
    for (const issue of p.issues) {
      const msg = issue.message;
      out.push({
        severity: issue.severity,
        code: issue.code,
        message:
          typeof msg === "string"
            ? msg.startsWith(`${relPath}:`)
              ? msg
              : `${lineLabel}: ${msg}`
            : lineLabel,
        detail: issue.detail,
      });
    }
  }
  return out;
}
