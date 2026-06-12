// Query key prefixes — must match the keys used in useQuery calls across modules.
// The realtime invalidation bridge (hooks/use-realtime-invalidation.ts) invalidates
// caches by these prefixes when Postgres change events arrive.
export const QUERY_KEYS = {
  ORDERS:          ["orders"]          as const,
  DEALERS:         ["dealers"]         as const,
  STOCK:           ["stock"]           as const,
  CHALLANS:        ["challans"]        as const,
  DASHBOARD_STATS: ["dashboard-stats"] as const,
  REPORTS:         ["reports"]         as const,
  REPORTS_META:    ["reports-meta"]    as const,
} as const;
