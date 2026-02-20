import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MealRequest, RequestItem, Recipe, Patient } from "@/lib/types";

export function useRecipes() {
  return useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recipes").select("*").order("name");
      if (error) throw error;
      return data as Recipe[];
    },
  });
}

export function useMealRequests() {
  return useQuery({
    queryKey: ["meal_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_requests")
        .select("*, patients(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MealRequest[];
    },
  });
}

export function useRequestItems(requestId: string | null) {
  return useQuery({
    queryKey: ["request_items", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_items")
        .select("*, recipes(*)")
        .eq("request_id", requestId!);
      if (error) throw error;
      return data as RequestItem[];
    },
  });
}

export function useCreateMealRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      patientId,
      recipeIds,
    }: {
      patientId: string;
      recipeIds: string[];
    }) => {
      // 1. Get patient
      const { data: patient, error: pErr } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();
      if (pErr) throw pErr;
      const p = patient as Patient;

      // 2. Get selected recipes
      const { data: recipes, error: rErr } = await supabase
        .from("recipes")
        .select("*")
        .in("id", recipeIds);
      if (rErr) throw rErr;
      const recs = recipes as Recipe[];

      // 3. Validate: check allergens
      const violations: string[] = [];
      for (const recipe of recs) {
        for (const allergen of recipe.allergens) {
          if (p.allergies.includes(allergen)) {
            violations.push(`"${recipe.name}" contains ${allergen} (patient allergy)`);
          }
        }
      }

      // 4. Validate: check diet compatibility
      for (const recipe of recs) {
        if (recipe.diet_tags.length > 0 && !recipe.diet_tags.includes(p.diet_order)) {
          violations.push(`"${recipe.name}" is not compatible with ${p.diet_order} diet`);
        }
      }

      if (violations.length > 0) {
        // Create as rejected
        const { data: req, error: reqErr } = await supabase
          .from("meal_requests")
          .insert({ patient_id: patientId, status: "Rejected", rejection_reason: violations.join("; ") })
          .select()
          .single();
        if (reqErr) throw reqErr;

        // Still save items for reference
        const items = recipeIds.map((rid) => ({ request_id: req.id, recipe_id: rid }));
        await supabase.from("request_items").insert(items);

        throw new Error(violations.join("\n"));
      }

      // 5. Create finalized request
      const { data: req, error: reqErr } = await supabase
        .from("meal_requests")
        .insert({ patient_id: patientId, status: "Finalized", finalized_at: new Date().toISOString() })
        .select()
        .single();
      if (reqErr) throw reqErr;

      // 6. Insert items
      const items = recipeIds.map((rid) => ({ request_id: req.id, recipe_id: rid }));
      const { error: iErr } = await supabase.from("request_items").insert(items);
      if (iErr) throw iErr;

      // 7. Create tray
      const { error: tErr } = await supabase.from("trays").insert({ request_id: req.id });
      if (tErr) throw tErr;

      return req;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal_requests"] });
      qc.invalidateQueries({ queryKey: ["trays"] });
    },
  });
}
