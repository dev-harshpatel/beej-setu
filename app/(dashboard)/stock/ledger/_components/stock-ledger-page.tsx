"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { useGlobalLoader } from "@/hooks/use-global-loader";
import { PERMISSIONS } from "@/constants/roles.constants";
import { useStockLedgerFilters } from "../_lib/use-stock-ledger-filters";
import { useStockLedgerData } from "../_lib/use-stock-ledger-data";
import { exportToCsv } from "../_lib/stock-ledger-utils";
import { StockLedgerFilters } from "./stock-ledger-filters";
import { BatchList } from "./batch-list";
import { BatchSummaryCard } from "./batch-summary-card";
import { BatchMovementTimeline } from "./batch-movement-timeline";

export function StockLedgerPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { withLoader } = useGlobalLoader();

  const {
    filters, selectedBatch, movementPage, dateFrom, dateTo, hasFilters,
    handleFiltersChange, handleBatchSelect, handleDateRange, setMovementPage,
  } = useStockLedgerFilters();

  const {
    crops, seedProducts, batches, batchesFetching, movementsData, movementsFetching, reconciliation,
  } = useStockLedgerData({ filters, hasFilters, selectedBatch, movementPage, dateFrom, dateTo });

  useEffect(() => {
    if (!hasPermission(PERMISSIONS.STOCK_MANAGE)) {
      router.replace("/stock");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasPermission(PERMISSIONS.STOCK_MANAGE)) return null;

  function handleExportCsv() {
    if (!movementsData?.movements || !selectedBatch) return;
    exportToCsv(movementsData.movements, selectedBatch.batch_number);
  }

  async function handlePrint() {
    if (!selectedBatch) return;
    await withLoader(async () => {
      const params = new URLSearchParams({
        seedId:      selectedBatch.seed_id,
        batchNumber: selectedBatch.batch_number,
      });
      const res  = await fetch(`/api/stock/print?${params}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${selectedBatch.batch_number}-ledger.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }, "Generating PDF…");
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <StockLedgerFilters
        filters={filters}
        crops={crops}
        seedProducts={seedProducts}
        onChange={handleFiltersChange}
      />

      {hasFilters && (
        <BatchList
          batches={batches}
          loading={batchesFetching && batches.length === 0}
          selectedBatchNumber={selectedBatch?.batch_number ?? null}
          onSelect={handleBatchSelect}
        />
      )}

      {!hasFilters && (
        <div className="rounded-lg border border-dashed border-border flex items-center justify-center h-40 text-sm text-muted-foreground">
          Use the filters above to find a batch, then click a row to view its history.
        </div>
      )}

      {selectedBatch && movementsData && (
        <>
          <BatchSummaryCard
            batch={selectedBatch}
            summary={movementsData.summary}
            reconciliation={reconciliation}
            onExportCsv={handleExportCsv}
            onPrint={handlePrint}
          />
          <BatchMovementTimeline
            movements={movementsData.movements}
            loading={movementsFetching}
            total={movementsData.total}
            page={movementPage}
            pageSize={50}
            dateFrom={dateFrom}
            dateTo={dateTo}
            packetsPerBag={selectedBatch.packets_per_bag}
            onPageChange={setMovementPage}
            onDateRangeChange={handleDateRange}
          />
        </>
      )}
    </div>
  );
}
