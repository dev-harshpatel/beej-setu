import { requirePermission } from "@/lib/auth/require-permission";
import { PERMISSIONS } from "@/constants/roles.constants";
import ProductReportPage from "./_components/product-report-page";

export default async function ProductReportRoute() {
  await requirePermission(PERMISSIONS.REPORTS_VIEW);
  return <ProductReportPage />;
}
