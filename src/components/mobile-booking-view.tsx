"use client";

import { Fragment, useMemo, useState } from "react";
import {
  formatBookingWindow,
  getSuggestedDaytimeBookingRange,
} from "@/lib/booking-times";
import { cn } from "@/lib/utils";
import { TIME_SLOTS } from "@/lib/constants";
import { getBookingDisplayName } from "@/lib/booking-utils";
import {
  BOAT_CLASS_FILTER_OPTIONS,
  CLASSIFICATION_FILTER_OPTIONS,
  COXED_FILTER_OPTIONS,
  matchesBoatClassFilter,
  matchesClassificationFilter,
  matchesCoxedFilter,
  SHELL_SECTIONS,
  type BoatClass,
  type BoatClassFilter,
  type CoxedFilter,
} from "@/lib/boats";
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
  boatClass: BoatClassFilter;
  classification: "all" | "black" | "green";
  coxed: CoxedFilter;
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

type ResourceRow = {
  id: string;
  name: string;
  resourceType: "boat" | "equipment" | "oar_set";
  boatTypeLabel?: string;
  boatClass?: BoatClass;
  classification?: "black" | "green";
  category?: BoatWithRelations["category"];
  status?: BoatWithRelations["status"];
  isOutside?: boolean;
  isCoxed?: boolean;
  subtitle?: string;
  sectionLabel?: string;
};

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
    boatClass: "all",
    classification: "all",
    coxed: "all",
  });
  const [showFilters, setShowFilters] = useState(false);

  const showFilterBar = tab === "shells";

  const activeFilterCount = showFilterBar
    ? [
        filters.boatClass !== "all",
        filters.classification !== "all",
        filters.coxed !== "all",
      ].filter(Boolean).length
    : 0;

  const resourceRows = useMemo((): ResourceRow[] => {
    if (tab === "shells") {
      const rows: ResourceRow[] = [];
      const clubBoats = boats.filter((boat) => boat.category === "club");

      for (const section of SHELL_SECTIONS) {
        const sectionBoats = clubBoats.filter((boat) => boat.boatClass === section.key);
        rows.push(
          ...sectionBoats.map((boat) => ({
            id: boat.id,
            name: boat.name,
            resourceType: "boat" as const,
            boatTypeLabel: boat.boatTypeLabel,
            boatClass: boat.boatClass,
            classification: boat.classification,
            category: boat.category,
            status: boat.status,
            isOutside: boat.isOutside,
            isCoxed: boat.isCoxed,
            sectionLabel: section.label,
          }))
        );
      }

      const privateBoats = boats.filter(
        (boat) => boat.category === "private" || boat.category === "syndicate"
      );
      rows.push(
        ...privateBoats.map((boat) => ({
          id: boat.id,
          name: boat.name,
          resourceType: "boat" as const,
          boatTypeLabel: boat.boatTypeLabel,
          boatClass: boat.boatClass,
          classification: boat.classification,
          category: boat.category,
          status: boat.status,
          isOutside: boat.isOutside,
          isCoxed: boat.isCoxed,
          sectionLabel: "Private & Syndicate Boats",
        }))
      );
      return rows;
    }

    if (tab === "tinnies") {
      return boats.map((boat) => ({
        id: boat.id,
        name: boat.name,
        resourceType: "boat" as const,
        boatTypeLabel: boat.boatTypeLabel,
        boatClass: boat.boatClass,
        category: boat.category,
        status: boat.status,
        isCoxed: boat.isCoxed,
      }));
    }

    if (tab === "oars") {
      return oarSets.map((oarSet) => ({
        id: oarSet.id,
        name: oarSet.name,
        resourceType: "oar_set" as const,
      }));
    }

    const ergs = equipment.filter((entry) => entry.type === "erg").map((entry) => ({
      id: entry.id,
      name: `Erg ${entry.number}`,
      resourceType: "equipment" as const,
      subtitle: "ONE SLOT ONLY",
    }));
    const bikes = equipment.filter((entry) => entry.type === "bike").map((entry) => ({
      id: entry.id,
      name: `Bike ${entry.number}`,
      resourceType: "equipment" as const,
    }));
    const gyms = equipment.filter((entry) => entry.type === "gym").map((entry) => ({
      id: entry.id,
      name: `Gym ${entry.number}`,
      resourceType: "equipment" as const,
    }));

    return [...ergs, ...bikes, ...gyms];
  }, [tab, boats, equipment, oarSets]);

  const filteredRows = useMemo(() => {
    if (!showFilterBar) {
      return resourceRows;
    }

    return resourceRows.filter((row) => {
      if (!row.boatClass || !row.classification) {
        return false;
      }

      return (
        matchesBoatClassFilter({ boatClass: row.boatClass, supportsSweep: false, supportsScull: false, isCoxed: row.isCoxed ?? false }, filters.boatClass) &&
        matchesClassificationFilter(
          { boatClass: row.boatClass, supportsSweep: false, supportsScull: false, isCoxed: row.isCoxed ?? false, classification: row.classification },
          filters.classification
        ) &&
        matchesCoxedFilter(
          { boatClass: row.boatClass, supportsSweep: false, supportsScull: false, isCoxed: row.isCoxed ?? false },
          filters.coxed
        )
      );
    });
  }, [filters, resourceRows, showFilterBar]);

  return (
    <div className="space-y-4">
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
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {BOAT_CLASS_FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setFilters((previous) => ({
                          ...previous,
                          boatClass: option.value,
                        }))
                      }
                      className={cn(
                        "px-3 py-2 rounded-full text-sm font-medium border transition-colors min-h-[44px]",
                        filters.boatClass === option.value
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200"
                      )}
                    >
                      {option.label}
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
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      classification: event.target.value as MobileFilters["classification"],
                    }))
                  }
                >
                  {CLASSIFICATION_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Coxed
                </label>
                <select
                  className="mt-1 w-full text-base border rounded px-2 py-2 min-h-[44px]"
                  value={filters.coxed}
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      coxed: event.target.value as MobileFilters["coxed"],
                    }))
                  }
                >
                  {COXED_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={() =>
                    setFilters({ boatClass: "all", classification: "all", coxed: "all" })
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

      <div className="overflow-auto rounded-lg border bg-white max-h-[calc(100dvh-320px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-20">
            <tr className="border-b bg-gray-50">
              <th scope="col" className="sticky left-0 z-30 bg-gray-50 px-3 py-2 text-left font-medium min-w-[220px] whitespace-nowrap">
                {tab === "shells" ? "Boat" : tab === "tinnies" ? "Tinny" : tab === "oars" ? "Oar Set" : "Equipment"}
              </th>
              {TIME_SLOTS.map((slot) => (
                <th
                  scope="col"
                  key={slot.slot}
                  className="bg-gray-50 px-1.5 py-2 text-center font-medium min-w-[90px] text-xs"
                >
                  {slot.label}
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
                        className="sticky left-0 z-30 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[220px]"
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
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium min-w-[220px] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isBlack && <Circle className="h-3 w-3 flex-shrink-0 fill-gray-800 text-gray-800" style={{ aspectRatio: "1/1" }} />}
                        {!isBlack && !isPrivate && tab === "shells" && <Circle className="h-3 w-3 flex-shrink-0 fill-green-500 text-green-500" style={{ aspectRatio: "1/1" }} />}
                        {isPrivate && <Lock className="h-3 w-3 flex-shrink-0 text-blue-500" />}
                        {isNotInUse && <Ban className="h-3 w-3 flex-shrink-0 text-red-500" />}
                        {row.resourceType === "boat" ? (
                          <button
                            type="button"
                            className="truncate max-w-[180px] text-left hover:underline"
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
                          <span className="truncate max-w-[180px]">{row.name}</span>
                        )}
                        {row.subtitle && (
                          <span className="text-[9px] text-muted-foreground">{row.subtitle}</span>
                        )}
                      </div>
                    </td>
                    {TIME_SLOTS.map((slot) => {
                      const bookings = getBookings(row.id, slot.slot);

                      if (isNotInUse) {
                        return (
                          <td key={slot.slot} className="px-1 py-1.5 text-center">
                            <div className="h-8 rounded bg-red-50 flex items-center justify-center">
                              <Ban className="h-3 w-3 text-red-300" />
                            </div>
                          </td>
                        );
                      }

                      if (slot.slot === 7) {
                        const suggestedDaytimeRange = getSuggestedDaytimeBookingRange(bookings);
                        const canAddBooking = !!suggestedDaytimeRange;
                        return (
                          <td key={slot.slot} className="px-1 py-1.5 align-top">
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
                                  onSlotClick(row.resourceType, row.id, row.name, slot.slot, {
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
                          <td key={slot.slot} className="px-1 py-1.5 text-center">
                            <button
                              className={cn(
                                "h-8 w-full rounded border flex items-center justify-center px-1 cursor-pointer transition-colors",
                                isPending
                                  ? "cursor-wait border-dashed bg-amber-50 border-amber-300 hover:bg-amber-50"
                                  : isOwn
                                    ? "bg-blue-100 border-blue-300 hover:bg-blue-200"
                                    : "bg-gray-100 border-gray-200 hover:bg-gray-200",
                                booking.isRaceSpecific && "ring-1 ring-amber-400"
                              )}
                              onClick={() => onBookingClick(booking)}
                              disabled={isPending}
                            >
                              {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin text-amber-700" />}
                              <span
                                className={cn(
                                  "text-xs font-medium truncate",
                                  isPending
                                    ? "text-amber-800"
                                    : isOwn
                                      ? "text-blue-800"
                                      : "text-gray-700"
                                )}
                              >
                                {getBookingDisplayName(booking)} ({booking.crewCount})
                              </span>
                            </button>
                          </td>
                        );
                      }

                      return (
                        <td key={slot.slot} className="px-1 py-1.5 text-center">
                          <button
                            className="h-8 w-full rounded border border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                            onClick={() => onSlotClick(row.resourceType, row.id, row.name, slot.slot)}
                            title="Click to book"
                            aria-label="Book this slot"
                          />
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
