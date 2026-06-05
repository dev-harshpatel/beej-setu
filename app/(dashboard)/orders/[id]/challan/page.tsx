import { requirePermission } from "@/lib/auth/require-permission";
import { PERMISSIONS } from "@/constants/roles.constants";
import ChallanPage from "./_components/challan-page";

export default async function ChallanRoute() {
  await requirePermission(PERMISSIONS.CHALLAN_MANAGE);
  return <ChallanPage />;
}
