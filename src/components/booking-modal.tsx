"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { TIME_SLOTS, MAX_CREW, DAYTIME_TIMES } from "@/lib/constants";
import {
  getDefaultBookingRange,
  getDaytimeOptionForMinutes,
  getDefaultEndMinutes,
  parseDaytimeTime,
} from "@/lib/booking-times";

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
  startMinutes: number;
  endMinutes: number;
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

  // Show coxed toggle for any boat type containing "+" that also has uncoxed options
  // e.g. "4x/4-/4+" supports coxed (5 crew) and uncoxed (4 crew)
  // Also show for pure "4+" to allow uncoxed rowing
  const hasCoxOption = !!boat && boat.boatType.includes("+") && boat.boatType !== "8+";
  const coxedCrew = boat ? (MAX_CREW[boat.boatType] ?? 1) : 1;
  const uncoxedCrew = hasCoxOption ? coxedCrew - 1 : coxedCrew;

  const maxCrew = boat ? (MAX_CREW[boat.boatType] ?? 1) : 1;
  const canBookAsSquad = user.squads.length > 0;
  const matchingSquad = canBookAsSquad
    ? user.squads.find((s) => s.id === editingBooking?.squadId)
    : null;
  const defaultRange = useMemo(
    () => getDefaultBookingRange(target.slot),
    [target.slot]
  );

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
  const [isCoxed, setIsCoxed] = useState(
    hasCoxOption
      ? (editingBooking ? editingBooking.crewCount === coxedCrew : true)
      : true
  );
  const effectiveCrew = hasCoxOption ? (isCoxed ? coxedCrew : uncoxedCrew) : maxCrew;
  const [endSlot, setEndSlot] = useState(editingBooking?.endSlot ?? defaultRange.endSlot);
  const [daytimeStart, setDaytimeStart] = useState(
    target.slot === 7
      ? getDaytimeOptionForMinutes(editingBooking?.startMinutes ?? defaultRange.startMinutes)
      : ""
  );
  const [daytimeEnd, setDaytimeEnd] = useState(
    (editingBooking?.endSlot ?? defaultRange.endSlot) === 7
      ? getDaytimeOptionForMinutes(editingBooking?.endMinutes ?? defaultRange.endMinutes)
      : ""
  );
  const [isRaceSpecific, setIsRaceSpecific] = useState(editingBooking?.isRaceSpecific ?? false);
  const [raceDetails, setRaceDetails] = useState(editingBooking?.raceDetails ?? "");
  const [notes] = useState(editingBooking?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function handleDaytimeStartChange(value: string) {
    setDaytimeStart(value);
    const startMins = value ? parseDaytimeTime(value) : null;
    if (startMins != null && endSlot === 7) {
      const autoEndMins = Math.min(startMins + 90, getDefaultEndMinutes(7));
      const autoEnd = getDaytimeOptionForMinutes(autoEndMins);
      if (autoEnd) {
        setDaytimeEnd(autoEnd);
      } else {
        const closest = getDaytimeOptionForMinutes(autoEndMins - (autoEndMins % 30));
        if (closest) setDaytimeEnd(closest);
      }
    }
  }

  useEffect(() => {
    if (isEditing || endSlot !== 7) {
      return;
    }

    const baseStartMinutes =
      target.slot === 7
        ? parseDaytimeTime(daytimeStart) ?? defaultRange.startMinutes
        : defaultRange.startMinutes;
    const currentEndMinutes = parseDaytimeTime(daytimeEnd);

    if (currentEndMinutes != null && currentEndMinutes > baseStartMinutes) {
      return;
    }

    const nextEndMinutes = Math.min(baseStartMinutes + 90, getDefaultEndMinutes(7));
    setDaytimeEnd(getDaytimeOptionForMinutes(nextEndMinutes));
  }, [daytimeEnd, daytimeStart, defaultRange.startMinutes, endSlot, isEditing, target.slot]);

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
    let startMinutes = defaultRange.startMinutes;
    let endMinutes = getDefaultEndMinutes(endSlot);

    if (target.slot === 7) {
      const parsedStart = daytimeStart
        ? parseDaytimeTime(daytimeStart)
        : defaultRange.startMinutes;
      if (parsedStart == null) {
        return { errors: ["Please select a valid daytime start time."] };
      }

      startMinutes = parsedStart;
    }

    if (endSlot === 7) {
      const parsedEnd = daytimeEnd
        ? parseDaytimeTime(daytimeEnd)
        : Math.min(startMinutes + 90, getDefaultEndMinutes(7));
      if (parsedEnd == null) {
        return { errors: ["Please select a valid daytime end time."] };
      }

      if (parsedEnd <= startMinutes) {
        return { errors: ["Daytime end time must be after the start time."] };
      }

      endMinutes = parsedEnd;
    }

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
        startMinutes,
        endMinutes,
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
    let optimisticId: string;
    try {
      optimisticId =
        globalThis.crypto?.randomUUID?.() ??
        `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    } catch {
      optimisticId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
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
      crewCount: effectiveCrew,
      startSlot: target.slot,
      endSlot: payload.endSlot,
      startMinutes: payload.startMinutes,
      endMinutes: payload.endMinutes,
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
          crewCount: effectiveCrew,
          startSlot: target.slot,
          ...payload,
        }),
      });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      pendingToast.dismiss();

      if (!res.ok) {
        onCreateResolved?.(optimisticBooking.id, null);
        const fallback =
          res.status === 409
            ? "This time slot is already booked."
            : "Failed to create booking.";
        toast({
          title: "Booking failed",
          description: getErrorMessage(data, fallback),
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
    } catch (error) {
      pendingToast.dismiss();
      onCreateResolved?.(optimisticBooking.id, null);
      toast({
        title: "Booking failed",
        description:
          error instanceof Error
            ? error.message
            : "Network error. Please try again.",
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

    // Close modal immediately and update in background
    void handleEditInBackground(submission.payload);
  }

  async function handleEditInBackground(payload: BookingPayload) {
    const pendingToast = toast({
      title: "Saving changes",
      description: `Updating ${target.resourceName}...`,
      duration: 20000,
    });

    onClose();

    try {
      const res = await fetch(`/api/bookings/${editingBooking!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      pendingToast.dismiss();

      if (!res.ok) {
        toast({
          title: "Update failed",
          description: getErrorMessage(data, "Failed to update booking."),
          variant: "destructive",
        });
        return;
      }

      onSaved?.(data as SerializedBooking);
      toast({
        title: "Booking updated",
        description: `${target.resourceName} updated successfully.`,
      });
    } catch (error) {
      pendingToast.dismiss();
      toast({
        title: "Update failed",
        description:
          error instanceof Error
            ? error.message
            : "Network error. Please try again.",
        variant: "destructive",
      });
    }
  }

  const slotLabel = TIME_SLOTS.find((ts) => ts.slot === target.slot)?.label ?? "";
  const showDaytimeStartSelector = target.slot === 7;
  const showDaytimeEndSelector = endSlot === 7;
  const daytimeStartOptions = DAYTIME_TIMES.filter((timeLabel) => {
    const optionMinutes = parseDaytimeTime(timeLabel);
    if (optionMinutes == null) {
      return false;
    }

    return endSlot === 7 ? optionMinutes < getDefaultEndMinutes(7) : true;
  });
  const minimumDaytimeEndMinutes = showDaytimeStartSelector
    ? parseDaytimeTime(daytimeStart) ?? defaultRange.startMinutes
    : defaultRange.startMinutes;
  const daytimeEndOptions = DAYTIME_TIMES.filter((timeLabel) => {
    const optionMinutes = parseDaytimeTime(timeLabel);
    return optionMinutes != null && optionMinutes > minimumDaytimeEndMinutes;
  });

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
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
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
            <div className="space-y-2">
              {hasCoxOption && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="coxed"
                    checked={isCoxed}
                    onCheckedChange={(checked) => setIsCoxed(checked === true)}
                  />
                  <Label htmlFor="coxed" className="text-sm">
                    Coxed (+1 cox)
                  </Label>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Crew: {effectiveCrew}{isCoxed && boat.boatType.includes("+") ? ` (${effectiveCrew - 1} + cox)` : ""}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="endSlot">Book through to slot</Label>
            <select
              id="endSlot"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
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

          {(showDaytimeStartSelector || showDaytimeEndSelector) && (
            <div className="space-y-2">
              <Label>
                Specific time{showDaytimeStartSelector ? "s" : ""} (8am–4:30pm slot)
              </Label>
              <div className={showDaytimeStartSelector && showDaytimeEndSelector ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
                {showDaytimeStartSelector && (
                  <div>
                    <Label htmlFor="startTime" className="text-xs text-muted-foreground">Start</Label>
                    <select
                      id="startTime"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                      value={daytimeStart}
                      onChange={(e) => handleDaytimeStartChange(e.target.value)}
                    >
                      <option value="">{getDaytimeOptionForMinutes(defaultRange.startMinutes) || "8:00am"}</option>
                      {daytimeStartOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}
                {showDaytimeEndSelector && (
                  <div>
                    <Label htmlFor="endTime" className="text-xs text-muted-foreground">End</Label>
                    <select
                      id="endTime"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                      value={daytimeEnd}
                      onChange={(e) => setDaytimeEnd(e.target.value)}
                    >
                      <option value="">{getDaytimeOptionForMinutes(defaultRange.endMinutes) || "4:30pm"}</option>
                      {daytimeEndOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {showDaytimeEndSelector && !showDaytimeStartSelector && (
                <p className="text-xs text-muted-foreground">
                  Morning bookings that run into the daytime slot can end at a precise time instead of blocking the whole 8am–4:30pm window.
                </p>
              )}
              {endSlot > 7 && showDaytimeStartSelector && (
                <p className="text-xs text-muted-foreground">
                  Start time is exact within the daytime slot. The booking then continues through the later slot you selected.
                </p>
              )}
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
