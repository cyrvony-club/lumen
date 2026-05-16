/** Обнаружение типичных локальных абсолютных/рабочих путей в публичных артефактах пакета. */

import type { Issue } from "../lib/exit.js";
import type { PublicScanTarget } from "./publicSurface.js";

const MARKERS = [
  { substring: "/Users/", code: "public_local_path_mac_users" },
  { substring: "workspace/", code: "public_local_path_workspace" },
  { substring: "Developer/Projects", code: "public_local_path_developer_projects" },
] as const;

export function findLocalFilesystemPathLeaks(
  targets: Iterable<PublicScanTarget>,
): Issue[] {
  const hits: Issue[] = [];
  for (const entry of targets) {
    for (const marker of MARKERS) {
      const idx = entry.content.indexOf(marker.substring);
      if (idx === -1) continue;
      const start = Math.max(0, idx - 40);
      const end = Math.min(entry.content.length, idx + marker.substring.length + 48);

      hits.push({
        severity: "error",
        code: marker.code,
        message:
          entry.kind === "jsonl_line"
            ? `${entry.pathRel}:${entry.lineNo}: в публичном артефакте недопустимы локальные пути машины разработчика`
            : `${entry.pathRel}: в публичном артефакте недопустимы локальные пути машины разработчика`,
        detail: `${entry.content.slice(start, end)}\n(...)`,
      });
    }
  }
  return hits;
}
