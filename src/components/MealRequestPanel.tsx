import { useState, useMemo, useEffect } from "react";
import { usePatients } from "@/hooks/usePatients";
import { useRecipes } from "@/hooks/useRecipes";
import { useMealRequests, useCreateMealRequest, useRequestItems } from "@/hooks/useMealRequests";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageControls } from "@/components/PageControls";
import { ClipboardPlus, AlertTriangle, Check, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 8;

function ExpandedDetail({ requestId }: { requestId: string }) {
  const { data: items } = useRequestItems(requestId);
  return (
    <div className="px-4 pb-3 pt-2 border-t border-border/50">
      <p className="text-xs font-medium text-muted-foreground mb-2">Items</p>
      {items?.length ? (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="text-sm text-foreground">
              • {item.recipe?.name}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No items</p>
      )}
    </div>
  );
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

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allPatients = patients ?? [];

  const toggleRecipe = (id: string) => {
    setSelectedRecipes((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const resetDialog = () => {
    setPatientId("");
    setSelectedRecipes([]);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      await createRequest.mutateAsync({ patientId, recipeIds: selectedRecipes });
      toast({ title: "Meal request finalized", description: "A tray has been created for the kitchen." });
      setOpen(false);
      resetDialog();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      toast({ title: "Validation failed", description: "See details in the form.", variant: "destructive" });
    }
  };

  const filtered = useMemo(() => {
    if (!requests) return [];
    const q = search.toLowerCase();
    return requests.filter((r) => {
      return !q || (r.patient?.name ?? "").toLowerCase().includes(q);
    });
  }, [requests, search]);

  useEffect(() => setPage(1), [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = !!search;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Meal Requests</h2>
          <p className="text-sm text-muted-foreground">Create and manage meal orders for patients</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) resetDialog();
          }}
        >
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — Room {p.room_number ?? "?"} ({p.diet_order})
                      </SelectItem>
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
                          {r.allergens.map((a) => (
                            <Badge key={a} variant="destructive" className="text-[10px]">
                              {a}
                            </Badge>
                          ))}
                          {r.diet_tags.map((d) => (
                            <Badge key={d} variant="secondary" className="text-[10px]">
                              {d}
                            </Badge>
                          ))}
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

      {/* Search */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by patient name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasActiveFilters}
          onClick={() => setSearch("")}
        >
          Clear
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading requests...</p>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {requests?.length ? "No requests match your search." : "No meal requests yet."}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} request{filtered.length !== 1 ? "s" : ""} found
          </p>
          <div className="space-y-2">
            {paginated.map((r) => (
              <Card key={r.id} className="border-l-4 border-l-success">
                <CardContent className="py-3 px-4">
                  <button
                    className="w-full flex items-center justify-between gap-3 text-left"
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    aria-expanded={expandedId === r.id}
                  >
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{r.patient?.name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</p>
                      </div>
                    </div>
                    {expandedId === r.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                </CardContent>
                {expandedId === r.id && <ExpandedDetail requestId={r.id} />}
              </Card>
            ))}
          </div>
          <PageControls page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
