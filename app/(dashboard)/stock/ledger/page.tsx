import { Suspense } from "react";
import type { Metadata } from "next";
import { StockLedgerPage } from "./_components/stock-ledger-page";

export const metadata: Metadata = {
  title: "Stock Ledger",
};

export default function Page() {
  return (
    <Suspense>
      <StockLedgerPage />
    </Suspense>
  );
}
