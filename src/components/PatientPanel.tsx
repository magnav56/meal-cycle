import { useState } from "react";
import { usePatients, useCreatePatient, useUpdatePatient } from "@/hooks/usePatients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DIET_OPTIONS, ALLERGY_OPTIONS, Patient } from "@/lib/types";
import { UserPlus, Edit2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function PatientPanel() {
  const { data: patients, isLoading } = usePatients();
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState({ name: "", room_number: "", diet_order: "Regular", allergies: [] as string[] });

  const resetForm = () => setForm({ name: "", room_number: "", diet_order: "Regular", allergies: [] });

  const handleSubmit = async () => {
    try {
      if (editPatient) {
        await updatePatient.mutateAsync({ id: editPatient.id, ...form });
        toast({ title: "Patient updated" });
      } else {
        await createPatient.mutateAsync(form);
        toast({ title: "Patient admitted" });
      }
      resetForm();
      setEditPatient(null);
      setOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to save patient", variant: "destructive" });
    }
  };

  const openEdit = (p: Patient) => {
    setEditPatient(p);
    setForm({ name: p.name, room_number: p.room_number || "", diet_order: p.diet_order, allergies: p.allergies });
    setOpen(true);
  };

  const toggleAllergy = (a: string) => {
    setForm((f) => ({
      ...f,
      allergies: f.allergies.includes(a) ? f.allergies.filter((x) => x !== a) : [...f.allergies, a],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Patient Clinical</h2>
          <p className="text-sm text-muted-foreground">Manage patient admissions, diets, and allergies</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditPatient(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button className="bg-clinical text-clinical-foreground hover:bg-clinical/90">
              <UserPlus className="mr-2 h-4 w-4" /> Admit Patient
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editPatient ? "Edit Patient" : "Admit New Patient"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Patient Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input value={form.room_number} onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))} placeholder="e.g. 301-A" />
              </div>
              <div className="space-y-2">
                <Label>Diet Order</Label>
                <Select value={form.diet_order} onValueChange={(v) => setForm((f) => ({ ...f, diet_order: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIET_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Allergies</Label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGY_OPTIONS.map((a) => (
                    <Badge
                      key={a}
                      variant={form.allergies.includes(a) ? "destructive" : "outline"}
                      className="cursor-pointer select-none"
                      onClick={() => toggleAllergy(a)}
                    >
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full bg-clinical text-clinical-foreground hover:bg-clinical/90" disabled={!form.name}>
                {editPatient ? "Update Patient" : "Admit Patient"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading patients...</p>
      ) : !patients?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No patients admitted yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((p) => (
            <Card key={p.id} className="border-l-4 border-l-clinical">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">Room {p.room_number || "—"}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="secondary">{p.diet_order}</Badge>
                {p.allergies.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    {p.allergies.map((a) => (
                      <Badge key={a} variant="destructive" className="text-xs">{a}</Badge>
                    ))}
                  </div>
                )}
                <Badge variant={p.status === "Admitted" ? "default" : "secondary"} className={p.status === "Admitted" ? "bg-success text-success-foreground" : ""}>
                  {p.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
