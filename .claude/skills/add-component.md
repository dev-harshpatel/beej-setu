# Skill: Add Component

Use this skill when the user asks to create a new UI component.

## Decision tree

1. **Is it a primitive (button, input, badge, select…)?**  
   → Check `components/ui/` first. If it doesn't exist, add it there following the existing pattern (CVA variants + `forwardRef` + `displayName`).

2. **Is it shared across 2+ features/pages?**  
   → Add to `components/common/<ComponentName>/index.tsx`.

3. **Is it used only in one route?**  
   → Colocate inside the route folder: `app/(dashboard)/<feature>/_components/<ComponentName>.tsx`.

## Rules

- **Responsiveness — #1 priority**: Every component must be responsive across mobile, tablet, and laptop. Use mobile-first Tailwind breakpoints (`sm:`, `md:`, `lg:`). Default styles = mobile, then layer up. Never build desktop-only.
- **Small files — mandatory**: Keep every file as small as possible. Break any page or large component into small focused sub-components. Each sub-component lives in the same `_components/` folder as the page. Tie them all together in one parent component (e.g., `orders-page.tsx` imports `orders-header.tsx`, `orders-table.tsx`, `orders-filters.tsx`). A file should almost never exceed ~150 lines.
- **One folder per page**: All files that belong to a page live in `app/(dashboard)/<feature>/_components/`. The `page.tsx` only imports the top-level router/container component from `_components/`.
- **No duplication**: search `components/` and the relevant route folder before creating anything.
- **No inline styles**: use Tailwind utility classes only.
- **Color/spacing via tokens**: use CSS variable tokens defined in `globals.css` (e.g., `bg-primary`, `text-muted-foreground`, `border-border`). Green accent via `bg-accent` / `text-accent-foreground`.
- **`cn()` for className merging**: always import from `@/lib/utils`.
- **`forwardRef` for form elements** so refs work with `react-hook-form`.
- **`displayName`** must be set on every `forwardRef` component.
- **No props drilling** for auth/permissions — use `useAuth()` and `usePermissions()` hooks directly in the component.
- **Accessibility**: interactive elements need `aria-*` attributes where relevant; form inputs need `label` + `aria-describedby` for errors.

## Responsive breakpoints reference
| Prefix | Min-width | Target          |
|--------|-----------|-----------------|
| (none) | 0px       | Mobile (default)|
| `sm:`  | 640px     | Large mobile    |
| `md:`  | 768px     | Tablet          |
| `lg:`  | 1024px    | Laptop/desktop  |
| `xl:`  | 1280px    | Large desktop   |

## File template (primitive)

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface MyComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  // props
}

const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("...", className)} {...props} />
  )
);
MyComponent.displayName = "MyComponent";

export { MyComponent };
```

## Export
- Primitives: add to `components/ui/index.ts`
- Common: add to `components/common/index.ts`
