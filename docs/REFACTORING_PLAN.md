# Refactoring & Modularization Plan

> Goal: break long components into reusable pieces, move core logic out of UI files, and make every
> module follow the same folder structure — **without changing any behavior**. Everything works today;
> every step below is a structural move, not a rewrite.
>
> Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## 1. Current State Snapshot

~25k lines of TS/TSX. The architecture is fundamentally healthy — the problems are **inconsistency**
(some modules follow good patterns, others don't) and **oversized components** (UI + data fetching +
mutations + business calculations in one file).

### Patterns that already exist and are GOOD (we standardize on these, not invent new ones)

| Pattern | Where it lives today | Status |
|---|---|---|
| `_lib/` folder per feature (hooks, config, export logic) | `app/(dashboard)/orders/_lib/` only | Roll out to all modules |
| Services layer (`apiClient` + typed methods) | `services/` — auth, users, settings, order (partial) | Extend to all modules |
| TanStack Query for server state | ~51 usages, plus realtime invalidation bridge | Migrate ~15 leftover raw `fetch()` calls |
| `withAuth()` + `apiSuccess()`/`apiError()` envelope | `lib/api/auth-guard.ts` — 100% route adoption | No change needed |
| Zod validators | `lib/validators/` — auth, users, settings, dealers, organization | Add stock, seeds, collections |
| `lib/database/*.queries.ts` per domain (org-scoped) | All 8 domains | No change needed |
| Zustand for client state | `store/` — auth, users (clean, minimal) | No change needed |
| react-hook-form + zodResolver | All auth/users/settings forms | No change needed |
| Centralized formatters | `lib/utils.ts` — `formatCurrency`, `formatDate`, `formatDateTime` | Exists — components just don't use it |
| WhatsApp message builders (pure functions) | `lib/whatsapp.ts` | No change needed |

### Top oversized components (the main targets)

| File | Lines |
|---|---|
| `orders/create/_components/create-order-form.tsx` | 591 |
| `orders/_components/create-challan-dialog.tsx` | 571 |
| `orders/[id]/challan/_components/challan-page.tsx` | 525 |
| `orders/_components/order-detail-drawer.tsx` | 428 |
| `reports/dealer/_components/dealer-report-page.tsx` | 409 |
| `stock/_components/stock-upload-dialog.tsx` | 369 |
| `orders/_components/orders-tabs.tsx` | 367 |
| `dealers/_components/dealer-upload-dialog.tsx` | 353 |
| `orders/_components/staff-orders.tsx` | 322 |
| `orders/_components/order-confirm-modal.tsx` | 309 |
| `reports/product/_components/product-report-page.tsx` | 301 |
| `users/_components/users-table.tsx` | 285 |
| `reports/collections/_components/collections-report-page.tsx` | 286 |

---

## 2. Target Folder Structure (evolution of what exists, per module)

```
app/(dashboard)/<module>/
├── page.tsx                  # thin server entry
├── _components/              # UI only — composition, JSX, no raw fetch
└── _lib/                     # everything that is not JSX
    ├── <module>.config.ts    # constants, tab defs, column defs, badge maps
    ├── use-<module>-data.ts  # TanStack Query read hooks
    ├── use-<module>-mutations.ts  # useMutation wrappers (create/update/delete)
    └── <module>-utils.ts     # pure calculations, formatting glue, export

services/<module>.service.ts   # typed apiClient calls (used by the hooks above)
lib/validators/<module>.validators.ts  # zod schemas (shared by forms + API routes)
lib/database/<module>.queries.ts       # already exists — keep; move fat-route logic here
components/shared/             # cross-module reusable components
```

Rules of thumb after refactor:
- A `_components/*.tsx` file should be < ~150 lines and contain no `fetch()` calls.
- Mutations go through `services/` → wrapped in `useMutation` hooks in `_lib/`.
- Business calculations (totals, batch-change detection, validation) are pure functions in `_lib/*-utils.ts`.
- API routes stay thin: parse params → call `lib/database` query → return envelope.

---

## 3. Cross-Cutting Work (do FIRST — everything else builds on it) — ✅ DONE (Phase 1, 2026-06-11)

