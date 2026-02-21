---
name: meal-cycle-conventions
description: Encodes the meal-cycle project's architecture, file structure, naming rules, API patterns, and hook conventions. Use when adding features, creating new hooks, routes, components, or types — or when the user asks how to structure code in this project.
---

# Meal-Cycle Conventions

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| UI | shadcn/ui (Radix UI + Tailwind CSS) |
| Server state | TanStack Query (React Query v5) |
| Routing | React Router DOM |
| Backend | Express + TypeScript (`server/`) |
| Database | PostgreSQL (Docker: `postgres:16-alpine`) |
| Testing | Vitest + Testing Library |

Path alias: `@` → `./src`

---

## Directory Layout

```
src/
  components/
    ui/           # shadcn/ui primitives — never edit directly
    *.tsx         # Feature components (PatientPanel, MealRequestPanel, KitchenPanel, PageControls)
  hooks/          # TanStack Query hooks, one file per domain
  lib/
    api.ts        # API client (single source of truth for HTTP)
    types.ts      # All shared TypeScript interfaces and constants
    utils.ts      # cn() helper only
  pages/          # Route-level components
  test/           # Vitest setup

server/
  src/
    db.ts         # PostgreSQL pool
    index.ts      # Express app + route mounting
    routes/       # One file per resource
```

---

## API Client (`src/lib/api.ts`)

All HTTP calls go through `api`:

```ts
import { api } from "@/lib/api";

api.get<T>(path)
api.post<T>(path, data)
api.patch<T>(path, data)
```

- No `delete` method exists — add it to `api.ts` if needed
- `VITE_API_URL` is empty by default; Vite proxies `/api` → `http://localhost:3001`
- Errors are thrown as `Error(body.error)` — catch in `onError` or try/catch around `mutateAsync`

---

## Hooks Pattern (`src/hooks/`)

One file per domain. Each file exports individual named hooks.

```ts
// src/hooks/usePatients.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Patient } from "@/lib/types";

export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get<Patient[]>("/api/patients"),
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; room_number: string; diet_order: string; allergies: string[]; clinical_state: string }) =>
      api.post<Patient>("/api/patients", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}
```

**Query key conventions:**

| Resource | Key |
|---|---|
| patients | `["patients"]` |
| meal_requests | `["meal_requests"]` |
| trays | `["trays"]` |
| recipes | `["recipes"]` |
| request items | `["request_items", requestId]` |

- Conditional queries use `enabled: !!param`
- Mutations always invalidate relevant query keys in `onSuccess`
- Cross-resource invalidation is valid (e.g., creating a meal request invalidates both `meal_requests` and `trays`)

---

## Types (`src/lib/types.ts`)

All shared interfaces and constants live here. Add new ones here — never inline types in hooks or components.

Current types: `Patient`, `Recipe`, `MealRequest`, `RequestItem`, `Tray`
Current constants: `TRAY_STATUSES`, `DIET_OPTIONS`, `CLINICAL_STATE_OPTIONS`, `ALLERGY_OPTIONS`

Database uses **snake_case** column names. TypeScript interfaces mirror them (e.g., `room_number`, `diet_order`, `created_at`).

Relation fields like `patients?` on `MealRequest` use the **table name** as the key (matching the `json_build_object` SQL alias). They hold a single object despite the plural name.

---

## Backend Routes (`server/src/routes/`)

One file per resource, mounted in `server/src/index.ts`.

```ts
// Mounting pattern in index.ts
app.use("/api/patients", patientsRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/meal-requests", mealRequestsRouter);
app.use("/api/trays", traysRouter);
```

Route file pattern:

```ts
import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM table_name ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("GET /api/resource error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
```

- Use `pool.query()` from `../db.js` — no ORM
- Always wrap in `try/catch`, log with `console.error`, return `{ error: "..." }` on failure
- PATCH routes that accept dynamic fields must whitelist allowed column names (see `ALLOWED_UPDATE_FIELDS` in `patients.ts`)
- UUID primary keys: use `gen_random_uuid()` in SQL or `DEFAULT gen_random_uuid()`

---

## UI Components

- Use shadcn/ui primitives from `src/components/ui/` for all UI elements
- Feature components go in `src/components/` (not `ui/`)
- Shared presentational components (e.g., `PageControls`) also go in `src/components/`
- Merge classes with `cn()` from `@/lib/utils`
- Custom Tailwind colors for workflow stages: `clinical`, `meal`, `kitchen`
- Keep constants (color maps, page sizes) outside the component body

```ts
import { cn } from "@/lib/utils";
<div className={cn("base-class", isActive && "active-class")} />
```

---

## Database Schema Conventions

- All tables have `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- All tables have `created_at TIMESTAMPTZ DEFAULT now()`
- `patients` also has `updated_at` managed by a trigger
- Snake_case for all column names
- New tables go in `db/init.sql`

---

## Local Development

```bash
# Full stack (recommended)
docker-compose up

# Frontend only
npm run dev          # port 8080

# Backend only (from server/)
npm run dev          # port 3001
```

Frontend proxies `/api/*` to the backend — no CORS issues in dev.

---

## Testing

- Test files: `src/test/*.test.ts` or colocated `*.test.tsx`
- Framework: Vitest with `@testing-library/react`
- Run: `npm test`
- Setup mocks `window.matchMedia` — already done in `src/test/setup.ts`

```ts
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
```
