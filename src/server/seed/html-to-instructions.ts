/**
 * wger da las instrucciones como HTML simple (<p>/<ol><li>), verificado con
 * curl. No vale la pena una dependencia de parsing HTML completo para esto
 * — es contenido generado por el propio wger, consistente.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).trim();
}

export function htmlToInstructions(html: string): string[] {
  if (!html) return [];

  const liMatches = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  if (liMatches.length > 0) {
    return liMatches
      .map((m) => stripTags(m[1] ?? ""))
      .map((s) => s.replace(/^​+/, "").trim())
      .filter(Boolean);
  }

  // Sin <li>: separa por párrafos, si tampoco hay, por líneas.
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) =>
    stripTags(m[1] ?? ""),
  );
  const source = paragraphs.length > 0 ? paragraphs : [stripTags(html)];
  return source
    .flatMap((p) => p.split(/\n+/))
    .map((s) => s.trim())
    .filter(Boolean);
}
