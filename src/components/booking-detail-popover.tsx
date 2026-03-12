"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBookingWindow } from "@/lib/booking-times";
import { getBookingDisplayName } from "@/lib/booking-utils";
import { useToast } from "@/hooks/use-toast";
import { can } from "@/lib/permissions";
import type {
  BoatWithRelations,
  EquipmentItem,
  OarSetItem,
  SerializedBooking,
  UserProfile,
} from "@/lib/types";

export function BookingDetailPopover({
  booking,
  boats,
  equipment,
  oarSets,
  user,
  onClose,
  onDeleted,
  onEdit,
}: {
  booking: SerializedBooking;
  boats: BoatWithRelations[];
  equipment: EquipmentItem[];
  oarSets: OarSetItem[];
  user: UserProfile;
  onClose: () => void;
  onDeleted?: (bookingId: string) => void;
  onEdit?: (booking: SerializedBooking) => void;
}) {
  const { toast } = useToast();

  const boat = boats.find((b) => b.id === booking.boatId);
  const equip = equipment.find((e) => e.id === booking.equipmentId);
  const oar = oarSets.find((o) => o.id === booking.oarSetId);

  const resourceName = boat?.name ?? (equip ? `${equip.type.charAt(0).toUpperCase() + equip.type.slice(1)} ${equip.number}` : oar?.name ?? "Unknown");

  const isOwner = booking.userId === user.id;
  const isSquadMember =
    !!booking.squadId && user.squads.some((s) => s.id === booking.squadId);
  const canCancel = isOwner || isSquadMember || can(user.role, "manage_bookings");
  const canEdit = isOwner || isSquadMember || can(user.role, "manage_bookings");

  function handleCancel() {
    // Close immediately, delete in background
    onDeleted?.(booking.id);
    onClose();

    const pendingToast = toast({
      title: "Cancelling booking",
      description: `Removing ${resourceName}...`,
      duration: 20000,
    });

    fetch(`/api/bookings/${booking.id}`, { method: "DELETE" })
      .then((res) => {
        pendingToast.dismiss();
        if (res.ok) {
          toast({ title: "Booking cancelled" });
        } else {
          toast({ title: "Failed to cancel booking", variant: "destructive" });
        }
      })
      .catch(() => {
        pendingToast.dismiss();
        toast({ title: "Failed to cancel booking", variant: "destructive" });
      });
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{resourceName}</DialogTitle>
          <DialogDescription className="sr-only">
            Booking details and available actions for {resourceName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Booked by</span>
            <span className="font-medium">{getBookingDisplayName(booking)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{booking.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time</span>
            <span>{formatBookingWindow(booking)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Crew</span>
            <span>{booking.crewCount}</span>
          </div>
          {boat && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Boat type</span>
              <span>{boat.boatTypeLabel}</span>
            </div>
          )}
          {(booking.isRaceSpecific || booking.squad || (!booking.squad && isOwner)) && (
            <div className="flex flex-wrap gap-2">
              {booking.isRaceSpecific && (
                <Badge variant="secondary">Race-specific</Badge>
              )}
              {booking.squad && (
                <Badge variant="outline">Squad booking</Badge>
              )}
              {!booking.squad && isOwner && (
                <Badge variant="default" className="bg-blue-600">Your booking</Badge>
              )}
            </div>
          )}
          {booking.notes && (
            <div>
              <span className="text-muted-foreground">Notes: </span>
              <span>{booking.notes}</span>
            </div>
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
            >
              Cancel Booking
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
