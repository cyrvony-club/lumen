/** Безопасный сегмент пути/url-slug без `..`, разделителей и управляющих символов. */

const MAX_SEGMENT_LEN = 120;

export function normalizeArtifactSlug(raw: string): string {
  const collapsed = `${raw}`
    .trim()
    .toLowerCase()
    .replace(/\.\./g, "")
    .replace(/[/\\\0\n\r\t\u202e]/g, "-")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  const segment = collapsed.slice(0, MAX_SEGMENT_LEN).replace(/^-+|-+$/g, "");
  return segment.length ? segment : "item";
}

export function joinArtifactSubpath(parts: readonly string[]): string {
  const norm = parts.map((p) => normalizeArtifactSlug(p));
  const joined = norm.join("/").replace(/\/{2,}/g, "/");
  const safe = joined
    .split("/")
    .filter((s) => s.length && s !== "." && s !== "..")
    .join("/");
  return safe;
}
