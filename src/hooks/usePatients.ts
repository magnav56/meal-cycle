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
    mutationFn: (patient: { name: string; room_number: string; diet_order: string; allergies: string[]; clinical_state: string }) =>
      api.post<Patient>("/api/patients", patient),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Patient> & { id: string }) =>
      api.patch<Patient>(`/api/patients/${id}`, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}
