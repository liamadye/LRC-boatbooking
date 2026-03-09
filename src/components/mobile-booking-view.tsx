"use client";

import { useMemo, useState } from "react";
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
  tab: TabType;
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
  tab,
  boats,
  equipment,
  oarSets,
  dayBookings,
  user,
  onBookingClick,
  onSlotClick,
}: Props) {
  const [filters, setFilters] = useState<MobileFilters>({
    boatType: "all",
    classification: "all",
    availability: "all",
  });
  const [showFilters, setShowFilters] = useState(false);

  const showFilterBar = tab === "shells";

  const activeFilterCount = showFilterBar ? [
    filters.boatType !== "all",
    filters.classification !== "all",
    filters.availability !== "all",
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
        })));
      }
      const privateBoats = boats.filter((b) => b.category === "private");
      rows.push(...privateBoats.map((b) => ({
        id: b.id,
        name: b.name,
        resourceType: "boat" as const,
        boatType: b.boatType,
        classification: b.classification,
        category: b.category,
        status: b.status,
        isOutside: b.isOutside,
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
      if (row.status === "not_in_use" && filters.availability === "available") return false;
      return true;
    });
  }, [resourceRows, filters, showFilterBar]);

  // Index bookings by resource
  const bookingIndex = useMemo(() => {
    const idx: Record<string, Record<number, SerializedBooking>> = {};
    for (const b of dayBookings) {
      const key = b.boatId ?? b.equipmentId ?? b.oarSetId ?? "";
      if (!idx[key]) idx[key] = {};
      for (let s = b.startSlot; s <= b.endSlot; s++) {
        idx[key][s] = b;
      }
    }
    return idx;
  }, [dayBookings]);

  function getBooking(resourceId: string, slot: number): SerializedBooking | undefined {
    return bookingIndex[resourceId]?.[slot];
  }

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

              <div className="grid grid-cols-2 gap-2">
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
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Availability
                  </label>
                  <select
                    className="mt-1 w-full text-base border rounded px-2 py-2 min-h-[44px]"
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
        </>
      )}

      {/* Horizontal scroll grid — same layout as desktop */}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th scope="col" className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium min-w-[140px]">
                {tab === "shells" ? "Boat" : tab === "tinnies" ? "Tinny" : tab === "oars" ? "Oar Set" : "Equipment"}
              </th>
              {TIME_SLOTS.map((ts) => (
                <th
                  scope="col"
                  key={ts.slot}
                  className="px-1.5 py-2 text-center font-medium min-w-[90px] text-xs"
                >
                  {ts.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const isNotInUse = row.status === "not_in_use";
              const isBlack = row.classification === "black";
              const isPrivate = row.category === "private";

              return (
                <tr key={row.id} className={cn("border-t", isNotInUse && "opacity-50")}>
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium">
                    <div className="flex items-center gap-1.5">
                      {isBlack && <Circle className="h-3 w-3 flex-shrink-0 fill-gray-800 text-gray-800" />}
                      {!isBlack && !isPrivate && tab === "shells" && <Circle className="h-3 w-3 flex-shrink-0 fill-green-500 text-green-500" />}
                      {isPrivate && <Lock className="h-3 w-3 flex-shrink-0 text-blue-500" />}
                      {isNotInUse && <Ban className="h-3 w-3 flex-shrink-0 text-red-500" />}
                      <span className="truncate max-w-[120px]">{row.name}</span>
                      {row.subtitle && (
                        <span className="text-[9px] text-muted-foreground">{row.subtitle}</span>
                      )}
                    </div>
                  </td>
                  {TIME_SLOTS.map((ts) => {
                    const booking = getBooking(row.id, ts.slot);

                    if (isNotInUse) {
                      return (
                        <td key={ts.slot} className="px-1 py-1.5 text-center">
                          <div className="h-8 rounded bg-red-50 flex items-center justify-center">
                            <Ban className="h-3 w-3 text-red-300" />
                          </div>
                        </td>
                      );
                    }

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
