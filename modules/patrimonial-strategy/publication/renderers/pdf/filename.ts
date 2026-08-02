import type { PatrimonialPublication } from "../../types.ts";

export function buildExecutiveMaterialPdfFileName(
  publication: PatrimonialPublication,
) {
  const clientName =
    publication.contentSnapshot.sourceSnapshot.leadContext?.leadName ??
    "cliente";
  const createdAt = publication.createdAt.slice(0, 10);

  return [
    "estrategia-patrimonial-patrion",
    slugify(clientName),
    createdAt,
    `v${publication.publicationVersion}`,
  ]
    .filter(Boolean)
    .join("-")
    .concat(".pdf");
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
