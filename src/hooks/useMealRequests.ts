import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MealRequest, RequestItem, Recipe } from "@/lib/types";

export function useRecipes() {
  return useQuery({
    queryKey: ["recipes"],
    queryFn: () => api.get<Recipe[]>("/api/recipes"),
  });
}

export function useMealRequests() {
  return useQuery({
    queryKey: ["meal_requests"],
    queryFn: () => api.get<MealRequest[]>("/api/meal-requests"),
  });
}

export function useRequestItems(requestId: string | null) {
  return useQuery({
    queryKey: ["request_items", requestId],
    enabled: !!requestId,
    queryFn: () => api.get<RequestItem[]>(`/api/meal-requests/${requestId}/items`),
  });
}

export function useCreateMealRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, recipeIds }: { patientId: string; recipeIds: string[] }) =>
      api.post<MealRequest>("/api/meal-requests", { patientId, recipeIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal_requests"] });
      qc.invalidateQueries({ queryKey: ["trays"] });
    },
  });
}
