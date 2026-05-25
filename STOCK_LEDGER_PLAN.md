# Stock Ledger — Batch Movement Tracker
### Revised Plan (v2)

---

## What This Module Does

Lets admins trace the complete lifecycle of any seed batch — from first stock entry, through every order dispatch and manual correction, to the current balance. Acts as a full, immutable audit trail per batch.

---

## Feasibility: YES — Fully Implementable

One database migration, two API routes, one query file, one new page with five components, plus minor additions to two existing screens.

---

## The Core Problem

`seed_stock` only stores the **current state**. There is no history of how it got there.

| What the admin wants to see | Currently available? |
|---|---|
| "100 bags added by Admin X on 01 Jan 2024" | ❌ No — only current balance exists |
| "25 bags dispatched to Dealer A by Staff B, approved by Admin C" | ❌ No — orders aren't linked back to batches |
| "−5 bags adjusted out: damaged goods" | ❌ No — manual corrections are completely invisible |
| Batch-level FIFO deduction trail | ❌ No — `deduct_seed_stock` runs FIFO silently |

Solution: introduce a `stock_movements` ledger table and update the relevant DB functions and triggers to write into it.

---

## User Flow

```
1. Select Crop       →  "Maize"
2. Select Variety    →  "DKC 9144"          (filtered by crop)
3. Select Pack Size  →  "4 kg"              (filtered by crop + variety)
4. OR type Batch #   →  "B-2024-01"         (shortcut, skips steps 1-3)
                              ↓
   ┌──────────────────────────────────────────────────────┐
   │  Batches for  Maize / DKC 9144 / 4 kg               │
   │                                                      │
   │  Batch #    Status    Bags   Pkts  First Entry       │
   │  B-2024-01  ACTIVE      75      2  01 Jan 2024       │
   │  B-2024-02  LOW          0      3  15 Mar 2024       │
   │  B-2023-05  DEPLETED     0      0  10 Jun 2023       │
   └──────────────────────────────────────────────────────┘
                              ↓  (click a batch row)
   ┌──────────────────────────────────────────────────────────────┐
   │  Batch B-2024-01  ·  Maize / DKC 9144 / 4 kg                │
   │                                                              │
   │  Total IN: 100 bags    Total DISPATCHED: 25 bags             │
   │  Corrections: −2 bags  Current Balance: 73 bags, 2 pkts      │
   │  First entry: 01 Jan 2024    Last movement: 20 Feb 2024      │
   │  Dealers served: 2    Orders: 2         [Export CSV] [Print] │
   ├──────────────────────────────────────────────────────────────┤
   │  Date filter: [From ──────] [To ──────]                      │
   ├──────────────────────────────────────────────────────────────┤
   │  Date          Type            Qty         Balance  Actor    │
   │  01 Jan 2024   ADD            +100 bags    100 bags          │
   │                               by Admin Rahul                 │
   │                               Note: "Received from supplier" │
   │                                                              │
   │  10 Jan 2024   DISPATCH        −10 bags     90 bags          │
   │                               Order #ORD-0012 → [view]       │
   │                               Dealer: Green Agro             │
   │                               Staff: Kiran / Approved: Rahul │
   │                                                              │
   │  15 Jan 2024   ADJUSTMENT_OUT  −2 bags      88 bags          │
   │                               by Admin Rahul                 │
   │                               Note: "Damaged in storage"     │
   │                                                              │
   │  20 Feb 2024   DISPATCH        −15 bags     73 bags          │
   │                               Order #ORD-0031 → [view]       │
   │                               Dealer: Sunrise Seeds          │
   │                               Staff: Meena / Approved: Rahul │
   │                                                              │
   │  Current Balance: 73 bags, 2 pkts                            │
   └──────────────────────────────────────────────────────────────┘
```

---

## Design Principles (What Changed from v1)

Before getting into implementation, these are the four critical corrections from the original plan:

### 1. No stored balances — compute via window function

The original plan stored `balance_bags` and `balance_packets` at write time. This is a race condition: two concurrent order approvals can both read the same "current balance" and each write a wrong post-deduction value. More fundamentally, a stored derived value can drift from reality if anything touches the table in an unexpected order.

