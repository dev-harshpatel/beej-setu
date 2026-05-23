import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Leaf,
  Store,
  BarChart2,
  Settings,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "./routes.constants";
import { PERMISSIONS, type Role, ROLES } from "./roles.constants";
import type { Permission } from "./roles.constants";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: ROUTES.DASHBOARD.ROOT,
    icon: LayoutDashboard,
  },
  {
    label: "Orders",
    href: ROUTES.ORDERS.ROOT,
    icon: ShoppingCart,
    permission: PERMISSIONS.ORDERS_VIEW,
  },
  {
    label: "Dealers",
    href: ROUTES.DEALERS.ROOT,
    icon: Store,
    permission: PERMISSIONS.DEALERS_VIEW,
  },
  {
    label: "Seeds",
    href: ROUTES.SEEDS.ROOT,
    icon: Leaf,
    permission: PERMISSIONS.SEEDS_VIEW,
  },
  {
    label: "Stock",
    href: ROUTES.STOCK.ROOT,
    icon: Warehouse,
    permission: PERMISSIONS.STOCK_VIEW,
  },
  {
    label: "Users",
    href: ROUTES.USERS.ROOT,
    icon: Users,
    permission: PERMISSIONS.USERS_VIEW,
  },
  {
    label: "Reports",
    href: ROUTES.REPORTS.ROOT,
    icon: BarChart2,
    permission: PERMISSIONS.REPORTS_VIEW,
  },
  {
    label: "Settings",
    href: ROUTES.SETTINGS.ROOT,
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_VIEW,
  },
];

export const ADMIN_ONLY_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
