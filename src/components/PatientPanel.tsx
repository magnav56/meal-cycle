import { useState, useMemo, useEffect } from "react";
import { usePatients, useCreatePatient, useUpdatePatient } from "@/hooks/usePatients";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageControls } from "@/components/PageControls";
import { DIET_OPTIONS, ALLERGY_OPTIONS, CLINICAL_STATE_OPTIONS, type Patient } from "@/lib/types";
import { UserPlus, Edit2, AlertTriangle, Search, Activity } from "lucide-react";
import { useToast } from "@/hooks/useToast";

const PAGE_SIZE = 9;

const CLINICAL_STATE_COLORS: Record<string, string> = {
  Stable: "bg-green-100 text-green-800 border-green-200",
  Critical: "bg-red-100 text-red-800 border-red-200",
  Observation: "bg-amber-100 text-amber-800 border-amber-200",
  "Post-Op": "bg-purple-100 text-purple-800 border-purple-200",
  "Discharge Pending": "bg-orange-100 text-orange-800 border-orange-200",
  NPO: "bg-slate-100 text-slate-800 border-slate-200",
};

const EMPTY_FORM = { name: "", room_number: "", diet_order: "Regular", allergies: [] as string[], clinical_state: "Stable" };

export function PatientPanel() {
  const { data: patients, isLoading } = usePatients();
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [search, setSearch] = useState("");
  const [dietFilter, setDietFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [page, setPage] = useState(1);

  const resetForm = () => setForm({ ...EMPTY_FORM, allergies: [] });

  const duplicatePatient = useMemo(() => {
    if (!patients || !form.name.trim() || !form.room_number.trim()) return null;
    const name = form.name.trim().toLowerCase();
    const room = form.room_number.trim().toLowerCase();
    return patients.find(
      (p) =>
        p.name.trim().toLowerCase() === name &&
        (p.room_number ?? "").trim().toLowerCase() === room &&
        p.id !== editPatient?.id,
    ) ?? null;
  }, [patients, form.name, form.room_number, editPatient]);

  const isMutating = createPatient.isPending || updatePatient.isPending;

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
    setForm({ name: p.name, room_number: p.room_number ?? "", diet_order: p.diet_order, allergies: p.allergies, clinical_state: p.clinical_state || "Stable" });
    setOpen(true);
  };

  const toggleAllergy = (a: string) => {
    setForm((f) => ({
      ...f,
      allergies: f.allergies.includes(a) ? f.allergies.filter((x) => x !== a) : [...f.allergies, a],
    }));
  };

  const filtered = useMemo(() => {
    if (!patients) return [];
    const q = search.toLowerCase();
    return patients.filter((p) => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.room_number ?? "").toLowerCase().includes(q);
      const matchDiet = dietFilter === "all" || p.diet_order === dietFilter;
      const matchState = stateFilter === "all" || p.clinical_state === stateFilter;
      return matchSearch && matchDiet && matchState;
    });
  }, [patients, search, dietFilter, stateFilter]);

  useEffect(() => setPage(1), [search, dietFilter, stateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = search || dietFilter !== "all" || stateFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Patient Clinical</h2>
          <p className="text-sm text-muted-foreground">Manage patient admissions, diets, and allergies</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setEditPatient(null);
              resetForm();
            }
          }}
        >
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
                <Label>Patient Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Room Number <span className="text-destructive">*</span></Label>
                <Input
                  value={form.room_number}
                  onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))}
                  placeholder="e.g. 301-A"
                />
              </div>
              <div className="space-y-2">
                <Label>Diet Order</Label>
                <Select value={form.diet_order} onValueChange={(v) => setForm((f) => ({ ...f, diet_order: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIET_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d} className="border-b border-border last:border-b-0">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Clinical State</Label>
                <Select value={form.clinical_state} onValueChange={(v) => setForm((f) => ({ ...f, clinical_state: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLINICAL_STATE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Allergies</Label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Allergy selection">
                  {ALLERGY_OPTIONS.map((a) => {
                    const selected = form.allergies.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        role="switch"
                        aria-checked={selected}
                        className="inline-flex items-center"
                        onClick={() => toggleAllergy(a)}
                      >
                        <Badge
                          variant={selected ? "destructive" : "outline"}
                          className="cursor-pointer select-none"
                        >
                          {a}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
              {duplicatePatient && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    A patient named <strong>{duplicatePatient.name}</strong> is already assigned to room{" "}
                    <strong>{duplicatePatient.room_number}</strong>. Change the name or room number to continue.
                  </span>
                </div>
              )}
              <Button
                onClick={handleSubmit}
                className="w-full bg-clinical text-clinical-foreground hover:bg-clinical/90"
                disabled={!form.name.trim() || !form.room_number.trim() || !!duplicatePatient || isMutating}
              >
                {editPatient ? "Update Patient" : "Admit Patient"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or room…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={dietFilter} onValueChange={setDietFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Diet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Diets</SelectItem>
            {DIET_OPTIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Clinical State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {CLINICAL_STATE_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasActiveFilters}
          onClick={() => {
            setSearch("");
            setDietFilter("all");
            setStateFilter("all");
          }}
        >
          Clear
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading patients...</p>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {patients?.length ? "No patients match your filters." : "No patients admitted yet."}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} patient{filtered.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" style={{ gridAutoRows: "minmax(4.5rem, auto)" }}>
            {paginated.map((p) => (
              <Card key={p.id} className="border-l-4 border-l-clinical">
                <CardContent className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">Room {p.room_number ?? "—"}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                        <Badge variant="secondary" className="text-xs">
                          {p.diet_order}
                        </Badge>
                        {p.clinical_state && (
                          <Badge
                            variant="outline"
                            className={`text-xs flex items-center gap-1 ${CLINICAL_STATE_COLORS[p.clinical_state] ?? ""}`}
                          >
                            <Activity className="h-3 w-3" />
                            {p.clinical_state}
                          </Badge>
                        )}
                        {p.allergies.length > 0 &&
                          p.allergies.map((a) => (
                            <Badge key={a} variant="destructive" className="text-xs flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {a}
                            </Badge>
                          ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 -mr-1"
                      onClick={() => openEdit(p)}
                      aria-label={`Edit ${p.name}`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <PageControls page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
