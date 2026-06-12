"use client";

import type { ReactNode } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DownloadIcon, UploadIcon, FileSpreadsheetIcon,
  CheckCircle2Icon, XCircleIcon, AlertCircleIcon,
} from "lucide-react";
import { useBulkUpload } from "./use-bulk-upload";
import type { BaseUploadRow, BaseUploadResult, BulkUploadConfig } from "./types";

interface BulkUploadDialogProps<
  TRow extends BaseUploadRow,
  TResult extends BaseUploadResult,
> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: BulkUploadConfig<TRow, TResult>;
  /** Return the <td> cells for a preview row — no <tr> wrapper. */
  renderPreviewCells(row: TRow): ReactNode;
  /** Return the <th> data columns for the results table — no "Result" column, that's handled. */
  renderResultHeaders(): ReactNode;
  /** Return the <td> data cells for a result row — no "Result" cell, that's handled. */
  renderResultCells(result: TResult): ReactNode;
}

export function BulkUploadDialog<
  TRow extends BaseUploadRow,
  TResult extends BaseUploadResult,
>({
  open, onOpenChange, onSuccess, config,
  renderPreviewCells, renderResultHeaders, renderResultCells,
}: BulkUploadDialogProps<TRow, TResult>) {
  const {
    fileInputRef, parsedRows, fileName, parseError,
    submitting, results, summary, isDone,
    invalidCount, validCount,
    downloadSample, handleFileChange, handleSubmit, handleOpenChange,
  } = useBulkUpload<TRow, TResult>(config, onSuccess);

  function handleClose(v: boolean) {
    handleOpenChange(v);
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 py-1">

          {/* Step 1 — Download sample */}
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Step 1 — Download the sample file</p>
              <p className="text-xs text-muted-foreground mt-0.5">{config.step1Hint}</p>
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
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer py-8 px-4 text-center"
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

          {/* Preview */}
          {parsedRows.length > 0 && !isDone && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Preview — {parsedRows.length} rows</p>
                {invalidCount > 0 && (
                  <span className="text-xs text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                    {invalidCount} invalid
                  </span>
                )}
                {validCount > 0 && (
                  <span className="text-xs text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30 px-1.5 py-0.5 rounded">
                    {validCount} ready
                  </span>
                )}
              </div>
              <div className="overflow-x-auto rounded-lg border border-border text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-8">#</th>
                      {config.allHeaders.map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row) => (
                      <tr key={row._rowIndex} className={row._errors.length > 0 ? "bg-destructive/5" : ""}>
                        <td className="px-2 py-1.5 text-muted-foreground">{row._rowIndex}</td>
                        {renderPreviewCells(row)}
                        <td className="px-2 py-1.5">
                          {row._errors.length > 0 ? (
                            <span
                              className="text-destructive flex items-center gap-1"
                              title={row._errors.join(", ")}
                            >
                              <XCircleIcon className="size-3.5 shrink-0" />
                              {row._errors.join(", ")}
                            </span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle2Icon className="size-3.5" />ok
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                <p className="text-sm font-medium">
                  {summary.successCount} {config.entityLabel}
                  {summary.successCount !== 1 ? "s" : ""} imported successfully
                  {summary.failureCount > 0 && `, ${summary.failureCount} failed`}
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-8">#</th>
                      {renderResultHeaders()}
                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.row} className={!r.success ? "bg-destructive/5" : ""}>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.row}</td>
                        {renderResultCells(r)}
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
              {submitting
                ? "Uploading…"
                : `Import ${validCount} ${config.entityLabel}${validCount !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
