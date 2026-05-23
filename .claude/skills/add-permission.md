# Skill: Add / Modify RBAC Permission

Use this skill when the user asks to add a new permission, change a role's access, or add a new role.

## Files involved

| File | What to change |
|------|----------------|
| `constants/roles.constants.ts` | `PERMISSIONS` object, `ROLE_PERMISSIONS` map |
| `constants/navigation.constants.ts` | `permission` field on `NavItem` |

## Steps

### Adding a new permission

1. Add the key to `PERMISSIONS` in `constants/roles.constants.ts`:
   ```ts
   FEATURE_ACTION: "feature:action",
   ```

2. Grant it to the appropriate roles in `ROLE_PERMISSIONS`:
   ```ts
   [ROLES.ADMIN]: [...existing, PERMISSIONS.FEATURE_ACTION],
   ```

3. If it gates a nav item, set `permission: PERMISSIONS.FEATURE_ACTION` on the nav entry.

### Adding a new role

1. Add to `ROLES` constant.
2. Update the `Role` type (it is derived automatically via `typeof ROLES`).
3. Add an entry to `ROLE_PERMISSIONS` with the allowed permissions.
4. Add a human-readable label to `ROLE_LABELS`.

## Consuming permissions in UI

```tsx
// Gate a full page
const { hasPermission } = usePermissions();
if (!hasPermission(PERMISSIONS.ORDERS_CREATE)) redirect("/dashboard");

// Gate a button
const { hasPermission } = usePermissions();
<Button disabled={!hasPermission(PERMISSIONS.ORDERS_CREATE)}>
  New Order
</Button>
```

## Rules
- **Never hard-code role strings** in component logic — always use `ROLES` and `PERMISSIONS` constants.
- `SUPER_ADMIN` and `ADMIN` always get every permission (update the spread in `ROLE_PERMISSIONS`).
- The `Permission` type is auto-derived — no manual union updates needed.
