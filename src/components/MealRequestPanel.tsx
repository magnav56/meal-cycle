import { useState } from "react";
import { usePatients } from "@/hooks/usePatients";
import { useRecipes, useMealRequests, useCreateMealRequest, useRequestItems } from "@/hooks/useMealRequests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClipboardPlus, AlertTriangle, Check, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MealRequest } from "@/lib/types";

function RequestDetailDialog({ request }: { request: MealRequest }) {
  const { data: items } = useRequestItems(request.id);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm"><span className="font-medium">Patient:</span> {request.patients?.name}</p>
          <p className="text-sm"><span className="font-medium">Status:</span> <StatusBadge status={request.status} /></p>
          {request.rejection_reason && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Validation Failed</AlertTitle>
              <AlertDescription className="whitespace-pre-line text-sm">{request.rejection_reason}</AlertDescription>
            </Alert>
          )}
          <div>
            <p className="font-medium text-sm mb-1">Items:</p>
            {items?.map((item) => (
              <div key={item.id} className="text-sm text-muted-foreground">• {item.recipes?.name}</div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = {
    Finalized: "bg-success text-success-foreground",
    Rejected: "bg-destructive text-destructive-foreground",
    Draft: "bg-muted text-muted-foreground",
    Validated: "bg-clinical text-clinical-foreground",
  }[status] || "";
  return <Badge className={cls}>{status}</Badge>;
}

export function MealRequestPanel() {
  const { data: patients } = usePatients();
  const { data: recipes } = useRecipes();
  const { data: requests, isLoading } = useMealRequests();
  const createRequest = useCreateMealRequest();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const admittedPatients = patients?.filter((p) => p.status === "Admitted") || [];

  const toggleRecipe = (id: string) => {
    setSelectedRecipes((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      await createRequest.mutateAsync({ patientId, recipeIds: selectedRecipes });
      toast({ title: "Meal request finalized", description: "A tray has been created for the kitchen." });
      setOpen(false);
      setPatientId("");
      setSelectedRecipes([]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      toast({ title: "Request rejected", description: "See details in the form.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Meal Requests</h2>
          <p className="text-sm text-muted-foreground">Create and manage meal orders for patients</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-meal text-meal-foreground hover:bg-meal/90">
              <ClipboardPlus className="mr-2 h-4 w-4" /> New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Meal Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {admittedPatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — Room {p.room_number || "?"} ({p.diet_order})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Items</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto rounded border p-3">
                  {recipes?.map((r) => (
                    <label key={r.id} className="flex items-start gap-3 cursor-pointer py-1">
                      <Checkbox checked={selectedRecipes.includes(r.id)} onCheckedChange={() => toggleRecipe(r.id)} />
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.description}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {r.allergens.map((a) => <Badge key={a} variant="destructive" className="text-[10px]">{a}</Badge>)}
                          {r.diet_tags.map((d) => <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>)}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Safety Validation Failed</AlertTitle>
                  <AlertDescription className="whitespace-pre-line text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSubmit}
                className="w-full bg-meal text-meal-foreground hover:bg-meal/90"
                disabled={!patientId || selectedRecipes.length === 0 || createRequest.isPending}
              >
                Submit & Validate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading requests...</p>
      ) : !requests?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No meal requests yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <Card key={r.id} className={`border-l-4 ${r.status === "Finalized" ? "border-l-success" : r.status === "Rejected" ? "border-l-destructive" : "border-l-meal"}`}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {r.status === "Finalized" ? <Check className="h-4 w-4 text-success" /> : r.status === "Rejected" ? <X className="h-4 w-4 text-destructive" /> : null}
                  <div>
                    <p className="text-sm font-medium">{r.patients?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <RequestDetailDialog request={r} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
