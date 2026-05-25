# Stock Ledger — Implementation Plan

Ordered by dependency. Each step is self-contained and testable before moving to the next.
Do **not** skip steps or reorder phases — later steps depend on earlier ones.

---

## Phase 1 — Database Migration

All steps in this phase are part of one file: `supabase/migrations/013_stock_movements.sql`
Write the file in the order below, then run it once at the end of the phase.

---

### Step 1 — Create the `stock_movements` table

Create the ledger table. No triggers or functions yet — just the schema.

**What to write:**

```sql
CREATE TABLE public.stock_movements (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_id          UUID        NOT NULL REFERENCES public.seed_products(id) ON DELETE CASCADE,
  batch_number     TEXT        NOT NULL,
  movement_type    TEXT        NOT NULL CHECK (movement_type IN (
                                 'ADD', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DISPATCH'
                               )),
  quantity_packets INTEGER     NOT NULL CHECK (quantity_packets > 0),
  quantity_bags    INTEGER     NOT NULL DEFAULT 0,
  quantity_pkt_rem INTEGER     NOT NULL DEFAULT 0,
  movement_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  movement_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_id         UUID        REFERENCES public.orders(id)   ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sm_seed_batch  ON public.stock_movements (seed_id, batch_number, movement_date ASC, created_at ASC);
CREATE INDEX idx_sm_order       ON public.stock_movements (order_id);
CREATE INDEX idx_sm_movement_by ON public.stock_movements (movement_by);
```

**Why no balance columns:** running balance is computed at read time via a SQL window function.
This avoids race conditions when two orders are approved concurrently.

---

### Step 2 — RLS on `stock_movements`

Enable Row Level Security. Intentionally no UPDATE or DELETE policy — the table is append-only by design.

```sql
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sm_select_admin" ON public.stock_movements
  FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY "sm_insert_admin" ON public.stock_movements
  FOR INSERT WITH CHECK (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- No UPDATE or DELETE policy: corrections are new rows, not edits.
```

---

### Step 3 — Add `notes` column to `seed_stock`

The stock form will let admins write a reason when adding or adjusting stock.
That reason needs to live somewhere on the stock record so the trigger can read it.

```sql
ALTER TABLE public.seed_stock
  ADD COLUMN IF NOT EXISTS notes TEXT;
```

---

### Step 4 — Trigger: log manual stock changes as ADD / ADJUSTMENT_IN / ADJUSTMENT_OUT

This trigger fires after every INSERT or UPDATE on `seed_stock`.
It computes the packet delta and logs the appropriate movement type.

It skips firing when inside `deduct_seed_stock` (detected via a session config flag set in Step 5).

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
  -- Skip if called from inside deduct_seed_stock
  IF current_setting('app.in_deduction', true) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT packets_per_bag INTO v_ppb
  FROM public.seed_products WHERE id = NEW.seed_id;

  v_new_pkt := NEW.bag_stock  * v_ppb + NEW.packet_stock;
  v_old_pkt := COALESCE(OLD.bag_stock, 0) * v_ppb + COALESCE(OLD.packet_stock, 0);
  v_delta   := v_new_pkt - v_old_pkt;

  IF TG_OP = 'INSERT' THEN
    v_type := 'ADD';
    v_abs  := v_new_pkt;
  ELSIF v_delta > 0 THEN
    v_type := 'ADJUSTMENT_IN';
    v_abs  := v_delta;
  ELSIF v_delta < 0 THEN
    v_type := 'ADJUSTMENT_OUT';
    v_abs  := ABS(v_delta);
  ELSE
    RETURN NEW; -- no change, nothing to log
  END IF;

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
    COALESCE(CURRENT_DATE),
    NEW.last_updated_by,
    NEW.notes
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_stock_log_manual_change
  AFTER INSERT OR UPDATE ON public.seed_stock
  FOR EACH ROW EXECUTE FUNCTION public.log_stock_manual_change();
