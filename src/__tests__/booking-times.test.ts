import { describe, expect, it } from "vitest";
import {
  bookingsOverlap,
  formatBookingWindow,
  getDaytimeOptionForMinutes,
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

  it("formats the precise booking window", () => {
    expect(
      formatBookingWindow({ startSlot: 7, endSlot: 7, startMinutes: 510, endMinutes: 600 })
    ).toBe("8:30am – 10am");
  });
});
