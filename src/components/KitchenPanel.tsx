import { useState, useMemo, useEffect } from "react";
import { useTrays, useAdvanceTray } from "@/hooks/useTrays";
import { useRequestItems } from "@/hooks/useMealRequests";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRAY_STATUSES, type Tray } from "@/lib/types";
import { PageControls } from "@/components/PageControls";
import { ChefHat, Search, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { formatTime } from "@/lib/utils";

const PAGE_SIZE = 8;

function TrayTimeline({ tray }: { tray: Tray }) {
  const currentIdx = TRAY_STATUSES.indexOf(tray.status);
  return (
    <div className="flex items-center gap-1 mt-2" role="progressbar" aria-valuenow={currentIdx + 1} aria-valuemin={1} aria-valuemax={TRAY_STATUSES.length} aria-label={`Tray status: ${tray.status}`}>
      {TRAY_STATUSES.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className={`h-2.5 w-2.5 rounded-full ${i <= currentIdx ? "bg-kitchen" : "bg-muted"}`}
            title={s}
          />
          {i < TRAY_STATUSES.length - 1 && (
            <div className={`h-0.5 w-4 ${i < currentIdx ? "bg-kitchen" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ExpandedDetail({ tray }: { tray: Tray }) {
  const { data: items } = useRequestItems(tray.request_id);
  const timestamps = [
    { label: "Preparation Started", value: tray.preparation_started_at },
    { label: "Accuracy Validated", value: tray.accuracy_validated_at },
    { label: "En Route", value: tray.en_route_at },
    { label: "Delivered", value: tray.delivered_at },
    { label: "Retrieved", value: tray.retrieved_at },
  ];

  return (
    <div className="px-4 pb-3 pt-2 border-t border-border/50 space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">Diet</p>
        <p className="text-sm">{tray.meal_request?.patient?.diet_order ?? "—"}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">Items</p>
        {items?.length ? (
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.id} className="text-sm">• {item.recipe?.name}</div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No items</p>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">Timeline</p>
        <div className="space-y-1">
          {timestamps.map((t) => (
            <div key={t.label} className="text-sm flex justify-between">
              <span className="text-muted-foreground">{t.label}</span>
              <span>{formatTime(t.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function KitchenPanel() {
  const { data: trays, isLoading } = useTrays();
  const advanceTray = useAdvanceTray();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"in-progress" | "completed" | "all">("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdvance = async (tray: Tray) => {
    try {
      const updated = await advanceTray.mutateAsync(tray);
      toast({ title: `Tray advanced to: ${updated.status}` });
    } catch {
      toast({ title: "Error", description: "Could not advance tray", variant: "destructive" });
    }
  };

  const filtered = useMemo(() => {
    if (!trays) return [];
    const q = search.toLowerCase();
    return trays.filter((t) => {
      const name = t.meal_request?.patient?.name ?? "";
      const room = t.meal_request?.patient?.room_number ?? "";
      const matchSearch = !q || name.toLowerCase().includes(q) || room.toLowerCase().includes(q);
      const matchView =
        view === "all" ? true :
        view === "completed" ? t.status === "Retrieved" :
        t.status !== "Retrieved";
      return matchView && matchSearch;
    });
  }, [trays, search, view]);

  useEffect(() => setPage(1), [search, view]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = !!search || view !== "all";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Kitchen & Tracking</h2>
        <p className="text-sm text-muted-foreground">Track tray preparation and delivery lifecycle</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by patient or room…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={view} onValueChange={(v) => setView(v as typeof view)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All trays" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trays</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasActiveFilters}
          onClick={() => { setSearch(""); setView("all"); }}
        >
          Clear
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading trays...</p>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {trays?.length
              ? "No trays match your filters."
              : "No trays yet. Finalize a meal request to generate one."}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} tray{filtered.length !== 1 ? "s" : ""} found
          </p>
          <div className="space-y-2">
            {paginated.map((tray) => {
              const currentIdx = TRAY_STATUSES.indexOf(tray.status);
              const nextStatus = TRAY_STATUSES[currentIdx + 1] as string | undefined;
              return (
                <Card key={tray.id} className="border-l-4 border-l-kitchen">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="flex-1 flex items-center justify-between gap-3 text-left min-w-0"
                        onClick={() => setExpandedId(expandedId === tray.id ? null : tray.id)}
                        aria-expanded={expandedId === tray.id}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <ChefHat className="h-4 w-4 text-muted-foreground shrink-0" />
                            <p className="text-sm font-medium truncate">{tray.meal_request?.patient?.name}</p>
                            <span className="text-xs text-muted-foreground shrink-0">
                              Room {tray.meal_request?.patient?.room_number ?? "—"}
                            </span>
                          </div>
                          <TrayTimeline tray={tray} />
                        </div>
                        {expandedId === tray.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                      {nextStatus && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 border-kitchen/40 text-kitchen hover:bg-kitchen/10 hover:text-kitchen"
                          onClick={() => handleAdvance(tray)}
                          disabled={advanceTray.isPending}
                          aria-label={`Advance tray to ${nextStatus}`}
                        >
                          <ArrowRight className="h-3.5 w-3.5 mr-1" />
                          Advance
                        </Button>
                      )}
                    </div>
                  </CardContent>
                  {expandedId === tray.id && <ExpandedDetail tray={tray} />}
                </Card>
              );
            })}
          </div>
          <PageControls page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