```

---

### Step 5 — Update `deduct_seed_stock` to log DISPATCH movements

Replace the existing function. Key additions:
- Accept `p_order_id`, `p_performed_by`, `p_approved_by` parameters (all defaulting to NULL for backwards compatibility)
- Set `app.in_deduction = 'true'` before the FIFO loop so the trigger in Step 4 is suppressed
- After each batch UPDATE, insert one `DISPATCH` row into `stock_movements`
- Clear the flag after the loop

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
  v_ppb        INTEGER;
  v_to_deduct  INTEGER;
  v_remaining  INTEGER;
  v_new_total  INTEGER;
  v_deducted   INTEGER;
  r            RECORD;
BEGIN
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

  PERFORM set_config('app.in_deduction', 'false', true);

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Insufficient stock: still need % packets for product %',
      v_remaining, p_seed_id;
  END IF;
END;
$$;
```

---

### Step 6 — Update `approve_order` to pass order context

Replace the existing function. The only change: fetch the order's `staff_id` and pass it plus `auth.uid()` to `deduct_seed_stock`.

```sql
CREATE OR REPLACE FUNCTION public.approve_order(
  p_order_id UUID,
  p_status   TEXT DEFAULT 'APPROVED'
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_item      RECORD;
  v_staff_id  UUID;
BEGIN
  IF p_status NOT IN ('APPROVED', 'PARTIALLY_APPROVED') THEN
    RAISE EXCEPTION 'approve_order() only accepts APPROVED or PARTIALLY_APPROVED, got: %', p_status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'Order % must be PENDING to approve', p_order_id;
  END IF;

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
      v_staff_id,
      auth.uid()
    );
  END LOOP;

  UPDATE public.orders
    SET status = p_status, updated_at = NOW()
    WHERE id = p_order_id;
END;
$$;
```

---

### Step 7 — Add reconciliation check function

A utility function that verifies the ledger total matches the actual `seed_stock` balance. Used by the API in Phase 4.

```sql
CREATE OR REPLACE FUNCTION public.check_batch_reconciliation(
  p_seed_id      UUID,
  p_batch_number TEXT
)
RETURNS TABLE (
  ledger_packets INTEGER,
  actual_packets INTEGER,
  is_reconciled  BOOLEAN,
  discrepancy    INTEGER
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
    ledger.total::INTEGER,
    actual.total::INTEGER,
    (ledger.total = actual.total),
    (actual.total - ledger.total)::INTEGER
  FROM ledger, actual;
$$;
```

---

### Step 8 — Historical backfill

Inserts one synthetic `ADD` row per existing `seed_stock` batch so existing batches have a starting entry rather than blank history. Run this at the end of the migration.

```sql
-- Suppress the manual-change trigger so we don't double-log
PERFORM set_config('app.in_deduction', 'true', true);

INSERT INTO public.stock_movements (
  seed_id, batch_number, movement_type,
  quantity_packets, quantity_bags, quantity_pkt_rem,
  movement_date, movement_by, notes, created_at
)
SELECT
  ss.seed_id,
  ss.batch_number,
  'ADD',
  (ss.bag_stock * sp.packets_per_bag + ss.packet_stock),
  ss.bag_stock,
  ss.packet_stock,
  ss.created_at::DATE,
  ss.last_updated_by,
  'Migrated — pre-ledger balance (estimated)',
  ss.created_at
FROM public.seed_stock ss
JOIN public.seed_products sp ON sp.id = ss.seed_id
WHERE ss.bag_stock > 0 OR ss.packet_stock > 0;

PERFORM set_config('app.in_deduction', 'false', true);
```

> **Run the migration.** Verify by checking `SELECT COUNT(*) FROM stock_movements` — should equal the number of non-zero batches in `seed_stock`. Run `SELECT * FROM check_batch_reconciliation(<any_seed_id>, '<any_batch>')` and confirm `is_reconciled = true`.

---

## Phase 2 — Types and Constants

No DB interaction. Pure TypeScript.

---

### Step 9 — Add `StockMovement` types to `types/database.types.ts`

Add the new table definition inside the `Tables` block, and add convenience row types at the bottom.

