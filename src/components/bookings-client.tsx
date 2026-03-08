"use client";

import { format, parseISO } from "date-fns";
import { WeekNav } from "@/components/week-nav";
import { BookingGrid } from "@/components/booking-grid";
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

export function BookingsClient({
  boats,
  equipment,
  oarSets,
  bookings,
  initialDate,
  weekStart,
  weekDays,
  user,
  pymbleNotes,
}: {
  boats: BoatWithRelations[];
  equipment: EquipmentItem[];
  oarSets: OarSetItem[];
  bookings: SerializedBooking[];
  initialDate: string;
  weekStart: Date;
  weekDays: Date[];
  user: UserProfile;
  pymbleNotes?: string | null;
}) {
  const selectedDateObj = parseISO(initialDate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Boat Bookings — W/C {format(weekStart, "d MMMM yyyy")}
        </h1>
        {pymbleNotes && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm text-amber-800">
            {pymbleNotes}
          </div>
        )}
      </div>

      <WeekNav
        weekDays={weekDays}
        selectedDate={selectedDateObj}
      />

      <BookingGrid
        boats={boats}
        equipment={equipment}
        oarSets={oarSets}
        bookings={bookings}
        selectedDate={initialDate}
        user={user}
      />
    </div>
  );
}
