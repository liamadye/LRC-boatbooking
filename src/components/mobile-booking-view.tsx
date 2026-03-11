"use client";

import { Fragment, useMemo, useState } from "react";
import {
  formatBookingWindow,
  getSuggestedDaytimeBookingRange,
} from "@/lib/booking-times";
import { cn } from "@/lib/utils";
import { TIME_SLOTS, BOAT_SECTIONS } from "@/lib/constants";
import { getBookingDisplayName } from "@/lib/booking-utils";
import { Circle, Lock, Filter, ChevronDown, ChevronRight, Ban, Loader2 } from "lucide-react";
import type {
  BoatWithRelations,
  EquipmentItem,
  OarSetItem,
  SerializedBooking,
  UserProfile,
} from "@/lib/types";

type TabType = "shells" | "tinnies" | "oars" | "gym";

type MobileFilters = {
  boatType: "all" | "8+" | "4s" | "2s" | "1x";
  classification: "all" | "black" | "green";
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
  tab: TabType;
  boats: BoatWithRelations[];
  equipment: EquipmentItem[];
  oarSets: OarSetItem[];
  user: UserProfile;
  getBookings: (resourceId: string, slot: number) => SerializedBooking[];
  onBookingClick: (booking: SerializedBooking) => void;
  onSlotClick: (
    resourceType: "boat" | "equipment" | "oar_set",
    resourceId: string,
    resourceName: string,
    slot: number,
    options?: {
      initialEndSlot?: number;
      initialStartMinutes?: number;
      initialEndMinutes?: number;
    }
  ) => void;
  onBoatInfoClick: (boat: BoatWithRelations) => void;
};

const SECTION_HEADER_STICKY_TOP = 41;

