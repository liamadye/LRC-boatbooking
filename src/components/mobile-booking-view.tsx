"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { TIME_SLOTS, MAX_CREW, BOAT_SECTIONS } from "@/lib/constants";
import { getBookingDisplayName } from "@/lib/booking-utils";
import { Circle, Lock, ChevronDown, ChevronRight, Filter, Loader2 } from "lucide-react";
import type {
  BoatWithRelations,
  EquipmentItem,
  OarSetItem,
  SerializedBooking,
  UserProfile,
} from "@/lib/types";

type MobileFilters = {
  boatType: "all" | "8+" | "4s" | "2s" | "1x";
  classification: "all" | "black" | "green";
  availability: "all" | "available";
};

const BOAT_TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "8+", label: "8+" },
  { value: "4s", label: "4s" },
  { value: "2s", label: "2s" },
  { value: "1x", label: "1x" },
] as const;

const BOAT_TYPE_MATCH: Record<string, string[]> = {
  "8+": ["8+"],
  "4s": ["4x/4-/4+", "4x/4-", "4x+/4+", "4x", "4-", "4+"],
  "2s": ["2-/x", "2x", "2-/x LWT", "2-", "2+"],
  "1x": ["1x"],
};

type Props = {
  boats: BoatWithRelations[];
  equipment: EquipmentItem[];
  oarSets: OarSetItem[];
  dayBookings: SerializedBooking[];
  selectedDate: string;
  user: UserProfile;
  boatMap: Map<string, BoatWithRelations>;
  equipMap: Map<string, EquipmentItem>;
  oarMap: Map<string, OarSetItem>;
  onBookingClick: (booking: SerializedBooking) => void;
  onSlotClick: (resourceType: "boat" | "equipment" | "oar_set", resourceId: string, resourceName: string, slot: number) => void;
};

