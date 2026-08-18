export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Añade un sufijo corto y estable si el slug ya existe en el Set dado. */
export function uniqueSlug(
  base: string,
  taken: Set<string>,
  disambiguator: string,
): string {
  if (!taken.has(base)) return base;
  return `${base}-${disambiguator.slice(0, 8)}`;
}
