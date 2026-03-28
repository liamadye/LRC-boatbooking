/** Types used across the booking UI */

import type { BoatClass } from "@/lib/boats";

export type BoatWithRelations = {
  id: string;
  name: string;
  boatClass: BoatClass;
  supportsSweep: boolean;
  supportsScull: boolean;
  isCoxed: boolean;
  boatTypeLabel: string;
  category: "club" | "private" | "syndicate" | "tinny";
  classification: "black" | "green";
  status: "available" | "not_in_use";
  avgWeightKg: number | null;
  isOutside: boolean;
  responsibleSquadId: string | null;
  responsiblePerson: string | null;
  ownerUserId: string | null;
  displayOrder: number;
  notes: string | null;
  responsibleSquad?: { id: string; name: string } | null;
  privateBoatAccessUserIds?: string[];
};

export type EquipmentItem = {
  id: string;
  type: "erg" | "bike" | "gym";
  number: number;
};

export type OarSetItem = {
  id: string;
  name: string;
};

export type SquadSummary = {
  id: string;
  name: string;
};

export type BookingSlot = {
  id: string;
  bookerName: string;
  crewCount: number;
  startSlot: number;
  endSlot: number;
  startMinutes: number;
  endMinutes: number;
  userId: string;
  isRaceSpecific: boolean;
  notes: string | null;
};

export type DayBookings = {
  boats: Record<string, BookingSlot[]>;
  equipment: Record<string, BookingSlot[]>;
  oarSets: Record<string, BookingSlot[]>;
};

export type SerializedBooking = {
  id: string;
  date: string;
  resourceType: string;
  boatId: string | null;
  equipmentId: string | null;
  oarSetId: string | null;
  userId: string;
  squadId: string | null;
  bookerName: string;
  crewCount: number;
  startSlot: number;
  endSlot: number;
  startMinutes: number;
  endMinutes: number;
  isRaceSpecific: boolean;
  raceDetails?: string | null;
  notes: string | null;
  squad: SquadSummary | null;
  clientStatus?: "pending";
};

export type BookingWeekSummary = {
  weekStart: string;
  opensAt: string;
  closesAt: string | null;
  pymbleNotes: string | null;
};

export type BookingWeekPayload = {
  bookings: SerializedBooking[];
  bookingWeek: BookingWeekSummary | null;
  weekStart: string;
};

export type InvitationSummary = {
  id: string;
  email: string;
  token: string;
  role: string;
  memberType: string;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
  inviter: { fullName: string };
  squads: SquadSummary[];
};

export type SignupRequestSummary = {
  id: string;
  email: string;
  fullName: string | null;
  provider: "google";
  status: "pending" | "approved" | "denied";
  createdAt: string;
  reviewedAt: string | null;
  reviewer: { fullName: string } | null;
};

export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "captain" | "vice_captain" | "squad_captain" | "member";
  memberType: "senior_competitive" | "student" | "recreational";
  weightKg: number | null;
  hasBlackBoatEligibility: boolean;
  squads: SquadSummary[];
};

export type ReferenceData = {
  boats: BoatWithRelations[];
  equipment: EquipmentItem[];
  oarSets: OarSetItem[];
  squads: SquadSummary[];
  fetchedAt: string;
};
