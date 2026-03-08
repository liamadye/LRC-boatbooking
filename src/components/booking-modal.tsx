"use client";

import { useState, useMemo } from "react";
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

export function BookingModal({
  target,
  selectedDate,
  user,
  boats,
  squads = [],
  onClose,
}: {
  target: BookingTarget;
  selectedDate: string;
  user: UserProfile;
  boats: BoatWithRelations[];
  squads?: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const boat = boats.find((b) => b.id === target.resourceId);

  // Determine if this is a "big boat" (4+ crew capacity)
  const isBigBoat = useMemo(() => {
    if (!boat) return false;
    const maxCrew = MAX_CREW[boat.boatType] ?? 1;
    return maxCrew >= 4;
  }, [boat]);

  // Default booker name: for big boats, use user's first squad name; otherwise personal name
  const defaultName = useMemo(() => {
    if (isBigBoat && user.squads.length > 0) {
      return user.squads[0].name;
    }
    return user.fullName;
  }, [isBigBoat, user]);

  const [bookerName, setBookerName] = useState(defaultName);
  const [nameMode, setNameMode] = useState<"squad" | "custom">(
    isBigBoat && user.squads.length > 0 ? "squad" : "custom"
  );
  const crewCount = boat ? (MAX_CREW[boat.boatType] ?? 1) : 1;
  const [endSlot, setEndSlot] = useState(target.slot);
  const [isRaceSpecific, setIsRaceSpecific] = useState(false);
  const [raceDetails, setRaceDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          resourceType: target.resourceType,
          resourceId: target.resourceId,
          bookerName,
          crewCount,
          startSlot: target.slot,
          endSlot,
          isRaceSpecific,
          raceDetails: isRaceSpecific ? raceDetails : null,
          notes: notes || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors.map((e: { message: string }) => e.message));
        } else {
          setErrors([data.error ?? "Failed to create booking"]);
        }
        return;
      }

      toast({ title: "Booking created", description: `${target.resourceName} booked successfully.` });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book {target.resourceName}</DialogTitle>
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

          {/* Booker name: crew dropdown for big boats, text input for others */}
          {isBigBoat ? (
            <div className="space-y-2">
              <Label>Booking for</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setNameMode("squad"); if (user.squads.length > 0) setBookerName(user.squads[0].name); }}
                  className={`px-3 py-1 rounded text-sm border ${nameMode === "squad" ? "bg-blue-100 border-blue-300" : "bg-gray-50 border-gray-200"}`}
                >
                  Crew
                </button>
                <button
                  type="button"
                  onClick={() => { setNameMode("custom"); setBookerName(user.fullName); }}
                  className={`px-3 py-1 rounded text-sm border ${nameMode === "custom" ? "bg-blue-100 border-blue-300" : "bg-gray-50 border-gray-200"}`}
                >
                  Individual
                </button>
              </div>
              {nameMode === "squad" ? (
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={bookerName}
                  onChange={(e) => setBookerName(e.target.value)}
                >
                  {/* User's own squads first */}
                  {user.squads.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} (your crew)
                    </option>
                  ))}
                  {/* Then all other squads */}
                  {squads
                    .filter((s) => !user.squads.some((us) => us.id === s.id))
                    .map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                </select>
              ) : (
                <Input
                  value={bookerName}
                  onChange={(e) => setBookerName(e.target.value)}
                  required
                />
              )}
            </div>
          ) : (
            <div>
              <Label htmlFor="bookerName">Name</Label>
              <Input
                id="bookerName"
                value={bookerName}
                onChange={(e) => setBookerName(e.target.value)}
                required
              />
            </div>
          )}

          {boat && (
            <div className="text-sm text-muted-foreground">
              Crew size: {crewCount}
            </div>
          )}

          <div>
            <Label htmlFor="endSlot">Book through to slot</Label>
            <select
              id="endSlot"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={endSlot}
              onChange={(e) => setEndSlot(parseInt(e.target.value))}
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
              {loading ? "Booking..." : "Confirm Booking"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
