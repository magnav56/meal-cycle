import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tray, TRAY_STATUSES } from "@/lib/types";

export function useTrays() {
  return useQuery({
    queryKey: ["trays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trays")
        .select("*, meal_requests(*, patients(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tray[];
    },
  });
}

export function useAdvanceTray() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tray: Tray) => {
      const currentIdx = TRAY_STATUSES.indexOf(tray.status);
      if (currentIdx >= TRAY_STATUSES.length - 1) throw new Error("Tray already at final status");

      const nextStatus = TRAY_STATUSES[currentIdx + 1];
      const timestampField = {
        "Accuracy Validated": "accuracy_validated_at",
        "En Route": "en_route_at",
        "Delivered": "delivered_at",
        "Retrieved": "retrieved_at",
      }[nextStatus];

      const updates: Record<string, unknown> = { status: nextStatus };
      if (timestampField) updates[timestampField] = new Date().toISOString();

      const { data, error } = await supabase
        .from("trays")
        .update(updates)
        .eq("id", tray.id)
        .select("*, meal_requests(*, patients(*))")
        .single();
      if (error) throw error;
      return data as Tray;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trays"] }),
  });
}
