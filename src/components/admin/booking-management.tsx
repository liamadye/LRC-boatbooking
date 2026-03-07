"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TIME_SLOTS } from "@/lib/constants";

type AdminBooking = {
  id: string;
  date: string;
  resourceType: string;
  bookerName: string;
  crewCount: number;
  startSlot: number;
  endSlot: number;
  isRaceSpecific: boolean;
  notes: string | null;
  boat: { name: string; boatType: string } | null;
  equipment: { type: string; number: number } | null;
  oarSet: { name: string } | null;
  user: { fullName: string; email: string };
};

export function BookingManagement() {
  const router = useRouter();
  const { toast } = useToast();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchBookings() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function deleteBooking(id: string, name: string) {
    if (!confirm(`Cancel booking by ${name}?`)) return;

    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Booking cancelled", description: `Booking by ${name} has been removed.` });
      setBookings((prev) => prev.filter((b) => b.id !== id));
      router.refresh();
    }
  }

  function getSlotLabel(slot: number) {
    return TIME_SLOTS.find((ts) => ts.slot === slot)?.label ?? `Slot ${slot}`;
  }

  function getResourceName(b: AdminBooking) {
    if (b.boat) return `${b.boat.name} (${b.boat.boatType})`;
    if (b.equipment) return `${b.equipment.type} ${b.equipment.number}`;
    if (b.oarSet) return b.oarSet.name;
    return "Unknown";
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="bookingDate">Date</Label>
          <Input
            id="bookingDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        <Button onClick={fetchBookings} disabled={loading}>
          {loading ? "Loading..." : "Load Bookings"}
        </Button>
      </div>

      {bookings.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">
          No bookings found. Select a date and click Load.
        </p>
      )}

      <div className="space-y-2">
        {bookings.map((b) => (
          <Card key={b.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">
                  {getResourceName(b)}
                  {b.isRaceSpecific && (
                    <Badge className="ml-2" variant="default">Race</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {getSlotLabel(b.startSlot)}
                  {b.endSlot !== b.startSlot && ` – ${getSlotLabel(b.endSlot)}`}
                  {" · "}Booked by: <strong>{b.bookerName}</strong> ({b.user.fullName})
                  {" · "}Crew: {b.crewCount}
                  {b.notes && ` · ${b.notes}`}
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteBooking(b.id, b.bookerName)}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
