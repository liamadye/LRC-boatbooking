import { MAX_CREW, MEMBER_TIME_RESTRICTIONS } from "./constants";

export type ValidationError = {
  field: string;
  message: string;
};

type BookingInput = {
  boatType?: string;
  boatClassification?: "black" | "green";
  boatCategory?: "club" | "private" | "syndicate" | "tinny";
  boatStatus?: "available" | "not_in_use";
  boatAvgWeightKg?: number | null;
  boatOwnerUserId?: string | null;
  privateBoatAccessUserIds?: string[];
  isOutside?: boolean;
  crewCount: number;
  crewAvgWeightKg?: number | null;
  startSlot: number;
  endSlot: number;
  userId: string;
  userRole: "admin" | "captain" | "vice_captain" | "squad_captain" | "member";
  userMemberType: "senior_competitive" | "student" | "recreational";
  userHasBlackBoatEligibility: boolean;
  isWeekend: boolean;
  isRaceSpecific?: boolean;
  equipmentType?: "erg" | "bike" | "gym";
};

/**
 * Validates a booking against all LRC Boat Usage Policy rules.
 * Returns an array of validation errors (empty = valid).
 */
export function validateBooking(input: BookingInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const isPrivilegedRole =
    input.userRole === "admin" ||
    input.userRole === "captain" ||
    input.userRole === "vice_captain";
  const enforceMemberTypeRules = false;

  // 1. Boat status check — "Not In Use" boats cannot be booked
  if (input.boatStatus === "not_in_use") {
    errors.push({
      field: "boat",
      message: "This boat is marked as Not In Use and cannot be booked.",
    });
    return errors; // No point checking further
  }

  // 2. Classification check — Black boats require eligibility unless user has elevated role
  if (
    input.boatClassification === "black" &&
    !input.userHasBlackBoatEligibility &&
    !isPrivilegedRole
  ) {
    errors.push({
      field: "boat",
      message:
        "This is a Black (restricted) boat. You must have Black Boat eligibility approved by the Captain or Committee.",
    });
  }

  // 3. Private boat check — must be owner or have explicit access
  if (input.boatCategory === "private" || input.boatCategory === "syndicate") {
    const isOwner = input.boatOwnerUserId === input.userId;
    const hasAccess = input.privateBoatAccessUserIds?.includes(input.userId) ?? false;
    if (!isOwner && !hasAccess && !isPrivilegedRole) {
      errors.push({
        field: "boat",
        message:
          "Private boats are for exclusive use by the owner or approved users. Contact the boat owner or admin for access.",
      });
    }
  }

  // 4. Crew count check
  if (input.boatType) {
    const maxCrew = MAX_CREW[input.boatType];
    if (maxCrew && input.crewCount > maxCrew) {
      errors.push({
        field: "crewCount",
        message: `Maximum crew for a ${input.boatType} is ${maxCrew}. You entered ${input.crewCount}.`,
      });
    }
    if (input.crewCount < 1) {
      errors.push({
        field: "crewCount",
        message: "Crew count must be at least 1.",
      });
    }
  }

  // 5. Weight check — disabled per club feedback
  // Weight validation is informational only; not enforced at booking time.

  // 6. Member type time restrictions (temporarily disabled)
  if (enforceMemberTypeRules && input.userMemberType && input.startSlot) {
    const restrictions =
      MEMBER_TIME_RESTRICTIONS[input.userMemberType];
    const timeRule = input.isWeekend
      ? restrictions.weekend
      : restrictions.weekday;

    if (input.startSlot < timeRule.earliestSlot) {
      errors.push({
        field: "timeSlot",
        message: `${input.userMemberType.replace("_", " ")} members cannot book before slot ${timeRule.earliestSlot} on ${input.isWeekend ? "weekends" : "weekdays"}.`,
      });
    }
  }

  // 7. Slot range validation
  if (input.startSlot > input.endSlot) {
    errors.push({
      field: "timeSlot",
      message: "End slot must be equal to or after start slot.",
    });
  }

  if (input.startSlot < 1 || input.startSlot > 9 || input.endSlot < 1 || input.endSlot > 9) {
    errors.push({
      field: "timeSlot",
      message: "Time slots must be between 1 and 9.",
    });
  }

  // 8. Erg single-slot restriction
  if (input.equipmentType === "erg" && input.startSlot !== input.endSlot) {
    errors.push({
      field: "timeSlot",
      message: "Ergs can only be booked for one time slot.",
    });
  }

  return errors;
}

/**
 * Check if a given date falls on a weekend (Saturday or Sunday).
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Calculate the crew count limit for a boat type.
 */
export function getMaxCrew(boatType: string): number {
  return MAX_CREW[boatType] ?? 1;
}
