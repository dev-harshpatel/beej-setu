import type { PostgrestError } from "@supabase/supabase-js";

// Postgres error codes → messages safe to show end users (e.g. in bulk-upload
// result tables). Callers should console.error the raw error for debugging.
export function friendlyDbErrorMessage(error: PostgrestError, entityLabel: string): string {
  switch (error.code) {
    case "23505": // unique_violation
      return `This ${entityLabel} already exists`;
    case "23503": // foreign_key_violation
      return `A record this ${entityLabel} is linked to no longer exists — refresh the page and re-upload this row`;
    case "23502": // not_null_violation
    case "23514": // check_violation
    case "22001": // string_data_right_truncation (value too long)
    case "22P02": // invalid_text_representation (wrong data type)
      return `This row has an invalid or missing value — check the data and re-upload this row`;
    default:
      return `Could not save this ${entityLabel} due to a temporary problem — please re-upload this row`;
  }
}
