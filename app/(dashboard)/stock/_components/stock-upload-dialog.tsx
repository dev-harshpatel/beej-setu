"use client";

import { BulkUploadDialog } from "@/components/shared/bulk-upload-dialog";
import { formatDateCell } from "@/lib/utils/xlsx-bulk-import";
import type { BulkUploadConfig, BaseUploadRow } from "@/components/shared/bulk-upload-dialog/types";
import type { BulkUploadRow, BulkUploadResult } from "@/app/api/stock/bulk-upload/route";

interface StockParsedRow extends BulkUploadRow, BaseUploadRow {}

const STOCK_CONFIG: BulkUploadConfig<StockParsedRow, BulkUploadResult> = {
  title: "Upload Stock via Excel",
  description: "Download the sample file, fill in your stock data, then upload the file.",
  step1Hint: (
    <>
      Fill in columns:{" "}
      <span className="font-mono">
        crop_name, variety, pack_size, batch_number, bag_stock, packet_stock
      </span>
    </>
  ),
  sampleRows: [
    ["crop_name", "variety", "pack_size", "batch_number", "bag_stock", "packet_stock", "movement_date", "notes"],
    ["Wheat", "HD-2967", "500g", "B2025-001", 10, 5, "2025-01-15", "Initial stock"],
    ["Rice", "Sona Masuri", "1kg", "B2025-002", 20, 0, "2025-01-20", ""],
  ],
  sampleSheetName: "Stock Upload",
  sampleFileName: "stock_upload_sample.xlsx",
  sampleColWidths: [
    { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 14 },
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 24 },
  ],
  requiredHeaders: ["crop_name", "variety", "pack_size", "batch_number"],
  allHeaders: ["crop_name", "variety", "pack_size", "batch_number", "bag_stock", "packet_stock", "movement_date", "notes"],
  parseRow(r, idx) {
    const errors: string[] = [];
    const crop_name     = String(r["crop_name"]     ?? "").trim();
    const variety       = String(r["variety"]       ?? "").trim();
    const pack_size     = String(r["pack_size"]     ?? "").trim();
    const batch_number  = String(r["batch_number"]  ?? "").trim();
    const bag_stock     = Number(r["bag_stock"])     || 0;
    const packet_stock  = Number(r["packet_stock"])  || 0;
    const movement_date = formatDateCell(r["movement_date"]);
    const notes         = String(r["notes"] ?? "").trim();

    if (!crop_name)    errors.push("crop_name required");
    if (!variety)      errors.push("variety required");
    if (!pack_size)    errors.push("pack_size required");
    if (!batch_number) errors.push("batch_number required");

    return {
      _rowIndex: idx + 2, _errors: errors,
      crop_name, variety, pack_size, batch_number, bag_stock, packet_stock,
      movement_date: movement_date || undefined,
      notes: notes || undefined,
    };
  },
  buildPayload(rows) {
    return rows.map(
      ({ crop_name, variety, pack_size, batch_number, bag_stock, packet_stock, movement_date, notes }) => ({
        crop_name, variety, pack_size, batch_number, bag_stock, packet_stock, movement_date, notes,
      }),
    );
  },
  submitEndpoint: "/api/stock/bulk-upload",
  entityLabel: "row",
};

interface StockUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StockUploadDialog({ open, onOpenChange, onSuccess }: StockUploadDialogProps) {
  return (
    <BulkUploadDialog
      open={open} onOpenChange={onOpenChange} onSuccess={onSuccess}
      config={STOCK_CONFIG}
      renderPreviewCells={(row) => (
        <>
          <td className="px-2 py-1.5 whitespace-nowrap">{row.crop_name}</td>
          <td className="px-2 py-1.5 whitespace-nowrap">{row.variety}</td>
          <td className="px-2 py-1.5 whitespace-nowrap">{row.pack_size}</td>
          <td className="px-2 py-1.5 whitespace-nowrap">{row.batch_number}</td>
          <td className="px-2 py-1.5 text-right">{row.bag_stock}</td>
          <td className="px-2 py-1.5 text-right">{row.packet_stock}</td>
          <td className="px-2 py-1.5 whitespace-nowrap">{row.movement_date ?? ""}</td>
          <td className="px-2 py-1.5 max-w-[140px] truncate" title={row.notes}>{row.notes ?? ""}</td>
        </>
      )}
      renderResultHeaders={() => (
        <>
          <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Crop</th>
          <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Variety</th>
          <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Batch</th>
        </>
      )}
      renderResultCells={(r) => (
        <>
          <td className="px-2 py-1.5 whitespace-nowrap">{r.crop_name}</td>
          <td className="px-2 py-1.5 whitespace-nowrap">{r.variety}</td>
          <td className="px-2 py-1.5 whitespace-nowrap">{r.batch_number}</td>
        </>
      )}
    />
  );
}
