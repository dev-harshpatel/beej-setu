"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { normalizeHeaders, checkMissingHeaders } from "@/lib/utils/xlsx-bulk-import";
import type { BaseUploadRow, BaseUploadResult, BulkUploadConfig } from "./types";

export function useBulkUpload<
  TRow extends BaseUploadRow,
  TResult extends BaseUploadResult,
>(config: BulkUploadConfig<TRow, TResult>, onSuccess: () => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<TRow[]>([]);
  const [fileName, setFileName]     = useState("");
  const [parseError, setParseError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults]       = useState<TResult[] | null>(null);
  const [summary, setSummary]       = useState<{ successCount: number; failureCount: number } | null>(null);

  function reset() {
    setParsedRows([]);
    setFileName("");
    setParseError("");
    setResults(null);
    setSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(open: boolean) {
    if (!open) reset();
  }

  function downloadSample() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(config.sampleRows);
    ws["!cols"] = config.sampleColWidths;
    XLSX.utils.book_append_sheet(wb, ws, config.sampleSheetName);
    XLSX.writeFile(wb, config.sampleFileName);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setResults(null);
    setSummary(null);

    try {
      const wb  = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      if (raw.length === 0) { setParseError("The file is empty or has no data rows."); return; }

      const normalised = normalizeHeaders(raw);
      const missing    = checkMissingHeaders(normalised, config.requiredHeaders);
      if (missing.length > 0) {
        setParseError(`Missing required columns: ${missing.join(", ")}`);
        return;
      }
      setParsedRows(normalised.map((r, idx) => config.parseRow(r, idx)));
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Failed to parse file. Please use a valid .xlsx or .xls file.",
      );
    }
  }

  async function handleSubmit() {
    const validRows = parsedRows.filter((r) => r._errors.length === 0);
    if (validRows.length === 0) return;

    setSubmitting(true);
    try {
      const res  = await fetch(config.submitEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: config.buildPayload(validRows) }),
      });
      const json = await res.json();

      if (!json.data) { setParseError(json.message ?? "Upload failed"); return; }
      setResults(json.data.results as TResult[]);
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

  return {
    fileInputRef, parsedRows, fileName, parseError,
    submitting, results, summary, isDone,
    invalidCount, validCount,
    downloadSample, handleFileChange, handleSubmit, handleOpenChange,
  };
}