**The correct ledger approach**: store only the delta (how much was added or removed). Compute the running balance at read time using a SQL window function:

```sql
SUM(
  CASE WHEN movement_type IN ('ADD', 'ADJUSTMENT_IN')
       THEN  quantity_packets
       ELSE -quantity_packets
  END
) OVER (
  PARTITION BY seed_id, batch_number
  ORDER BY movement_date ASC, created_at ASC, id ASC
) AS running_balance_packets
```

The `id` as final tiebreaker ensures deterministic ordering when two rows share the same timestamp.

### 2. Downward manual corrections must be logged

The original trigger only fired when stock went up (`v_delta > 0`). If an admin edits a batch from 100 bags to 80 bags (damage, expiry, count correction), that −20 change was **completely invisible**. This is a serious audit gap — an admin could silently remove stock with no record.

The trigger must handle both directions: positive delta → `ADJUSTMENT_IN`, negative delta → `ADJUSTMENT_OUT`.

### 3. Four movement types, not two

| Type | When used | Direction |
|---|---|---|
| `ADD` | Batch first created — initial stock entry | +IN |
| `ADJUSTMENT_IN` | Admin manually increases an existing batch | +IN |
| `ADJUSTMENT_OUT` | Admin manually decreases an existing batch (damage / expiry / correction) | −OUT |
| `DISPATCH` | Order approved — stock deducted via `deduct_seed_stock` | −OUT |

This distinction matters for the summary card: "Total dispatched" should count only `DISPATCH`; "Total corrections" counts `ADJUSTMENT_IN + ADJUSTMENT_OUT` separately.

### 4. Append-only by design, not by accident

The original plan had no DELETE policy, which accidentally prevented deletions (PostgreSQL denies by default when RLS is on and no policy exists). This must be **explicit and intentional**.

More importantly: if an admin makes a data entry error (typed 500 instead of 50), the fix is a new `ADJUSTMENT_OUT` entry for −450, not a delete + re-insert. Deleting a row breaks the window function balance calculation. Reversal entries preserve the full history.

**Rule**: the ledger is append-only. Corrections are new rows, never edits or deletes.

---

## Implementation

---

### Step 1 — Database Migration (`013_stock_movements.sql`)

#### 1a. New table: `stock_movements`

```sql
CREATE TABLE public.stock_movements (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_id          UUID        NOT NULL REFERENCES public.seed_products(id) ON DELETE CASCADE,
  batch_number     TEXT        NOT NULL,

  movement_type    TEXT        NOT NULL CHECK (movement_type IN (
                                 'ADD', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DISPATCH'
                               )),

  -- Canonical quantity in packets (always positive — direction comes from movement_type)
  quantity_packets INTEGER     NOT NULL CHECK (quantity_packets > 0),

  -- Human-readable split at the time of writing
  -- (preserves the packets_per_bag conversion rate even if the product is later changed)
  quantity_bags    INTEGER     NOT NULL DEFAULT 0,
  quantity_pkt_rem INTEGER     NOT NULL DEFAULT 0,

  -- Physical date of the event (set by user — may differ from created_at)
  movement_date    DATE        NOT NULL DEFAULT CURRENT_DATE,

  -- Context
  movement_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_id         UUID        REFERENCES public.orders(id)   ON DELETE SET NULL,
  notes            TEXT,

  -- System timestamp (always auto-set — never user-editable)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()

  -- NOTE: No balance columns — running balance is computed at read time
  --       via window function. See stock-movements.queries.ts.
  -- NOTE: No UPDATE or DELETE policies — this table is append-only by design.
  --       Corrections must be new rows (ADJUSTMENT_IN / ADJUSTMENT_OUT).
);

CREATE INDEX idx_sm_seed_batch ON public.stock_movements
  (seed_id, batch_number, movement_date ASC, created_at ASC);

CREATE INDEX idx_sm_order ON public.stock_movements (order_id);
CREATE INDEX idx_sm_movement_by ON public.stock_movements (movement_by);
```

#### 1b. RLS — only ADMIN / SUPER_ADMIN, no DELETE

