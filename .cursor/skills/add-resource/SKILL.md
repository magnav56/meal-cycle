---
name: add-resource
description: Step-by-step checklist for adding a new domain resource to the MealFlow stack (database table, API route, TypeScript types, React Query hooks, and UI). Use when the user asks to add a new entity, model, or feature domain.
---

# Add a New Resource

Follow these steps in order when adding a new resource (e.g., "staff", "inventory").

## 1. Database — `db/init.sql`

Add a `CREATE TABLE` statement following the existing pattern:

```sql
CREATE TABLE resource_name (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- domain columns here
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- Use `snake_case` for all column names
- UUID primary key with `gen_random_uuid()`
- Add `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` + trigger if the resource is editable
- Foreign keys: `REFERENCES other_table(id)` with optional `ON DELETE CASCADE`

After editing `init.sql`, rebuild the database: `docker-compose down -v && docker-compose up`

## 2. Types — `src/lib/types.ts`

Add a TypeScript interface mirroring the table columns:

```ts
export interface ResourceName {
  id: string;
  // domain fields matching snake_case column names
  created_at: string;
}
```

If the resource is fetched with JOINs, add optional relation fields using the **table name** as the key:

```ts
export interface ResourceName {
  id: string;
  other_id: string;
  other_table?: OtherType;  // matches json_build_object alias
  created_at: string;
}
```

Add any related constants (status arrays, option lists) as `const` arrays with `as const`.

## 3. Backend Route — `server/src/routes/resourceName.ts`

Create a new route file:

```ts
import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM resource_name ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("GET /api/resource-name error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add POST, PATCH routes as needed — always with try/catch

export default router;
```

Then mount it in `server/src/index.ts`:

```ts
import resourceNameRouter from "./routes/resourceName.js";
app.use("/api/resource-name", resourceNameRouter);
```

**Security**: PATCH routes that accept dynamic fields must whitelist column names:

```ts
const ALLOWED_UPDATE_FIELDS = new Set(["field1", "field2"]);
const keys = Object.keys(fields).filter((k) => ALLOWED_UPDATE_FIELDS.has(k));
```

## 4. Hook — `src/hooks/useResourceName.ts`

Create a hooks file with query and mutation hooks:

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ResourceName } from "@/lib/types";

export function useResourceNames() {
  return useQuery({
    queryKey: ["resource_names"],
    queryFn: () => api.get<ResourceName[]>("/api/resource-name"),
  });
}

export function useCreateResourceName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePayload) =>
      api.post<ResourceName>("/api/resource-name", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resource_names"] }),
  });
}
```

- Query key: `["resource_names"]` (snake_case, plural)
- Invalidate related keys in `onSuccess` when mutations affect other resources

## 5. UI Component — `src/components/ResourceNamePanel.tsx`

Create a panel component following the existing pattern (PatientPanel, MealRequestPanel, KitchenPanel):

- Import hooks, UI primitives, and types
- Use `useMemo` for filtered/searched data
- Use `PageControls` from `@/components/PageControls` for pagination
- Use `useToast` for user feedback
- Use the appropriate stage color (`clinical`, `meal`, `kitchen`) or add a new one

## 6. Wire Up

- Add the panel to `src/pages/Index.tsx` in the `TABS` array and render block
- If adding a new workflow stage color, define CSS variables in `src/index.css` and Tailwind tokens in `tailwind.config.ts`

## Checklist

- [ ] Table in `db/init.sql`
- [ ] Interface + constants in `src/lib/types.ts`
- [ ] Route file in `server/src/routes/`
- [ ] Route mounted in `server/src/index.ts`
- [ ] Hooks in `src/hooks/`
- [ ] Panel component in `src/components/`
- [ ] Wired into `src/pages/Index.tsx`
- [ ] `tsc --noEmit` passes for both frontend and server
