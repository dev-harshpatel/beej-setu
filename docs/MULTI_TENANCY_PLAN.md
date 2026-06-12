# Multi-Tenancy Implementation Plan

Convert Beej Setu from a single-company app into a multi-tenant SaaS where multiple companies (tenants) onboard independently, each with fully isolated data: users, dealers, seeds, stock, orders, challans, collections, reports.

---

## 1. Tenancy Model Decision

**Chosen: Shared database, shared schema, `organization_id` column on every table, enforced by RLS (pooled model).**

| Model | Verdict | Why |
|---|---|---|
| Shared schema + `organization_id` + RLS | ✅ **Use this** | One Supabase project, one migration history, RLS gives DB-level isolation, scales to hundreds of tenants, cheapest to operate |
| Schema-per-tenant | ❌ Rejected | Supabase tooling (types, migrations, PostgREST) works poorly across N schemas; migration fan-out nightmare |
| Database/project-per-tenant | ❌ Rejected | One Supabase project per company = cost + provisioning automation + N deployment targets; overkill at this stage |

**Isolation strategy = defense in depth (two layers):**
1. **RLS policies** on every table check `organization_id` — the hard guarantee. Even buggy app code cannot leak data when using the anon/session client.
2. **Explicit `.eq('organization_id', orgId)` filters** in every query in `lib/database/*.queries.ts` — required because several code paths use the **service-role admin client** (`lib/supabase/admin.ts`), which **bypasses RLS entirely**. This is the biggest leak risk in the current codebase.

---

## 2. New Database Objects

### 2.1 `organizations` table

```sql
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,          -- url-safe identifier, e.g. "acme-seeds"
  logo_url    TEXT,
  status      TEXT NOT NULL DEFAULT 'ACTIVE'
              CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CANCELLED')),
  settings    JSONB NOT NULL DEFAULT '{}',   -- per-tenant config (branding, defaults)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 `organization_id` on every tenant-owned table

Add `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT` to:

| Table | Notes |
|---|---|
| `profiles` | Every user belongs to exactly one org (v1: no multi-org membership) |
| `dealers` | |
| `crops` | Each org manages its own crop list |
| `seed_products` | |
| `seed_stock` | |
| `stock_movements` | Append-only ledger — backfill from `seed_products` join |
| `orders` | |
| `order_items` | Denormalize org_id here too (simplifies RLS — avoids join through orders) |
| `challans` | |
| `collections` | |
| `bulk_upload_logs` | |

Index every one: `CREATE INDEX idx_<table>_org ON <table>(organization_id);`
For hot query paths, composite indexes: `orders(organization_id, status)`, `orders(organization_id, created_at DESC)`, `dealers(organization_id, status)`, `seed_stock(organization_id, seed_id)`.

### 2.3 Unique constraints — rescope from global to per-org

Current global uniques will collide across tenants. Change:

| Current | New |
|---|---|
| `profiles.username UNIQUE` | **Keep globally unique** (see §4.2 — username login depends on it) |
| `orders.order_number UNIQUE` | `UNIQUE (organization_id, order_number)` — each org has its own ORD-0001 sequence |
| `crops.name UNIQUE` | `UNIQUE (organization_id, name)` |
| `seed_products (crop_id, variety, pack_size)` | Already org-scoped via `crop_id` FK — keep as is |
| `seed_stock (seed_id, batch_number)` | Already org-scoped via `seed_id` FK — keep as is |
| `organizations.slug UNIQUE` | New, global |

### 2.4 RLS helper — `get_my_org_id()` via SECURITY DEFINER profile lookup

> **Implementation note (changed from the original JWT design):** the codebase already resolves the caller's role in RLS via `get_my_role()` — a `SECURITY DEFINER` lookup on `profiles` (migration 001). `get_my_org_id()` uses the identical pattern:

```sql
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;
```

Why this beats the JWT `app_metadata` claim considered earlier:
- **No re-login required** after the migration — existing sessions keep working immediately.
- **No staleness**: org/role changes take effect on the next request, not at JWT refresh (~1h).
- **No new failure mode**: with the JWT approach, forgetting to set `app_metadata` at user-creation would silently lock the user out of every table.
- `SECURITY DEFINER` bypasses RLS on `profiles`, so there is no recursive-policy problem; the existing `get_my_role()` proves the pattern in production.

Returns `NULL` for anon **and** for the service-role context. SECURITY-sensitive functions treat `NULL` as "trusted server code — skip the org guard" (safe: service role bypasses RLS anyway). `get_my_role()` stays exactly as is.

### 2.5 Rewrite all RLS policies

Every policy on every tenant table gets `organization_id = get_my_org_id()` ANDed into both `USING` and `WITH CHECK`. Pattern:

```sql
-- before
CREATE POLICY dealers_select ON dealers FOR SELECT
  USING (deleted_at IS NULL AND auth.role() = 'authenticated');