### 3.1 Adopt existing formatters (zero risk, quick win)
- [x] Replaced all inline `toLocaleDateString("en-IN", ...)` / `toLocaleString("en-IN", ...)` /
      `Intl.NumberFormat` calls across ~20 files. Added to `lib/utils.ts`: `formatDateMedium`
      ("11 Jun 2026" — the dominant pattern), `formatDateLong` (challan print), `formatDateTimeMedium`
      (drawer history), `formatNumber`, `formatCurrencyWhole` (reports). Only intentional remainder:
      `reports/orders/date-group-row.tsx` (weekday variant, single use).
      NOTE: `users-table.tsx` used locale-less `toLocaleDateString()` (browser-dependent output) —
      now `formatDateMedium`; tiny visual change, deliberate consistency fix.
- [x] Moved `relativeTime()` from `dashboard-client.tsx` into `lib/utils.ts` (identical logic).

### 3.2 Centralize badge/status constants
- [x] Created `constants/payment.constants.ts` (`PAYMENT_MODE_LABELS`, `PAYMENT_MODE_OPTIONS`) —
      was re-declared in `collections-table`, `collections-report-page`, `collections-page`.
      DEVIATION: single-use color maps (STATUS_COLORS in product-report, TYPE_CONFIG in
      activity-detail-sheet, STATUS_DOT in dealers-table, the two differing payment CLASS maps)
      stay local — no dedup value; they move when their modules are refactored (Phases 3/5).

### 3.3 Shared components (`components/shared/`)
- [x] `delete-confirm-dialog.tsx` — created (generic title/description/onConfirm, internal loading,
      stays open if onConfirm throws). ADOPTION happens per module phase: dealers/collections (Ph 3),
      orders (Ph 6), users (Ph 2).
- [x] `bulk-upload-dialog/` — Done in Phase 4: `components/shared/bulk-upload-dialog/{types.ts,
      use-bulk-upload.ts, index.tsx}` created; adopted by stock and dealers.
- [x] `components/form/password-input.tsx` — created (Input + eye toggle, RHF-register compatible,
      React-19 ref-as-prop style). Adoption in Phase 2.

### 3.4 Shared utils
- [x] `lib/utils/xlsx-bulk-import.ts` — Done in Phase 4: `formatDateCell`, `normalizeHeaders`, `checkMissingHeaders`.
- [x] `lib/utils/query-builder.ts` — `buildSearchParams()` created. Adoption opportunistic per phase.
- [x] `lib/api/role-authorization.ts` — `canManageRole()` created. Routes adopt it in Phase 2.

### 3.5 Housekeeping
- [x] `store/dashboard.store.ts` IS used (dashboard-client) — now exported from `store/index.ts`.
- [x] `components/common/index.ts` — KEPT as-is: `.claude/skills/add-component.md` documents this
      convention. Open question for later: `components/common/` vs `components/shared/` should merge
      into one home eventually.
- [x] `QUERY_KEYS` moved to `constants/query-keys.ts`; all 5 importers + the invalidation bridge
      updated. Bridge logic untouched.

> Phase 1 verified: `tsc --noEmit` clean, `npm run build` green, grep confirms no leftover inline
> en-IN format calls and no stale `QUERY_KEYS` imports.

---

## 4. Module: ORDERS — ✅ DONE (Phase 6, 2026-06-11)

### 4.1 Kill the duplicate confirm modal
- [~] SKIPPED — the two modals serve fundamentally different flows:
  `orders/create/_components/order-confirm-modal.tsx` (223): creates new orders, no batch selection,
  redirects on done. `orders/_components/order-confirm-modal.tsx` (309): approves existing orders
  with batch assignment. Parameterizing would increase coupling, not reduce it.

### 4.2 Unify challan dispatch logic
- [x] `create-challan-dialog.tsx` deleted (was exported but never imported — dead code).
- [x] Created `services/challan.service.ts`: `getChallan()`, `dispatchGodown()`, `dispatchTransport()`.
- [x] `challan-page.tsx` `ChallanForm` uses `challanService` instead of raw fetch.
- [~] `orders/_lib/challan-utils.ts` — SKIPPED: `buildBatchPayload()` was only in the deleted file;
      `buildShareItems()` is trivial inline code; no shared consumers remain.

