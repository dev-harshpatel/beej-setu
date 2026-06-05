# Security Audit — Role-Based Access & Data Exposure

**Application:** Beej Setu (seed distribution management)
**Date:** 2026-06-05
**Roles in system:** `SUPER_ADMIN` · `ADMIN` · `STAFF` · `DISPATCH_STAFF`

---

## How protection currently works

| Layer | Mechanism | Status |
|---|---|---|
| Middleware (`middleware.ts`) | Redirects **unauthenticated** users to `/login` — does NOT check role/permission | Auth only |
| API routes | `withAuth(handler, PERMISSION)` wrapper — enforces role permission, returns 401/403 | ✅ Good |
| Page routes | `requirePermission(PERMISSION)` at top of server component — renders 404 if unauthorized | Inconsistently applied |
| Navigation sidebar | Filters items by permission client-side | UI only — not a security control |

---

## Part 1 — Data Exposed Through API / Network Tab

### CRITICAL

#### C-1 · `GET /api/users/[id]/password` returns decrypted plaintext passwords
**File:** `app/api/users/[id]/password/route.ts:11–50`

Any user with `USERS_EDIT` permission (i.e. ADMIN and SUPER_ADMIN) can call this endpoint and receive a subordinate user's password in plain text. The system stores passwords in a custom encrypted column (`encrypted_password`) specifically to support this endpoint.

**Risk:** An admin account compromise exposes ALL staff/dispatch-staff passwords. Passwords should never leave the server in any form.

**Fix:** Remove the `GET` handler entirely. Password management should be RESET-only (the `PATCH` handler that calls `auth.admin.updateUserById` is correct). Delete the `decryptPassword` call path and the `encrypted_password` column lookup from the GET route.

---

#### C-2 · `GET /api/reports/overview` exposes full business intelligence to STAFF
**File:** `app/api/reports/` (overview route)
**Permission required:** `REPORTS_VIEW` — which STAFF role has

Response includes: **entire inventory status** (low/critical stock counts), **top 10 seeds by demand** (system-wide), **top 10 dealers by order volume** (system-wide), **order status breakdown** (system-wide). A STAFF user (who should only see their own territory) can read the full company picture.

**Fix:** Filter overview data by `staff_id` when the requester is STAFF role. STAFF should see only stats for their assigned dealers and orders.

---

### HIGH

#### H-1 · `GET /api/reports/meta` exposes the complete staff directory
**Permission required:** `REPORTS_VIEW` — which STAFF role has

Returns all active STAFF users with `id`, `name`, and `territory`. A staff member can enumerate all colleagues, their territories, and IDs. Currently gated only by `REPORTS_VIEW`.

**Fix:** Require `USERS_VIEW` permission instead of `REPORTS_VIEW`, or remove the staff list from the response and let the frontend handle filters differently.

---

#### H-2 · `GET /api/dashboard/activity` returns system-wide activity log to any `ORDERS_VIEW` user
DISPATCH_STAFF has `ORDERS_VIEW` and would receive the activity feed showing approvals, stock additions, and actions by other users.

**Fix:** Restrict to `DASHBOARD_VIEW` permission (which DISPATCH_STAFF does NOT have), or filter activity entries to those relevant to the requesting user.

---

#### H-3 · `GET /api/dealers/[id]`, `PATCH /api/dealers/[id]`, `DELETE /api/dealers/[id]` — no STAFF scoping on individual dealer routes
**File:** `app/api/dealers/[id]/route.ts`

The list endpoint (`GET /api/dealers`) correctly restricts STAFF to their own dealers. However, individual dealer routes have no such check — a STAFF user who knows (or guesses) another dealer's UUID can read, edit, or delete it directly.

**Fix:** In the `[id]` route handlers, add the same ownership check applied to the list endpoint: if `auth.profile.role === ROLES.STAFF`, verify `dealer.staff_id === auth.profile.id` before proceeding, return 403 otherwise.

---

#### H-4 · `GET /api/orders` and `GET /api/orders/[id]` expose all orders to all STAFF
No `staff_id` filtering. A STAFF user can see every order in the system — including orders placed by colleagues for dealers they don't manage.