-- after
CREATE POLICY dealers_select ON dealers FOR SELECT
  USING (deleted_at IS NULL AND organization_id = get_my_org_id());
```

Tables/policies to rewrite (from migrations 001, 003–006, 010, 014, 018, 021):
- `profiles` — select own / select-as-admin / update own / update-as-admin → all + org check. Admins see only their own org's users.
- `dealers`, `crops`, `seed_products`, `orders`, `order_items`, `seed_stock`, `stock_movements`, `challans`, `bulk_upload_logs` — all CRUD policies + org check.
- `collections` — **currently has NO RLS policies at all** (gap in migration 018). Add full org-scoped policy set while here.
- `organizations` itself — members can `SELECT` their own org (`id = get_my_org_id()`); only org SUPER_ADMIN can `UPDATE` it. No INSERT/DELETE via anon client (onboarding uses service role).

### 2.6 Update database functions (SECURITY DEFINER — these bypass RLS)

All PL/pgSQL functions must take/derive org context and verify cross-entity consistency, otherwise an attacker who guesses UUIDs can operate across tenants through RPC:

| Function | Change |
|---|---|
| `deduct_seed_stock(...)` | Verify `seed_products.organization_id` matches the order's org; stamp `organization_id` on the `stock_movements` rows it inserts |
| `approve_order(p_order_id, ...)` | First line: `IF (SELECT organization_id FROM orders WHERE id = p_order_id) <> get_my_org_id() THEN RAISE EXCEPTION 'forbidden'; END IF;` |
| `log_stock_manual_change()` trigger | Copy `NEW.organization_id` into the ledger row |
| `check_batch_reconciliation(...)` | Scope all aggregates by org (derive from seed_id, verify against caller's org) |
| `confirm_order`, `approve_from_hold` paths | Same order-org guard |
| `stock_movements_with_balance` view | Add `organization_id` to the select list; window `PARTITION BY` is already per (seed_id, batch_number) so correctness is unaffected, but expose the column for filtering |

---

## 3. Migration Plan (SQL)

Single migration file: `supabase/migrations/025_multi_tenancy.sql`, written to be safe on the existing production data:

**Status: ✅ written and applied — `supabase/migrations/025_multi_tenancy.sql` has been run in Supabase.**

```
Step 1:  CREATE TABLE organizations (+ updated_at trigger).
Step 2:  INSERT the default org with a fixed UUID:
         ('00000000-0000-4000-a000-000000000001', 'Beej Setu', 'beej-setu', 'ACTIVE').
Step 3:  ALTER each table ADD COLUMN organization_id UUID REFERENCES organizations.
Step 4:  Backfill: UPDATE <table> SET organization_id = default org.
Step 5:  ALTER COLUMN organization_id SET NOT NULL.
Step 6:  Drop + recreate unique constraints per §2.3.
Step 7:  Create get_my_org_id() (SECURITY DEFINER profile lookup, §2.4).
Step 8:  DROP and recreate every RLS policy with org checks (§2.5),
         including the new collections + organizations policies.
Step 9:  Replace functions + trigger + view (§2.6); drop dead
         confirm_order() and the stale 3-param deduct_seed_stock overload.
