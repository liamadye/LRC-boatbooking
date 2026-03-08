"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getBookingDisplayName } from "@/lib/booking-utils";
import { useToast } from "@/hooks/use-toast";
import { TIME_SLOTS } from "@/lib/constants";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import type { SquadSummary } from "@/lib/types";

type Booking = {
  id: string;
  date: string;
  resourceType: string;
  boatId: string | null;
  equipmentId: string | null;
  oarSetId: string | null;
  squadId: string | null;
  bookerName: string;
  crewCount: number;
  startSlot: number;
  endSlot: number;
  isRaceSpecific: boolean;
  notes: string | null;
  squad: SquadSummary | null;
  boat?: { name: string; boatType: string } | null;
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    const res = await fetch("/api/my-bookings");
    if (res.ok) {
      const data = await res.json();
      setBookings(data);
    }
    setLoading(false);
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this booking?")) return;

    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBookings((prev) => prev.filter((b) => b.id !== id));
      toast({ title: "Booking cancelled" });
    } else {
      toast({ title: "Failed to cancel", variant: "destructive" });
    }
  }

  function getSlotLabel(slot: number): string {
    return TIME_SLOTS.find((ts) => ts.slot === slot)?.label ?? `Slot ${slot}`;
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">My Bookings</h1>

      {bookings.length === 0 ? (
        <p className="text-muted-foreground">No upcoming bookings.</p>
      ) : (
        bookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="space-y-1">
                <div className="font-medium">
                  {booking.boat?.name ?? booking.resourceType}
                  {booking.boat && (
                    <Badge variant="outline" className="ml-2">
                      {booking.boat.boatType}
                    </Badge>
                  )}
                  {booking.isRaceSpecific && (
                    <Badge className="ml-2">Race</Badge>
                  )}
                  {booking.squad && (
                    <Badge variant="outline" className="ml-2">Squad</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(booking.date), "EEE d MMM yyyy")} —{" "}
                  {getSlotLabel(booking.startSlot)}
                  {booking.endSlot !== booking.startSlot && (
                    <> to {getSlotLabel(booking.endSlot)}</>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {getBookingDisplayName(booking)} — {booking.crewCount} in boat
                  {booking.notes && <> — {booking.notes}</>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleCancel(booking.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