**Fix:** When `auth.profile.role === ROLES.STAFF`, add a `staff_id` filter to the orders query so STAFF only sees orders they created. This mirrors the pattern already used for dealers and collections.

---

### MEDIUM

#### M-1 · `GET /api/dashboard/stats` exposes headcounts of staff/admins to any `ORDERS_VIEW` user
Returns `totalStaff` and `totalAdmins` counts to DISPATCH_STAFF (who has `ORDERS_VIEW`). Not critical but reveals org size.

**Fix:** Gate the full stats response behind `DASHBOARD_VIEW`, or omit user-count fields from the DISPATCH_STAFF response.

---

#### M-2 · No rate limiting on `POST /api/auth/login`
Unauthenticated endpoint. An attacker can make unlimited password-guessing attempts.

**Fix:** Add request rate limiting (e.g. Upstash Ratelimit, or a simple sliding-window check in middleware) scoped to IP address.

---

#### M-3 · Bulk upload endpoints have no detailed audit trail
`POST /api/dealers/bulk-upload` and `POST /api/stock/bulk-upload` only report success/failure counts. Individual row mutations are not recorded.

**Fix:** Write each imported row (or at minimum the diff summary) to an audit/log table with the requesting user ID and timestamp.

---

## Part 2 — Cross-Role Page Access (URL navigation)

The middleware only blocks **unauthenticated** users. Authenticated users of any role can navigate directly to any page URL — the page shell will render even if the API calls inside it return 403. Only two pages currently use `requirePermission()` for a server-side guard (`/stock` and `/reports`).

### Pages accessible by the wrong role via direct URL

| Page | URL | Missing permission guard | Roles that should be blocked |
|---|---|---|---|
| Dashboard | `/dashboard` | `DASHBOARD_VIEW` | DISPATCH_STAFF |
| Users | `/users` | `USERS_VIEW` | STAFF, DISPATCH_STAFF |
| Dealers | `/dealers` | `DEALERS_VIEW` | DISPATCH_STAFF |
| Seeds / Products | `/seeds` | `SEEDS_VIEW` | DISPATCH_STAFF |
| Collections | `/collections` | `COLLECTIONS_VIEW` | DISPATCH_STAFF |
| Create Order | `/orders/create` | `ORDERS_CREATE` | DISPATCH_STAFF |
| Challan page | `/orders/[id]/challan` | `CHALLAN_MANAGE` | STAFF (non-dispatch) can access the URL — they see the form but API blocks them |
| Stock Ledger | `/stock/ledger` | `STOCK_MANAGE` | STAFF (has `STOCK_VIEW` but not `STOCK_MANAGE`) |
| Reports — Dealer | `/reports/dealer` | `REPORTS_VIEW` | DISPATCH_STAFF; also "use client" so no server check at all |
| Reports — Product | `/reports/product` | `REPORTS_VIEW` | DISPATCH_STAFF; also "use client" so no server check at all |
| Reports — Collections | `/reports/collections` | `REPORTS_VIEW` | DISPATCH_STAFF; also "use client" so no server check at all |

### Fix (same pattern for all)

Convert each listed page to an `async` server component and add `requirePermission(PERMISSIONS.XYZ)` as the first call — the same pattern already used in `app/(dashboard)/stock/page.tsx` and `app/(dashboard)/reports/page.tsx`.

```ts
// Example fix — app/(dashboard)/users/page.tsx
export default async function UsersPage() {
  await requirePermission(PERMISSIONS.USERS_VIEW);
  // ... rest of the page
}
```

For client-only report pages (`/reports/dealer`, `/reports/product`, `/reports/collections`): wrap the `"use client"` component in a thin server wrapper that performs the permission check before rendering the client component.

---

## Fix Priority Order