**Add to `Database.public.Tables`:**

```ts
stock_movements: {
  Row: {
    id: string;
    seed_id: string;
    batch_number: string;
    movement_type: 'ADD' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DISPATCH';
    quantity_packets: number;
    quantity_bags: number;
    quantity_pkt_rem: number;
    movement_date: string;          // DATE as ISO string "YYYY-MM-DD"
    movement_by: string | null;
    approved_by: string | null;
    order_id: string | null;
    notes: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    seed_id: string;
    batch_number: string;
    movement_type: 'ADD' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DISPATCH';
    quantity_packets: number;
    quantity_bags?: number;
    quantity_pkt_rem?: number;
    movement_date?: string;
    movement_by?: string | null;
    approved_by?: string | null;
    order_id?: string | null;
    notes?: string | null;
    created_at?: string;
  };
  Update: never; // Append-only — no updates allowed
  Relationships: [];
};
```

**Add to `seed_stock.Row` and `seed_stock.Insert`:**

```ts
// In Row:
notes: string | null;

// In Insert:
notes?: string | null;
```

**Add convenience types at the bottom of the file:**

```ts
export type StockMovementRow = Database['public']['Tables']['stock_movements']['Row'];
export type StockMovementType = StockMovementRow['movement_type'];
```

---

### Step 10 — Add route constant and permission

**In `constants/routes.constants.ts`**, add `LEDGER` under `STOCK`:

```ts
STOCK: {
  ROOT:   "/stock",
  LEDGER: "/stock/ledger",
},
```

**In `constants/roles.constants.ts`**, add a ledger permission (reuses `STOCK_VIEW` — no new permission needed since the ledger is admin-only like stock):

```ts
// No new permission constant needed.
// The ledger page uses PERMISSIONS.STOCK_VIEW for visibility
// and the API uses the same ADMIN/SUPER_ADMIN RLS that seed_stock uses.
```

**In `constants/navigation.constants.ts`**, add ledger as a child of Stock.
Import `History` from `lucide-react` and update:

```ts
{
  label: "Stock",
  href: ROUTES.STOCK.ROOT,
  icon: Warehouse,
  permission: PERMISSIONS.STOCK_VIEW,
  children: [
    { label: "Inventory",     href: ROUTES.STOCK.ROOT,   icon: Warehouse },
    { label: "Stock Ledger",  href: ROUTES.STOCK.LEDGER, icon: History   },
  ],
},
```

---

## Phase 3 — Query Layer

---

### Step 11 — Create `lib/database/stock-movements.queries.ts`

Create a new file. Three exported functions.

**Types to define at the top of the file:**

```ts
export type StockMovementEntry = StockMovementRow & {
  running_balance_packets: number;
  running_balance_bags: number;
  running_balance_pkt_rem: number;
  movement_by_profile: { name: string; role: string } | null;
  approved_by_profile: { name: string } | null;
  order: { order_number: string; dealer: { name: string } | null } | null;
};

export type BatchSummary = {
  total_in_packets: number;
  total_dispatched_packets: number;
  total_adj_in_packets: number;
  total_adj_out_packets: number;
  distinct_dealers_count: number;
  orders_count: number;
  first_movement_date: string | null;
  last_movement_date: string | null;
};

export type BatchWithStatus = {
  seed_id: string;
  batch_number: string;
  bag_stock: number;
  packet_stock: number;
  packets_per_bag: number;
  variety: string;
  pack_size: string;
  crop_name: string;
  first_movement_date: string | null;
  last_movement_date: string | null;
  batch_status: 'ACTIVE' | 'LOW' | 'DEPLETED';
};

export type ReconciliationResult = {
  ledger_packets: number;
  actual_packets: number;
  is_reconciled: boolean;
  discrepancy: number;
};
```

**Function 1 — `getBatches`:**

Joins `seed_stock → seed_products → crops`.
Filters: `cropId?`, `variety?`, `packSize?`, `batchNumber?` (text search on batch_number).
Computes `batch_status` client-side after fetch.
Also fetches `first_movement_date` and `last_movement_date` from `stock_movements` via a subquery or a second call.

