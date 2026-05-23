import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes.constants";

export default function RootPage() {
  redirect(ROUTES.AUTH.LOGIN);
}