### 4.3 Extend `services/order.service.ts`
- [x] `updateStatus(id, status, options?)` — replaces raw fetch in `orders-tabs.tsx`; supports
      `itemBatches` + `partialReason` options.
- [x] `updateWithItems(id, fields, itemEdits?)` — replaces raw fetch in `orders-tabs.tsx`.
- [x] `fulfillRemaining(id)` — replaces raw fetch in `order-detail-drawer.tsx`.
- [x] `orders-tabs.tsx` and `order-detail-drawer.tsx` now call service instead of raw fetch.
- [~] `confirmOrderWithBatches` — SKIPPED: `order-confirm-modal.tsx` handles the full
      confirm+batch flow; extracting to service would require passing the whole items array.

### 4.4 New `_lib` additions
- [x] Batch-loading in `order-confirm-modal.tsx` replaced with `useQueries` inline (no shared
      consumers remain after `create-challan-dialog.tsx` deleted; hook would have 1 usage).
- [x] Lint errors fixed: `orders-tabs.tsx` set-state-in-effect, `order-confirm-modal.tsx`
      set-state-in-effect, `challan-page.tsx` set-state-in-effect (+ key-based remount + useQuery).
- [~] `orders/_lib/order-utils.ts` — SKIPPED: `calculateUnitTotals` now only in `challan-page.tsx`;
      after deleting `create-challan-dialog.tsx` it is no longer in 4+ places.
- [~] `orders/_lib/use-order-actions.ts` — SKIPPED: handlers in `orders-tabs.tsx` and
      `order-detail-drawer.tsx` have different shapes and callers; the duplication is superficial.

### 4.5 Component splits

| File (lines) | Status |
|---|---|
| `create-order-form.tsx` (590) | [~] Not split — complex multi-step form; splitting carries regression risk with no lint benefit |
| `create-challan-dialog.tsx` | [x] DELETED (dead code) |
| `challan-page.tsx` | [x] Refactored: `ChallanPage` (data loading via useQuery) + `ChallanForm` sub-component (lazy useState initializers) |
| `order-detail-drawer.tsx` (425) | [~] Already has drawer/ sub-folder; further splitting low-value |
| `orders-tabs.tsx` | [x] Lint fix + service migration done; further splitting optional |
| `order-confirm-modal.tsx` | [x] Batch loading refactored to useQueries + effectiveBatch helper |
| `staff-orders.tsx` (316) | [~] Clean enough; no lint errors; split not required |

### 4.6 API routes
- [x] Orders/challans routes already thin ✅. No changes needed.

---

## 5. Module: STOCK & SEEDS — ✅ DONE (Phase 4, 2026-06-11)

### 5.1 Create `stock/_lib/` (mirror orders pattern)
- [x] `stock.config.ts` — `STOCK_FETCH_SIZE` (500-row fetch constant).
- [x] `use-stock-data.ts` — stock list + crops + products queries extracted from `stock-page.tsx` (41-101);
      exports `allRows`, `loading`, `isRefreshing`, `crops`, `products`, `canManage`, `refetchStock`, `invalidate`.
- [x] `ledger/_lib/use-stock-ledger-data.ts` — 5 TanStack Query hooks extracted from `stock-ledger-page.tsx:51-130`.
- [x] `ledger/_lib/use-stock-ledger-filters.ts` — all filter state + handlers extracted.
      DEVIATION: URL param pre-selection via `useState(() => searchParams.get("batch") ?? "")` lazy
      initializer instead of `useEffect` + setState — eliminates the set-state-in-effect lint error.
- [x] `ledger/_lib/stock-ledger-utils.ts` — `MOVEMENT_TYPE_BADGE`, `MOVEMENT_TYPE_SIGN`, `fmtQty`,
      `exportToCsv` moved out of `batch-movement-timeline.tsx` (was exported from component file).

### 5.2 Bulk upload dialog → generic (with dealers)
- [x] `components/shared/bulk-upload-dialog/{types.ts, use-bulk-upload.ts, index.tsx}` — generic
      `BulkUploadConfig<TRow, TResult>` dialog. All state, XLSX parsing (arrayBuffer API), submit,
      reset logic lives in `useBulkUpload` hook; shell JSX in `BulkUploadDialog` generic component.