```ts
async getBatches(db, filters: {
  cropId?: string;
  variety?: string;
  packSize?: string;
  batchNumber?: string;
}): Promise<BatchWithStatus[]>
```

**Function 2 — `getMovements`:**

Queries `stock_movements` for a specific seed_id + batch_number.
Pagination params: `page`, `pageSize`.
Optional date range: `dateFrom`, `dateTo` (filter on `movement_date`).
Joins: `movement_by → profiles`, `approved_by → profiles`, `order_id → orders → dealers`.

Computes running balance using a window function via a raw SQL RPC call (Supabase `.rpc()`) or via a PostgreSQL view. Since Supabase JS client doesn't support window functions directly, the cleanest approach is a dedicated RPC function or a database view.

> **Recommended approach**: Create a PostgreSQL view `stock_movements_with_balance` that computes the window function, then query the view via `.from('stock_movements_with_balance')`.

Add this view to the migration (Step 1 block):

```sql
CREATE OR REPLACE VIEW public.stock_movements_with_balance AS
SELECT
  sm.*,
  SUM(
    CASE WHEN sm.movement_type IN ('ADD', 'ADJUSTMENT_IN')
         THEN  sm.quantity_packets
         ELSE -sm.quantity_packets
    END
  ) OVER (
    PARTITION BY sm.seed_id, sm.batch_number
    ORDER BY sm.movement_date ASC, sm.created_at ASC, sm.id ASC
  ) AS running_balance_packets
FROM public.stock_movements sm;
```

Then the query joins profiles and orders on top of this view.

Also computes `BatchSummary` from the fetched rows (no extra DB call — just aggregate in TypeScript after fetching).

```ts
async getMovements(db, seedId: string, batchNumber: string, params?: {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{
  movements: StockMovementEntry[];
  summary: BatchSummary;
  total: number;
}>
```

**Function 3 — `getReconciliation`:**

Calls the `check_batch_reconciliation` RPC.

```ts
async getReconciliation(db, seedId: string, batchNumber: string): Promise<ReconciliationResult>
```

---

## Phase 4 — API Routes

---

### Step 12 — `app/api/stock/batches/route.ts`

**GET** — returns batch list.

- Parse query params: `cropId`, `variety`, `packSize`, `batchNumber`
- Create Supabase server client (same pattern as other routes in the project)
- Call `stockMovementsQueries.getBatches(db, filters)`
- Return `{ success: true, data: batches }`
- Guard: only allow ADMIN / SUPER_ADMIN (check role via `getServerSession` or the existing auth helper pattern)

---

### Step 13 — `app/api/stock/movements/route.ts`

**GET** — returns movement history + summary for one batch.

- Required params: `seedId`, `batchNumber`
- Optional params: `page`, `pageSize`, `dateFrom`, `dateTo`
- Call `stockMovementsQueries.getMovements(db, seedId, batchNumber, params)`
- Return `{ success: true, data: { movements, summary, total } }`
- Return 400 if `seedId` or `batchNumber` is missing

---

### Step 14 — `app/api/stock/reconciliation/route.ts`

**GET** — returns reconciliation status for one batch.

- Required params: `seedId`, `batchNumber`
- Call `stockMovementsQueries.getReconciliation(db, seedId, batchNumber)`
- Return `{ success: true, data: result }`

---

### Step 15 — Update stock API route to forward `notes` and `movement_date`

In the existing `app/api/stock/route.ts` (POST) and `app/api/stock/[id]/route.ts` (PATCH):

- Accept `notes` and `movement_date` in the request body
- Pass `notes` into the `seed_stock` INSERT/UPDATE payload
- Pass `movement_date` into the `seed_stock` INSERT/UPDATE payload (as a new column)

> This requires adding `movement_date DATE` column to `seed_stock` as well so the trigger can read it. Add to the migration:

```sql
ALTER TABLE public.seed_stock
  ADD COLUMN IF NOT EXISTS movement_date DATE DEFAULT CURRENT_DATE;
```

