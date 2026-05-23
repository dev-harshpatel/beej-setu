import type { ID, Timestamps } from "./common.types";
import type { Dealer } from "./dealer.types";
import type { SeedProduct } from "./seed.types";
import type { User } from "./auth.types";

export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  id: ID;
  seed: SeedProduct;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  notes?: string;
}

export interface Order {
  id: ID;
  orderNumber: string;
  dealer: Dealer;
  staff: User;
  items: OrderItem[];
  status: OrderStatus;
  notes?: string;
  deliveryDate?: string;
  createdAt: Timestamps["createdAt"];
  updatedAt: Timestamps["updatedAt"];
}

export interface CreateOrderItemPayload {
  seedId: ID;
  quantity: number;
  pricePerUnit: number;
  notes?: string;
}

export interface CreateOrderPayload {
  dealerId: ID;
  items: CreateOrderItemPayload[];
  notes?: string;
  deliveryDate?: string;
}

export type UpdateOrderPayload = Partial<
  Omit<CreateOrderPayload, "dealerId"> & { status: OrderStatus }
>;

export interface OrderStatusLabel {
  label: string;
  color: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusLabel> = {
  DRAFT: { label: "Draft", color: "gray" },
  PENDING: { label: "Pending", color: "yellow" },
  CONFIRMED: { label: "Confirmed", color: "blue" },
  PROCESSING: { label: "Processing", color: "orange" },
  SHIPPED: { label: "Shipped", color: "purple" },
  DELIVERED: { label: "Delivered", color: "green" },
  CANCELLED: { label: "Cancelled", color: "red" },
};

// ─── DB-backed joined types (used in admin orders page) ──────────────────────
import type { DealerRow, ProfileRow, SeedProductRow, CropRow, OrderRow, OrderItemRow } from "./database.types";

export type SeedWithCategory = SeedProductRow & {
  crops: Pick<CropRow, "name"> | null;
};

export type OrderItemWithSeed = OrderItemRow & {
  seed: SeedWithCategory | null;
};

export type OrderWithRelations = OrderRow & {
  dealer: DealerRow | null;
  staff: ProfileRow | null;
  items: OrderItemWithSeed[];
};
