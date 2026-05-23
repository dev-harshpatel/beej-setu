import { withAuth, apiSuccess } from "@/lib/api/auth-guard";

export const GET = withAuth(async (_req, _ctx, { profile }) => {
  return apiSuccess(profile, "OK");
});