```sql
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sm_select_admin" ON public.stock_movements
  FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY "sm_insert_admin" ON public.stock_movements
  FOR INSERT WITH CHECK (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- Intentionally no UPDATE or DELETE policy.
-- Corrections must be logged as new reversal entries.
```

#### 1c. Trigger: log ADD / ADJUSTMENT_IN / ADJUSTMENT_OUT on `seed_stock` changes

```sql
CREATE OR REPLACE FUNCTION public.log_stock_manual_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_ppb     INTEGER;
  v_new_pkt INTEGER;
  v_old_pkt INTEGER;
  v_delta   INTEGER;
  v_type    TEXT;
  v_abs     INTEGER;
BEGIN
  SELECT packets_per_bag INTO v_ppb
  FROM public.seed_products WHERE id = NEW.seed_id;

  v_new_pkt := NEW.bag_stock  * v_ppb + NEW.packet_stock;
  v_old_pkt := COALESCE(OLD.bag_stock, 0) * v_ppb + COALESCE(OLD.packet_stock, 0);
  v_delta   := v_new_pkt - v_old_pkt;

  -- INSERT (new batch): always ADD
  IF TG_OP = 'INSERT' THEN
    v_type := 'ADD';
    v_abs  := v_new_pkt;
  -- UPDATE with positive delta: ADJUSTMENT_IN
  ELSIF v_delta > 0 THEN
    v_type := 'ADJUSTMENT_IN';
    v_abs  := v_delta;
  -- UPDATE with negative delta: ADJUSTMENT_OUT
  ELSIF v_delta < 0 THEN
    v_type := 'ADJUSTMENT_OUT';
    v_abs  := ABS(v_delta);
  ELSE
    -- delta = 0, nothing changed — skip
    RETURN NEW;
  END IF;

  -- Skip zero-stock inserts (batch created with 0,0 as placeholder)
  IF v_abs = 0 THEN RETURN NEW; END IF;

  INSERT INTO public.stock_movements (
    seed_id, batch_number, movement_type,
    quantity_packets, quantity_bags, quantity_pkt_rem,
    movement_date, movement_by, notes
  ) VALUES (
    NEW.seed_id, NEW.batch_number, v_type,
    v_abs,
    FLOOR(v_abs::NUMERIC / v_ppb),
    v_abs % v_ppb,
    CURRENT_DATE,
    NEW.last_updated_by,
    NULL  -- notes flow in from the API layer via a separate call if needed
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_stock_log_manual_change
  AFTER INSERT OR UPDATE ON public.seed_stock
  FOR EACH ROW EXECUTE FUNCTION public.log_stock_manual_change();
```

> **Trigger vs. `deduct_seed_stock` conflict**: `deduct_seed_stock` UPDATEs `seed_stock`, which fires this trigger. But the trigger checks for negative delta (ADJUSTMENT_OUT) and the deduction function produces negative delta. To avoid double-logging, the trigger must check a session variable to know if it's running inside a deduction context. Use a PostgreSQL session variable:
>
> ```sql
> -- Set before deduct loop:  PERFORM set_config('app.in_deduction', 'true', true);
> -- Clear after:              PERFORM set_config('app.in_deduction', 'false', true);
> -- In trigger:               IF current_setting('app.in_deduction', true) = 'true' THEN RETURN NEW; END IF;
> ```

#### 1d. Update `deduct_seed_stock` — add order context + log DISPATCH movements

