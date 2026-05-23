# Skill: Add Feature

Use this skill when the user asks to add a new feature module (e.g., dealers, seeds, orders, reports).

## Checklist

### 1. Types (`types/<feature>.types.ts`)
- Add entity interface with `ID`, `Timestamps`, `SoftDelete` from `types/common.types.ts`
- Add `Create<Feature>Payload` and `Update<Feature>Payload` interfaces
- Export from `types/index.ts`

### 2. Constants (if needed)
- Add feature-specific status enums or config maps to `constants/` (new file or existing)
- Add any new routes to `constants/routes.constants.ts`
- Add any new permissions to `constants/roles.constants.ts` under `PERMISSIONS`
- Update `ROLE_PERMISSIONS` for each role
- Add nav item to `constants/navigation.constants.ts` → `NAV_ITEMS`
- Re-export from `constants/index.ts`

### 3. Validators (`lib/validators/<feature>.validators.ts`)
- Write `zod` schemas for create/edit forms
- Export inferred form value types

### 4. Service (`services/<feature>.service.ts`)
- Use `apiClient` from `lib/api-client.ts`
- Implement CRUD + any custom endpoints
- Export from `services/index.ts`

### 5. App route (`app/(dashboard)/<feature>/`)
- `page.tsx` — imports only the top-level container/router from `_components/`, nothing else
- `create/page.tsx` — create form page
- `[id]/page.tsx` — detail view
- `[id]/edit/page.tsx` — edit form page
- Add `export const metadata` to each page

### 6. Components (`app/(dashboard)/<feature>/_components/`)
- **Small files — mandatory**: Break every page into the smallest logical pieces. Each piece is its own file in `_components/`. Aim for ~100 lines per file, hard limit ~150 lines.
- **One folder per page**: Every sub-component for a page lives in that page's `_components/` folder. The `page.tsx` only renders the top-level container from `_components/`.
- Naming pattern: `<feature>-<section>.tsx` (e.g., `orders-header.tsx`, `orders-filters.tsx`, `orders-table.tsx`, `orders-empty.tsx`, `orders-pagination.tsx`)
- Check `components/common/` for reusable pieces before creating new ones
- Shared feature components used in 2+ pages → promote to `components/common/`

### 7. RBAC guard
- Wrap pages or actions with `usePermissions().hasPermission(PERMISSIONS.<FEATURE>_<ACTION>)`
- Never hard-code role strings — always use `ROLES` and `PERMISSIONS` constants

## Conventions
- **Responsiveness — #1 priority**: Every page and component must work on mobile, tablet, and laptop. Mobile-first: default classes = mobile, then `md:` for tablet, `lg:` for laptop.
- **Small files**: No file should exceed ~150 lines. If it does, split it.
- **One folder per page**: `page.tsx` only renders the container; all page logic lives in `_components/`.
- All files use kebab-case names
- Types: PascalCase interfaces, `as const` for value maps
- No inline magic strings — use constants
- Services return unwrapped data (not the raw Axios response)

## Responsive layout patterns
- List pages: single column on mobile → multi-column grid on `md:` / `lg:`
- Forms: full-width stacked on mobile → max-width centered on `md:`
- Tables: consider card/list view on mobile, table on `md:`+
- Page header: stack title + actions vertically on mobile → row on `sm:`