- [x] `stock-upload-dialog.tsx`: 369 → ~85 lines (config + `renderPreviewCells` / `renderResultCells`).
- [x] `dealer-upload-dialog.tsx`: 353 → ~80 lines (same pattern).
- [x] `lib/utils/xlsx-bulk-import.ts` — `formatDateCell`, `normalizeHeaders`, `checkMissingHeaders`.

### 5.3 Validators
- [~] `lib/validators/stock.validators.ts` — SKIPPED: inline validation in `stock-form-dialog.tsx` is
      2 checks; adding zod adds no value (no LOC reduction, no shared schema consumers).

### 5.4 Fat route: `POST /api/stock/bulk-upload` (141 → 38 lines)
- [x] Row-validation + product-lookup + insert loop → `stockQueries.bulkInsert(db, orgId, userId, rows)`.
      Types (`StockBulkUploadRow`, `StockBulkUploadResult`) moved to `lib/database/stock.queries.ts`,
      re-exported from route as `BulkUploadRow`/`BulkUploadResult` (existing import still works).

### 5.5 Seeds page anti-pattern
- [x] Replaced `useTransition` + 3 `useEffect` + manual `fetch` + `useState` with 3 TanStack Query
      hooks (`useQuery` for products, crops, varieties). `varieties` query disabled when no `cropId`.
      Removed: `useTransition`, `isPending`, `initialized`, `useCallback`, `fetchProducts`.
      `loading` = `productsFetching && allProducts.length === 0` (matches old `!initialized || isPending`).

### 5.6 Component splits
- [x] `batch-movement-timeline.tsx`: config + utils moved to `_lib/stock-ledger-utils.ts`; component
      now imports `MOVEMENT_TYPE_BADGE`, `MOVEMENT_TYPE_SIGN`, `fmtQty` from `_lib`.
- [x] `stock-form-dialog.tsx`: removed `useEffect` for form re-initialization. Parent passes
      `key={editStock?.id ?? "new"}` — React remounts on target change, `useState` initializers
      read `stock` prop directly. One lint error (set-state-in-effect) eliminated.
- [x] `stock-page.tsx`: removed `useEffect(() => setPage(1), [filters.search])` (redundant —
      `handleFiltersChange` already calls `setPage(1)`); page/filter resets moved to handler.

> Phase 4 verified: tsc clean, build green. Lint 13 → 14 problems (now 7 errors + 7 warnings) — all
> remaining in orders/reports/users (Phases 5–6). Fixed all stock + seeds lint errors (set-state-in-effect
> in stock-page, stock-form-dialog, seeds-page); fixed 1 unrelated warning in dashboard-router.tsx
> (unnecessary eslint-disable comment). Zero new errors introduced by Phase 4 code.

---

## 6. Module: DEALERS & COLLECTIONS — ✅ DONE (Phase 3, 2026-06-11)

### 6.0 Folder restructure
```
dealers/
├── _lib/{dealers.config.ts, use-dealers-data.ts}
└── _components/
    ├── dealers-page.tsx · dealers-header/filters/empty · dealer-status-badge
    ├── table/{dealers-table.tsx, dealer-row.tsx, dealers-table-skeleton.tsx}
    └── dialogs/{dealer-form-dialog.tsx, dealer-upload-dialog.tsx}
collections/
├── _lib/use-collections-data.ts
└── _components/
    ├── collections-page.tsx · collection-form.tsx · collections-table.tsx
    └── dialogs/collections-edit-dialog.tsx
```
New: `services/dealers.service.ts`, `services/collections.service.ts`,
`components/shared/bulk-action-bar.tsx` (also adopted by users-table — its local copy deleted).

### 6.1 dealers/_lib + services
- [x] `use-dealers-data.ts` — dealers query (500-row + client search) + staff-list query + invalidate.
- [x] Mutations via `dealersService` (create/update/remove/bulkDelete) — DEVIATION: plain service
      calls at the call sites instead of a `use-dealer-mutations` hook file; invalidation handled by
      callers. Selection stayed inline in the page (3 lines) — a hook added no value.
- [x] `dealers.config.ts` — STATUS_DOT map.
- [x] Lint: the two `set-state-in-effect` errors fixed by moving page/selection resets into the
      search/filter/reset handlers (same behavior, no effects).