And update the trigger (Step 4) to use `NEW.movement_date` instead of `CURRENT_DATE`.

---

## Phase 5 — New Page and Components

All files under `app/(dashboard)/stock/ledger/`.

---

### Step 16 — Page entry point: `app/(dashboard)/stock/ledger/page.tsx`

Minimal server component, just renders `<StockLedgerPage />`.
Add the same metadata pattern used by the other pages in the project.

```tsx
import { StockLedgerPage } from "./_components/stock-ledger-page";
export default function Page() { return <StockLedgerPage />; }
```

---

### Step 17 — `_components/stock-ledger-filters.tsx`

**Props:**
```ts
interface LedgerFilters {
  cropId: string;
  variety: string;
  packSize: string;
  batchNumber: string;   // direct search field
}
interface Props {
  filters: LedgerFilters;
  crops: CropRow[];
  seedProducts: SeedProductWithCropRow[];
  onChange: (next: LedgerFilters) => void;
}
```

**Render:**
- Row of four controls: Crop select, Variety select, Pack Size select, Batch # text input
- Variety select is disabled until `cropId` is set; options are derived from `seedProducts` filtered by `cropId`
- Pack Size select is disabled until `variety` is set; options derived from `seedProducts` filtered by `cropId + variety`
- Batch # text input works independently — typing here clears the other three filters and vice-versa
- A "Clear" button appears when any filter has a value

**Cascading reset logic** (inside `onChange` handler in the parent `StockLedgerPage`):
```
cropId changed    → reset variety, packSize, batchNumber
variety changed   → reset packSize, batchNumber
packSize changed  → reset batchNumber
batchNumber typed → reset cropId, variety, packSize
```

---

### Step 18 — `_components/batch-list.tsx`

**Props:**
```ts
interface Props {
  batches: BatchWithStatus[];
  loading: boolean;
  selectedBatchNumber: string | null;
  onSelect: (batch: BatchWithStatus) => void;
}
```

**Render:**
- Table with columns: Batch #, Crop, Variety, Pack Size, Status badge, Bags, Pkts, First Entry
- Clicking a row calls `onSelect` and highlights the selected row
- Status badge: `ACTIVE` (green), `LOW` (amber), `DEPLETED` (muted/grey)
  - ACTIVE: `bag_stock > 0`
  - LOW: `bag_stock === 0 && packet_stock > 0`
  - DEPLETED: `bag_stock === 0 && packet_stock === 0`
- Empty state if no batches match the selected filters
- Skeleton rows while loading (same pattern as `StockTable`)

---

### Step 19 — `_components/batch-summary-card.tsx`

**Props:**
```ts
interface Props {
  batch: BatchWithStatus;
  summary: BatchSummary;
  reconciliation: ReconciliationResult | null;
  onExportCsv: () => void;
  onPrint: () => void;
}
```

**Render:**
Four stat cells in a card header row:

| Total IN | Total DISPATCHED | Corrections | Current Balance |
|---|---|---|---|
| `(total_in + adj_in)` bags | `total_dispatched` bags | `net adj` bags | `bag_stock` bags, `packet_stock` pkts |

Below the stats: First entry date, Last movement date, Dealers served, Orders count.

Bottom row: Reconciliation badge — green "✓ Reconciled" or red "⚠ Mismatch — ledger does not match stock". Plus Export CSV and Print buttons.

**Helper functions (inside the component):**

```ts
function packetsToDisplay(packets: number, ppb: number) {
  return { bags: Math.floor(packets / ppb), pkts: packets % ppb };
}
```

---

### Step 20 — `_components/batch-movement-timeline.tsx`

**Props:**
```ts
interface Props {
  movements: StockMovementEntry[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  dateFrom: string;
  dateTo: string;
  packetsPerBag: number;
  onPageChange: (page: number) => void;
  onDateRangeChange: (from: string, to: string) => void;
}
```

**Render:**

Top bar: date range inputs (From / To) matching the style of `ReportsFilters`.