```sql
CREATE OR REPLACE FUNCTION public.deduct_seed_stock(
  p_seed_id      UUID,
  p_quantity     INTEGER,
  p_unit         TEXT,
  p_order_id     UUID  DEFAULT NULL,
  p_performed_by UUID  DEFAULT NULL,
  p_approved_by  UUID  DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_ppb         INTEGER;
  v_to_deduct   INTEGER;
  v_remaining   INTEGER;
  v_new_total   INTEGER;
  v_deducted    INTEGER;
  r             RECORD;
BEGIN
  -- Suppress the manual-change trigger during deduction
  PERFORM set_config('app.in_deduction', 'true', true);

  SELECT packets_per_bag INTO v_ppb
  FROM public.seed_products WHERE id = p_seed_id;

  IF v_ppb IS NULL THEN
    RAISE EXCEPTION 'Seed product % not found', p_seed_id;
  END IF;

  v_to_deduct := CASE
    WHEN p_unit IN ('Bag', 'Box') THEN p_quantity * v_ppb
    ELSE p_quantity
  END;

  v_remaining := v_to_deduct;

  FOR r IN
    SELECT id, batch_number,
           bag_stock * v_ppb + packet_stock AS total_packets
    FROM   public.seed_stock
    WHERE  seed_id = p_seed_id
      AND  (bag_stock > 0 OR packet_stock > 0)
    ORDER  BY created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    IF r.total_packets <= v_remaining THEN
      v_deducted  := r.total_packets;
      v_remaining := v_remaining - r.total_packets;
      UPDATE public.seed_stock
      SET bag_stock = 0, packet_stock = 0, updated_at = NOW()
      WHERE id = r.id;
    ELSE
      v_deducted  := v_remaining;
      v_new_total := r.total_packets - v_remaining;
      v_remaining := 0;
      UPDATE public.seed_stock
      SET bag_stock    = FLOOR(v_new_total::NUMERIC / v_ppb),
          packet_stock = v_new_total % v_ppb,
          updated_at   = NOW()
      WHERE id = r.id;
    END IF;

    -- Log one DISPATCH row per batch touched (preserves per-batch granularity)
    INSERT INTO public.stock_movements (
      seed_id, batch_number, movement_type,
      quantity_packets, quantity_bags, quantity_pkt_rem,
      movement_date, movement_by, approved_by, order_id
    ) VALUES (
      p_seed_id, r.batch_number, 'DISPATCH',
      v_deducted,
      FLOOR(v_deducted::NUMERIC / v_ppb),
      v_deducted % v_ppb,
      CURRENT_DATE,
      p_performed_by,
      p_approved_by,
      p_order_id
    );
  END LOOP;

  -- Re-enable manual-change trigger
  PERFORM set_config('app.in_deduction', 'false', true);

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Insufficient stock: still need % packets for product %',
      v_remaining, p_seed_id;
  END IF;
END;
$$;
```

#### 1e. Update `approve_order` — pass order context to deduct

```sql
CREATE OR REPLACE FUNCTION public.approve_order(
  p_order_id UUID,
  p_status   TEXT DEFAULT 'APPROVED'
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_item         RECORD;
  v_staff_id     UUID;
BEGIN
  IF p_status NOT IN ('APPROVED', 'PARTIALLY_APPROVED') THEN
    RAISE EXCEPTION 'approve_order() only accepts APPROVED or PARTIALLY_APPROVED, got: %', p_status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'Order % must be PENDING to approve', p_order_id;
  END IF;

  -- Fetch the staff who created this order (stored as performed_by in movements)
  SELECT staff_id INTO v_staff_id FROM public.orders WHERE id = p_order_id;

  FOR v_item IN
    SELECT seed_id, quantity, unit
    FROM public.order_items
    WHERE order_id = p_order_id
  LOOP
    PERFORM public.deduct_seed_stock(
      v_item.seed_id,
      v_item.quantity,
      v_item.unit,
      p_order_id,
      v_staff_id,    -- staff who created the order = performed_by
      auth.uid()     -- admin running approve_order = approved_by
    );
  END LOOP;

  UPDATE public.orders
  SET status = p_status, updated_at = NOW()
  WHERE id = p_order_id;
END;
$$;
```

#### 1f. Reconciliation check function

Verifies that the sum of all movements matches the current `seed_stock` balance. Run this from the API to show a health indicator per batch.

