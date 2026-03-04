/** Types used across the booking UI */

export type BoatWithRelations = {
  id: string;
  name: string;
  boatType: string;
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

export type BookingSlot = {
  id: string;
  bookerName: string;
  crewCount: number;
  startSlot: number;
  endSlot: number;
  userId: string;
  isRaceSpecific: boolean;
  notes: string | null;
};

export type DayBookings = {
  boats: Record<string, BookingSlot[]>;       // boatId -> bookings
  equipment: Record<string, BookingSlot[]>;   // equipmentId -> bookings
  oarSets: Record<string, BookingSlot[]>;     // oarSetId -> bookings
};

export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "captain" | "vice_captain" | "squad_captain" | "member";
  memberType: "senior_competitive" | "student" | "recreational";
  weightKg: number | null;
  hasBlackBoatEligibility: boolean;
  squads: { id: string; name: string }[];
};