export function MobileBookingView({
  tab,
  boats,
  equipment,
  oarSets,
  user,
  getBookings,
  onBookingClick,
  onSlotClick,
  onBoatInfoClick,
}: Props) {
  const [filters, setFilters] = useState<MobileFilters>({
    boatType: "all",
    classification: "all",
  });
  const [showFilters, setShowFilters] = useState(false);

  const showFilterBar = tab === "shells";

  const activeFilterCount = showFilterBar ? [
    filters.boatType !== "all",
    filters.classification !== "all",
  ].filter(Boolean).length : 0;

  // Build resource rows based on tab
  type ResourceRow = {
    id: string;
    name: string;
    resourceType: "boat" | "equipment" | "oar_set";
    boatType?: string;
    classification?: string;
    category?: string;
    status?: string;
    isOutside?: boolean;
    subtitle?: string;
    sectionLabel?: string;
  };

  const resourceRows = useMemo((): ResourceRow[] => {
    if (tab === "shells") {
      // Group by section like desktop
      const rows: ResourceRow[] = [];
      const clubBoats = boats.filter((b) => b.category === "club");
      for (const section of BOAT_SECTIONS) {
        const sectionBoats = clubBoats.filter((b) => section.types.includes(b.boatType));
        rows.push(...sectionBoats.map((b) => ({
          id: b.id,
          name: b.name,
          resourceType: "boat" as const,
          boatType: b.boatType,
          classification: b.classification,
          category: b.category,
          status: b.status,
          isOutside: b.isOutside,
          sectionLabel: section.label,
        })));
      }
      const privateBoats = boats.filter(
        (b) => b.category === "private" || b.category === "syndicate"
      );
      rows.push(...privateBoats.map((b) => ({
        id: b.id,
        name: b.name,
        resourceType: "boat" as const,
        boatType: b.boatType,
        classification: b.classification,
        category: b.category,
        status: b.status,
        isOutside: b.isOutside,
        sectionLabel: "Private & Syndicate Boats",
      })));
      return rows;
    }
    if (tab === "tinnies") {
      return boats.map((b) => ({
        id: b.id,
        name: b.name,
        resourceType: "boat" as const,
        boatType: b.boatType,
        category: b.category,
        status: b.status,
      }));
    }
    if (tab === "oars") {
      return oarSets.map((os) => ({
        id: os.id,
        name: os.name,
        resourceType: "oar_set" as const,
      }));
    }
    // gym
    const ergs = equipment.filter((e) => e.type === "erg").map((e) => ({
      id: e.id,
      name: `Erg ${e.number}`,
      resourceType: "equipment" as const,
      subtitle: "ONE SLOT ONLY",
    }));
    const bikes = equipment.filter((e) => e.type === "bike").map((e) => ({
      id: e.id,
      name: `Bike ${e.number}`,
      resourceType: "equipment" as const,
    }));
    const gyms = equipment.filter((e) => e.type === "gym").map((e) => ({
      id: e.id,
      name: `Gym ${e.number}`,
      resourceType: "equipment" as const,
    }));
    return [...ergs, ...bikes, ...gyms];
  }, [tab, boats, equipment, oarSets]);

  // Apply filters (shells tab only)
  const filteredRows = useMemo(() => {
    if (!showFilterBar) return resourceRows;
    return resourceRows.filter((row) => {
      if (filters.boatType !== "all") {
        const types = BOAT_TYPE_MATCH[filters.boatType] ?? [];
        if (!row.boatType || !types.includes(row.boatType)) return false;
      }
      if (filters.classification !== "all") {
        if (row.classification !== filters.classification) return false;
      }
      return true;
    });
  }, [resourceRows, filters, showFilterBar]);

  return (
    <div className="space-y-4 md:hidden">
      {/* Filter bar (shells tab only) */}
      {showFilterBar && (
        <>
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-label={`Toggle filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm min-h-[44px]",
              activeFilterCount > 0 ? "bg-blue-50 border-blue-200" : "bg-white"
            )}
          >
            <span className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </span>
            {showFilters ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>

          {showFilters && (
            <div className="rounded-lg border bg-white p-3 space-y-3">
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
                        "px-3 py-2 rounded-full text-sm font-medium border transition-colors min-h-[44px]",
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

              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Classification
                </label>
                <select
                  className="mt-1 w-full text-base border rounded px-2 py-2 min-h-[44px]"
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

              {activeFilterCount > 0 && (
                <button
                  onClick={() =>
                    setFilters({ boatType: "all", classification: "all" })
                  }
                  className="text-xs text-blue-600 underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Horizontal scroll grid — same layout as desktop */}
      <div className="overflow-auto rounded-lg border bg-white max-h-[calc(100dvh-320px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-20">
            <tr className="border-b bg-gray-50">
              <th scope="col" className="sticky left-0 z-30 bg-gray-50 px-3 py-2 text-left font-medium min-w-[140px]">
                {tab === "shells" ? "Boat" : tab === "tinnies" ? "Tinny" : tab === "oars" ? "Oar Set" : "Equipment"}
              </th>
              {TIME_SLOTS.map((ts) => (
                <th
                  scope="col"
                  key={ts.slot}
                  className="bg-gray-50 px-1.5 py-2 text-center font-medium min-w-[90px] text-xs"
                >
                  {ts.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => {
              const isNotInUse = row.status === "not_in_use";
              const isBlack = row.classification === "black";
              const isPrivate = row.category === "private" || row.category === "syndicate";
              const previousRow = filteredRows[index - 1];
              const showSectionHeader =
                !!row.sectionLabel && row.sectionLabel !== previousRow?.sectionLabel;

              return (
                <Fragment key={row.id}>
                  {showSectionHeader && (
                    <tr key={`${row.sectionLabel}-header`} className="border-t bg-gray-50">
                      <td
                        className="sticky left-0 z-30 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        style={{ top: SECTION_HEADER_STICKY_TOP }}
                      >
                        {row.sectionLabel}
                      </td>
                      <td
                        colSpan={TIME_SLOTS.length}
                        className="sticky z-20 bg-gray-50"
                        style={{ top: SECTION_HEADER_STICKY_TOP }}
                        aria-hidden="true"
                      />
                    </tr>
                  )}
                  <tr key={row.id} className={cn("border-t", isNotInUse && "opacity-50")}>
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium">
                      <div className="flex items-center gap-1.5">
                        {isBlack && <Circle className="h-3 w-3 flex-shrink-0 fill-gray-800 text-gray-800" style={{ aspectRatio: "1/1" }} />}
                        {!isBlack && !isPrivate && tab === "shells" && <Circle className="h-3 w-3 flex-shrink-0 fill-green-500 text-green-500" style={{ aspectRatio: "1/1" }} />}
                        {isPrivate && <Lock className="h-3 w-3 flex-shrink-0 text-blue-500" />}
                        {isNotInUse && <Ban className="h-3 w-3 flex-shrink-0 text-red-500" />}
                        {row.resourceType === "boat" ? (
                          <button
                            type="button"
                            className="truncate max-w-[120px] text-left hover:underline"
                            onClick={() => {
                              const boat = boats.find((entry) => entry.id === row.id);
                              if (boat) {
                                onBoatInfoClick(boat);
                              }
                            }}
                          >
                            {row.name}
                          </button>
                        ) : (
                          <span className="truncate max-w-[120px]">{row.name}</span>
                        )}
                        {row.subtitle && (
                          <span className="text-[9px] text-muted-foreground">{row.subtitle}</span>
                        )}
                      </div>
                    </td>
                    {TIME_SLOTS.map((ts) => {
                      const bookings = getBookings(row.id, ts.slot);

                      if (isNotInUse) {
                        return (
                          <td key={ts.slot} className="px-1 py-1.5 text-center">
                            <div className="h-8 rounded bg-red-50 flex items-center justify-center">
                              <Ban className="h-3 w-3 text-red-300" />
                            </div>
                          </td>
                        );
                      }

                      if (ts.slot === 7) {
                        const suggestedDaytimeRange = getSuggestedDaytimeBookingRange(bookings);
                        const canAddBooking = !!suggestedDaytimeRange;
                        return (
                          <td key={ts.slot} className="px-1 py-1.5 align-top">
                            <div className="space-y-1 min-w-[96px]">
                              {bookings.map((booking) => {
                                const isOwn = booking.userId === user.id;
                                const isPending = booking.clientStatus === "pending";
                                return (
                                  <button
                                    key={booking.id}
                                    className={cn(
                                      "w-full rounded border px-1.5 py-1 text-left",
                                      isPending
                                        ? "cursor-wait border-dashed bg-amber-50 border-amber-300"
                                        : isOwn
                                          ? "bg-blue-100 border-blue-300 hover:bg-blue-200"
                                          : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                                    )}
                                    onClick={() => !isPending && onBookingClick(booking)}
                                    disabled={isPending}
                                  >
                                    <div className="flex items-center gap-1">
                                      {isPending && <Loader2 className="h-3 w-3 animate-spin text-amber-700" />}
                                      <span className="truncate text-[10px] font-medium">
                                        {formatBookingWindow(booking)}
                                      </span>
                                    </div>
                                    <div className="truncate text-[10px] text-muted-foreground">
                                      {getBookingDisplayName(booking)} ({booking.crewCount})
                                    </div>
                                  </button>
                                );
                              })}
                              <button
                                className={cn(
                                  "h-8 w-full rounded border border-dashed transition-colors text-[10px]",
                                  canAddBooking
                                    ? "border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 text-muted-foreground"
                                    : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                                )}
                                onClick={() =>
                                  onSlotClick(row.resourceType, row.id, row.name, ts.slot, {
                                    initialEndSlot: 7,
                                    initialStartMinutes: suggestedDaytimeRange?.startMinutes,
                                    initialEndMinutes: suggestedDaytimeRange?.endMinutes,
                                  })
                                }
                                aria-label="Add daytime booking"
                                disabled={!canAddBooking}
                              >
                                {bookings.length === 0 ? "Book" : canAddBooking ? "Add" : "Full"}
                              </button>
                            </div>
                          </td>
                        );
                      }

                      const booking = bookings[0];
                      if (booking) {
                        const isOwn = booking.userId === user.id;
                        const isPending = booking.clientStatus === "pending";
                        return (
                          <td key={ts.slot} className="px-1 py-1.5 text-center">
                            <button
                              className={cn(
                                "h-8 w-full rounded border flex items-center justify-center px-1 transition-colors",
                                isPending
                                  ? "cursor-wait border-dashed bg-amber-50 border-amber-300"
                                  : isOwn
                                    ? "bg-blue-100 border-blue-300 hover:bg-blue-200"
                                    : "bg-gray-100 border-gray-200 hover:bg-gray-200",
                                booking.isRaceSpecific && "ring-1 ring-amber-400"
                              )}
                              onClick={() => !isPending && onBookingClick(booking)}
                              disabled={isPending}
                            >
                              {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin text-amber-700" />}
                              <span className={cn(
                                "text-[10px] font-medium truncate",
                                isPending ? "text-amber-800" : isOwn ? "text-blue-800" : "text-gray-700"
                              )}>
                                {getBookingDisplayName(booking)} ({booking.crewCount})
                              </span>
                            </button>
                          </td>
                        );
                      }

                      return (
                        <td key={ts.slot} className="px-1 py-1.5 text-center">
                          <button
                            className="h-8 w-full rounded border border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                            onClick={() => onSlotClick(row.resourceType, row.id, row.name, ts.slot)}
                            aria-label="Book this slot"
                          />
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={1 + TIME_SLOTS.length} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {showFilterBar && activeFilterCount > 0 ? "No boats match your filters" : "Nothing to show"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
