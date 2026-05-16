/** Публичный URL артефакта; base без завершающего `/`. */

import type { ProductTruthModel } from "./types.js";

export function publicArtifactUrl(
  packageBaseUrl: string,
  relativePathPosix: string,
): string {
  const trimmedBase = `${packageBaseUrl}`.replace(/\/+$/u, "");
  const rel =
    `${relativePathPosix}`
      .replace(/^\/+/u, "")
      .replace(/\\/gu, "/")
      .trim() || "";

  const segments = rel.split("/").filter(Boolean);

  if (
    segments.length === 0 ||
    segments.some((s) => s === "." || s === ".." || s.toLowerCase() === "lumen")
  )
    throw new Error("Публичные сегменты пути должны быть безопасными POSIX-сегментами");

  return `${trimmedBase}/${segments.join("/")}`;
}

/** Текст `llms.txt`: только нейтральные формулировки и переданный base URL. */

export function buildLlmsTxt(params: {
  readonly manifestUrl: string;
  readonly artifactUrls: readonly string[];
}): string {
  const uniq = [...new Set([params.manifestUrl, ...params.artifactUrls])].sort();

  const lines: string[] = [
    `# LLM-readable product data package`,
    ``,
    `Machine-readable manifests and exports:`,
    ...uniq.map((u) => `- ${u}`),
    ``,
  ];

  const body = `${lines.join("\n")}\n`;

  if (/lumen/i.test(body))
    throw new Error("Внутреннее: запрещённые упоминания бренда в llms.txt");

  return body;
}

export function buildManifestIndex(params: {
  readonly model: ProductTruthModel;
  readonly packageVersion: string;
  readonly generatedAt: string;
  readonly baseUrl: string;
  readonly artifacts: readonly {
    readonly type: string;
    readonly relative_path: string;
    readonly media_type: string;
    readonly checksum?: string;
  }[];
}): Record<string, unknown> {
  const rows = params.artifacts.map((row) => {
    const base = {
      type: row.type,
      url: publicArtifactUrl(params.baseUrl, row.relative_path),
      media_type: row.media_type,
      relative_path: row.relative_path,
    };

    return row.checksum !== undefined ? { ...base, checksum: row.checksum } : base;
  });

  return {
    schema_version: "package-index.min.v1",
    package_version: params.packageVersion,
    generated_at: params.generatedAt,
    product_id: params.model.product_id,
    base_url: params.baseUrl.replace(/\/+$/u, ""),
    artifacts: rows,
  };
}
