import { useTrays, useAdvanceTray } from "@/hooks/useTrays";
import { useRequestItems } from "@/hooks/useMealRequests";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TRAY_STATUSES, Tray } from "@/lib/types";
import { ChefHat, ArrowRight, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function TrayTimeline({ tray }: { tray: Tray }) {
  const currentIdx = TRAY_STATUSES.indexOf(tray.status);
  return (
    <div className="flex items-center gap-1 mt-2">
      {TRAY_STATUSES.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              i <= currentIdx ? "bg-kitchen" : "bg-muted"
            }`}
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

function TrayDetailDialog({ tray }: { tray: Tray }) {
  const { data: items } = useRequestItems(tray.request_id);
  const timestamps = [
    { label: "Preparation Started", value: tray.preparation_started_at },
    { label: "Accuracy Validated", value: tray.accuracy_validated_at },
    { label: "En Route", value: tray.en_route_at },
    { label: "Delivered", value: tray.delivered_at },
    { label: "Retrieved", value: tray.retrieved_at },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tray Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm"><span className="font-medium">Patient:</span> {tray.meal_requests?.patients?.name}</p>
          <p className="text-sm"><span className="font-medium">Room:</span> {tray.meal_requests?.patients?.room_number || "—"}</p>
          <p className="text-sm"><span className="font-medium">Diet:</span> {tray.meal_requests?.patients?.diet_order}</p>
          <div>
            <p className="font-medium text-sm mb-1">Items:</p>
            {items?.map((item) => (
              <div key={item.id} className="text-sm text-muted-foreground">• {item.recipes?.name}</div>
            ))}
          </div>
          <div>
            <p className="font-medium text-sm mb-1">Timeline:</p>
            {timestamps.map((t) => (
              <div key={t.label} className="text-sm flex justify-between">
                <span className="text-muted-foreground">{t.label}</span>
                <span>{t.value ? new Date(t.value).toLocaleTimeString() : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function KitchenPanel() {
  const { data: trays, isLoading } = useTrays();
  const advanceTray = useAdvanceTray();
  const { toast } = useToast();

  const handleAdvance = async (tray: Tray) => {
    try {
      const updated = await advanceTray.mutateAsync(tray);
      toast({ title: `Tray advanced to: ${updated.status}` });
    } catch {
      toast({ title: "Error", description: "Could not advance tray", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Kitchen & Tracking</h2>
        <p className="text-sm text-muted-foreground">Track tray preparation and delivery lifecycle</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading trays...</p>
      ) : !trays?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No trays yet. Finalize a meal request to generate one.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {trays.map((tray) => {
            const isComplete = tray.status === "Retrieved";
            return (
              <Card key={tray.id} className={`border-l-4 ${isComplete ? "border-l-muted" : "border-l-kitchen"}`}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ChefHat className={`h-4 w-4 ${isComplete ? "text-muted-foreground" : "text-kitchen"}`} />
                        <p className="text-sm font-medium">{tray.meal_requests?.patients?.name}</p>
                        <span className="text-xs text-muted-foreground">Room {tray.meal_requests?.patients?.room_number || "—"}</span>
                      </div>
                      <TrayTimeline tray={tray} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={isComplete ? "bg-muted text-muted-foreground" : "bg-kitchen text-kitchen-foreground"}>
                        {tray.status}
                      </Badge>
                      {!isComplete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdvance(tray)}
                          disabled={advanceTray.isPending}
                          className="border-kitchen text-kitchen hover:bg-kitchen hover:text-kitchen-foreground"
                        >
                          <ArrowRight className="h-3 w-3 mr-1" /> Advance
                        </Button>
                      )}
                      <TrayDetailDialog tray={tray} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
