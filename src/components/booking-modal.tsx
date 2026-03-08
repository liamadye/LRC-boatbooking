"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { TIME_SLOTS, MAX_CREW } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { BoatWithRelations, UserProfile } from "@/lib/types";

type BookingTarget = {
  resourceType: "boat" | "equipment" | "oar_set";
  resourceId: string;
  resourceName: string;
  slot: number;
};

type EditingBooking = {
  id: string;
  bookerName: string;
  crewCount: number;
  startSlot: number;
  endSlot: number;
  isRaceSpecific: boolean;
  raceDetails?: string | null;
  notes?: string | null;
};

export function BookingModal({
  target,
  selectedDate,
  user,
  boats,
  editingBooking,
  onClose,
}: {
  target: BookingTarget;
  selectedDate: string;
  user: UserProfile;
  boats: BoatWithRelations[];
  editingBooking?: EditingBooking;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const isEditing = !!editingBooking;
  const boat = boats.find((b) => b.id === target.resourceId);
  const maxCrew = boat ? (MAX_CREW[boat.boatType] ?? 1) : 1;

  const [bookerName, setBookerName] = useState(editingBooking?.bookerName ?? user.fullName);
  const [endSlot, setEndSlot] = useState(editingBooking?.endSlot ?? target.slot);
  const [isRaceSpecific, setIsRaceSpecific] = useState(editingBooking?.isRaceSpecific ?? false);
  const [raceDetails, setRaceDetails] = useState(editingBooking?.raceDetails ?? "");
  const [notes, setNotes] = useState(editingBooking?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      let res: Response;

      if (isEditing) {
        res = await fetch(`/api/bookings/${editingBooking.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookerName,
            endSlot,
            isRaceSpecific,
            raceDetails: isRaceSpecific ? raceDetails : null,
            notes: notes || null,
          }),
        });
      } else {
        res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: selectedDate,
            resourceType: target.resourceType,
            resourceId: target.resourceId,
            bookerName,
            crewCount: maxCrew,
            startSlot: target.slot,
            endSlot,
            isRaceSpecific,
            raceDetails: isRaceSpecific ? raceDetails : null,
            notes: notes || null,
          }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors.map((e: { message: string }) => e.message));
        } else {
          setErrors([data.error ?? `Failed to ${isEditing ? "update" : "create"} booking`]);
        }
        return;
      }

      toast({
        title: isEditing ? "Booking updated" : "Booking created",
        description: `${target.resourceName} ${isEditing ? "updated" : "booked"} successfully.`,
      });
      onClose();
      router.refresh();
    } catch {
      setErrors(["Network error. Please try again."]);
    } finally {
      setLoading(false);
    }
  }

  const slotLabel = TIME_SLOTS.find((ts) => ts.slot === target.slot)?.label ?? "";

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] mx-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Book"} {target.resourceName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {selectedDate} — Slot: {slotLabel}
            {boat && (
              <>
                {" "}— Type: {boat.boatType}
                {boat.avgWeightKg && ` — Weight: ${boat.avgWeightKg}kg`}
                {boat.classification === "black" && (
                  <span className="ml-1 text-amber-600 font-medium">
                    (Black — restricted)
                  </span>
                )}
              </>
            )}
          </div>

          <div>
            <Label htmlFor="bookerName">Name</Label>
            <Input
              id="bookerName"
              value={bookerName}
              onChange={(e) => setBookerName(e.target.value)}
              required
            />
          </div>

          {target.resourceType === "boat" && boat && (
            <div className="text-sm text-muted-foreground">
              Crew: {maxCrew}{maxCrew > 1 && boat.boatType.includes("+") ? ` (${maxCrew - 1} + cox)` : ""}
            </div>
          )}

          <div>
            <Label htmlFor="endSlot">Book through to slot</Label>
            <select
              id="endSlot"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={endSlot}
              onChange={(e) => setEndSlot(parseInt(e.target.value))}
              disabled={isEditing}
            >
              {TIME_SLOTS.filter((ts) => ts.slot >= target.slot).map((ts) => (
                <option key={ts.slot} value={ts.slot}>
                  {ts.label}
                  {ts.slot === target.slot ? " (single slot)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="raceSpecific"
              checked={isRaceSpecific}
              onCheckedChange={(checked) =>
                setIsRaceSpecific(checked === true)
              }
            />
            <Label htmlFor="raceSpecific" className="text-sm">
              Race-specific booking (priority allocation)
            </Label>
          </div>

          {isRaceSpecific && (
            <div>
              <Label htmlFor="raceDetails">
                Training days & target regattas
              </Label>
              <Textarea
                id="raceDetails"
                value={raceDetails}
                onChange={(e) => setRaceDetails(e.target.value)}
                placeholder="e.g. Tue/Thu 5am, targeting State Championships April"
                required
              />
            </div>
          )}

          {target.slot === 7 && (
            <div>
              <Label htmlFor="notes">Specific time (8am-4:30pm slot)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 10:00am - 12:00pm"
              />
            </div>
          )}

          {errors.length > 0 && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEditing ? "Saving..." : "Booking..."
                : isEditing ? "Save Changes" : "Confirm Booking"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