```sql
CREATE OR REPLACE FUNCTION public.check_batch_reconciliation(
  p_seed_id      UUID,
  p_batch_number TEXT
)
RETURNS TABLE (
  ledger_packets  INTEGER,
  actual_packets  INTEGER,
  is_reconciled   BOOLEAN,
  discrepancy     INTEGER
) LANGUAGE sql AS $$
  WITH ledger AS (
    SELECT COALESCE(SUM(
      CASE WHEN movement_type IN ('ADD', 'ADJUSTMENT_IN')
           THEN  quantity_packets
           ELSE -quantity_packets
      END
    ), 0) AS total
    FROM public.stock_movements
    WHERE seed_id = p_seed_id AND batch_number = p_batch_number
  ),
  actual AS (
    SELECT COALESCE(
      ss.bag_stock * sp.packets_per_bag + ss.packet_stock, 0
    ) AS total
    FROM public.seed_stock ss
    JOIN public.seed_products sp ON sp.id = ss.seed_id
    WHERE ss.seed_id = p_seed_id AND ss.batch_number = p_batch_number
  )
  SELECT
    ledger.total::INTEGER AS ledger_packets,
    actual.total::INTEGER AS actual_packets,
    (ledger.total = actual.total) AS is_reconciled,
    (actual.total - ledger.total)::INTEGER AS discrepancy
  FROM ledger, actual;
$$;
```

#### 1g. Partial historical backfill (included in migration)

Inserts synthetic movement rows for all existing batches so they have a starting point rather than blank history.

```sql
-- Backfill: one synthetic ADD row per existing seed_stock batch
-- quantity = current balance (we don't know the original — it may have been partially deducted)
-- Notes flag this as pre-ledger migrated data so admins know it's estimated
INSERT INTO public.stock_movements (
  seed_id, batch_number, movement_type,
  quantity_packets, quantity_bags, quantity_pkt_rem,
  movement_date, movement_by, notes, created_at
)
SELECT
  ss.seed_id,
  ss.batch_number,
  'ADD',
  ss.bag_stock * sp.packets_per_bag + ss.packet_stock,
  ss.bag_stock,
  ss.packet_stock,
  ss.created_at::DATE,
  ss.last_updated_by,
  'Migrated — pre-ledger balance (estimated)',
  ss.created_at
FROM public.seed_stock ss
JOIN public.seed_products sp ON sp.id = ss.seed_id
WHERE ss.bag_stock > 0 OR ss.packet_stock > 0;
```

---

### Step 2 — Query Layer (`lib/database/stock-movements.queries.ts`)

#### `getBatches(filters)`

Joins `seed_stock → seed_products → crops`. Filters by `cropId`, `variety`, `pack_size`. Optionally filters by `batchNumber` text search (direct search shortcut).

Returns for each batch:
- `seed_id`, `batch_number`, `bag_stock`, `packet_stock`
- `crop.name`, `variety`, `pack_size`
- `first_movement_date` (from MIN of stock_movements.movement_date)
- `last_movement_date`
- Computed `batch_status`: `ACTIVE` | `LOW` | `DEPLETED`

#### `getMovements(seedId, batchNumber, params?)`

Queries `stock_movements` with pagination (`page`, `pageSize`), optional `dateFrom`/`dateTo` filter.

Joins:
- `movement_by → profiles (name, role)`
- `approved_by → profiles (name)`
- `order_id → orders (order_number) → order.dealer → dealers (name)`

Computes running balance via window function in the SQL query (not in application code).

Returns:
- `movements: StockMovementEntry[]` — each entry includes `running_balance_packets`, `running_balance_bags`, `running_balance_pkt_rem`
- `summary: BatchSummary` — total_in_packets, total_dispatched_packets, total_adj_in_packets, total_adj_out_packets, distinct_dealers_count, orders_count
- `total: number` (for pagination)

#### `getBatchReconciliation(seedId, batchNumber)`

Calls the `check_batch_reconciliation` RPC function. Returns the reconciliation status.

---

### Step 3 — API Routes

| Route | Method | Query params | Description |
|---|---|---|---|
| `/api/stock/batches` | GET | `cropId`, `variety`, `packSize`, `batchNumber` | Returns batch list with status |
| `/api/stock/movements` | GET | `seedId`, `batchNumber`, `page`, `pageSize`, `dateFrom`, `dateTo` | Returns paginated movements + summary |
| `/api/stock/reconciliation` | GET | `seedId`, `batchNumber` | Returns reconciliation status |

All three protected: ADMIN / SUPER_ADMIN only.

---

### Step 4 — Frontend

**Route**: `/stock/ledger`

