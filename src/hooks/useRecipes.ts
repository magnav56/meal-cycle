import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Recipe } from "@/lib/types";

export function useRecipes() {
  return useQuery({
    queryKey: ["recipes"],
    queryFn: () => api.get<Recipe[]>("/api/recipes"),
  });
}
