"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { TIME_SLOTS, MAX_CREW } from "@/lib/constants";
import { Circle, Lock } from "lucide-react";
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
  notes: string | null;
};

type Props = {
  boats: BoatWithRelations[];
  equipment: EquipmentItem[];
  oarSets: OarSetItem[];
  bookings: SerializedBooking[];
  selectedDate: string;
  user: UserProfile;
  onBookingClick: (booking: SerializedBooking) => void;
  onSlotClick: (resourceType: "boat" | "equipment" | "oar_set", resourceId: string, resourceName: string, slot: number) => void;
};

export function MobileBookingView({
  boats,
  equipment,
  oarSets,
  bookings,
  selectedDate,
  user,
  onBookingClick,
  onSlotClick,
}: Props) {
  const dayBookings = useMemo(
    () => bookings.filter((b) => b.date === selectedDate),
    [bookings, selectedDate]
  );

  const availableBoats = boats.filter((b) => b.status === "available");

  return (
    <div className="space-y-4 md:hidden">
      {TIME_SLOTS.map((ts) => {
        const slotBookings = dayBookings.filter(
          (b) => b.startSlot <= ts.slot && b.endSlot >= ts.slot
        );

        // Find available boats for this slot
        const bookedResourceIds = new Set(
          slotBookings.map((b) => b.boatId ?? b.equipmentId ?? b.oarSetId)
        );
        const availableForSlot = availableBoats.filter(
          (b) => !bookedResourceIds.has(b.id)
        );

        return (
          <div key={ts.slot} className="rounded-lg border bg-white overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 font-semibold text-sm border-b">
              {ts.label}
            </div>

            {/* Booked items */}
            {slotBookings.length > 0 && (
              <div className="divide-y">
                {slotBookings.map((booking) => {
                  const boat = boats.find((b) => b.id === booking.boatId);
                  const equip = equipment.find((e) => e.id === booking.equipmentId);
                  const oar = oarSets.find((o) => o.id === booking.oarSetId);
                  const resourceName = boat?.name ?? (equip ? `${equip.type} ${equip.number}` : oar?.name ?? "Unknown");
                  const isOwn = booking.userId === user.id;

                  return (
                    <button
                      key={booking.id}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm flex items-center justify-between",
                        isOwn ? "bg-blue-50" : "bg-gray-50/50"
                      )}
                      onClick={() => onBookingClick(booking)}
                    >
                      <div className="flex items-center gap-2">
                        {boat && (
                          <span>
                            {boat.classification === "black" ? (
                              <Circle className="h-3 w-3 fill-gray-800 text-gray-800" />
                            ) : (
                              <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                            )}
                          </span>
                        )}
                        <span className="font-medium">{resourceName}</span>
                        {boat && (
                          <span className="text-muted-foreground text-xs">{boat.boatType}</span>
                        )}
                      </div>
                      <div className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        isOwn ? "bg-blue-200 text-blue-800" : "bg-gray-200 text-gray-700"
                      )}>
                        {booking.bookerName} ({booking.crewCount})
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Available boats */}
            {availableForSlot.length > 0 && (
              <div className="divide-y border-t">
                <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-green-50/50">
                  Available
                </div>
                {availableForSlot.map((boat) => (
                  <button
                    key={boat.id}
                    className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-blue-50/50 transition-colors"
                    onClick={() => onSlotClick("boat", boat.id, boat.name, ts.slot)}
                  >
                    <div className="flex items-center gap-2">
                      {boat.classification === "black" ? (
                        <Circle className="h-3 w-3 fill-gray-800 text-gray-800" />
                      ) : boat.category === "private" ? (
                        <Lock className="h-3 w-3 text-blue-500" />
                      ) : (
                        <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                      )}
                      <span className="font-medium">{boat.name}</span>
                      <span className="text-muted-foreground text-xs">{boat.boatType}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {MAX_CREW[boat.boatType] ?? 1} crew
                    </span>
                  </button>
                ))}
              </div>
            )}

            {slotBookings.length === 0 && availableForSlot.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No boats available
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
