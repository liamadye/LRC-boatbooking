import { format, startOfWeek } from "date-fns";
import type { BookingWeekPayload, BookingWeekSummary, SerializedBooking } from "@/lib/types";
import { supportsSquadBooking as supportsSquadBookingForClass, type BoatClass } from "@/lib/boats";

type BookingLike = {
  id: string;
  date: Date;
  resourceType: string;
  boatId: string | null;
  equipmentId: string | null;
  oarSetId: string | null;
  userId: string;
  squadId: string | null;
  bookerName: string;
  crewCount: number;
  startSlot: number;
  endSlot: number;
  startMinutes: number;
  endMinutes: number;
  isRaceSpecific: boolean;
  raceDetails?: string | null;
  notes: string | null;
  squad?: { id: string; name: string } | null;
};

type BookingWeekLike = {
  weekStart: Date;
  opensAt: Date;
  closesAt: Date | null;
  pymbleNotes: string | null;
};

export function supportsSquadBooking(boatClass?: BoatClass | null) {
  return supportsSquadBookingForClass(boatClass);
}

export function getWeekStartKey(date: Date) {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function serializeBooking(booking: BookingLike): SerializedBooking {
  return {
    id: booking.id,
    date: format(booking.date, "yyyy-MM-dd"),
    resourceType: booking.resourceType,
    boatId: booking.boatId,
    equipmentId: booking.equipmentId,
    oarSetId: booking.oarSetId,
    userId: booking.userId,
    squadId: booking.squadId,
    bookerName: booking.bookerName,
    crewCount: booking.crewCount,
    startSlot: booking.startSlot,
    endSlot: booking.endSlot,
    startMinutes: booking.startMinutes,
    endMinutes: booking.endMinutes,
    isRaceSpecific: booking.isRaceSpecific,
    raceDetails: booking.raceDetails ?? null,
    notes: booking.notes,
    squad: booking.squad ?? null,
  };
}

export function serializeBookingWeekSummary(
  bookingWeek: BookingWeekLike | null
): BookingWeekSummary | null {
  if (!bookingWeek) {
    return null;
  }

  return {
    weekStart: format(bookingWeek.weekStart, "yyyy-MM-dd"),
    opensAt: bookingWeek.opensAt.toISOString(),
    closesAt: bookingWeek.closesAt?.toISOString() ?? null,
    pymbleNotes: bookingWeek.pymbleNotes,
  };
}

export function buildBookingWeekPayload(args: {
  bookings: BookingLike[];
  bookingWeek: BookingWeekLike | null;
  weekStart: Date;
}): BookingWeekPayload {
  return {
    bookings: args.bookings.map(serializeBooking),
    bookingWeek: serializeBookingWeekSummary(args.bookingWeek),
    weekStart: format(args.weekStart, "yyyy-MM-dd"),
  };
}

export function getBookingDisplayName(booking: Pick<SerializedBooking, "bookerName" | "squad">) {
  return booking.squad?.name ?? booking.bookerName;
}
