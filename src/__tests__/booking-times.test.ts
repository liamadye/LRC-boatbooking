import { describe, expect, it } from "vitest";
import {
  bookingsOverlap,
  formatBookingWindow,
  getDefaultBookingRange,
  getDaytimeOptionForMinutes,
  getSuggestedDaytimeBookingRange,
  parseDaytimeTime,
} from "@/lib/booking-times";

describe("booking-times", () => {
  it("parses daytime labels into minutes", () => {
    expect(parseDaytimeTime("8:30am")).toBe(510);
    expect(parseDaytimeTime("4:30pm")).toBe(990);
  });

  it("maps stored minutes back to daytime labels", () => {
    expect(getDaytimeOptionForMinutes(510)).toBe("8:30am");
    expect(getDaytimeOptionForMinutes(990)).toBe("4:30pm");
  });

  it("detects overlapping daytime bookings within slot 7", () => {
    expect(
      bookingsOverlap(
        { startSlot: 7, endSlot: 7, startMinutes: 510, endMinutes: 600 },
        { startSlot: 7, endSlot: 7, startMinutes: 570, endMinutes: 660 }
      )
    ).toBe(true);
  });

  it("allows adjacent daytime bookings within slot 7", () => {
    expect(
      bookingsOverlap(
        { startSlot: 7, endSlot: 7, startMinutes: 510, endMinutes: 600 },
        { startSlot: 7, endSlot: 7, startMinutes: 600, endMinutes: 690 }
      )
    ).toBe(false);
  });

  it("allows an early-slot booking to end at the point a daytime booking begins", () => {
    expect(
      bookingsOverlap(
        { startSlot: 5, endSlot: 7, startMinutes: 420, endMinutes: 510 },
        { startSlot: 7, endSlot: 7, startMinutes: 510, endMinutes: 600 }
      )
    ).toBe(false);
  });

  it("formats the precise booking window", () => {
    expect(
      formatBookingWindow({ startSlot: 7, endSlot: 7, startMinutes: 510, endMinutes: 600 })
    ).toBe("8:30am – 10am");
  });

  it("defaults slot 7 bookings to 90 minutes", () => {
    expect(getDefaultBookingRange(7)).toEqual({
      endSlot: 7,
      startMinutes: 480,
      endMinutes: 570,
    });
  });

  it("defaults early morning bookings to 90 minutes even when they run into slot 7", () => {
    expect(getDefaultBookingRange(5)).toEqual({
      endSlot: 7,
      startMinutes: 420,
      endMinutes: 510,
    });
  });

  it("suggests the next daytime range immediately after the latest existing booking", () => {
    expect(
      getSuggestedDaytimeBookingRange([
        { startSlot: 7, endSlot: 7, startMinutes: 570, endMinutes: 630 },
      ])
    ).toEqual({
      startMinutes: 630,
      endMinutes: 720,
    });
  });

  it("returns null when the daytime slot is already full", () => {
    expect(
      getSuggestedDaytimeBookingRange([
        { startSlot: 7, endSlot: 7, startMinutes: 480, endMinutes: 990 },
      ])
    ).toBeNull();
  });
});
