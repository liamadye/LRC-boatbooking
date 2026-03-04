/** Max crew for each boat type (rowers + cox if applicable) */
export const MAX_CREW: Record<string, number> = {
  "1x": 1,
  "2x": 2,
  "2-": 2,
  "2+": 3, // 2 rowers + cox
  "2-/x": 2,
  "4x": 4,
  "4-": 4,
  "4+": 5, // 4 rowers + cox
  "4x/4-": 4,
  "4x/4-/4+": 5,
  "4x+/4+": 5,
  "8+": 9, // 8 rowers + cox
  tinny: 1, // coach boat
};

/** Weight tolerance percentage (±10%) per Boat Usage Policy */
export const WEIGHT_TOLERANCE_PERCENT = 10;

/** Time slot definitions */
export const TIME_SLOTS = [
  { slot: 1, label: "5:00am", startMinutes: 300 },
  { slot: 2, label: "5:30am", startMinutes: 330 },
  { slot: 3, label: "6:00am", startMinutes: 360 },
  { slot: 4, label: "6:30am", startMinutes: 390 },
  { slot: 5, label: "7:00am", startMinutes: 420 },
  { slot: 6, label: "7:30am", startMinutes: 450 },
  { slot: 7, label: "8am-4:30pm", startMinutes: 480 },
  { slot: 8, label: "4:30-6pm", startMinutes: 990 },
  { slot: 9, label: "6:15pm+", startMinutes: 1095 },
] as const;

/**
 * Member type time restrictions from Boat Usage Policy:
 *
 * Senior competitive/students:
 *   Weekdays: collect by 5am, return by 7am
 *   Weekends: collect by 6am, return by 8am
 *
 * Recreationals:
 *   Weekdays: collect AFTER 5:45am, return by 7:30am (green boats only)
 *   Weekends: collect by 6am, return by 8am (green boats only)
 */
export const MEMBER_TIME_RESTRICTIONS = {
  senior_competitive: {
    weekday: { earliestSlot: 1, latestReturnSlot: 5 }, // 5am - 7am
    weekend: { earliestSlot: 3, latestReturnSlot: 6 }, // 6am - 8am
  },
  student: {
    weekday: { earliestSlot: 1, latestReturnSlot: 5 },
    weekend: { earliestSlot: 3, latestReturnSlot: 6 },
  },
  recreational: {
    weekday: { earliestSlot: 2, latestReturnSlot: 6 }, // after 5:45am - 7:30am (green only)
    weekend: { earliestSlot: 3, latestReturnSlot: 6 }, // 6am - 8am (green only)
  },
} as const;

/** Section display configuration matching XLS layout */
export const BOAT_SECTIONS: { label: string; types: string[]; color: string }[] = [
  { label: "Eights (8+)", types: ["8+"], color: "bg-gray-100" },
  { label: "Fours (4x/4-/4+)", types: ["4x/4-/4+", "4x/4-", "4x+/4+"], color: "bg-gray-100" },
  { label: "Pairs & Doubles (2-/x, 2x)", types: ["2-/x", "2x", "2-/x LWT"], color: "bg-gray-100" },
  { label: "Singles (1x)", types: ["1x"], color: "bg-gray-50" },
];

/** Color coding for UI sections */
export const SECTION_COLORS = {
  club: "bg-gray-100",
  oars: "bg-red-50",
  private: "bg-blue-50",
  tinny: "bg-slate-50",
  equipment: "bg-yellow-50",
} as const;
