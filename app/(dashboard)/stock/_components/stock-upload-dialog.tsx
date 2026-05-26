"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DownloadIcon, UploadIcon, FileSpreadsheetIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon } from "lucide-react";
import type { BulkUploadRow, BulkUploadResult } from "@/app/api/stock/bulk-upload/route";

const SAMPLE_ROWS = [
  ["crop_name", "variety", "pack_size", "batch_number", "bag_stock", "packet_stock", "movement_date", "notes"],
  ["Wheat", "HD-2967", "500g", "B2025-001", 10, 5, "2025-01-15", "Initial stock"],
  ["Rice", "Sona Masuri", "1kg", "B2025-002", 20, 0, "2025-01-20", ""],
];

const REQUIRED_HEADERS = ["crop_name", "variety", "pack_size", "batch_number"];
const ALL_HEADERS = ["crop_name", "variety", "pack_size", "batch_number", "bag_stock", "packet_stock", "movement_date", "notes"];

interface ParsedRow extends BulkUploadRow {
  _rowIndex: number;
  _errors: string[];
}

interface StockUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StockUploadDialog({ open, onOpenChange, onSuccess }: StockUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows]   = useState<ParsedRow[]>([]);
  const [fileName, setFileName]       = useState("");
  const [parseError, setParseError]   = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [results, setResults]         = useState<BulkUploadResult[] | null>(null);
  const [summary, setSummary]         = useState<{ successCount: number; failureCount: number } | null>(null);

  function reset() {
    setParsedRows([]);
    setFileName("");
    setParseError("");
    setResults(null);
    setSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function downloadSample() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(SAMPLE_ROWS);
    // Column widths
    ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws, "Stock Upload");
    XLSX.writeFile(wb, "stock_upload_sample.xlsx");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setResults(null);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb   = XLSX.read(data, { type: "binary", cellDates: true });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (rows.length === 0) { setParseError("The file is empty or has no data rows."); return; }

        // Normalise header keys (trim + lowercase)
        const normalised = rows.map((r) => {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(r)) out[k.trim().toLowerCase()] = v;
          return out;
        });

        // Check required headers exist
        const firstRow = normalised[0];
        const missing  = REQUIRED_HEADERS.filter((h) => !(h in firstRow));
        if (missing.length > 0) {
          setParseError(`Missing required columns: ${missing.join(", ")}`);
          return;
        }

        const parsed: ParsedRow[] = normalised.map((r, idx) => {
          const errors: string[] = [];
          const crop_name    = String(r["crop_name"]    ?? "").trim();
          const variety      = String(r["variety"]      ?? "").trim();
          const pack_size    = String(r["pack_size"]    ?? "").trim();
          const batch_number = String(r["batch_number"] ?? "").trim();
          const bag_stock    = Number(r["bag_stock"])    || 0;
          const packet_stock = Number(r["packet_stock"]) || 0;
          const movement_date = formatDateCell(r["movement_date"]);
          const notes        = String(r["notes"] ?? "").trim();

          if (!crop_name)    errors.push("crop_name required");
          if (!variety)      errors.push("variety required");
          if (!pack_size)    errors.push("pack_size required");
          if (!batch_number) errors.push("batch_number required");

          return { _rowIndex: idx + 2, _errors: errors, crop_name, variety, pack_size, batch_number, bag_stock, packet_stock, movement_date: movement_date || undefined, notes: notes || undefined };
        });

        setParsedRows(parsed);
      } catch {
        setParseError("Failed to parse file. Please use a valid .xlsx or .xls file.");
      }
    };
    reader.readAsBinaryString(file);
  }

  async function handleSubmit() {
    const validRows = parsedRows.filter((r) => r._errors.length === 0);
    if (validRows.length === 0) return;

    setSubmitting(true);
    try {
      const payload: BulkUploadRow[] = validRows.map(({ crop_name, variety, pack_size, batch_number, bag_stock, packet_stock, movement_date, notes }) => ({
        crop_name, variety, pack_size, batch_number, bag_stock, packet_stock, movement_date, notes,
      }));

      const res  = await fetch("/api/stock/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const json = await res.json();

      if (!json.data) { setParseError(json.message ?? "Upload failed"); return; }
      setResults(json.data.results);
      setSummary({ successCount: json.data.successCount, failureCount: json.data.failureCount });
      if (json.data.successCount > 0) onSuccess();
    } catch {
      setParseError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const invalidCount = parsedRows.filter((r) => r._errors.length > 0).length;
  const validCount   = parsedRows.length - invalidCount;
  const isDone       = !!results;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Stock via Excel</DialogTitle>
          <DialogDescription>
            Download the sample file, fill in your stock data, then upload the file.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 py-1">

          {/* Step 1 — Download sample */}
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Step 1 — Download the sample file</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fill in columns: <span className="font-mono">crop_name, variety, pack_size, batch_number, bag_stock, packet_stock</span>
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={downloadSample}>
              <DownloadIcon className="size-3.5" />
              Download Sample
            </Button>
          </div>

          {/* Step 2 — Upload file */}
          {!isDone && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Step 2 — Upload your filled file</p>
              <label
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-[var(--accent)] hover:bg-accent/5 transition-colors cursor-pointer py-8 px-4 text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheetIcon className="size-8 text-muted-foreground" />
                {fileName ? (
                  <span className="text-sm font-medium">{fileName}</span>
                ) : (
                  <>
                    <span className="text-sm font-medium">Click to choose file</span>
                    <span className="text-xs text-muted-foreground">.xlsx or .xls</span>
                  </>
                )}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
              <AlertCircleIcon className="size-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{parseError}</p>
            </div>
          )}

          {/* Preview / Results */}
          {parsedRows.length > 0 && !isDone && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Preview — {parsedRows.length} rows</p>
                {invalidCount > 0 && (
                  <span className="text-xs text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">{invalidCount} invalid</span>
                )}
                {validCount > 0 && (
                  <span className="text-xs text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30 px-1.5 py-0.5 rounded">{validCount} ready</span>
                )}
              </div>
              <PreviewTable rows={parsedRows} />
            </div>
          )}

          {/* Upload results */}
          {isDone && results && summary && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
                {summary.failureCount === 0 ? (
                  <CheckCircle2Icon className="size-5 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <AlertCircleIcon className="size-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {summary.successCount} row{summary.successCount !== 1 ? "s" : ""} imported successfully
                    {summary.failureCount > 0 && `, ${summary.failureCount} failed`}
                  </p>
                </div>
              </div>
              <ResultsTable results={results} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => handleClose(false)} disabled={submitting}>
            {isDone ? "Close" : "Cancel"}
          </Button>
          {!isDone && parsedRows.length > 0 && validCount > 0 && (
            <Button
              size="sm"
              className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/80"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <UploadIcon className="size-3.5" />
              {submitting ? "Uploading…" : `Import ${validCount} Row${validCount !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewTable({ rows }: { rows: ParsedRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border text-xs">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-8">#</th>
            {ALL_HEADERS.map((h) => (
              <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._rowIndex} className={row._errors.length > 0 ? "bg-destructive/5" : ""}>
              <td className="px-2 py-1.5 text-muted-foreground">{row._rowIndex}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{row.crop_name}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{row.variety}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{row.pack_size}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{row.batch_number}</td>
              <td className="px-2 py-1.5 text-right">{row.bag_stock}</td>
              <td className="px-2 py-1.5 text-right">{row.packet_stock}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{row.movement_date ?? ""}</td>
              <td className="px-2 py-1.5 max-w-[140px] truncate" title={row.notes}>{row.notes ?? ""}</td>
              <td className="px-2 py-1.5">
                {row._errors.length > 0 ? (
                  <span className="text-destructive" title={row._errors.join(", ")}>
                    <XCircleIcon className="size-3.5 inline mr-1" />{row._errors.join(", ")}
                  </span>
                ) : (
                  <span className="text-green-600 dark:text-green-400">
                    <CheckCircle2Icon className="size-3.5 inline mr-1" />ok
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultsTable({ results }: { results: BulkUploadResult[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border text-xs">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-8">#</th>
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Crop</th>
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Variety</th>
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Batch</th>
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Result</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.row} className={r.success ? "" : "bg-destructive/5"}>
              <td className="px-2 py-1.5 text-muted-foreground">{r.row}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{r.crop_name}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{r.variety}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{r.batch_number}</td>
              <td className="px-2 py-1.5">
                {r.success ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2Icon className="size-3.5" /> Imported
                  </span>
                ) : (
                  <span className="text-destructive flex items-center gap-1">
                    <XCircleIcon className="size-3.5" />{r.message}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDateCell(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const str = String(val).trim();
  // Already ISO date
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Try parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return str;
}
