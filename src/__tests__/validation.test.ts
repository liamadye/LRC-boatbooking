import { describe, it, expect } from "vitest";
import { validateBooking, isWeekend, getMaxCrew } from "@/lib/validation";

const baseInput = {
  crewCount: 1,
  startSlot: 1,
  endSlot: 1,
  userId: "user1",
  userRole: "member" as const,
  userMemberType: "recreational" as const,
  userHasBlackBoatEligibility: false,
  isWeekend: false,
};

describe("validateBooking", () => {
  it("returns no errors for a valid booking", () => {
    const errors = validateBooking({
      ...baseInput,
      boatType: "1x",
      boatClassification: "green",
      boatCategory: "club",
      boatStatus: "available",
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects booking on not-in-use boats", () => {
    const errors = validateBooking({
      ...baseInput,
      boatStatus: "not_in_use",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("boat");
    expect(errors[0].message).toContain("Not In Use");
  });

  it("rejects black boats without eligibility", () => {
    const errors = validateBooking({
      ...baseInput,
      boatClassification: "black",
      boatStatus: "available",
    });
    expect(errors.some((e) => e.message.includes("Black"))).toBe(true);
  });

  it("allows black boats for eligible users", () => {
    const errors = validateBooking({
      ...baseInput,
      boatClassification: "black",
      boatStatus: "available",
      userHasBlackBoatEligibility: true,
    });
    expect(errors.some((e) => e.message.includes("Black"))).toBe(false);
  });

  it("allows black boats for admin/captain roles", () => {
    const errors = validateBooking({
      ...baseInput,
      boatClassification: "black",
      boatStatus: "available",
      userRole: "admin",
    });
    expect(errors.some((e) => e.message.includes("Black"))).toBe(false);
  });

  it("rejects private boats for non-owners", () => {
    const errors = validateBooking({
      ...baseInput,
      boatCategory: "private",
      boatOwnerUserId: "other-user",
      boatStatus: "available",
    });
    expect(errors.some((e) => e.message.includes("Private"))).toBe(true);
  });

  it("allows private boats for owners", () => {
    const errors = validateBooking({
      ...baseInput,
      boatCategory: "private",
      boatOwnerUserId: "user1",
      boatStatus: "available",
    });
    expect(errors.some((e) => e.message.includes("Private"))).toBe(false);
  });

  it("rejects crew count exceeding max", () => {
    const errors = validateBooking({
      ...baseInput,
      boatType: "1x",
      crewCount: 5,
      boatStatus: "available",
    });
    expect(errors.some((e) => e.field === "crewCount")).toBe(true);
  });

  it("rejects crew count less than 1", () => {
    const errors = validateBooking({
      ...baseInput,
      boatType: "1x",
      crewCount: 0,
      boatStatus: "available",
    });
    expect(errors.some((e) => e.field === "crewCount")).toBe(true);
  });

  it("rejects end slot before start slot", () => {
    const errors = validateBooking({
      ...baseInput,
      startSlot: 5,
      endSlot: 3,
    });
    expect(errors.some((e) => e.field === "timeSlot")).toBe(true);
  });

  it("rejects slots out of range", () => {
    const errors = validateBooking({
      ...baseInput,
      startSlot: 0,
      endSlot: 10,
    });
    expect(errors.some((e) => e.message.includes("between 1 and 9"))).toBe(true);
  });

  it("rejects erg booking across multiple slots", () => {
    const errors = validateBooking({
      ...baseInput,
      equipmentType: "erg",
      startSlot: 1,
      endSlot: 3,
    });
    expect(errors.some((e) => e.message.includes("Ergs"))).toBe(true);
  });

  it("allows erg booking for single slot", () => {
    const errors = validateBooking({
      ...baseInput,
      equipmentType: "erg",
      startSlot: 1,
      endSlot: 1,
    });
    expect(errors.some((e) => e.message.includes("Ergs"))).toBe(false);
  });

  it("warns about consecutive day bookings without race-specific", () => {
    const errors = validateBooking({
      ...baseInput,
      existingBookingsOnConsecutiveDays: 1,
      isRaceSpecific: false,
    });
    expect(errors.some((e) => e.field === "consecutiveDay")).toBe(true);
  });

  it("allows consecutive day bookings with race-specific", () => {
    const errors = validateBooking({
      ...baseInput,
      existingBookingsOnConsecutiveDays: 1,
      isRaceSpecific: true,
    });
    expect(errors.some((e) => e.field === "consecutiveDay")).toBe(false);
  });
});

describe("isWeekend", () => {
  it("returns true for Saturday", () => {
    expect(isWeekend(new Date("2026-03-07"))).toBe(true); // Saturday
  });

  it("returns true for Sunday", () => {
    expect(isWeekend(new Date("2026-03-08"))).toBe(true); // Sunday
  });

  it("returns false for weekday", () => {
    expect(isWeekend(new Date("2026-03-09"))).toBe(false); // Monday
  });
});

describe("getMaxCrew", () => {
  it("returns correct crew for 8+", () => {
    expect(getMaxCrew("8+")).toBe(9);
  });

  it("returns correct crew for 1x", () => {
    expect(getMaxCrew("1x")).toBe(1);
  });

  it("returns correct crew for 4+", () => {
    expect(getMaxCrew("4+")).toBe(5);
  });

  it("defaults to 1 for unknown type", () => {
    expect(getMaxCrew("unknown")).toBe(1);
  });
});
