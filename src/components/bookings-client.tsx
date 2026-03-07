"use client";

import { useState, useCallback } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { useRouter } from "next/navigation";
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
  squads,
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
  squads: { id: string; name: string }[];
  pymbleNotes?: string | null;
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const router = useRouter();

  const handleDayChange = useCallback((date: Date) => {
    const formatted = format(date, "yyyy-MM-dd");
    // If same week, just update client state (no server round-trip)
    const dayWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    if (dayWeekStart.getTime() === weekStart.getTime()) {
      setSelectedDate(formatted);
      // Update URL without triggering navigation
      window.history.replaceState(null, "", `/bookings?date=${formatted}`);
    } else {
      // Different week: need server data
      router.push(`/bookings?date=${formatted}`);
    }
  }, [weekStart, router]);

  const handleWeekChange = useCallback((offset: number) => {
    const newWeekStart = addDays(weekStart, offset);
    router.push(`/bookings?date=${format(newWeekStart, "yyyy-MM-dd")}`);
  }, [weekStart, router]);

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
        selectedDate={selectedDate}
        onDayChange={handleDayChange}
        onWeekChange={handleWeekChange}
      />

      <BookingGrid
        boats={boats}
        equipment={equipment}
        oarSets={oarSets}
        bookings={bookings}
        selectedDate={selectedDate}
        user={user}
        squads={squads}
      />
    </div>
  );
}
