"use client";

import { BulkUploadDialog } from "@/components/shared/bulk-upload-dialog";
import type { BulkUploadConfig, BaseUploadRow } from "@/components/shared/bulk-upload-dialog/types";
import type { DealerBulkUploadRow, DealerBulkUploadResult } from "@/app/api/dealers/bulk-upload/route";

interface DealerParsedRow extends DealerBulkUploadRow, BaseUploadRow {}

const DEALER_CONFIG: BulkUploadConfig<DealerParsedRow, DealerBulkUploadResult> = {
  title: "Upload Dealers via Excel",
  description: "Download the sample file, fill in your dealer data, then upload the file.",
  step1Hint: (
    <>
      Required columns: <span className="font-mono">name</span>
      {" · "}Optional:{" "}
      <span className="font-mono">contact, territory, center, staff_username, default_transport, notes</span>
    </>
  ),
  sampleRows: [
    ["name", "contact", "territory", "center", "staff_username", "default_transport", "notes"],
    ["Patel Beej Bhandar",  "9824011234", "Saurashtra",   "Rajkot Central",    "rameshbhai", "VRL Logistics", ""],
    ["Sharma Seeds",        "9876543210", "North Gujarat", "Ahmedabad Central", "sureshbhai", "DTDC",          "Wholesale only"],
    ["Rajesh Agro",         "9712345678", "Kutch",         "",                  "",           "",              ""],
  ],
  sampleSheetName: "Dealers Upload",
  sampleFileName: "dealers_upload_sample.xlsx",
  sampleColWidths: [{ wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 24 }],
  requiredHeaders: ["name"],
  allHeaders: ["name", "contact", "territory", "center", "staff_username", "default_transport", "notes"],
  parseRow(r, idx) {
    const errors: string[] = [];
    const name              = String(r["name"]              ?? "").trim();
    const contact           = String(r["contact"]           ?? "").trim();
    const territory         = String(r["territory"]         ?? "").trim();
    const center            = String(r["center"]            ?? "").trim();
    const staff_username    = String(r["staff_username"]    ?? "").trim().toLowerCase();
    const default_transport = String(r["default_transport"] ?? "").trim();
    const notes             = String(r["notes"]             ?? "").trim();

    if (!name) errors.push("name is required");

    return {
      _rowIndex: idx + 2, _errors: errors,
      name, contact,
      territory:         territory         || undefined,
      center:            center            || undefined,
      staff_username:    staff_username    || undefined,
      default_transport: default_transport || undefined,
      notes:             notes             || undefined,
    };
  },
  buildPayload(rows) {
    return rows.map(({ name, contact, territory, center, staff_username, default_transport, notes }) => ({
      name, contact, territory, center, staff_username, default_transport, notes,
    }));
  },
  submitEndpoint: "/api/dealers/bulk-upload",
  entityLabel: "dealer",
};

interface DealerUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DealerUploadDialog({ open, onOpenChange, onSuccess }: DealerUploadDialogProps) {
  return (
    <BulkUploadDialog
      open={open} onOpenChange={onOpenChange} onSuccess={onSuccess}
      config={DEALER_CONFIG}
      renderPreviewCells={(row) => (
        <>
          <td className="px-2 py-1.5 whitespace-nowrap font-medium">{row.name}</td>
          <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">{row.contact}</td>
          <td className="px-2 py-1.5 whitespace-nowrap">{row.territory ?? ""}</td>
          <td className="px-2 py-1.5 whitespace-nowrap">{row.center ?? ""}</td>
          <td className="px-2 py-1.5 whitespace-nowrap font-mono">{row.staff_username ?? ""}</td>
          <td className="px-2 py-1.5 whitespace-nowrap">{row.default_transport ?? ""}</td>
          <td className="px-2 py-1.5 max-w-[140px] truncate" title={row.notes}>{row.notes ?? ""}</td>
        </>
      )}
      renderResultHeaders={() => (
        <>
          <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Name</th>
          <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Contact</th>
        </>
      )}
      renderResultCells={(r) => (
        <>
          <td className="px-2 py-1.5 whitespace-nowrap font-medium">{r.name}</td>
          <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">{r.contact}</td>
        </>
      )}
    />
  );
}
