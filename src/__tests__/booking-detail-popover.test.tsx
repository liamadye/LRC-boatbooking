import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookingDetailPopover } from "@/components/booking-detail-popover";
import type { BoatWithRelations, SerializedBooking, UserProfile } from "@/lib/types";

const boat: BoatWithRelations = {
  id: "boat-1",
  name: "Dean Patterson",
  boatType: "8+",
  category: "club",
  classification: "green",
  status: "available",
  avgWeightKg: null,
  isOutside: false,
  responsibleSquadId: null,
  responsiblePerson: null,
  ownerUserId: null,
  displayOrder: 1,
  notes: null,
  responsibleSquad: null,
  privateBoatAccessUserIds: [],
};

const user: UserProfile = {
  id: "user-1",
  email: "test@example.com",
  fullName: "Test User",
  role: "member",
  memberType: "student",
  weightKg: null,
  hasBlackBoatEligibility: true,
  squads: [{ id: "squad-1", name: "Bullsharks" }],
};

function renderPopover(booking: SerializedBooking) {
  render(
    <BookingDetailPopover
      booking={booking}
      boats={[boat]}
      equipment={[]}
      oarSets={[]}
      user={user}
      onClose={() => undefined}
    />
  );
}

describe("BookingDetailPopover", () => {
  it("shows only the squad badge for squad bookings owned by the current user", () => {
    renderPopover({
      id: "booking-1",
      date: "2026-03-11",
      resourceType: "boat",
      boatId: "boat-1",
      equipmentId: null,
      oarSetId: null,
      userId: "user-1",
      squadId: "squad-1",
      bookerName: "Bullsharks",
      crewCount: 9,
      startSlot: 6,
      endSlot: 7,
      startMinutes: 450,
      endMinutes: 480,
      isRaceSpecific: false,
      notes: null,
      squad: { id: "squad-1", name: "Bullsharks" },
    });

    expect(screen.getByText("Squad booking")).toBeInTheDocument();
    expect(screen.queryByText("Your booking")).not.toBeInTheDocument();
  });

  it("shows the owner badge for individual bookings", () => {
    renderPopover({
      id: "booking-2",
      date: "2026-03-11",
      resourceType: "boat",
      boatId: "boat-1",
      equipmentId: null,
      oarSetId: null,
      userId: "user-1",
      squadId: null,
      bookerName: "Test User",
      crewCount: 1,
      startSlot: 7,
      endSlot: 7,
      startMinutes: 600,
      endMinutes: 690,
      isRaceSpecific: false,
      notes: null,
      squad: null,
    });

    expect(screen.getByText("Your booking")).toBeInTheDocument();
    expect(screen.queryByText("Squad booking")).not.toBeInTheDocument();
  });
});
