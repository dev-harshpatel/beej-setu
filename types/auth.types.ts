import type { Role } from "@/constants/roles.constants";
import type { OrganizationStatusValue } from "./database.types";
import type { ID, Timestamps } from "./common.types";

export interface Organization {
  id: ID;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  gstNumber: string | null;
  phone: string | null;
  email: string | null;
  seedLicenceNumber: string | null;
  status: OrganizationStatusValue;
}

export interface User {
  id: ID;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  profileImage?: string;
  organization: Organization;
  createdAt: Timestamps["createdAt"];
  updatedAt: Timestamps["updatedAt"];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
