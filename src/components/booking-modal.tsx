"use client";

import { useState, type FormEvent } from "react";
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
import { supportsSquadBooking } from "@/lib/booking-utils";
import { useToast } from "@/hooks/use-toast";
import type { BoatWithRelations, SerializedBooking, UserProfile } from "@/lib/types";

type BookingTarget = {
  resourceType: "boat" | "equipment" | "oar_set";
  resourceId: string;
  resourceName: string;
  slot: number;
};

type BookingPayload = {
  bookerName: string;
  squadId: string | null;
  endSlot: number;
  isRaceSpecific: boolean;
  raceDetails: string | null;
  notes: string | null;
};

type BookingSubmission = { payload: BookingPayload } | { errors: string[] };

export function BookingModal({
  target,
  selectedDate,
  user,
  boats,
  editingBooking,
  onCreatePending,
  onCreateResolved,
  onSaved,
  onClose,
}: {
  target: BookingTarget;
  selectedDate: string;
  user: UserProfile;
  boats: BoatWithRelations[];
  editingBooking?: SerializedBooking;
  onCreatePending?: (booking: SerializedBooking) => void;
  onCreateResolved?: (tempId: string, booking: SerializedBooking | null) => void;
  onSaved?: (booking: SerializedBooking) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const isEditing = !!editingBooking;
  const boat = boats.find((b) => b.id === target.resourceId);
  const maxCrew = boat ? (MAX_CREW[boat.boatType] ?? 1) : 1;
  const canBookAsSquad =
    target.resourceType === "boat" &&
    !!boat &&
    user.squads.length > 0 &&
    supportsSquadBooking(boat.boatType);
  const matchingSquad = canBookAsSquad
    ? user.squads.find((s) => s.id === editingBooking?.squadId)
    : null;

  const defaultSquad = matchingSquad ?? (canBookAsSquad ? user.squads[0] : null);
  const defaultToSquad = !!matchingSquad || (canBookAsSquad && !isEditing);
  const [bookerName, setBookerName] = useState(
    editingBooking?.bookerName ??
    (defaultToSquad && defaultSquad ? defaultSquad.name : user.fullName)
  );
  const [bookingMode, setBookingMode] = useState<"person" | "squad">(
    defaultToSquad ? "squad" : "person"
  );
  const [selectedSquadId, setSelectedSquadId] = useState<string>(
    matchingSquad?.id ?? user.squads[0]?.id ?? ""
  );
  const [endSlot, setEndSlot] = useState(editingBooking?.endSlot ?? target.slot);
  const [isRaceSpecific, setIsRaceSpecific] = useState(editingBooking?.isRaceSpecific ?? false);
  const [raceDetails, setRaceDetails] = useState(editingBooking?.raceDetails ?? "");
  const [notes, setNotes] = useState(editingBooking?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function handleBookingModeChange(nextMode: "person" | "squad") {
    setBookingMode(nextMode);

    if (nextMode === "person") {
      setBookerName(user.fullName);
      return;
    }

    const fallback = user.squads[0];
    const selected = user.squads.find((s) => s.id === selectedSquadId) ?? fallback;
    if (selected) {
      setSelectedSquadId(selected.id);
      setBookerName(selected.name);
    }
  }

  function handleSquadChange(squadId: string) {
    setSelectedSquadId(squadId);

    if (bookingMode === "squad") {
      const selected = user.squads.find((s) => s.id === squadId);
      if (selected) {
        setBookerName(selected.name);
      }
    }
  }

  function buildPayload(): BookingSubmission {
    let submitBookerName = bookerName;
    let submitSquadId: string | null = null;

    if (canBookAsSquad && bookingMode === "squad") {
      const selected = user.squads.find((s) => s.id === selectedSquadId);
      if (!selected) {
        return { errors: ["Please select a squad to continue."] };
      }
      submitBookerName = selected.name;
      submitSquadId = selected.id;
    }

    return {
      payload: {
        bookerName: submitBookerName,
        squadId: submitSquadId,
        endSlot,
        isRaceSpecific,
        raceDetails: isRaceSpecific ? raceDetails : null,
        notes: notes || null,
      },
    };
  }

  function getErrorMessage(data: unknown, fallback: string) {
    if (typeof data !== "object" || data === null) {
      return fallback;
    }

    if ("errors" in data && Array.isArray(data.errors)) {
      const messages = data.errors
        .map((error) =>
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
            ? error.message
            : null
        )
        .filter((message): message is string => !!message);
      if (messages.length > 0) {
        return messages.join(" ");
      }
    }

    if ("error" in data && typeof data.error === "string") {
      return data.error;
    }

    return fallback;
  }

  function buildOptimisticBooking(payload: BookingPayload): SerializedBooking {
    const optimisticId =
      globalThis.crypto?.randomUUID?.() ??
      `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const squad = payload.squadId
      ? user.squads.find((entry) => entry.id === payload.squadId) ?? null
      : null;

    return {
      id: `pending-${optimisticId}`,
      date: selectedDate,
      resourceType: target.resourceType,
      boatId: target.resourceType === "boat" ? target.resourceId : null,
      equipmentId: target.resourceType === "equipment" ? target.resourceId : null,
      oarSetId: target.resourceType === "oar_set" ? target.resourceId : null,
      userId: user.id,
      squadId: payload.squadId,
      bookerName: payload.bookerName,
      crewCount: maxCrew,
      startSlot: target.slot,
      endSlot: payload.endSlot,
      isRaceSpecific: payload.isRaceSpecific,
      raceDetails: payload.raceDetails,
      notes: payload.notes,
      squad,
      clientStatus: "pending",
    };
  }

  async function handleCreateInBackground(payload: BookingPayload) {
    const optimisticBooking = buildOptimisticBooking(payload);
    onCreatePending?.(optimisticBooking);

    const pendingToast = toast({
      title: "Processing booking",
      description: `${target.resourceName} is being booked.`,
      duration: 20000,
    });

    onClose();

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          resourceType: target.resourceType,
          resourceId: target.resourceId,
          crewCount: maxCrew,
          startSlot: target.slot,
          ...payload,
        }),
      });
      const data = await res.json();
      pendingToast.dismiss();

      if (!res.ok) {
        onCreateResolved?.(optimisticBooking.id, null);
        toast({
          title: "Booking failed",
          description: getErrorMessage(data, "Failed to create booking."),
          variant: "destructive",
        });
        return;
      }

      if (onCreateResolved) {
        onCreateResolved(optimisticBooking.id, data as SerializedBooking);
      } else {
        onSaved?.(data as SerializedBooking);
      }
      toast({
        title: "Booking created",
        description: `${target.resourceName} booked successfully.`,
      });
    } catch {
      pendingToast.dismiss();
      onCreateResolved?.(optimisticBooking.id, null);
      toast({
        title: "Booking failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) {
      return;
    }

    setErrors([]);

    const submission = buildPayload();
    if ("errors" in submission) {
      setErrors(submission.errors);
      return;
    }

    setLoading(true);

    if (!isEditing) {
      void handleCreateInBackground(submission.payload);
      return;
    }

    try {
      const res = await fetch(`/api/bookings/${editingBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission.payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrors([getErrorMessage(data, "Failed to update booking.")]);
        return;
      }

      toast({
        title: "Booking updated",
        description: `${target.resourceName} updated successfully.`,
      });
      onSaved?.(data as SerializedBooking);
      onClose();
    } catch {
      setErrors(["Network error. Please try again."]);
    } finally {
      setLoading(false);
    }
  }

  const slotLabel = TIME_SLOTS.find((ts) => ts.slot === target.slot)?.label ?? "";

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="max-w-md w-[calc(100%-2rem)] mx-auto"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
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
              disabled={canBookAsSquad && bookingMode === "squad"}
            />
          </div>

          {canBookAsSquad && (
            <div className="space-y-2">
              <Label id="bookingModeLabel">Booking For</Label>
              <div
                id="bookingMode"
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-labelledby="bookingModeLabel"
              >
                <Button
                  type="button"
                  variant={bookingMode === "person" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => handleBookingModeChange("person")}
                >
                  Person
                </Button>
                <Button
                  type="button"
                  variant={bookingMode === "squad" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => handleBookingModeChange("squad")}
                >
                  Squad
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {bookingMode === "person"
                  ? `Booking as ${user.fullName}`
                  : "Booking on behalf of a squad"}
              </div>

              {bookingMode === "squad" && (
                <select
                  id="selectedSquadId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedSquadId}
                  onChange={(e) => handleSquadChange(e.target.value)}
                >
                  {user.squads.map((squad) => (
                    <option key={squad.id} value={squad.id}>
                      {squad.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

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
