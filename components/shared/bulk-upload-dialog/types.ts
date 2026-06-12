import type { ReactNode } from "react";

export interface BaseUploadRow {
  _rowIndex: number;
  _errors: string[];
}

export interface BaseUploadResult {
  row: number;
  success: boolean;
  message: string;
}

export interface BulkUploadConfig<
  TRow extends BaseUploadRow,
  TResult extends BaseUploadResult,
> {
  title: string;
  description: string;
  /** Short description shown next to Step 1 (required/optional column names). */
  step1Hint: ReactNode;
  sampleRows: (string | number)[][];
  sampleSheetName: string;
  sampleFileName: string;
  sampleColWidths: { wch: number }[];
  requiredHeaders: string[];
  allHeaders: string[];
  parseRow(raw: Record<string, unknown>, idx: number): TRow;
  buildPayload(validRows: TRow[]): unknown[];
  submitEndpoint: string;
  /** Singular noun used in "X {entityLabel}s imported". e.g. "row", "dealer". */
  entityLabel: string;
}
