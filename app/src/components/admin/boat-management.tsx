"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Circle, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BoatWithRelations } from "@/lib/types";

type Squad = { id: string; name: string };

export function BoatManagement({
  boats,
}: {
  boats: BoatWithRelations[];
  squads: Squad[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function toggleStatus(boatId: string, currentStatus: string) {
    const newStatus = currentStatus === "available" ? "not_in_use" : "available";
    const res = await fetch(`/api/admin/boats/${boatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      toast({ title: `Boat ${newStatus === "not_in_use" ? "disabled" : "enabled"}` });
      router.refresh();
    }
  }

  async function toggleClassification(boatId: string, current: string) {
    const newClass = current === "black" ? "green" : "black";
    const res = await fetch(`/api/admin/boats/${boatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classification: newClass }),
    });

    if (res.ok) {
      toast({ title: `Boat set to ${newClass}` });
      router.refresh();
    }
  }

  return (
    <div className="space-y-2 mt-4">
      {boats.map((boat) => (
        <Card key={boat.id} className={boat.status === "not_in_use" ? "opacity-60" : ""}>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              {boat.classification === "black" ? (
                <Circle className="h-4 w-4 fill-gray-800 text-gray-800" />
              ) : (
                <Circle className="h-4 w-4 fill-green-500 text-green-500" />
              )}
              <div>
                <div className="font-medium">
                  {boat.name}
                  {boat.category === "private" && (
                    <Lock className="inline h-3 w-3 ml-1 text-blue-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {boat.boatType} — {boat.responsibleSquad?.name ?? boat.responsiblePerson ?? "Unassigned"}
                  {boat.avgWeightKg && ` — ${boat.avgWeightKg}kg`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{boat.category}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleClassification(boat.id, boat.classification)}
              >
                {boat.classification === "black" ? "Set Green" : "Set Black"}
              </Button>
              <Button
                variant={boat.status === "not_in_use" ? "default" : "ghost"}
                size="sm"
                onClick={() => toggleStatus(boat.id, boat.status)}
              >
                {boat.status === "not_in_use" ? "Enable" : "Disable"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
