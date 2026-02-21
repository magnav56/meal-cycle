import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Tray } from "@/lib/types";

export function useTrays() {
  return useQuery({
    queryKey: ["trays"],
    queryFn: () => api.get<Tray[]>("/api/trays"),
    refetchInterval: 30_000,
  });
}

export function useAdvanceTray() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tray: Tray) =>
      api.patch<Tray>(`/api/trays/${tray.id}/advance`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trays"] }),
  });
}
