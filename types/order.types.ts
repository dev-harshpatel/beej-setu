import type { ID, Timestamps } from "./common.types";
import type { Dealer } from "./dealer.types";
import type { SeedProduct } from "./seed.types";
import type { User } from "./auth.types";
import { type OrderStatusValue } from "@/constants/order-status.constants";

export type OrderStatus = OrderStatusValue;

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

// Re-export from constants so existing imports of ORDER_STATUS_CONFIG keep working
export { ORDER_STATUS_LABELS as ORDER_STATUS_CONFIG } from "@/constants/order-status.constants";

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
