"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatBookingWindow } from "@/lib/booking-times";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { Trash2 } from "lucide-react";

type AdminBooking = {
  id: string;
  date: string;
  resourceType: string;
  bookerName: string;
  crewCount: number;
  startSlot: number;
  endSlot: number;
  startMinutes: number;
  endMinutes: number;
  isRaceSpecific: boolean;
  notes: string | null;
  boat: { name: string; boatTypeLabel: string } | null;
  equipment: { type: string; number: number } | null;
  oarSet: { name: string } | null;
  user: { fullName: string; email: string };
};

export function BookingManagement() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));

  async function fetchBookings() {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    try {
      const res = await fetch(`/api/admin/bookings?${params}`);
      if (!res.ok) {
        throw new Error("Failed to load bookings.");
      }
      const data = await res.json();
      setBookings(data);
    } catch {
      toast({ title: "Failed to load bookings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel(bookingId: string) {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast({ title: "Booking cancelled" });
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } else {
      toast({ title: "Failed to cancel booking", variant: "destructive" });
    }
  }

  function getResourceName(booking: AdminBooking) {
    if (booking.boat) return `${booking.boat.name} (${booking.boat.boatTypeLabel})`;
    if (booking.equipment) return `${booking.equipment.type.charAt(0).toUpperCase() + booking.equipment.type.slice(1)} ${booking.equipment.number}`;
    if (booking.oarSet) return booking.oarSet.name;
    return "Unknown";
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <Label htmlFor="dateFrom">From</Label>
          <Input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div>
          <Label htmlFor="dateTo">To</Label>
          <Input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={fetchBookings} disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {loading && bookings.length === 0
          ? "Loading bookings..."
          : `${bookings.length} booking${bookings.length !== 1 ? "s" : ""} found`}
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Resource</th>
              <th className="px-3 py-2 text-left font-medium">Booked By</th>
              <th className="px-3 py-2 text-left font-medium">Slot</th>
              <th className="px-3 py-2 text-left font-medium">Crew</th>
              <th className="px-3 py-2 text-left font-medium">Notes</th>
              <th className="px-3 py-2 text-center font-medium w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-t hover:bg-gray-50/50">
                <td className="px-3 py-2">
                  {format(new Date(booking.date), "dd/MM/yyyy")}
                </td>
                <td className="px-3 py-2 font-medium">
                  {getResourceName(booking)}
                </td>
                <td className="px-3 py-2">
                  <div>{booking.bookerName}</div>
                  <div className="text-xs text-muted-foreground">{booking.user.email}</div>
                </td>
                <td className="px-3 py-2">
                  {formatBookingWindow(booking)}
                </td>
                <td className="px-3 py-2">
                  {booking.crewCount}
                  {booking.isRaceSpecific && (
                    <Badge variant="secondary" className="ml-1 text-[10px]">Race</Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">
                  {booking.notes ?? "—"}
                </td>
                <td className="px-3 py-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleCancel(booking.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  {loading ? "Loading bookings..." : "No bookings found for the selected date range."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