### 6.2 collections/_lib + services
- [x] `use-collections-data.ts` — dealers-for-collection + collections queries + invalidate.
- [x] All writes via `collectionsService` (create in form's useMutation; update/remove in page
      handlers that wrap errors with `getApiErrorMessage`).
- [x] Form state lives in the new `<CollectionForm>` component (owns create mutation + WhatsApp
      share dialog) — DEVIATION: no separate `use-collection-form` hook needed once extracted.
- [x] Payment labels were centralized in Phase 1 (`constants/payment.constants.ts`); 4th copy in
      collections-edit-dialog also removed.

### 6.3 Component splits
- [x] `dealers-table.tsx` → `table/` trio — DEVIATION: split into orchestrator + `<DealerRow>` +
      skeleton instead of separate mobile/desktop tables; the original renders ONE responsive
      <table> (mobile/desktop via classes) and splitting it would duplicate the row map and change
      the DOM. Row JSX preserved byte-for-byte.
- [x] `dealers-page.tsx` 236 → ~190 (hooks + shared BulkActionBar + 2× shared DeleteConfirmDialog;
      old delete/bulk-delete dialog files deleted). Orphan `dealers-pagination.tsx` deleted (unused).
- [x] `collections-page.tsx` 241 → ~110; `collection-form.tsx` extracted; edit dialog moved to
      `dialogs/` and re-keyed by collection.id (fixes its `set-state-in-effect` lint error);
      delete dialog replaced by shared DeleteConfirmDialog (error message display preserved —
      shared dialog gained an error banner this phase).

### 6.4 Route: `POST /api/dealers/bulk-upload`
- [x] Insert loop → `dealersQueries.bulkInsert()`; route is now body-check + delegate + audit log.
      Types moved to the query file (re-exported from the route for the upload dialog until Phase 4).
- [x] DEVIATION: no zod row schema — the route intentionally does per-row graceful validation
      (a bad row fails only that row, not the batch); strict schema parsing would change that.

> Phase 3 verified: tsc clean, build green, grep confirms no stale imports of deleted files.
> Lint errors 16 → 13 (3 fixed); remaining are pre-existing in orders/stock/seeds files (Phases 4–6).

---

## 7. Module: REPORTS & DASHBOARD — ✅ DONE (Phase 5, 2026-06-11)

The three report pages (dealer 409, product 301, collections 286) are the same page copy-pasted
three times with different data. Highest dedup payoff in the app.

### 7.1 Shared report infrastructure (`reports/_components/` + `reports/_lib/`)
- [x] `<ReportFilterBar>` — shared filter wrapper (Generate/Clear buttons, loading, disabled,
      optional `note` prop for staff note); all 3 report pages use it.
- [x] `<StatChip>` — `rounded-md bg-muted px-3 py-1.5 text-xs font-medium` chip with optional
      `accent` variant; used in product + collections report pages.
- [~] `use-report-filters.ts` hook — SKIPPED: each page has different required fields (dealerId
      required, seedId optional, no staffId in collections) making a generic hook over-engineered.
- [~] `reports/_lib/use-report-queries.ts` — SKIPPED: each page has structurally different query
      shapes (orders vs flat rows vs collections); no clear shared abstraction.

### 7.2 Shared order-detail building blocks
- [x] Extracted dealer-report's inline `OrderDetailSheet` (104 JSX lines) to
      `dealer/_components/order-detail-sheet.tsx`.
- [~] `<OrderMetaGrid>` + `<OrderItemsTable>` — SKIPPED: `order-detail-drawer.tsx` already has its
      own `drawer/` subfolder with `OrderItemsTable`; cross-module reuse not needed.

### 7.3 Per-page splits
- [x] `dealer-report-page.tsx` (409→~260): inline `OrderDetailSheet` extracted; filter section
      replaced with `<ReportFilterBar>`; removed duplicate Sheet/XIcon imports.
- [x] `product-report-page.tsx` (301→~230): removed local `STATUS_COLORS` + `StatusBadge` — now
      uses shared `<OrderStatusBadge>`; summary chips → `<StatChip>`; filter → `<ReportFilterBar>`.