| # | Issue | File(s) | Severity | Status |
|---|---|---|---|---|
| 1 | Remove `GET /api/users/[id]/password` (plaintext password endpoint) | `app/api/users/[id]/password/route.ts` | CRITICAL | ✅ Fixed |
| 2 | Add `requirePermission` to `/users` page | `app/(dashboard)/users/page.tsx` | HIGH | ✅ Fixed |
| 3 | Add `requirePermission` to `/dealers` page | `app/(dashboard)/dealers/page.tsx` | HIGH | ✅ Fixed |
| 4 | Add `requirePermission` to `/seeds` page | `app/(dashboard)/seeds/page.tsx` | HIGH | ✅ Fixed |
| 5 | Add `requirePermission` to `/collections` page | `app/(dashboard)/collections/page.tsx` | HIGH | ✅ Fixed |
| 6 | Add `requirePermission` to `/orders/create` page | `app/(dashboard)/orders/create/page.tsx` | HIGH | ✅ Fixed |
| 7 | Add `requirePermission` to `/dashboard` page | `app/(dashboard)/dashboard/page.tsx` | HIGH | ✅ Fixed |
| 8 | Scope `GET /api/dealers/[id]`, `PATCH`, `DELETE` to STAFF's own dealers | `app/api/dealers/[id]/route.ts` | HIGH | ✅ Fixed |
| 9 | Scope `GET /api/orders` to STAFF's own orders | `app/api/orders/route.ts` | HIGH | ✅ Fixed |
| 10 | Scope `GET /api/orders/[id]` to STAFF's own orders | `app/api/orders/[id]/route.ts` | HIGH | ✅ Fixed |
| 11 | Filter `GET /api/reports/overview` by staff territory for STAFF role | `app/api/reports/overview/route.ts` | HIGH | ✅ Fixed |
| 12 | Move `GET /api/reports/meta` behind `USERS_VIEW` or remove staff list | `app/api/reports/meta/route.ts` | HIGH | ✅ Fixed |
| 13 | Add `requirePermission` to `/stock/ledger` page | `app/(dashboard)/stock/ledger/page.tsx` | MEDIUM | ✅ Fixed |
| 14 | Add server wrapper with `requirePermission` to `/reports/dealer` | `app/(dashboard)/reports/dealer/page.tsx` | MEDIUM | ✅ Fixed |
| 15 | Add server wrapper with `requirePermission` to `/reports/product` | `app/(dashboard)/reports/product/page.tsx` | MEDIUM | ✅ Fixed |
| 16 | Add server wrapper with `requirePermission` to `/reports/collections` | `app/(dashboard)/reports/collections/page.tsx` | MEDIUM | ✅ Fixed |
| 17 | Add `requirePermission` to `/orders/[id]/challan` page | `app/(dashboard)/orders/[id]/challan/page.tsx` | MEDIUM | ✅ Fixed |
| 18 | Gate `GET /api/dashboard/activity` behind `DASHBOARD_VIEW` | `app/api/dashboard/activity/route.ts` | MEDIUM | ✅ Fixed |
| 19 | Restrict `GET /api/dashboard/stats` user-count fields from DISPATCH_STAFF | `app/api/dashboard/stats/route.ts` | LOW | ✅ Fixed |
| 20 | Add rate limiting to `POST /api/auth/login` | `app/api/auth/login/route.ts` | MEDIUM | ✅ Fixed |
| 21 | Add row-level audit logging for bulk uploads | `app/api/dealers/bulk-upload/`, `app/api/stock/bulk-upload/` | LOW | ✅ Fixed |

---

## What is already correct

- All API routes consistently use `withAuth()` — no unprotected data endpoints.
- Middleware refreshes Supabase sessions on every request.
- `is_active` check blocks disabled accounts at the API layer.
- `GET /api/dealers` and collections endpoints correctly scope STAFF to their own records.
- `GET /api/users` hides SUPER_ADMIN from regular ADMIN.
- Challan endpoints properly restricted to `CHALLAN_MANAGE` (DISPATCH_STAFF only).
- Collections `PATCH`/`DELETE` correctly verify ownership for STAFF.
- ADMIN role cannot create or edit SUPER_ADMIN users.
- `PATCH /api/settings/password` requires the user's current password before changing it.
