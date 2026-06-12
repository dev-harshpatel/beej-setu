export function formatDateCell(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return str;
}

export function normalizeHeaders(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      out[k.trim().toLowerCase().replace(/\s+/g, "_")] = v;
    }
    return out;
  });
}

export function checkMissingHeaders(
  normalised: Record<string, unknown>[],
  required: string[],
): string[] {
  if (normalised.length === 0) return required;
  return required.filter((h) => !(h in normalised[0]));
}
