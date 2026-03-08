import { describe, it, expect } from "vitest";
import { supportsSquadBooking, getBookingDisplayName } from "@/lib/booking-utils";

describe("supportsSquadBooking", () => {
  it("returns true for 8+", () => {
    expect(supportsSquadBooking("8+")).toBe(true);
  });

  it("returns true for 4x/4-/4+", () => {
    expect(supportsSquadBooking("4x/4-/4+")).toBe(true);
  });

  it("returns true for 4x/4-", () => {
    expect(supportsSquadBooking("4x/4-")).toBe(true);
  });

  it("returns false for 1x", () => {
    expect(supportsSquadBooking("1x")).toBe(false);
  });

  it("returns false for 2x", () => {
    expect(supportsSquadBooking("2x")).toBe(false);
  });

  it("returns false for 2-/x", () => {
    expect(supportsSquadBooking("2-/x")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(supportsSquadBooking(null)).toBe(false);
    expect(supportsSquadBooking(undefined)).toBe(false);
    expect(supportsSquadBooking("")).toBe(false);
  });
});

describe("getBookingDisplayName", () => {
  it("returns squad name when squad exists", () => {
    expect(
      getBookingDisplayName({
        bookerName: "John Doe",
        squad: { id: "1", name: "Avians" },
      })
    ).toBe("Avians");
  });

  it("returns bookerName when no squad", () => {
    expect(
      getBookingDisplayName({
        bookerName: "John Doe",
        squad: null,
      })
    ).toBe("John Doe");
  });
});
