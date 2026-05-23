import type { ID, Timestamps, SoftDelete } from "./common.types";

export type DealerStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface DealerStaff {
  id: ID;
  name: string;
  username: string;
}

export interface Dealer {
  id: ID;
  name: string;
  staffId: ID | null;
  contact: string;
  defaultTransport: string | null;
  defaultDeliveryInstruction: string | null;
  deliveryInstruction: string | null;
  territory: string | null;
  status: DealerStatus;
  notes: string | null;
  createdAt: Timestamps["createdAt"];
  updatedAt: Timestamps["updatedAt"];
  deletedAt: SoftDelete["deletedAt"];
}

export interface DealerWithStaff extends Dealer {
  staff: DealerStaff | null;
}

export interface CreateDealerPayload {
  name: string;
  staffId?: string | null;
  contact: string;
  defaultTransport?: string | null;
  defaultDeliveryInstruction?: string | null;
  deliveryInstruction?: string | null;
  territory?: string | null;
  notes?: string | null;
}

export type UpdateDealerPayload = Partial<CreateDealerPayload> & {
  status?: DealerStatus;
};
