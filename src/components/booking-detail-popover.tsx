"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TIME_SLOTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { can } from "@/lib/permissions";
import type { BoatWithRelations, EquipmentItem, OarSetItem, UserProfile } from "@/lib/types";

type SerializedBooking = {
  id: string;
  date: string;
  resourceType: string;
  boatId: string | null;
  equipmentId: string | null;
  oarSetId: string | null;
  userId: string;
  bookerName: string;
  crewCount: number;
  startSlot: number;
  endSlot: number;
  isRaceSpecific: boolean;
  raceDetails?: string | null;
  notes: string | null;
};

export function BookingDetailPopover({
  booking,
  boats,
  equipment,
  oarSets,
  user,
  onClose,
  onEdit,
}: {
  booking: SerializedBooking;
  boats: BoatWithRelations[];
  equipment: EquipmentItem[];
  oarSets: OarSetItem[];
  user: UserProfile;
  onClose: () => void;
  onEdit?: (booking: SerializedBooking) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState(false);

  const boat = boats.find((b) => b.id === booking.boatId);
  const equip = equipment.find((e) => e.id === booking.equipmentId);
  const oar = oarSets.find((o) => o.id === booking.oarSetId);

  const resourceName = boat?.name ?? (equip ? `${equip.type.charAt(0).toUpperCase() + equip.type.slice(1)} ${equip.number}` : oar?.name ?? "Unknown");

  const startLabel = TIME_SLOTS.find((ts) => ts.slot === booking.startSlot)?.label ?? "";
  const endLabel = TIME_SLOTS.find((ts) => ts.slot === booking.endSlot)?.label ?? "";

  const isOwner = booking.userId === user.id;
  const canCancel = isOwner || can(user.role, "manage_bookings");
  const canEdit = isOwner || can(user.role, "manage_bookings");

  async function handleCancel() {
    setCancelling(true);

    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast({ title: "Booking cancelled" });
      onClose();
      router.refresh();
    } else {
      toast({ title: "Failed to cancel booking", variant: "destructive" });
    }

    setCancelling(false);
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{resourceName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Booked by</span>
            <span className="font-medium">{booking.bookerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{booking.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time</span>
            <span>
              {startLabel}
              {booking.endSlot !== booking.startSlot && ` – ${endLabel}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Crew</span>
            <span>{booking.crewCount}</span>
          </div>
          {boat && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Boat type</span>
              <span>{boat.boatType}</span>
            </div>
          )}
          {booking.isRaceSpecific && (
            <Badge variant="secondary">Race-specific</Badge>
          )}
          {booking.notes && (
            <div>
              <span className="text-muted-foreground">Notes: </span>
              <span>{booking.notes}</span>
            </div>
          )}
          {isOwner && (
            <Badge variant="default" className="bg-blue-600">Your booking</Badge>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          {canEdit && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(booking);
              }}
            >
              Edit
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Cancel Booking"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
