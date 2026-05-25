import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Leaf,
  Store,
  BarChart2,
  Settings,
  Warehouse,
  Building2,
  Package,
  History,
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
    permission: PERMISSIONS.DASHBOARD_VIEW,
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
    label: "Product",
    href: ROUTES.SEEDS.ROOT,
    icon: Leaf,
    permission: PERMISSIONS.SEEDS_VIEW,
  },
  {
    label: "Stock",
    href: ROUTES.STOCK.ROOT,
    icon: Warehouse,
    permission: PERMISSIONS.STOCK_VIEW,
    children: [
      { label: "Inventory",    href: ROUTES.STOCK.ROOT,   icon: Warehouse },
      { label: "Stock Ledger", href: ROUTES.STOCK.LEDGER, icon: History   },
    ],
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
    children: [
      { label: "Overview", href: ROUTES.REPORTS.ROOT, icon: BarChart2 },
      { label: "Dealer Report", href: ROUTES.REPORTS.DEALER, icon: Building2 },
      { label: "Product Report", href: ROUTES.REPORTS.PRODUCT, icon: Package },
    ],
  },
  {
    label: "Settings",
    href: ROUTES.SETTINGS.ROOT,
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_VIEW,
  },
];

export const ADMIN_ONLY_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
