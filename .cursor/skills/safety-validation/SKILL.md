---
name: safety-validation
description: Documents the meal request safety validation pipeline — how allergen and diet compatibility checks work across the backend and frontend. Use when modifying validation rules, debugging rejected requests, or adding new safety checks.
---

# Safety Validation Pipeline

MealFlow validates every meal request against the patient's allergies and diet order before finalizing. This is the most critical business logic in the system.

## How It Works

### Entry Point

`POST /api/meal-requests` in `server/src/routes/mealRequests.ts`

### Flow

1. **Client** submits `{ patientId, recipeIds }` via `useCreateMealRequest` hook
2. **Server** opens a transaction and loads the patient and selected recipes
3. **Allergen check**: for each recipe, every item in `recipe.allergens[]` is checked against `patient.allergies[]`. Any match is a violation.
4. **Diet check**: if a recipe has `diet_tags[]`, the patient's `diet_order` must appear in that array. If not, it's a violation.
5. **Outcome**:
   - **Violations found** → request saved as `status: 'Rejected'` with `rejection_reason`, items still recorded. Returns **422** with `{ error, request }`.
   - **No violations** → request saved as `status: 'Finalized'`, items recorded, a tray is created. Returns **201**.
6. **Client** shows validation errors in an `Alert` component inside the meal request dialog, or shows a success toast.

### Key Files

| File | Role |
|---|---|
| `server/src/routes/mealRequests.ts` | Validation logic (POST handler) |
| `src/hooks/useMealRequests.ts` | `useCreateMealRequest` mutation |
| `src/components/MealRequestPanel.tsx` | Error display + form |
| `src/lib/types.ts` | `MealRequest.status`, `Recipe.allergens`, `Patient.allergies` |
| `db/init.sql` | `recipes` table seed data with allergens and diet_tags |

### Data Model

```
Patient.allergies: string[]       — e.g. ["Shellfish", "Gluten"]
Patient.diet_order: string        — e.g. "Low Sodium"
Recipe.allergens: string[]        — e.g. ["Shellfish"]
Recipe.diet_tags: string[]        — e.g. ["Regular", "Low Sodium"]
```

Allergen values must match exactly between `Recipe.allergens` and `Patient.allergies` (case-sensitive, sourced from `ALLERGY_OPTIONS`).

Diet tags use an **inclusion model**: if a recipe has any `diet_tags`, the patient's `diet_order` must be in that list. An empty `diet_tags` array means the recipe is compatible with all diets.

## Adding a New Validation Rule

1. Add the check inside the transaction block in `mealRequests.ts`, after the existing allergen/diet checks
2. Push violation messages to the `violations[]` array — same format as existing ones
3. No frontend changes needed: the error string is displayed as-is in the `Alert` component
4. If the new rule requires new data fields, update `types.ts`, `db/init.sql`, and the relevant route queries

## Common Pitfalls

- Validation runs **server-side only** — the frontend does not pre-filter recipes by compatibility
- Rejected requests are still persisted (with their items) for audit purposes
- The transaction ensures atomicity: if the tray insert fails, the entire request is rolled back
- Allergen/diet strings are case-sensitive and must match the values in `ALLERGY_OPTIONS` / `DIET_OPTIONS`
