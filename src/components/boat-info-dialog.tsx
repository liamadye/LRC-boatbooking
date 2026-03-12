"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { BoatWithRelations } from "@/lib/types";

export function BoatInfoDialog({
  boat,
  onClose,
}: {
  boat: BoatWithRelations;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{boat.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{boat.boatTypeLabel}</Badge>
            <Badge variant={boat.classification === "black" ? "secondary" : "outline"}>
              {boat.classification === "black" ? "Black" : "Green"}
            </Badge>
            <Badge variant="outline">{boat.category}</Badge>
            {boat.status === "not_in_use" && <Badge variant="destructive">Not in use</Badge>}
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Average weight</span>
            <span>{boat.avgWeightKg ? `${boat.avgWeightKg}kg` : "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Responsible squad</span>
            <span>{boat.responsibleSquad?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Responsible person</span>
            <span>{boat.responsiblePerson ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Storage</span>
            <span>{boat.isOutside ? "Outside" : "Inside shed"}</span>
          </div>

          {boat.notes && (
            <div>
              <span className="text-muted-foreground">Notes</span>
              <p className="mt-1 leading-relaxed">{boat.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
