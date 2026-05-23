import type { ID, Timestamps, SoftDelete } from "./common.types";

export type SeedProductStatus = "ACTIVE" | "INACTIVE";

export interface Crop {
  id: ID;
  name: string;
  createdAt: Timestamps["createdAt"];
  updatedAt: Timestamps["updatedAt"];
}

export interface SeedProduct {
  id: ID;
  cropId: ID;
  variety: string;
  packSize: string;
  packetsPerBag: number;
  status: SeedProductStatus;
  createdAt: Timestamps["createdAt"];
  updatedAt: Timestamps["updatedAt"];
  deletedAt: SoftDelete["deletedAt"];
}

export interface SeedProductWithCrop extends SeedProduct {
  crop: Pick<Crop, "id" | "name">;
}