---

#### Components

| Component | File | Purpose |
|---|---|---|
| `StockLedgerPage` | `_components/stock-ledger-page.tsx` | Orchestrates all state, fetches data |
| `StockLedgerFilters` | `_components/stock-ledger-filters.tsx` | Crop / Variety / Pack Size cascade + Batch # direct search |
| `BatchList` | `_components/batch-list.tsx` | Table of batches with status badges, click to select |
| `BatchSummaryCard` | `_components/batch-summary-card.tsx` | Stats header shown above the timeline |
| `BatchMovementTimeline` | `_components/batch-movement-timeline.tsx` | Paginated timeline with date range filter + export |

---

#### Cascading Filter Logic

```
cropId changes        → reset variety, packSize, batchNumber search, selectedBatch
variety changes       → reset packSize, selectedBatch
packSize changes      → reset selectedBatch, trigger batch fetch
batchNumber typed     → bypass cascade, fetch batch directly, auto-select if single result
batchRow clicked      → set selectedBatch, trigger movements fetch
```

Variety and pack size options are derived client-side from the seeds list (already fetched, no extra API call needed). The cascade ultimately resolves to a `seed_id` which is passed as-is to the movements API.

---

#### `BatchSummaryCard` — what it shows

Computed from the `summary` object returned alongside movements (no extra API call):

```
Batch B-2024-01  ·  Maize / DKC 9144 / 4 kg
─────────────────────────────────────────────────────────
Total IN        100 bags     (ADD + ADJUSTMENT_IN)
Total DISPATCHED  25 bags     (DISPATCH only)
Corrections      −2 bags     (net ADJUSTMENT_IN − ADJUSTMENT_OUT)
Current Balance  73 bags, 2 pkts
─────────────────────────────────────────────────────────
First entry: 01 Jan 2024     Last movement: 20 Feb 2024
Dealers served: 2            Orders contributed to: 2
Reconciliation:  ✓ OK        [Export CSV]  [Print]
```

If `is_reconciled = false` from the reconciliation API, show a red warning: "⚠ Reconciliation mismatch — ledger total does not match current stock. Contact support."

---

#### `BatchMovementTimeline` — each row shows

- **Date** — `movement_date` formatted `dd/MM/yyyy` (plus `created_at` time in tooltip)
- **Type badge** — `ADD` (green) / `ADJUSTMENT_IN` (teal) / `ADJUSTMENT_OUT` (orange) / `DISPATCH` (red)
- **Quantity** — `+100 bags` or `−10 bags, 2 pkts` (sign derived from movement_type)
- **Running balance** — e.g. `90 bags, 0 pkts` (computed by window function, never stored)
- **Actor** — varies by type:
  - ADD / ADJUSTMENT: "by [name]"
  - DISPATCH: "Staff: [name] → Dealer: [name] → Approved: [name]"
- **Order link** — for DISPATCH rows, show `Order #ORD-0012 →` as a clickable link that opens the existing `OrderDetailDrawer`
- **Notes** — shown as a smaller secondary line if present

---

#### Batch status badges (computed client-side)

| Badge | Condition |
|---|---|
| `ACTIVE` | `bag_stock > 0` or `packet_stock >= packets_per_bag` |
| `LOW` | `bag_stock = 0` and `packet_stock > 0` and `packet_stock < packets_per_bag` |
| `DEPLETED` | `bag_stock = 0` and `packet_stock = 0` |

---

#### Export

- **CSV**: Serialize the movements array to CSV in the browser. No server-side work needed.
- **Print**: Apply a `@media print` stylesheet that hides nav/filters and renders the timeline full-width. Standard browser print dialog.

---

### Step 5 — Changes to Existing Screens

#### Stock table — add "View Ledger" action

In `stock-table.tsx`, add a `ClockIcon` button in the actions column (alongside the existing Edit and Delete buttons). Clicking it navigates to `/stock/ledger?seedId=X&batch=Y` with filters pre-populated, jumping directly to the movement timeline for that batch.

#### Order detail drawer — add "View Stock Impact" per item

