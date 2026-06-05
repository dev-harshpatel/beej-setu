import { requirePermission } from "@/lib/auth/require-permission";
import { PERMISSIONS } from "@/constants/roles.constants";
import DealerReportPage from "./_components/dealer-report-page";

export default async function DealerReportRoute() {
  await requirePermission(PERMISSIONS.REPORTS_VIEW);
  return <DealerReportPage />;
}