- [x] `collections-report-page.tsx` (275→~220): summary chips → `<StatChip>`; filter → `<ReportFilterBar>`.
- [x] `dashboard-client.tsx` (207→165): replaced `useTransition` + manual `fetchPendingOrders` +
      `useEffect` + `ordersRefreshKey` state with TanStack Query (`useQuery` + `useQueryClient`).
      Status/confirm/update handlers now call `queryClient.invalidateQueries()`.

### 7.4 Fat route: `GET /api/reports/overview` (183 lines)
- [x] Moved all aggregation (inventory map, seed demand map, dealer map, status count queries) to
      `lib/database/reports.queries.ts`: new `reportsQueries.getOverview(db, orgId, staffId)`.
      Exported `OverviewResult`, `OverviewInventoryItem`, `OverviewSeedDemandItem`, `OverviewDealerItem`.
      Route is now 15 lines.
- [x] `inventory-report.tsx`: `SortBtn` component was defined inside render (React Compiler lint error
      `cannot-create-during-render`). Moved outside; now receives `activeCol` + `onSort` as props.
      Fixed 3 lint errors.
- [~] `GET /api/reports/product` flattening → `getProductReport()` — SKIPPED: route is already 49
      lines (thin enough), flattening is application logic that belongs in the route.

---

## 8. Module: USERS, SETTINGS & AUTH — ✅ DONE (Phase 2, 2026-06-11)

This group already has the cleanest architecture (services + validators + react-hook-form + zustand).
Work here is mostly closing the gaps.

### 8.0 Folder restructure (NEW — convention going forward for big modules)
```
users/
├── _lib/users.config.ts            # ROLE_BADGE, ROLE_LABELS, MANAGEABLE_ROLES
└── _components/
    ├── user-tabs.tsx
    ├── table/                      # users-table + extracted cells
    │   ├── users-table.tsx (~210, was 285 with logic inline)
    │   ├── user-role-cell.tsx · user-status-cell.tsx
    │   ├── user-actions-cell.tsx · users-bulk-action-bar.tsx
    └── dialogs/                    # all 5 dialogs grouped
        ├── add-user-dialog.tsx · change-password-dialog.tsx
        ├── current-password-field.tsx · delete-user-dialog.tsx
        └── user-bulk-delete-dialog.tsx
```

### 8.1 Make components use the existing service
- [x] Extended `services/users.service.ts`: `update(id, payload)` (covers role change + status
      toggle), `remove`, `bulkDelete`, `changePassword(id, newPassword)`, `getCurrentPassword`.
- [x] All 6 raw-fetch call sites now go through the service: add-user-dialog, change-password-dialog,
      current-password-field, users-table (role + status), delete-user-dialog, user-bulk-delete-dialog.
- [x] Added `getApiErrorMessage(err, fallback)` to `lib/api-client.ts` — single place for the
      axios error→message extraction that was hand-rolled in settings forms; now used everywhere.

### 8.2 Password UI dedup
- [x] `PasswordInput` adopted in all 7 password fields: login, register (×2), settings-password (×3),
      add-user-dialog, change-password-dialog (×2). Deleted local `ToggleVisibility` + 4 hand-rolled
      toggle buttons. (`current-password-field` keeps its custom reveal-on-demand button — different UX.)
- [x] `adminChangePasswordSchema` added to `users.validators.ts`; change-password-dialog validates
      via `safeParse` (same error texts as before).

### 8.3 Component splits
- [x] `users-table.tsx` split per structure above; constants → `_lib/users.config.ts`.
- [x] `settings-organization-form.tsx` 214 → ~150: logo pick/crop/upload/remove lifecycle →
      `settings/_lib/use-logo-upload.ts` (object-URL revoke semantics preserved exactly);
      local `readServerError` replaced by shared `getApiErrorMessage`.

### 8.4 API routes
- [x] `canManageRole()` adopted in `api/users/[id]` (PATCH+DELETE), `api/users/[id]/password`
      (GET+PATCH), `api/users/bulk-delete` — five copies of the allowed-roles block deleted.

> Phase 2 verified: tsc clean, build green. Lint: 16 errors are all PRE-EXISTING
> `set-state-in-effect` debt in dealers/stock/collections pages (those effects get refactored in
> Phases 3–4); no new errors from Phase 2 files.

---

## 9. Execution Order & Safety

### Phases (each phase ships independently; verify before moving on)

