/**
 * Build URLSearchParams from a params object, skipping
 * undefined / null / empty-string values.
 */
export function buildSearchParams(
  params: Record<string, string | number | boolean | null | undefined>
): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  return sp;
}
