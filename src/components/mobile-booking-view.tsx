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
  dayBookings: SerializedBooking[];
  selectedDate: string;
  user: UserProfile;
  boatMap: Map<string, BoatWithRelations>;
  equipMap: Map<string, EquipmentItem>;
  oarMap: Map<string, OarSetItem>;
  onBookingClick: (booking: SerializedBooking) => void;
  onSlotClick: (resourceType: "boat" | "equipment" | "oar_set", resourceId: string, resourceName: string, slot: number) => void;
};

export function MobileBookingView({
  boats,
  dayBookings,
  user,
  boatMap,
  equipMap,
  oarMap,
  onBookingClick,
  onSlotClick,
}: Props) {
  const availableBoats = useMemo(
    () => boats.filter((b) => b.status === "available"),
    [boats]
  );

  return (
    <div className="space-y-3 md:hidden">
      {TIME_SLOTS.map((ts) => {
        const slotBookings = dayBookings.filter(
          (b) => b.startSlot <= ts.slot && b.endSlot >= ts.slot
        );

        const bookedResourceIds = new Set(
          slotBookings.map((b) => b.boatId ?? b.equipmentId ?? b.oarSetId)
        );
        const availableForSlot = availableBoats.filter(
          (b) => !bookedResourceIds.has(b.id)
        );

        return (
          <div key={ts.slot} className="rounded-lg border bg-white overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 font-semibold text-sm border-b flex items-center justify-between">
              <span>{ts.label}</span>
              {slotBookings.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  {slotBookings.length} booked
                </span>
              )}
            </div>

            {/* Booked items */}
            {slotBookings.length > 0 && (
              <div className="divide-y">
                {slotBookings.map((booking) => {
                  const boat = boatMap.get(booking.boatId ?? "");
                  const equip = equipMap.get(booking.equipmentId ?? "");
                  const oar = oarMap.get(booking.oarSetId ?? "");
                  const resourceName = boat?.name ?? (equip ? `${equip.type} ${equip.number}` : oar?.name ?? "Unknown");
                  const isOwn = booking.userId === user.id;

                  return (
                    <button
                      key={booking.id}
                      className={cn(
                        "w-full px-3 py-2.5 text-left text-sm flex items-center justify-between active:bg-gray-100",
                        isOwn ? "bg-blue-50" : "bg-gray-50/50"
                      )}
                      onClick={() => onBookingClick(booking)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {boat && (
                          <span className="flex-shrink-0">
                            {boat.classification === "black" ? (
                              <Circle className="h-3 w-3 fill-gray-800 text-gray-800" />
                            ) : (
                              <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                            )}
                          </span>
                        )}
                        <span className="font-medium truncate">{resourceName}</span>
                        {boat && (
                          <span className="text-muted-foreground text-xs flex-shrink-0">{boat.boatType}</span>
                        )}
                      </div>
                      <div className={cn(
                        "text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2",
                        isOwn ? "bg-blue-200 text-blue-800" : "bg-gray-200 text-gray-700"
                      )}>
                        {booking.bookerName} ({booking.crewCount})
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Available boats — collapsed by default on mobile for cleaner view */}
            {availableForSlot.length > 0 && (
              <details className="border-t">
                <summary className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-green-50/50 cursor-pointer select-none">
                  {availableForSlot.length} available
                </summary>
                <div className="divide-y">
                  {availableForSlot.map((boat) => (
                    <button
                      key={boat.id}
                      className="w-full px-3 py-2.5 text-left text-sm flex items-center justify-between active:bg-blue-50 transition-colors"
                      onClick={() => onSlotClick("boat", boat.id, boat.name, ts.slot)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {boat.classification === "black" ? (
                          <Circle className="h-3 w-3 fill-gray-800 text-gray-800" />
                        ) : boat.category === "private" ? (
                          <Lock className="h-3 w-3 text-blue-500" />
                        ) : (
                          <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                        )}
                        <span className="font-medium truncate">{boat.name}</span>
                        <span className="text-muted-foreground text-xs flex-shrink-0">{boat.boatType}</span>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {MAX_CREW[boat.boatType] ?? 1} crew
                      </span>
                    </button>
                  ))}
                </div>
              </details>
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
