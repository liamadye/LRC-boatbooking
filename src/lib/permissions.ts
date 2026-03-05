/**
 * Centralised permissions module for LRC Boat Booking Portal.
 *
 * Defines which roles can perform which actions, and provides
 * a `can(user, action)` helper used across API routes.
 */

export type UserRole = "admin" | "captain" | "vice_captain" | "squad_captain" | "member";

export type Action =
  | "manage_boats"       // toggle status, classification
  | "manage_users"       // change role, memberType, grant Black eligibility
  | "manage_bookings"    // cancel/edit any booking
  | "review_applications" // approve/deny Black boat applications
  | "send_invites"       // invite new members
  | "view_admin"         // access admin panel
  | "book"               // create bookings
  | "cancel_own_booking" // cancel own booking
  | "view_bookings";     // view the booking grid

const ADMIN_ROLES: UserRole[] = ["admin", "captain", "vice_captain"];

const ROLE_PERMISSIONS: Record<Action, UserRole[]> = {
  manage_boats: ADMIN_ROLES,
  manage_users: ADMIN_ROLES,
  manage_bookings: ADMIN_ROLES,
  review_applications: ADMIN_ROLES,
  send_invites: ADMIN_ROLES,
  view_admin: ADMIN_ROLES,
  book: ["admin", "captain", "vice_captain", "squad_captain", "member"],
  cancel_own_booking: ["admin", "captain", "vice_captain", "squad_captain", "member"],
  view_bookings: ["admin", "captain", "vice_captain", "squad_captain", "member"],
};

export function can(userRole: string, action: Action): boolean {
  const allowed = ROLE_PERMISSIONS[action];
  return allowed.includes(userRole as UserRole);
}

export function isAdmin(role: string): boolean {
  return ADMIN_ROLES.includes(role as UserRole);
}