Table with columns:

| Date | Type | Quantity | Balance After | Actor | Notes |
|---|---|---|---|---|---|
| `movement_date` formatted | badge | `+100 bags` / `−10 bags, 2 pkts` | `73 bags, 2 pkts` | varies | if present |

**Type badge colours:**
- `ADD` — green (`bg-success/10 text-success`)
- `ADJUSTMENT_IN` — teal (`bg-teal-100 text-teal-700`)
- `ADJUSTMENT_OUT` — orange (`bg-orange-100 text-orange-600`)
- `DISPATCH` — red (`bg-destructive/15 text-destructive`)

**Actor cell** varies by movement type:
- ADD / ADJUSTMENT: "by [movement_by_profile.name]"
- DISPATCH: three lines — "Staff: [name]", "→ Dealer: [dealer.name]", "Approved: [approved_by_profile.name]"

**Order link**: for DISPATCH rows, show `#ORD-XXXX →` as a button that opens the existing `OrderDetailDrawer` passing `orderId`.

**Running balance display**: `running_balance_bags` bags, `running_balance_pkt_rem` pkts. Compute bags/pkts from `running_balance_packets` and `packetsPerBag`.

**Pagination**: reuse the existing `StockPagination` component or the same pagination pattern.

**Export CSV** (called from `BatchSummaryCard`):
```ts
function exportToCsv(movements: StockMovementEntry[], batchNumber: string) {
  const headers = ['Date', 'Type', 'Qty (pkts)', 'Balance (pkts)', 'By', 'Dealer', 'Order', 'Notes'];
  const rows = movements.map(m => [...]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `ledger-${batchNumber}.csv`; a.click();
}
```

---

### Step 21 — `_components/stock-ledger-page.tsx` (orchestrator)

This is the "smart" component that owns all state and wires everything together.

**State:**
```ts
const [filters, setFilters] = useState<LedgerFilters>({ cropId:'', variety:'', packSize:'', batchNumber:'' });
const [selectedBatch, setSelectedBatch] = useState<BatchWithStatus | null>(null);
const [movementPage, setMovementPage] = useState(1);
const [dateFrom, setDateFrom] = useState('');
const [dateTo, setDateTo] = useState('');
```

**Queries (TanStack Query):**

1. **Crops** — `GET /api/crops` — staleTime 10 min (same as stock page)
2. **Seed products** — `GET /api/seeds?pageSize=200` — for filter dropdowns (same as stock page)
3. **Batches** — `GET /api/stock/batches?cropId=&variety=&packSize=&batchNumber=` — enabled when any filter has a value
4. **Movements** — `GET /api/stock/movements?seedId=&batchNumber=&page=&dateFrom=&dateTo=` — enabled when `selectedBatch !== null`
5. **Reconciliation** — `GET /api/stock/reconciliation?seedId=&batchNumber=` — enabled when `selectedBatch !== null`

**Layout:**
```
<StockLedgerFilters />          ← always visible
<BatchList />                   ← visible when batches query has data
<BatchSummaryCard />            ← visible when selectedBatch !== null
<BatchMovementTimeline />       ← visible when selectedBatch !== null
```

**Filter change handler**: implements the cascading reset logic from Step 17.

**Batch select handler**: sets `selectedBatch`, resets `movementPage` to 1, resets date range.

---

## Phase 6 — Existing Screen Changes

Three small modifications. No new components.

---

### Step 22 — Stock form dialog: add Notes and Movement Date fields

**File:** `app/(dashboard)/stock/_components/stock-form-dialog.tsx`

Add two fields to the form (after the existing Batch Number field):

1. **Movement Date** — a date input (`<input type="date">` or the existing DatePicker pattern). Defaults to today. Label: "Stock Date". Tooltip: "The date the stock was physically received or adjusted."

2. **Notes** — a textarea. Optional. Label: "Notes / Reason". Placeholder: "e.g. Received from supplier, correcting counting error…"

Pass both through to the API in the POST/PATCH body.

---

### Step 23 — Stock table: add "View Ledger" action button

