/**
 * Normalises a string to Title Case: trims whitespace, lowercases everything,
 * then uppercases the first letter of each word.
 * "saurashtra" → "Saurashtra"  |  "HARSH PATEL" → "Harsh Patel"
 */
export function toTitleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Normalises a batch/code string: trims and uppercases.
 * "lot-2024-01" → "LOT-2024-01"
 */
export function toBatchCode(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Normalises a string to a url-safe slug: lowercase, alphanumeric and hyphens only.
 * "Acme Seeds Pvt. Ltd." → "acme-seeds-pvt-ltd"
 */
export function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
