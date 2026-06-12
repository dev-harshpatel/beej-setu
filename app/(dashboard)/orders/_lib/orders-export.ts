import * as XLSX from "xlsx";
import { formatDateMedium } from "@/lib/utils";
import type { OrderWithRelations } from "@/types/order.types";
import type { OrderStatusValue } from "@/constants/order-status.constants";

interface ExportFilters {
  resolvedStatus: OrderStatusValue | undefined;
  debouncedSearch: string;
  dealerId: string;
  staffId: string;
  dateFrom: string;
  dateTo: string;
}

export async function exportOrdersToXlsx(filters: ExportFilters): Promise<void> {
  const params = new URLSearchParams({ page: "1", pageSize: "10000" });
  if (filters.resolvedStatus)   params.set("status", filters.resolvedStatus);
  if (filters.debouncedSearch)  params.set("search", filters.debouncedSearch);
  if (filters.dealerId)         params.set("dealerId", filters.dealerId);
  if (filters.staffId)          params.set("staffId", filters.staffId);
  if (filters.dateFrom)         params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo)           params.set("dateTo", filters.dateTo);

  const res  = await fetch(`/api/orders?${params}`);
  const json = await res.json();
  if (!json.success) return;

  const allOrders = json.data.data as OrderWithRelations[];

  const rows = allOrders.flatMap((order) =>
    (order.items ?? []).map((item) => ({
      "Order Number": order.order_number,
      "Dealer":       order.dealer?.name ?? "",
      "Territory":    order.dealer?.territory ?? "",
      "Staff":        order.staff?.name ?? "",
      "Center":       order.center ?? "",
      "Transport":    order.transport_name ?? "",
      "Status":       order.status,
      "Date":         formatDateMedium(order.created_at),
      "Crop":         item.seed?.crops?.name ?? "",
      "Variety":      item.seed?.variety ?? "",
      "Pack Size":    item.seed?.pack_size ?? "",
      "Unit":         item.unit,
      "Quantity":     item.quantity,
      "Notes":        order.notes ?? "",
    }))
  );

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, `orders-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