Step 10: Create indexes (§2.2).
```

> Run on a branch/staging Supabase project first. No re-login needed — org resolution reads `profiles`, not the JWT (§2.4).

Extra findings folded into 025 (discovered while reading migrations 001–024):
- `confirm_order()` (008/009) sets `status='CONFIRMED'`, which migration 010's check constraint forbids — dead code, dropped.
- `deduct_seed_stock(UUID, INTEGER, TEXT)` from 006 still existed alongside the 6-param version from 014 (CREATE OR REPLACE with a different arg list creates an overload) — dropped.
- `stock_movements_with_balance` view ran with owner (postgres) privileges, **bypassing RLS** — any authenticated user could read all stock movements through it. Recreated `WITH (security_invoker = true)`.
- `dealers` are hard-delete since migration 023 (no `deleted_at`) — §2.2's table note saying otherwise was stale.

---

## 4. Application Layer Changes

### 4.1 Auth guard — `lib/api/auth-guard.ts`

- Extend the fetched profile selection to include `organization_id`.
- Reject if the user's organization `status != 'ACTIVE'` (fetch org status alongside, or join). Suspended org ⇒ 403 for every request — this is the tenant kill-switch.
- The `profile` object passed to every handler now carries `organization_id`; type it as required.

### 4.2 Login — `app/api/auth/login/route.ts`

- Username stays **globally unique** (v1 decision), so the username→email lookup is unchanged and no org-picker is needed at login. Trade-off: "john" can exist in only one company; acceptable for v1, revisit if it bites.
- After successful sign-in, include `organization` (id, name, slug, logo) in the response so the client can store/show it.

### 4.3 Every query file — `lib/database/*.queries.ts`

This is the bulk of the app work. Every function signature gains an `orgId: string` parameter (threaded from `profile.organization_id` in the route handlers), and every query — **especially every admin-client query, which bypasses RLS** — adds `.eq('organization_id', orgId)`:

- `users.queries.ts` — getAll, getById, update, softDelete, bulkSoftDelete
- `dealers.queries.ts` — all functions; `create` must **set** `organization_id: orgId`
- `seeds.queries.ts` — getAll, getById, getAllCrops; creates set org_id
- `orders.queries.ts` — all functions; **`getNextSerial` must compute the next order number scoped to the org** (`WHERE organization_id = orgId`), or order numbers will interleave across tenants
- `stock.queries.ts`, `stock-movements.queries.ts`, `collections.queries.ts`, `reports.queries.ts` — same pattern
- Dashboard stats / activity / reports aggregates — every `count`/`sum` gets the org filter

Rule of thumb: **any `from(...)` call without `.eq('organization_id', ...)` is a bug** unless the table is `organizations` itself.

### 4.4 Writes that stamp `organization_id`

Every `insert` adds `organization_id: profile.organization_id` server-side (never trust client payloads for it). Audit specifically:

- `POST /api/users` — also sets `app_metadata.organization_id` on `auth.admin.createUser`
- `POST /api/dealers`, `POST /api/dealers/bulk-upload` (admin client — critical)
- `POST /api/seeds` (and crop auto-create if any)
- `POST /api/orders` + items
- `POST /api/stock`, `POST /api/stock/bulk-upload` (admin client — critical), `POST /api/stock/movements`
- `POST /api/challans`, `POST /api/collections`
- `bulk_upload_logs` inserts (admin client — critical)

### 4.5 Cross-entity validation inside handlers

When a request references other rows by id, verify they belong to the caller's org (RLS covers the anon client, but admin-client paths and RPCs need explicit checks):

- Order create: `dealer_id` and every `seed_id` belong to org
- Stock create: `seed_id` belongs to org
- Collection create: `dealer_id` belongs to org
- Challan create: `order_id` belongs to org
- User update: target profile belongs to org (admins must not edit other orgs' users)

### 4.6 Realtime

Migration 002/012 enable realtime on tables. Postgres Changes subscriptions **respect RLS**, so org filtering holds automatically once policies are in — but add `filter: 'organization_id=eq.<orgId>'` to channel subscriptions anyway to cut noise and cost.

### 4.7 Rate limiting

Login rate limit stays per-IP. Add per-org rate limiting later if needed (not v1).

---

## 5. Tenant Onboarding Flow

### 5.1 Self-serve signup (recommended v1)

New public route + page:

- `POST /api/auth/register-organization` — zod-validated `{ companyName, slug?, adminName, email, username, password }`. Using the **service-role client**, transactionally:
  1. Create `organizations` row (derive slug from name, ensure unique)
  2. `auth.admin.createUser` with `app_metadata: { organization_id, role: 'SUPER_ADMIN' }`, `email_confirm: true`
  3. Insert `profiles` row with `organization_id`, role `SUPER_ADMIN`
  4. On any failure, roll back (delete org + auth user) — wrap in a single Postgres function called via RPC to get a real transaction, since auth.admin + table inserts can't share one otherwise; acceptable v1 alternative: best-effort cleanup in catch block
  5. Rate-limit this endpoint aggressively (same in-memory limiter as login)
- `app/(auth)/register/page.tsx` — company signup form; link from login page

The org's SUPER_ADMIN then creates ADMIN / STAFF / DISPATCH_STAFF users from the existing Users page — unchanged flow, now org-scoped.

### 5.2 Platform administration (phase 2, optional)

A `PLATFORM_ADMIN` concept (cross-org god mode: list/suspend orgs, support access) is **deliberately out of scope for v1**. For now, suspend an org by flipping `organizations.status` in the Supabase dashboard. If/when needed: separate role value checked before org filters, plus an `/admin` area — keep it out of the tenant RLS path (use service role + explicit code).

---

## 6. UI Changes

- **Sidebar / layout** (`app/(dashboard)/layout.tsx`): show org name + logo instead of (or alongside) hardcoded `APP_NAME`. Org data comes from `/api/auth/me` (extend it to join the organization).
- **Login page**: add "Register your company" link.
- **Register page**: new (§5.1).
- **Settings page**: new "Organization" tab (SUPER_ADMIN only) — edit org name, logo. New `PATCH /api/settings/organization` route.
- **Auth store / AuthSync**: persist `organization` next to the user profile.
- `constants/app.constants.ts`: `APP_NAME` becomes the *product* name (login page, browser title); tenant branding comes from the org row.

---

## 7. Types & Validators

- `types/database.types.ts`: add `organizations` table types; add `organization_id` to every row type.
- `types/auth.types.ts`: `User` gains `organizationId`; add `Organization` type.
- New `lib/validators/organization.validators.ts`: `registerOrganizationSchema`, `updateOrganizationSchema`.
- `constants/roles.constants.ts`: unchanged — roles remain meaningful *within* an org.

---

## 8. Implementation Steps (ordered)

**Phase A — Database (do first, deploy as one unit with Phase B)**
1. ✅ Write `025_multi_tenancy.sql` per §3 (organizations, columns, backfill, constraints, `get_my_org_id()`, RLS rewrite incl. collections, function/trigger/view updates, indexes)
2. Test on a staging/branch Supabase project with a copy of prod data
3. Verify existing app still works against migrated DB *before* app changes ship (it will, because all data is in the default org, and org resolution needs no re-login)

**Phase B — App plumbing** ✅ **done**
4. ✅ `types/database.types.ts` + auth types — org fields added; `organization_id` is **required** on every Insert type and `create()` query functions take `Omit<Insert, "organization_id">` + an `orgId` param, so an unstamped insert is a compile error. Also added proper `bulk_upload_logs` types (removed the `(db as any)` casts).
5. ✅ `auth-guard.ts` — `getByIdWithOrg` join, org `status !== 'ACTIVE'` ⇒ 403 (tenant kill-switch), handlers receive `auth.orgId`. Same checks added to `lib/auth/require-permission.ts` (server pages) and login.
6. ✅ All `lib/database/*.queries.ts` take `orgId` (right after `db` by convention) — filters on reads, stamping on writes; raw queries inside routes (dashboard stats/activity, reports overview, stock availability/batches, challans, fulfill-remaining) org-filtered too.
7. ✅ Cross-entity org checks: order create validates dealer + all seed ids (`seedsQueries.getExistingIds`); collection create/update validates dealer; challan create validates order; stock create validates seed; RPC wrappers (`approveWithStockDeduction`, `getReconciliation`) verify ownership before invoking — required because the DB-side guard skips the service-role context.
8. ✅ Bulk-upload routes stamp `organization_id` on every dealer/stock insert and on `bulk_upload_logs`.
9. ✅ `getNextSerial(db, orgId, fy)` — per-org order numbering.
10. ✅ `/api/auth/me` + login return `organization` via a shared `serializeAuthUser` (`lib/api/serialize-user.ts`); `User` type gains `organization`.

Deliberately left global (not org-scoped): username-uniqueness checks in `POST /api/users` and settings (usernames are globally unique by design, §4.2) and the pre-auth username→email lookup in login.

**Phase C — Onboarding + UI** ✅ **done**
11. ✅ `POST /api/auth/register-organization` — public, rate-limited (5/15min/IP), service-role: unique slug (`toSlug` + `-2`/`-3` suffixing), org → auth user → SUPER_ADMIN profile with best-effort rollback on each failure. `/register` page + form (mirrors login styling); login ⇄ register links; `?registered=1` success notice on login.
12. ✅ Sidebar shows org name + logo from the auth store (falls back to "Beej Setu" pre-hydration); Settings gains a SUPER_ADMIN-only Organization card; `PATCH /api/settings/organization` (SUPER_ADMIN, name + logo URL) with shared `serializeOrganization`.
13. ✅ Auth store needed no structural change (persists `User`, which now carries `organization`); `AuthSync` also refetches `/me` when a persisted pre-tenant user lacks `organization`. `/register` added to `PUBLIC_ROUTES` (proxy.ts auth redirect).

**Phase D — Verification**
14. **Isolation test (the critical one):** create two orgs (A, B) with users and data in each. As org-A admin: list endpoints return only A's rows; direct `GET /api/orders/<B-order-id>` → 404/403; `POST /api/orders` with B's `dealer_id` → rejected; RPC `approve_order` on B's order → rejected; bulk uploads land in A only; reports/dashboard counts only A.
15. Repeat key checks with the **browser anon client** (RLS layer) and via **API routes that use the admin client** (code layer) — both must hold independently.
16. Regression: full existing flow (login → dealer → order → approve → dispatch → challan → collection → reports) inside one org.

---

## 9. Known Risks & Gotchas

| Risk | Mitigation |
|---|---|
| **Admin client bypasses RLS** — one missed `.eq('organization_id')` = cross-tenant leak | Code-review checklist: grep all `getSupabaseAdminClient()` call sites; §4.3 rule of thumb; isolation tests in Phase D |
| Stale org/role after change | None: `get_my_org_id()`/`get_my_role()` read `profiles` live; `withAuth` also re-fetches per request |
| `collections` had no RLS at all | Fixed in migration 025 — do not skip |
| SECURITY DEFINER RPCs callable cross-org by UUID guessing | Org guards inside every function (§2.6) |
| Order numbers interleave across orgs | Per-org `getNextSerial` + `(organization_id, order_number)` unique |
| Username collisions across companies | Accepted v1 (global unique); revisit with per-org usernames + org slug at login if it becomes a problem |
| Existing sessions break post-migration | They don't — org resolution is DB-side, sessions keep working |
| In-memory rate limiter resets per instance | Pre-existing issue, unchanged by this work |

---

## 10. Out of Scope (v1)

- Billing / subscription plans
- Multi-org membership for one user (org switching)
- Platform admin console (§5.2)
- Custom domains / per-tenant subdomains (`acme.beejsetu.com`) — slug exists in the schema so this can be added later without a migration
- Per-tenant feature flags (use `organizations.settings` JSONB when needed)
