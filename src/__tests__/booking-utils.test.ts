import { describe, it, expect } from "vitest";
import { supportsSquadBooking, getBookingDisplayName } from "@/lib/booking-utils";

describe("supportsSquadBooking", () => {
  it("returns true for eights", () => {
    expect(supportsSquadBooking("eight")).toBe(true);
  });

  it("returns true for fours", () => {
    expect(supportsSquadBooking("four")).toBe(true);
  });

  it("returns false for singles and pairs", () => {
    expect(supportsSquadBooking("single")).toBe(false);
    expect(supportsSquadBooking("pair")).toBe(false);
  });

  it("returns false for null and undefined", () => {
    expect(supportsSquadBooking(null)).toBe(false);
    expect(supportsSquadBooking(undefined)).toBe(false);
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
