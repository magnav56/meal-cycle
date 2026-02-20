import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Patient } from "@/lib/types";

export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("admitted_at", { ascending: false });
      if (error) throw error;
      return data as Patient[];
    },
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patient: { name: string; room_number: string; diet_order: string; allergies: string[] }) => {
      const { data, error } = await supabase.from("patients").insert(patient).select().single();
      if (error) throw error;
      return data as Patient;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Patient> & { id: string }) => {
      const { data, error } = await supabase.from("patients").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Patient;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}