export function MobileBookingView({
  boats,
  dayBookings,
  user,
  boatMap,
  equipMap,
  oarMap,
  onBookingClick,
  onSlotClick,
}: Props) {
  const [filters, setFilters] = useState<MobileFilters>({
    boatType: "all",
    classification: "all",
    availability: "all",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const activeFilterCount = [
    filters.boatType !== "all",
    filters.classification !== "all",
    filters.availability !== "all",
  ].filter(Boolean).length;

  const availableBoats = useMemo(
    () => boats.filter((b) => b.status === "available"),
    [boats]
  );

  function matchesTypeFilter(boatType: string) {
    if (filters.boatType === "all") return true;
    const types = BOAT_TYPE_MATCH[filters.boatType] ?? [];
    return types.includes(boatType);
  }

  function matchesClassFilter(boat: BoatWithRelations) {
    if (filters.classification === "all") return true;
    return boat.classification === filters.classification;
  }

  const slotBookings = useMemo(() => {
    const slots: Record<number, SerializedBooking[]> = {};
    for (const ts of TIME_SLOTS) {
      slots[ts.slot] = [];
    }
    for (const booking of dayBookings) {
      for (let slot = booking.startSlot; slot <= booking.endSlot; slot += 1) {
        slots[slot].push(booking);
      }
    }
    return slots;
  }, [dayBookings]);

  const availableBySlot = useMemo(() => {
    const slots: Record<number, BoatWithRelations[]> = {};
    for (const ts of TIME_SLOTS) {
      const bookedResourceIds = new Set(
        (slotBookings[ts.slot] ?? []).map(
          (booking) => booking.boatId ?? booking.equipmentId ?? booking.oarSetId
        )
      );
      slots[ts.slot] = availableBoats.filter(
        (boat) =>
          !bookedResourceIds.has(boat.id) &&
          matchesTypeFilter(boat.boatType) &&
          matchesClassFilter(boat)
      );
    }
    return slots;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableBoats, slotBookings, filters.boatType, filters.classification]);

  // Filter booked items too
  const filteredSlotBookings = useMemo(() => {
    if (filters.boatType === "all" && filters.classification === "all" && filters.availability === "all") {
      return slotBookings;
    }
    const filtered: Record<number, SerializedBooking[]> = {};
    for (const ts of TIME_SLOTS) {
      filtered[ts.slot] = (slotBookings[ts.slot] ?? []).filter((booking) => {
        if (filters.availability === "available") return false; // hide booked when "available" filter
        const boat = boatMap.get(booking.boatId ?? "");
        if (!boat) return true; // show non-boat bookings always
        if (!matchesTypeFilter(boat.boatType)) return false;
        if (!matchesClassFilter(boat)) return false;
        return true;
      });
    }
    return filtered;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotBookings, boatMap, filters.boatType, filters.classification, filters.availability]);

  // Group available boats by category
  function groupByCategory(boatList: BoatWithRelations[]) {
    const groups: { label: string; boats: BoatWithRelations[] }[] = [];
    for (const section of BOAT_SECTIONS) {
      const matching = boatList.filter((b) =>
        b.category === "club" && section.types.includes(b.boatType)
      );
      if (matching.length > 0) {
        groups.push({ label: section.label, boats: matching });
      }
    }
    // Other club boats not in any section
    const allSectionTypes = BOAT_SECTIONS.flatMap((s) => s.types);
    const other = boatList.filter(
      (b) => b.category === "club" && !allSectionTypes.includes(b.boatType)
    );
    if (other.length > 0) {
      groups.push({ label: "Other", boats: other });
    }
    // Private boats
    const privateBoats = boatList.filter((b) => b.category === "private");
    if (privateBoats.length > 0) {
      groups.push({ label: "Private Boats", boats: privateBoats });
    }
    // Tinnies
    const tinnies = boatList.filter((b) => b.category === "tinny");
    if (tinnies.length > 0) {
      groups.push({ label: "Coach Boats", boats: tinnies });
    }
    return groups;
  }

  function toggleCategory(key: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-3 md:hidden">
      {/* Filter toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
          activeFilterCount > 0 ? "bg-blue-50 border-blue-200" : "bg-white"
        )}
      >
        <span className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </span>
        {showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {showFilters && (
        <div className="rounded-lg border bg-white p-3 space-y-3">
          {/* Boat type pills */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Boat Type
            </label>
            <div className="flex gap-1.5 mt-1">
              {BOAT_TYPE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilters((prev) => ({ ...prev, boatType: f.value as MobileFilters["boatType"] }))}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    filters.boatType === f.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Classification + Availability */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Restriction
              </label>
              <select
                className="mt-1 w-full text-sm border rounded px-2 py-1.5"
                value={filters.classification}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    classification: e.target.value as MobileFilters["classification"],
                  }))
                }
              >
                <option value="all">All boats</option>
                <option value="green">Green (open)</option>
                <option value="black">Black (restricted)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Availability
              </label>
              <select
                className="mt-1 w-full text-sm border rounded px-2 py-1.5"
                value={filters.availability}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    availability: e.target.value as MobileFilters["availability"],
                  }))
                }
              >
                <option value="all">All</option>
                <option value="available">Available only</option>
              </select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={() =>
                setFilters({ boatType: "all", classification: "all", availability: "all" })
              }
              className="text-xs text-blue-600 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Time slots */}
      {TIME_SLOTS.map((ts) => {
        const bookingsForSlot = filteredSlotBookings[ts.slot] ?? [];
        const availableForSlot = availableBySlot[ts.slot] ?? [];
        const categoryGroups = groupByCategory(availableForSlot);

        if (filters.availability === "available" && availableForSlot.length === 0) {
          return null;
        }

        return (
          <div key={ts.slot} className="rounded-lg border bg-white overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 font-semibold text-sm border-b flex items-center justify-between">
              <span>{ts.label}</span>
              <div className="flex items-center gap-2">
                {bookingsForSlot.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    {bookingsForSlot.length} booked
                  </span>
                )}
                {availableForSlot.length > 0 && (
                  <span className="text-xs text-green-600 font-normal">
                    {availableForSlot.length} free
                  </span>
                )}
              </div>
            </div>

            {/* Booked items */}
            {bookingsForSlot.length > 0 && (
              <div className="divide-y">
                {bookingsForSlot.map((booking) => {
                  const boat = boatMap.get(booking.boatId ?? "");
                  const equip = equipMap.get(booking.equipmentId ?? "");
                  const oar = oarMap.get(booking.oarSetId ?? "");
                  const resourceName = boat?.name ?? (equip ? `${equip.type} ${equip.number}` : oar?.name ?? "Unknown");
                  const isOwn = booking.userId === user.id;
                  const isPending = booking.clientStatus === "pending";

                  return (
                    <button
                      key={booking.id}
                      className={cn(
                        "w-full px-3 py-2.5 text-left text-sm flex items-center justify-between active:bg-gray-100",
                        isPending
                          ? "bg-amber-50"
                          : isOwn
                            ? "bg-blue-50"
                            : "bg-gray-50/50"
                      )}
                      onClick={() => {
                        if (!isPending) {
                          onBookingClick(booking);
                        }
                      }}
                      disabled={isPending}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isPending && (
                          <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin text-amber-700" />
                        )}
                        {boat && (
                          <span className="flex-shrink-0">
                            {boat.classification === "black" ? (
                              <Circle className="h-3 w-3 fill-gray-800 text-gray-800" />
                            ) : (
                              <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                            )}
                          </span>
                        )}
                        <span className="font-medium truncate">{resourceName}</span>
                        {boat && (
                          <span className="text-muted-foreground text-xs flex-shrink-0">{boat.boatType}</span>
                        )}
                      </div>
                      <div className={cn(
                        "text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2",
                        isPending
                          ? "bg-amber-200 text-amber-900"
                          : isOwn
                            ? "bg-blue-200 text-blue-800"
                            : "bg-gray-200 text-gray-700"
                      )}>
                        {getBookingDisplayName(booking)} ({booking.crewCount})
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Available boats grouped by category */}
            {categoryGroups.length > 0 && (
              <div className="border-t">
                {categoryGroups.map((group) => {
                  const categoryKey = `${ts.slot}:${group.label}`;
                  const isCollapsed = collapsedCategories.has(categoryKey);

                  return (
                    <div key={group.label}>
                      <button
                        onClick={() => toggleCategory(categoryKey)}
                        className="w-full px-3 py-1.5 text-left flex items-center justify-between bg-green-50/50 hover:bg-green-50 transition-colors border-t first:border-t-0"
                      >
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {group.label} ({group.boats.length})
                        </span>
                        {isCollapsed ? (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                      {!isCollapsed && (
                        <div className="divide-y">
                          {group.boats.map((boat) => (
                            <button
                              key={boat.id}
                              className="w-full px-3 py-2.5 text-left text-sm flex items-center justify-between active:bg-blue-50 transition-colors"
                              onClick={() => onSlotClick("boat", boat.id, boat.name, ts.slot)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {boat.classification === "black" ? (
                                  <Circle className="h-3 w-3 fill-gray-800 text-gray-800" />
                                ) : boat.category === "private" ? (
                                  <Lock className="h-3 w-3 text-blue-500" />
                                ) : (
                                  <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                                )}
                                <span className="font-medium truncate">{boat.name}</span>
                                <span className="text-muted-foreground text-xs flex-shrink-0">{boat.boatType}</span>
                              </div>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {MAX_CREW[boat.boatType] ?? 1} crew
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {bookingsForSlot.length === 0 && availableForSlot.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No boats available
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
