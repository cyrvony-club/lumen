/** Экранирование для XML text внутри `<loc>`. */

export function escapeXmlLoc(text: string): string {
  return `${text}`
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function assertNeutralUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("sitemap.xml: ожидается абсолютный http(s) URL");
  }

  if (!/^https?:$/iu.test(parsed.protocol))
    throw new Error("sitemap.xml: только схемы http и https");

  const hasLumenSegment = parsed.pathname
    .split("/")
    .some((segment) => segment.toLowerCase() === "lumen");

  if (hasLumenSegment)
    throw new Error("sitemap.xml: путь не должен содержать сегмент lumen");
}


/** Минимальный `urlset`; только http(s) локации, без `/lumen/` в path. */

export function buildSitemapXml(locations: readonly string[]): string {


  const uniq = [...new Set(locations.map((u) => `${u}`.trim()))].filter(Boolean).sort();

  const urls = uniq.filter((candidate) => /^https?:\/\//iu.test(candidate));

  urls.forEach(assertNeutralUrl);



  const rows = urls.map(
    (href) => `  <url><loc>${escapeXmlLoc(href)}</loc></url>`,

  );

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${rows.join("\n")}\n</urlset>\n`
  );


}
