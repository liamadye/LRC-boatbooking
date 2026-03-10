import { DAYTIME_TIMES, TIME_SLOTS } from "@/lib/constants";

type BookingTimeLike = {
  startSlot: number;
  endSlot: number;
  startMinutes?: number | null;
  endMinutes?: number | null;
};

const daytimeTimeSet = new Set<string>(DAYTIME_TIMES);

function getSlotRange(slot: number) {
  return TIME_SLOTS.find((entry) => entry.slot === slot) ?? null;
}

export function getDefaultStartMinutes(slot: number) {
  return getSlotRange(slot)?.startMinutes ?? 0;
}

export function getDefaultEndMinutes(slot: number) {
  return getSlotRange(slot)?.endMinutes ?? 0;
}

export function getDefaultBookingRange(slot: number) {
  const slotRange = getSlotRange(slot);
  if (!slotRange) {
    return { endSlot: slot, startMinutes: 0, endMinutes: 0 };
  }

  const startMinutes = slotRange.startMinutes;
  const preferredEndMinutes = startMinutes + 90;
  const matchingEndSlot =
    TIME_SLOTS.find((entry) => preferredEndMinutes <= entry.endMinutes) ??
    TIME_SLOTS[TIME_SLOTS.length - 1];

  return {
    endSlot: matchingEndSlot.slot,
    startMinutes,
    endMinutes: Math.min(preferredEndMinutes, matchingEndSlot.endMinutes),
  };
}

export function normalizeBookingMinutes(args: BookingTimeLike) {
  return {
    startMinutes: args.startMinutes ?? getDefaultStartMinutes(args.startSlot),
    endMinutes: args.endMinutes ?? getDefaultEndMinutes(args.endSlot),
  };
}

export function bookingsOverlap(a: BookingTimeLike, b: BookingTimeLike) {
  const left = normalizeBookingMinutes(a);
  const right = normalizeBookingMinutes(b);
  return left.startMinutes < right.endMinutes && right.startMinutes < left.endMinutes;
}

export function formatMinutes(minutes: number) {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours24 >= 12 ? "pm" : "am";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutePart = mins === 0 ? "" : `:${mins.toString().padStart(2, "0")}`;
  return `${hours12}${minutePart}${suffix}`;
}

export function formatBookingWindow(args: BookingTimeLike) {
  const { startMinutes, endMinutes } = normalizeBookingMinutes(args);
  return `${formatMinutes(startMinutes)} – ${formatMinutes(endMinutes)}`;
}

export function parseDaytimeTime(value: string) {
  if (!daytimeTimeSet.has(value)) {
    return null;
  }

  const match = value.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/i);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const suffix = match[3].toLowerCase();

  let normalizedHours = hours % 12;
  if (suffix === "pm") {
    normalizedHours += 12;
  }

  return normalizedHours * 60 + minutes;
}

export function getDaytimeOptionForMinutes(minutes: number | null | undefined) {
  if (minutes == null) {
    return "";
  }

  return DAYTIME_TIMES.find((value) => parseDaytimeTime(value) === minutes) ?? "";
}
