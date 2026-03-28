import { startOfWeek, format, parseISO } from "date-fns";
import { BookingsClient } from "@/components/bookings-client";
import { getSydneyDateString } from "@/lib/sydney-time";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;

  // Determine which date to show (default to Sydney local date, not UTC)
  const selectedDate = params.date
    ? parseISO(params.date)
    : parseISO(getSydneyDateString());

  // Get Monday of the selected week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

  return (
    <BookingsClient
      initialSelectedDate={format(selectedDate, "yyyy-MM-dd")}
      initialWeekStart={format(weekStart, "yyyy-MM-dd")}
    />
  );
}