In `order-detail-drawer.tsx`, for each item in an approved/dispatched order, add a small link: `View batch movement →`. This navigates to the ledger filtered to that seed's movements, filtered to movements where `order_id = this order`.

#### Stock form dialog — add `Notes` and `Movement Date` fields

In `stock-form-dialog.tsx`, add:
- **Notes** text input — stored in `seed_stock.notes` (new column) and forwarded to the `stock_movements.notes` column by the trigger.
- **Movement Date** date picker — passed to the API and inserted as `movement_date` in the trigger. Defaults to today.

This requires adding a `notes TEXT` column and a `movement_date_hint DATE` column to `seed_stock` (or passing them via a separate API call that pre-inserts into `stock_movements` before the stock UPDATE triggers).

> Simpler alternative: the stock API route explicitly inserts into `stock_movements` with the user-provided notes and date AFTER the `seed_stock` update, and the trigger is modified to skip logging when it detects a manual movement was already logged (using the same `app.in_deduction` session variable pattern).

---

## Files to Create / Modify

### New files
```
supabase/migrations/013_stock_movements.sql
lib/database/stock-movements.queries.ts
app/api/stock/batches/route.ts
app/api/stock/movements/route.ts
app/api/stock/reconciliation/route.ts
app/(dashboard)/stock/ledger/page.tsx
app/(dashboard)/stock/ledger/_components/stock-ledger-page.tsx
app/(dashboard)/stock/ledger/_components/stock-ledger-filters.tsx
app/(dashboard)/stock/ledger/_components/batch-list.tsx
app/(dashboard)/stock/ledger/_components/batch-summary-card.tsx
app/(dashboard)/stock/ledger/_components/batch-movement-timeline.tsx
```

### Modified files
```
supabase/migrations/013_stock_movements.sql  ← deduct_seed_stock + approve_order updates
app/(dashboard)/stock/_components/stock-table.tsx       ← add "View Ledger" action button
app/(dashboard)/orders/_components/order-detail-drawer.tsx ← add "View Stock Impact" links
app/(dashboard)/stock/_components/stock-form-dialog.tsx ← add Notes + Movement Date fields
constants/navigation.constants.ts           ← add "Stock Ledger" nav entry
constants/routes.constants.ts               ← add STOCK_LEDGER route constant
types/database.types.ts                     ← add StockMovement, BatchSummary types
```

---

## Risks & Decisions

| Risk | Decision |
|---|---|
| Trigger fires during `deduct_seed_stock` UPDATE | Use `set_config('app.in_deduction', 'true', true)` session variable to suppress the trigger inside the deduction function. Trigger checks this flag and skips if set. |
| Historical batches have no movement history | Partial backfill in migration: synthetic ADD rows using current balance + notes flagging them as estimated. Not perfect but gives a starting point. |
| Historical orders have no per-batch attribution | Accept: pre-migration orders cannot be mapped to specific batches since FIFO wasn't tracked. The backfill only covers current stock state. |
| `movement_date` set by user could be wrong or in the future | Accept user input as-is. The `created_at` system timestamp is always available for cross-reference. Admins are trusted to input correct dates. |
| Reconciliation mismatch after migration if backfill is imprecise | The backfill creates ADD movements using the CURRENT balance, which is already post-deduction. So ledger total = actual total immediately after migration. Mismatch would only appear if there's a bug going forward. |
| Notes field on stock form requires schema change | Add `notes TEXT` column to `seed_stock` (nullable). Existing rows unaffected. |
| Order drill-down from movement row uses existing `OrderDetailDrawer` | Pass `orderId` into the existing drawer — no new component needed. |
| `packets_per_bag` could change after movements are logged | `quantity_bags`/`quantity_pkt_rem` are stored at write time, preserving the conversion rate as it was. Only the canonical `quantity_packets` is used for running balance calculations. |

---

## Estimated Scope

| Area | Effort |
|---|---|
| DB migration (013) | Medium-High — new table, trigger, updated functions, reconciliation function, backfill |
| Query layer | Small-Medium — window function query, summary aggregation |
| API routes (×3) | Small |
| Frontend (5 new components) | Medium |
| Existing screen changes (×3) | Small |
| **Total** | ~2–3 days |
