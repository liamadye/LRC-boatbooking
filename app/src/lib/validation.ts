import { MAX_CREW, WEIGHT_TOLERANCE_PERCENT, MEMBER_TIME_RESTRICTIONS } from "./constants";

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
  isOutside?: boolean;
  crewCount: number;
  crewAvgWeightKg?: number | null;
  startSlot: number;
  endSlot: number;
  userId: string;
  userMemberType: "senior_competitive" | "student" | "recreational";
  userHasBlackBoatEligibility: boolean;
  isWeekend: boolean;
  isRaceSpecific?: boolean;
  equipmentType?: "erg" | "bike" | "gym";
  existingBookingsOnConsecutiveDays?: number;
};

/**
 * Validates a booking against all LRC Boat Usage Policy rules.
 * Returns an array of validation errors (empty = valid).
 */
export function validateBooking(input: BookingInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Boat status check — "Not In Use" boats cannot be booked
  if (input.boatStatus === "not_in_use") {
    errors.push({
      field: "boat",
      message: "This boat is marked as Not In Use and cannot be booked.",
    });
    return errors; // No point checking further
  }

  // 2. Classification check — Black boats require eligibility
  if (input.boatClassification === "black" && !input.userHasBlackBoatEligibility) {
    errors.push({
      field: "boat",
      message:
        "This is a Black (restricted) boat. You must have Black Boat eligibility approved by the Captain or Committee.",
    });
  }

  // 3. Recreational members can only use Green boats
  if (
    input.userMemberType === "recreational" &&
    input.boatClassification === "black"
  ) {
    errors.push({
      field: "boat",
      message: "Recreational members can only book Green (training) boats.",
    });
  }

  // 4. Private boat check — must be owner
  if (input.boatCategory === "private" && input.boatOwnerUserId !== input.userId) {
    errors.push({
      field: "boat",
      message:
        "Private boats are for exclusive use by the owner or by arrangement with the owner.",
    });
  }

  // 5. Crew count check
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

  // 6. Weight check — crew average within ±10% of boat weight
  if (input.boatAvgWeightKg && input.crewAvgWeightKg) {
    const tolerance = input.boatAvgWeightKg * (WEIGHT_TOLERANCE_PERCENT / 100);
    const minWeight = input.boatAvgWeightKg - tolerance;
    const maxWeight = input.boatAvgWeightKg + tolerance;

    if (input.crewAvgWeightKg < minWeight || input.crewAvgWeightKg > maxWeight) {
      errors.push({
        field: "weight",
        message: `Crew average weight (${input.crewAvgWeightKg}kg) should be within ±10% of the boat weight (${input.boatAvgWeightKg}kg). Acceptable range: ${minWeight.toFixed(1)}kg – ${maxWeight.toFixed(1)}kg.`,
      });
    }
  }

  // 7. Member type time restrictions
  if (input.userMemberType && input.startSlot) {
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

  // 8. Slot range validation
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

  // 9. Erg single-slot restriction
  if (input.equipmentType === "erg" && input.startSlot !== input.endSlot) {
    errors.push({
      field: "timeSlot",
      message: "Ergs can only be booked for one time slot.",
    });
  }

  // 10. Consecutive day warning (soft validation — returns warning, not blocking unless !raceSpecific)
  if (
    input.existingBookingsOnConsecutiveDays &&
    input.existingBookingsOnConsecutiveDays > 0 &&
    !input.isRaceSpecific
  ) {
    errors.push({
      field: "consecutiveDay",
      message:
        "This boat is already booked on a consecutive day. Consecutive-day bookings require race-specific justification (training days + target regattas).",
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
