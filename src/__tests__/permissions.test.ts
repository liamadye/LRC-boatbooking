import { describe, it, expect } from "vitest";
import { can, isAdmin } from "@/lib/permissions";

describe("can", () => {
  it("allows admin to manage boats", () => {
    expect(can("admin", "manage_boats")).toBe(true);
  });

  it("allows captain to manage boats", () => {
    expect(can("captain", "manage_boats")).toBe(true);
  });

  it("allows vice_captain to manage boats", () => {
    expect(can("vice_captain", "manage_boats")).toBe(true);
  });

  it("denies squad_captain from managing boats", () => {
    expect(can("squad_captain", "manage_boats")).toBe(false);
  });

  it("denies member from managing boats", () => {
    expect(can("member", "manage_boats")).toBe(false);
  });

  it("allows member to book", () => {
    expect(can("member", "book")).toBe(true);
  });

  it("allows squad_captain to book", () => {
    expect(can("squad_captain", "book")).toBe(true);
  });

  it("allows all roles to view bookings", () => {
    for (const role of ["admin", "captain", "vice_captain", "squad_captain", "member"]) {
      expect(can(role, "view_bookings")).toBe(true);
    }
  });

  it("allows all roles to cancel own booking", () => {
    for (const role of ["admin", "captain", "vice_captain", "squad_captain", "member"]) {
      expect(can(role, "cancel_own_booking")).toBe(true);
    }
  });

  it("denies member from sending invites", () => {
    expect(can("member", "send_invites")).toBe(false);
  });

  it("allows admin to send invites", () => {
    expect(can("admin", "send_invites")).toBe(true);
  });
});

describe("isAdmin", () => {
  it("returns true for admin", () => {
    expect(isAdmin("admin")).toBe(true);
  });

  it("returns true for captain", () => {
    expect(isAdmin("captain")).toBe(true);
  });

  it("returns true for vice_captain", () => {
    expect(isAdmin("vice_captain")).toBe(true);
  });

  it("returns false for squad_captain", () => {
    expect(isAdmin("squad_captain")).toBe(false);
  });

  it("returns false for member", () => {
    expect(isAdmin("member")).toBe(false);
  });
});
