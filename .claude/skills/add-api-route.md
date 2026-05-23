# Skill: Add API Route

> **Supabase project** — queries go through `lib/database/`, not direct axios calls.
> Use `getSupabaseAdminClient()` in route handlers (server only, bypasses RLS).
> Use `getSupabaseServerClient()` only when you need the user's session context.


Use this skill when the user asks to add a new Next.js API route handler.

## File location

```
app/api/<resource>/route.ts          # collection: GET list, POST create
app/api/<resource>/[id]/route.ts     # item: GET one, PATCH update, DELETE
```

## Template

```ts
import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types/common.types";

export async function GET(request: NextRequest) {
  try {
    // implementation
    return NextResponse.json<ApiResponse<unknown>>({
      success: true,
      message: "OK",
      data: {},
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, message: "Internal server error", data: null },
      { status: 500 }
    );
  }
}
```

## Auth guard
- Parse the `Authorization: Bearer <token>` header
- Validate the token and decode the user
- Check the user role/permissions using `ROLE_PERMISSIONS` from `@/constants/roles.constants`
- Return `401` for missing/invalid token, `403` for insufficient permissions

## Response shape
Always return `ApiResponse<T>` (defined in `types/common.types.ts`):
```json
{ "success": true, "message": "...", "data": { ... } }
```

## Error codes
| Status | When |
|--------|------|
| 400 | Validation failure |
| 401 | Missing or invalid token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 500 | Unexpected server error |