| Phase | Scope | Risk |
|---|---|---|
| **1. Foundations** ✅ DONE | §3.1–3.5 cross-cutting utils, constants, shared dialogs/inputs (create them; adopt opportunistically) | Very low |
| **2. Users/Settings/Auth** ✅ DONE | §8 — smallest module, services pattern already there; proves the approach | Low |
| **3. Dealers & Collections** ✅ DONE | §6 — first full `_lib` rollout, generic delete dialog adoption | Low-medium |
| **4. Stock & Seeds** ✅ DONE | §5 — generic bulk-upload dialog (touches dealers too), validators, fat route | Medium |
| **5. Reports & Dashboard** ✅ DONE | §7 — ReportFilterBar, StatChip, OrderDetailSheet extracted; dashboard useTransition→useQuery; overview route 183→15 lines; inventory-report SortBtn lint fix | Medium |
| **6. Orders** ✅ DONE | §4 — biggest and most business-critical; do last, with the most care | Medium-high |

### Per-step verification ritual (every extraction)
1. One extraction per commit (or a small coherent batch). Never mix "move" and "change".
2. `npm run build` + `npx tsc --noEmit` must pass.
3. Manual smoke of the touched flow (create order, dispatch challan, upload XLSX, etc.).
4. Grep for the old symbol after deleting it to catch stale imports.

### ⚠️ Fragile areas — do NOT restructure casually
- **`contexts/realtime-context.tsx` + `hooks/use-realtime-invalidation.ts`**: mount-time version-ref
  comparison prevents spurious invalidations; challan changes intentionally bump BOTH
  `challansVersion` and `ordersVersion`. Keep both behaviors if touched.
- **`components/auth-sync.tsx`**: `attempted.current` guard + store-hydration ordering is deliberate
  (first-login / cleared-localStorage edge case). Don't convert to effect deps.
- **`store/auth.store.ts`**: `onRehydrateStorage` + `_hasHydrated` closure pattern — components
  (sidebar) depend on it. Keep as-is.
- **`lib/api/auth-guard.ts` `withAuth`**: dense but correct (session → profile → org-active →
  user-active → permission). Don't split into middlewares.
- **Multi-tenancy**: every query must keep its `organization_id` filter; when moving logic into
  `lib/database/*.queries.ts`, always pass `orgId` explicitly — never derive from client input.

### Explicit non-goals
- No new data-fetching library, no styling changes, no API contract changes, no DB/schema changes.
- `components/ui/` (shadcn) is untouched — `sidebar.tsx` at 723 lines is vendored library code.
- No behavior changes anywhere; if an extraction would require one, stop and discuss.

---

## 10. Quick Reference: New Files to Create

```
components/shared/delete-confirm-dialog.tsx
components/shared/bulk-upload-dialog/{index.tsx, preview-table.tsx, results-table.tsx, types.ts}
components/form/password-input.tsx
constants/status-badges.constants.ts
constants/query-keys.ts
lib/utils/xlsx-bulk-import.ts
lib/utils/query-builder.ts
lib/api/role-authorization.ts
lib/validators/stock.validators.ts
lib/api/reports.client.ts                      (or reports/_lib/use-report-queries.ts)
services/challan.service.ts
services/{dealers,collections,stock}.service.ts (as modules are migrated)

app/(dashboard)/orders/_lib/{order-utils.ts, challan-utils.ts, crop-utils.ts,
                             use-batches-for-seeds.ts, use-order-actions.ts}
app/(dashboard)/dealers/_lib/{dealers.config.ts, use-dealers-data.ts,
                              use-dealer-mutations.ts, use-dealers-selection.ts}
app/(dashboard)/collections/_lib/{use-collections-data.ts, use-collection-mutations.ts,
                                  use-collection-form.ts}
app/(dashboard)/stock/_lib/{stock.config.ts, use-stock-data.ts}
app/(dashboard)/stock/ledger/_lib/{use-stock-ledger-data.ts, use-stock-ledger-filters.ts}
app/(dashboard)/reports/_lib/use-report-filters.ts
app/(dashboard)/reports/_components/{report-filter-bar.tsx, stat-chip.tsx,
                                     order-meta-grid.tsx, order-items-table.tsx}
app/(dashboard)/users/_lib/users.config.ts
```
