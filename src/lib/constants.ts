/** 30-minute increment times for the 8am–4:30pm daytime slot */
export const DAYTIME_TIMES = [
  "8:00am", "8:30am", "9:00am", "9:30am", "10:00am", "10:30am",
  "11:00am", "11:30am", "12:00pm", "12:30pm", "1:00pm", "1:30pm",
  "2:00pm", "2:30pm", "3:00pm", "3:30pm", "4:00pm", "4:30pm",
] as const;

/** Weight tolerance percentage (±10%) per Boat Usage Policy */
export const WEIGHT_TOLERANCE_PERCENT = 10;

/** Time slot definitions */
export const TIME_SLOTS = [
  { slot: 1, label: "5:00am", startMinutes: 300, endMinutes: 330 },
  { slot: 2, label: "5:30am", startMinutes: 330, endMinutes: 360 },
  { slot: 3, label: "6:00am", startMinutes: 360, endMinutes: 390 },
  { slot: 4, label: "6:30am", startMinutes: 390, endMinutes: 420 },
  { slot: 5, label: "7:00am", startMinutes: 420, endMinutes: 450 },
  { slot: 6, label: "7:30am", startMinutes: 450, endMinutes: 480 },
  { slot: 7, label: "8am-4:30pm", startMinutes: 480, endMinutes: 990 },
  { slot: 8, label: "4:30-6pm", startMinutes: 990, endMinutes: 1080 },
  { slot: 9, label: "6:15pm+", startMinutes: 1095, endMinutes: 1260 },
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
    weekday: { earliestSlot: 1, latestReturnSlot: 5 },
    weekend: { earliestSlot: 3, latestReturnSlot: 6 },
  },
  student: {
    weekday: { earliestSlot: 1, latestReturnSlot: 5 },
    weekend: { earliestSlot: 3, latestReturnSlot: 6 },
  },
  recreational: {
    weekday: { earliestSlot: 2, latestReturnSlot: 6 },
    weekend: { earliestSlot: 1, latestReturnSlot: 6 },
  },
} as const;

/** Color coding for UI sections */
export const SECTION_COLORS = {
  club: "bg-gray-100",
  oars: "bg-red-50",
  private: "bg-blue-50",
  tinny: "bg-slate-50",
  equipment: "bg-yellow-50",
} as const;
