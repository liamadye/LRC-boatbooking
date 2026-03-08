"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { TIME_SLOTS, MAX_CREW } from "@/lib/constants";
import { getBookingDisplayName } from "@/lib/booking-utils";
import { Circle, Lock } from "lucide-react";
import type {
  BoatWithRelations,
  EquipmentItem,
  OarSetItem,
  SerializedBooking,
  UserProfile,
} from "@/lib/types";

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

  const slotBookings = useMemo(() => {
    const slots: Record<number, SerializedBooking[]> = {};
    for (const ts of TIME_SLOTS) {
      slots[ts.slot] = [];
    }

    for (const booking of dayBookings) {
      for (let slot = booking.startSlot; slot <= booking.endSlot; slot += 1) {
        slots[slot].push(booking);
      }
    }

    return slots;
  }, [dayBookings]);

  const availableBySlot = useMemo(() => {
    const slots: Record<number, BoatWithRelations[]> = {};
    for (const ts of TIME_SLOTS) {
      const bookedResourceIds = new Set(
        (slotBookings[ts.slot] ?? []).map(
          (booking) => booking.boatId ?? booking.equipmentId ?? booking.oarSetId
        )
      );
      slots[ts.slot] = availableBoats.filter((boat) => !bookedResourceIds.has(boat.id));
    }
    return slots;
  }, [availableBoats, slotBookings]);

  return (
    <div className="space-y-3 md:hidden">
      {TIME_SLOTS.map((ts) => {
        const bookingsForSlot = slotBookings[ts.slot] ?? [];
        const availableForSlot = availableBySlot[ts.slot] ?? [];

        return (
          <div key={ts.slot} className="rounded-lg border bg-white overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 font-semibold text-sm border-b flex items-center justify-between">
              <span>{ts.label}</span>
              {bookingsForSlot.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  {bookingsForSlot.length} booked
                </span>
              )}
            </div>

            {/* Booked items */}
            {bookingsForSlot.length > 0 && (
              <div className="divide-y">
                {bookingsForSlot.map((booking) => {
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
                        {getBookingDisplayName(booking)} ({booking.crewCount})
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

            {bookingsForSlot.length === 0 && availableForSlot.length === 0 && (
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
