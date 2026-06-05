import { requirePermission } from "@/lib/auth/require-permission";
import { PERMISSIONS } from "@/constants/roles.constants";
import CollectionsReportPage from "./_components/collections-report-page";

export default async function CollectionsReportRoute() {
  await requirePermission(PERMISSIONS.REPORTS_VIEW);
  return <CollectionsReportPage />;
}
