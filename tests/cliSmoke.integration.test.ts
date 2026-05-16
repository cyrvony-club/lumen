import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** Корень репозитория: `tests/` → `..`. */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runTsxScript(
  relativeScript: string,
  extraArgs: string[],
): { status: number | null; stderr: string } {
  const scriptAbs = path.join(repoRoot, relativeScript);
  const r = spawnSync("npx", ["tsx", scriptAbs, ...extraArgs], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
  return { status: r.status, stderr: r.stderr ?? "" };
}

describe("CLI (интеграция)", () => {
  it("generate-package: отсутствует --input → exit 1 без Node stack (`at …`)", () => {
    const miss = path.join(
      repoRoot,
      "__fixture_missing_models__",
      `nonexistent-${Date.now()}.json`,
    );
    const { status, stderr } = runTsxScript("src/cli/generate-package.ts", [
      "--input",
      miss,
    ]);

    expect(status).toBe(1);
    expect(stderr).toMatch(/\[generate:package\]/);
    expect(stderr.toLowerCase()).toContain("input");
    expect(stderr).not.toMatch(/\n\s+at\s+\S+\s+\(/);
  });
});