**File:** `app/(dashboard)/stock/_components/stock-table.tsx`

In the actions column (where Edit and Delete buttons are), add a third icon button before Edit:

```tsx
import { History } from "lucide-react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes.constants";

// Inside the actions cell:
<button
  onClick={() => router.push(
    `${ROUTES.STOCK.LEDGER}?seedId=${row.seed_id}&batch=${row.batch_number}`
  )}
  title="View ledger"
>
  <History className="h-4 w-4" />
</button>
```

---

### Step 24 — Order detail drawer: add "View Stock Impact" per item

**File:** `app/(dashboard)/orders/_components/order-detail-drawer.tsx`

For orders with status `APPROVED`, `PARTIALLY_APPROVED`, `GODOWN_DISPATCHED`, `TRANSPORT_DISPATCHED`, or `SHIPPED`, add a link next to each order item:

```tsx
import { ROUTES } from "@/constants/routes.constants";

// For each item in the order (only if order is past PENDING):
<a
  href={`${ROUTES.STOCK.LEDGER}?seedId=${item.seed_id}`}
  className="text-xs text-muted-foreground underline"
>
  View batch movement →
</a>
```

This navigates to the ledger pre-filtered to that seed's batches. The admin then selects the specific batch.

---

## Completion Checklist

### Phase 1 — Database
- [x] Step 1: `stock_movements` table created
- [x] Step 2: RLS policies on `stock_movements`
- [x] Step 3: `notes` column added to `seed_stock`
- [x] Step 4: `log_stock_manual_change` trigger created
- [x] Step 5: `deduct_seed_stock` updated with DISPATCH logging + session flag
- [x] Step 6: `approve_order` updated to pass staff_id + auth.uid()
- [x] Step 7: `check_batch_reconciliation` function created
- [x] Step 8: Historical backfill executed
- [ ] Migration run and verified — reconciliation returns `is_reconciled = true` for all existing batches

### Phase 2 — Types and Constants
- [x] Step 9: `StockMovementRow`, `StockMovementType` added to `database.types.ts`; `seed_stock` updated with `notes`
- [x] Step 10: `ROUTES.STOCK.LEDGER` added; Navigation updated with Stock Ledger child link

### Phase 3 — Query Layer
- [x] Step 11: `stock-movements.queries.ts` created with `getBatches`, `getMovements`, `getReconciliation`
- [x] `stock_movements_with_balance` view added to migration

### Phase 4 — API Routes
- [x] Step 12: `GET /api/stock/batches` route created
- [x] Step 13: `GET /api/stock/movements` route created
- [x] Step 14: `GET /api/stock/reconciliation` route created
- [x] Step 15: Existing stock POST/PATCH routes forward `notes` and `movement_date`

### Phase 5 — New Frontend
- [x] Step 16: `app/(dashboard)/stock/ledger/page.tsx` created
- [x] Step 17: `StockLedgerFilters` component
- [x] Step 18: `BatchList` component with status badges
- [x] Step 19: `BatchSummaryCard` component with export + reconciliation badge
- [x] Step 20: `BatchMovementTimeline` component with pagination + date filter + CSV export
- [x] Step 21: `StockLedgerPage` orchestrator wiring all queries and components

### Phase 6 — Existing Screen Changes
- [x] Step 22: Stock form dialog — Notes + Movement Date fields added
- [x] Step 23: Stock table — History icon button added to actions column
- [x] Step 24: Order detail drawer — "View batch movement →" link added per item

---

## Dependency Map

```
Phase 1 (DB)
  └── Phase 2 (Types)
        └── Phase 3 (Queries)
              ├── Phase 4 (API)         ← depends on Phase 3
              │     └── Phase 5 (UI)   ← depends on Phase 4
              │           └── Phase 6  ← depends on Phase 5 routes existing
              └── Phase 6, Step 22     ← stock form, depends on types only
```

You can work on Phase 2 and begin scaffolding Phase 3/4 files in parallel with running the DB migration, but don't test end-to-end until the migration is confirmed healthy.
