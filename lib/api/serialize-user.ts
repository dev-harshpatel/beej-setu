import type { ProfileOrganization, ProfileWithOrgRow } from "@/lib/database/users.queries";
import type { Organization, User } from "@/types/auth.types";

// Single place that shapes the organization payload (login, /me, org settings).
export function serializeOrganization(org: ProfileOrganization): Organization {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logo_url,
    status: org.status,
  };
}

// Single place that shapes the authenticated-user payload for login and /me.
export function serializeAuthUser(profile: ProfileWithOrgRow, email: string): User {
  return {
    id: profile.id,
    name: profile.name,
    username: profile.username,
    email,
    phone: profile.phone ?? undefined,
    role: profile.role,
    isActive: profile.is_active,
    profileImage: profile.profile_image ?? undefined,
    organization: serializeOrganization(profile.organization),
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}
