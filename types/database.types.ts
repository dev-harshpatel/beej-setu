// Auto-generate with: npx supabase gen types typescript --project-id <your-project-id>
// This file is manually maintained until the CLI is set up.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          username: string;
          phone: string | null;
          role: "SUPER_ADMIN" | "ADMIN" | "STAFF";
          is_active: boolean;
          profile_image: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          username: string;
          phone?: string | null;
          role?: "SUPER_ADMIN" | "ADMIN" | "STAFF";
          is_active?: boolean;
          profile_image?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };

      dealers: {
        Row: {
          id: string;
          name: string;
          staff_id: string | null;
          contact: string;
          default_transport: string | null;
          default_delivery_instruction: string | null;
          delivery_instruction: string | null;
          territory: string | null;
          status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          staff_id?: string | null;
          contact: string;
          default_transport?: string | null;
          default_delivery_instruction?: string | null;
          delivery_instruction?: string | null;
          territory?: string | null;
          status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["dealers"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "dealers_staff_id_fkey";
            columns: ["staff_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };

      crops: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["crops"]["Insert"]>;
        Relationships: [];
      };

      seed_products: {
        Row: {
          id: string;
          crop_id: string;
          variety: string;
          pack_size: string;
          packets_per_bag: number;
          status: "ACTIVE" | "INACTIVE";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          crop_id: string;
          variety: string;
          pack_size: string;
          packets_per_bag: number;
          status?: "ACTIVE" | "INACTIVE";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["seed_products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "seed_products_crop_id_fkey";
            columns: ["crop_id"];
            referencedRelation: "crops";
            referencedColumns: ["id"];
          }
        ];
      };

      orders: {
        Row: {
          id: string;
          order_number: string;
          dealer_id: string;
          staff_id: string;
          center: string | null;
          transport_name: string | null;
          delivery_center: string | null;
          delivery_date: string | null;
          status: "DRAFT" | "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          dealer_id: string;
          staff_id: string;
          center?: string | null;
          transport_name?: string | null;
          delivery_center?: string | null;
          delivery_date?: string | null;
          status?: "DRAFT" | "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };

      seed_stock: {
        Row: {
          id: string;
          seed_id: string;
          batch_number: string;
          bag_stock: number;
          packet_stock: number;
          last_updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seed_id: string;
          batch_number: string;
          bag_stock?: number;
          packet_stock?: number;
          last_updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["seed_stock"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "seed_stock_seed_id_fkey"; columns: ["seed_id"]; referencedRelation: "seed_products"; referencedColumns: ["id"] },
          { foreignKeyName: "seed_stock_last_updated_by_fkey"; columns: ["last_updated_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };

      order_items: {
        Row: {
          id: string;
          order_id: string;
          seed_id: string;
          unit: "Bag" | "Packet" | "Box";
          quantity: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          seed_id: string;
          unit?: "Bag" | "Packet" | "Box";
          quantity: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, { Row: Record<string, unknown>; Relationships: [] }>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: Record<string, string>;
  };
}

// Convenience row types
export type ProfileRow      = Database["public"]["Tables"]["profiles"]["Row"];
export type DealerRow       = Database["public"]["Tables"]["dealers"]["Row"];
export type CropRow         = Database["public"]["Tables"]["crops"]["Row"];
export type SeedProductRow  = Database["public"]["Tables"]["seed_products"]["Row"];
export type OrderRow        = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItemRow    = Database["public"]["Tables"]["order_items"]["Row"];
export type SeedStockRow    = Database["public"]["Tables"]["seed_stock"]["Row"];
