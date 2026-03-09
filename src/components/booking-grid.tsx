"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { BoatInfoDialog } from "@/components/boat-info-dialog";
import { formatBookingWindow } from "@/lib/booking-times";
import { getBookingDisplayName } from "@/lib/booking-utils";
import { cn } from "@/lib/utils";
import { TIME_SLOTS, BOAT_SECTIONS, SECTION_COLORS } from "@/lib/constants";
import { MobileBookingView } from "@/components/mobile-booking-view";
import { ChevronDown, ChevronRight, Circle, Lock, Ban, RefreshCw, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type {
  BoatWithRelations,
  EquipmentItem,
  OarSetItem,
  SerializedBooking,
  UserProfile,
} from "@/lib/types";

const BookingModal = dynamic(() =>
  import("@/components/booking-modal").then((m) => ({ default: m.BookingModal }))
);
const BookingDetailPopover = dynamic(() =>
  import("@/components/booking-detail-popover").then((m) => ({ default: m.BookingDetailPopover }))
);

type TabType = "shells" | "tinnies" | "oars" | "gym";

type Props = {
  tab: TabType;
  boats: BoatWithRelations[];
  equipment: EquipmentItem[];
  oarSets: OarSetItem[];
  bookings: SerializedBooking[];
  selectedDate: string;
  user: UserProfile;
  loadedAt?: string;
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
  onBookingPending?: (booking: SerializedBooking) => void;
  onPendingBookingResolved?: (tempId: string, booking: SerializedBooking | null) => void;
  onBookingSaved?: (booking: SerializedBooking) => void;
  onBookingDeleted?: (bookingId: string) => void;
};

type BookingTarget = {
  resourceType: "boat" | "equipment" | "oar_set";
  resourceId: string;
  resourceName: string;
  slot: number;
};

export function BookingGrid({
  tab,
  boats,
  equipment,
  oarSets,
  bookings,
  selectedDate,
  user,
  loadedAt,
  onRefresh,
  refreshing = false,
  onBookingPending,
  onPendingBookingResolved,
  onBookingSaved,
  onBookingDeleted,
}: Props) {
  const showBoatColumns = tab === "shells";
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [bookingTarget, setBookingTarget] = useState<BookingTarget | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<SerializedBooking | null>(null);
  const [editingBooking, setEditingBooking] = useState<SerializedBooking | null>(null);
  const [selectedBoat, setSelectedBoat] = useState<BoatWithRelations | null>(null);

  useEffect(() => {
    setSelectedBooking((current) =>
      current ? bookings.find((booking) => booking.id === current.id) ?? null : null
    );
    setEditingBooking((current) =>
      current ? bookings.find((booking) => booking.id === current.id) ?? null : null
    );
  }, [bookings]);

  // Lookup maps for O(1) access
  const boatMap = useMemo(() => {
    const m = new Map<string, BoatWithRelations>();
    boats.forEach((b) => m.set(b.id, b));
    return m;
  }, [boats]);

  const equipMap = useMemo(() => {
    const m = new Map<string, EquipmentItem>();
    equipment.forEach((e) => m.set(e.id, e));
    return m;
  }, [equipment]);

  const oarMap = useMemo(() => {
    const m = new Map<string, OarSetItem>();
    oarSets.forEach((o) => m.set(o.id, o));
    return m;
  }, [oarSets]);

  // Memoize resource groupings
  const clubBoats = useMemo(() => boats.filter((b) => b.category === "club"), [boats]);
  const privateBoats = useMemo(() => boats.filter((b) => b.category === "private"), [boats]);
  const tinnies = useMemo(() => boats.filter((b) => b.category === "tinny"), [boats]);
  const ergs = useMemo(() => equipment.filter((e) => e.type === "erg"), [equipment]);
  const bikes = useMemo(() => equipment.filter((e) => e.type === "bike"), [equipment]);
  const gyms = useMemo(() => equipment.filter((e) => e.type === "gym"), [equipment]);

  function handleEdit(booking: SerializedBooking) {
    const resourceId = booking.boatId ?? booking.equipmentId ?? booking.oarSetId ?? "";
    const boat = boatMap.get(booking.boatId ?? "");
    const equip = equipMap.get(booking.equipmentId ?? "");
    const oar = oarMap.get(booking.oarSetId ?? "");
    const resourceName = boat?.name ?? (equip ? `${equip.type.charAt(0).toUpperCase() + equip.type.slice(1)} ${equip.number}` : oar?.name ?? "Unknown");

    setBookingTarget({
      resourceType: booking.resourceType as "boat" | "equipment" | "oar_set",
      resourceId,
      resourceName,
      slot: booking.startSlot,
    });
    setEditingBooking(booking);
  }

  // Filter bookings for the selected date
  const dayBookings = useMemo(
    () => bookings.filter((b) => b.date === selectedDate),
    [bookings, selectedDate]
  );

  // Index bookings by resource for quick lookup
  const bookingIndex = useMemo(() => {
    const idx: Record<string, Record<number, SerializedBooking[]>> = {};
    for (const b of dayBookings) {
      const key = b.boatId ?? b.equipmentId ?? b.oarSetId ?? "";
      if (!idx[key]) idx[key] = {};
      for (let s = b.startSlot; s <= b.endSlot; s++) {
        if (!idx[key][s]) {
          idx[key][s] = [];
        }
        idx[key][s].push(b);
      }
    }
    for (const resourceId of Object.keys(idx)) {
      for (const slot of Object.keys(idx[resourceId])) {
        idx[resourceId][Number(slot)].sort((a, b) => {
          if (a.startMinutes !== b.startMinutes) {
            return a.startMinutes - b.startMinutes;
          }
          return a.id.localeCompare(b.id);
        });
      }
    }
    return idx;
  }, [dayBookings]);

  function toggleSection(section: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  function getBookings(resourceId: string, slot: number): SerializedBooking[] {
    return bookingIndex[resourceId]?.[slot] ?? [];
  }

  function handleCellClick(
    resourceType: "boat" | "equipment" | "oar_set",
    resourceId: string,
    resourceName: string,
    slot: number
  ) {
    const existing = getBookings(resourceId, slot)[0];
    if (slot !== 7 && existing) {
      if (existing.clientStatus === "pending") {
        return;
      }
      setSelectedBooking(existing);
      return;
    }
    setBookingTarget({ resourceType, resourceId, resourceName, slot });
  }

  return (
    <>
      {loadedAt && (
        <RefreshIndicator
          loadedAt={loadedAt}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}

      {/* Mobile view */}
      <MobileBookingView
        tab={tab}
        boats={boats}
        equipment={equipment}
        oarSets={oarSets}
        user={user}
        getBookings={getBookings}
        onBookingClick={(booking) => setSelectedBooking(booking)}
        onSlotClick={(type, id, name, slot) =>
          setBookingTarget({ resourceType: type, resourceId: id, resourceName: name, slot })
        }
        onBoatInfoClick={(boat) => setSelectedBoat(boat)}
      />

      {/* Desktop view */}
      <div className="overflow-x-auto rounded-lg border bg-white hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th scope="col" className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium w-48">
                {tab === "shells" ? "Boat" : tab === "tinnies" ? "Tinny" : tab === "oars" ? "Oar Set" : "Equipment"}
              </th>
              {showBoatColumns && (
                <>
                  <th scope="col" className="px-2 py-2 text-left font-medium w-20">Type</th>
                  <th scope="col" className="px-2 py-2 text-left font-medium w-16">Wt</th>
                  <th scope="col" className="px-2 py-2 text-left font-medium w-28">Squad</th>
                </>
              )}
              {TIME_SLOTS.map((ts) => (
                <th
                  scope="col"
                  key={ts.slot}
                  className="px-2 py-2 text-center font-medium min-w-[110px]"
                >
                  {ts.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Club Boats by section (shells tab) */}
            {tab === "shells" && BOAT_SECTIONS.map((section) => {
              const sectionBoats = clubBoats.filter((b) =>
                section.types.includes(b.boatType)
              );
              if (sectionBoats.length === 0) return null;
              const isCollapsed = collapsedSections.has(section.label);

              return (
                <SectionGroup key={section.label}>
                  <SectionHeader
                    label={section.label}
                    count={sectionBoats.length}
                    isCollapsed={isCollapsed}
                    onToggle={() => toggleSection(section.label)}
                    colorClass={SECTION_COLORS.club}
                    extraColumns={showBoatColumns ? 3 : 0}
                  />
                  {!isCollapsed &&
                    sectionBoats.map((boat) => (
                      <BoatRow
                        key={boat.id}
                        boat={boat}
                        showBoatColumns={showBoatColumns}
                        getBookings={getBookings}
                        onCellClick={handleCellClick}
                        onBookingClick={setSelectedBooking}
                        onBoatInfoClick={setSelectedBoat}
                        colorClass={section.color}
                        currentUserId={user.id}
                      />
                    ))}
                </SectionGroup>
              );
            })}

            {/* Private Boats (shells tab) */}
            {tab === "shells" && privateBoats.length > 0 && <SectionGroup>
              <SectionHeader
                label="Private Boats"
                count={privateBoats.length}
                isCollapsed={collapsedSections.has("Private Boats")}
                onToggle={() => toggleSection("Private Boats")}
                colorClass={SECTION_COLORS.private}
                extraColumns={showBoatColumns ? 3 : 0}
              />
              {!collapsedSections.has("Private Boats") &&
                privateBoats.map((boat) => (
                    <BoatRow
                      key={boat.id}
                      boat={boat}
                      showBoatColumns={showBoatColumns}
                      getBookings={getBookings}
                      onCellClick={handleCellClick}
                      onBookingClick={setSelectedBooking}
                      onBoatInfoClick={setSelectedBoat}
                      colorClass={SECTION_COLORS.private}
                      currentUserId={user.id}
                    />
                ))}
            </SectionGroup>}

            {/* Tinnies (tinnies tab) */}
            {tab === "tinnies" && tinnies.length > 0 &&
              tinnies.map((boat) => (
                <BoatRow
                  key={boat.id}
                  boat={boat}
                  showBoatColumns={false}
                  getBookings={getBookings}
                  onCellClick={handleCellClick}
                  onBookingClick={setSelectedBooking}
                  onBoatInfoClick={setSelectedBoat}
                  colorClass={SECTION_COLORS.tinny}
                  currentUserId={user.id}
                />
              ))
            }

            {/* Oar Sets (oars tab) */}
            {tab === "oars" && oarSets.map((os) => (
              <ResourceRow
                key={os.id}
                id={os.id}
                name={os.name}
                resourceType="oar_set"
                colorClass={SECTION_COLORS.oars}
                  getBookings={getBookings}
                  onCellClick={handleCellClick}
                  onBookingClick={setSelectedBooking}
                  currentUserId={user.id}
                />
            ))}

            {/* Equipment (gym tab) */}
            {tab === "gym" && (
              <>
                {ergs.map((e) => (
                  <ResourceRow
                    key={e.id}
                    id={e.id}
                    name={`Erg ${e.number}`}
                    subtitle="ONE SLOT ONLY"
                    resourceType="equipment"
                    colorClass={SECTION_COLORS.equipment}
                  getBookings={getBookings}
                  onCellClick={handleCellClick}
                  onBookingClick={setSelectedBooking}
                  currentUserId={user.id}
                />
                ))}
                {bikes.map((e) => (
                  <ResourceRow
                    key={e.id}
                    id={e.id}
                    name={`Bike ${e.number}`}
                    resourceType="equipment"
                    colorClass={SECTION_COLORS.equipment}
                  getBookings={getBookings}
                  onCellClick={handleCellClick}
                  onBookingClick={setSelectedBooking}
                  currentUserId={user.id}
                />
                ))}
                {gyms.map((e) => (
                  <ResourceRow
                    key={e.id}
                    id={e.id}
                    name={`Gym ${e.number}`}
                    resourceType="equipment"
                    colorClass={SECTION_COLORS.equipment}
                  getBookings={getBookings}
                  onCellClick={handleCellClick}
                  onBookingClick={setSelectedBooking}
                  currentUserId={user.id}
                />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {bookingTarget && (
        <BookingModal
          target={bookingTarget}
          selectedDate={selectedDate}
          user={user}
          boats={boats}
          editingBooking={editingBooking ?? undefined}
          onCreatePending={onBookingPending}
          onCreateResolved={onPendingBookingResolved}
          onSaved={(booking) => {
            onBookingSaved?.(booking);
          }}
          onClose={() => { setBookingTarget(null); setEditingBooking(null); }}
        />
      )}

      {selectedBooking && (
        <BookingDetailPopover
          booking={selectedBooking}
          boats={boats}
          equipment={equipment}
          oarSets={oarSets}
          user={user}
          onClose={() => setSelectedBooking(null)}
          onDeleted={(bookingId) => {
            onBookingDeleted?.(bookingId);
            setSelectedBooking(null);
          }}
          onEdit={handleEdit}
        />
      )}

      {selectedBoat && (
        <BoatInfoDialog boat={selectedBoat} onClose={() => setSelectedBoat(null)} />
      )}
    </>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function SectionGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const SectionHeader = memo(function SectionHeader({
  label,
  count,
  isCollapsed,
  onToggle,
  colorClass,
  extraColumns = 3,
}: {
  label: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
  colorClass: string;
  extraColumns?: number;
}) {
  return (
    <tr
      className={cn("border-t cursor-pointer hover:bg-gray-100", colorClass)}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-expanded={!isCollapsed}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
    >
      <td colSpan={1 + extraColumns + TIME_SLOTS.length} className="px-3 py-2 font-semibold">
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
          {label}
          <span className="text-xs text-muted-foreground font-normal">
            ({count})
          </span>
        </div>
      </td>
    </tr>
  );
});

const BoatRow = memo(function BoatRow({
  boat,
  showBoatColumns = true,
  getBookings,
  onCellClick,
  onBookingClick,
  onBoatInfoClick,
  colorClass,
  currentUserId,
}: {
  boat: BoatWithRelations;
  showBoatColumns?: boolean;
  getBookings: (id: string, slot: number) => SerializedBooking[];
  onCellClick: (type: "boat", id: string, name: string, slot: number) => void;
  onBookingClick: (booking: SerializedBooking) => void;
  onBoatInfoClick: (boat: BoatWithRelations) => void;
  colorClass: string;
  currentUserId: string;
}) {
  const isNotInUse = boat.status === "not_in_use";
  const isBlack = boat.classification === "black";
  const isPrivate = boat.category === "private";

  return (
    <tr className={cn("border-t hover:bg-gray-50/50", isNotInUse && "opacity-50")}>
      <td className={cn("sticky left-0 z-10 px-3 py-1.5 font-medium", colorClass)}>
        <div className="flex items-center gap-1.5">
          {isBlack && (
            <span title="Black boat (restricted)"><Circle className="h-3 w-3 fill-gray-800 text-gray-800" aria-hidden="true" /><span className="sr-only">Black boat (restricted)</span></span>
          )}
          {!isBlack && !isPrivate && (
            <span title="Green boat (open)"><Circle className="h-3 w-3 fill-green-500 text-green-500" aria-hidden="true" /><span className="sr-only">Green boat (open)</span></span>
          )}
          {isPrivate && <span title="Private boat"><Lock className="h-3 w-3 text-blue-500" aria-hidden="true" /><span className="sr-only">Private boat</span></span>}
          {isNotInUse && <span title="Not in use"><Ban className="h-3 w-3 text-red-500" aria-hidden="true" /><span className="sr-only">Not in use</span></span>}
          <button
            type="button"
            className="truncate max-w-[160px] text-left hover:underline"
            onClick={(event) => {
              event.stopPropagation();
              onBoatInfoClick(boat);
            }}
          >
            {boat.name}
          </button>
        </div>
      </td>
      {showBoatColumns && (
        <>
          <td className="px-2 py-1.5 text-muted-foreground">{boat.boatType}</td>
          <td className="px-2 py-1.5 text-muted-foreground">
            {boat.avgWeightKg ? `${boat.avgWeightKg}` : "—"}
          </td>
          <td className="px-2 py-1.5 text-muted-foreground text-xs truncate max-w-[120px]">
            {boat.responsibleSquad?.name ?? boat.responsiblePerson ?? "—"}
          </td>
        </>
      )}
      {TIME_SLOTS.map((ts) => {
        const bookings = getBookings(boat.id, ts.slot);
        return (
          <BookingCell
            key={ts.slot}
            bookings={bookings}
            slot={ts.slot}
            isNotInUse={isNotInUse}
            currentUserId={currentUserId}
            onBookingClick={onBookingClick}
            onAddClick={() =>
              !isNotInUse && onCellClick("boat", boat.id, boat.name, ts.slot)
            }
          />
        );
      })}
    </tr>
  );
});

const ResourceRow = memo(function ResourceRow({
  id,
  name,
  subtitle,
  resourceType,
  colorClass,
  getBookings,
  onCellClick,
  onBookingClick,
  currentUserId,
}: {
  id: string;
  name: string;
  subtitle?: string;
  resourceType: "equipment" | "oar_set";
  colorClass: string;
  getBookings: (id: string, slot: number) => SerializedBooking[];
  onCellClick: (type: "equipment" | "oar_set", id: string, name: string, slot: number) => void;
  onBookingClick: (booking: SerializedBooking) => void;
  currentUserId: string;
}) {
  return (
    <tr className="border-t hover:bg-gray-50/50">
      <td className={cn("sticky left-0 z-10 px-3 py-1.5 font-medium", colorClass)}>
        <div>
          {name}
          {subtitle && (
            <span className="text-[10px] text-muted-foreground ml-1.5">
              {subtitle}
            </span>
          )}
        </div>
      </td>
      {TIME_SLOTS.map((ts) => {
        const bookings = getBookings(id, ts.slot);
        return (
          <BookingCell
            key={ts.slot}
            bookings={bookings}
            slot={ts.slot}
            currentUserId={currentUserId}
            onBookingClick={onBookingClick}
            onAddClick={() => onCellClick(resourceType, id, name, ts.slot)}
          />
        );
      })}
    </tr>
  );
});

function RefreshIndicator({
  loadedAt,
  onRefresh,
  refreshing = false,
}: {
  loadedAt: string;
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");

  const updateLabel = useCallback(() => {
    setLabel(formatDistanceToNow(new Date(loadedAt), { addSuffix: true }));
  }, [loadedAt]);

  useEffect(() => {
    updateLabel();
    const interval = setInterval(updateLabel, 30_000);
    return () => clearInterval(interval);
  }, [updateLabel]);

  function handleRefresh() {
    if (onRefresh) {
      void onRefresh();
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Last refreshed {label}</span>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        aria-label="Refresh bookings"
        className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} aria-hidden="true" />
        Refresh
      </button>
    </div>
  );
}

const BookingCell = memo(function BookingCell({
  bookings,
  slot,
  isNotInUse,
  currentUserId,
  onBookingClick,
  onAddClick,
}: {
  bookings: SerializedBooking[];
  slot: number;
  isNotInUse?: boolean;
  currentUserId: string;
  onBookingClick: (booking: SerializedBooking) => void;
  onAddClick: () => void;
}) {
  if (isNotInUse) {
    return (
      <td className="px-1 py-1.5 text-center">
        <div className="h-8 rounded bg-red-50 flex items-center justify-center">
          <Ban className="h-3 w-3 text-red-300" />
        </div>
      </td>
    );
  }

  if (slot === 7) {
    return (
      <td className="px-1 py-1.5 align-top">
        <div className="space-y-1 min-w-[110px]">
          {bookings.map((booking) => {
            const isOwn = booking.userId === currentUserId;
            const isPending = booking.clientStatus === "pending";

            return (
              <button
                key={booking.id}
                className={cn(
                  "w-full rounded border px-1.5 py-1 text-left transition-colors",
                  isPending
                    ? "cursor-wait border-dashed bg-amber-50 border-amber-300"
                    : isOwn
                      ? "bg-blue-100 border-blue-300 hover:bg-blue-200"
                      : "bg-gray-100 border-gray-200 hover:bg-gray-200",
                  booking.isRaceSpecific && "ring-1 ring-amber-400"
                )}
                onClick={() => onBookingClick(booking)}
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
            className="h-8 w-full rounded border border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-[10px] text-muted-foreground"
            onClick={onAddClick}
            aria-label="Add daytime booking"
          >
            {bookings.length === 0 ? "Book" : "Add"}
          </button>
        </div>
      </td>
    );
  }

  const booking = bookings[0];
  if (booking) {
    const isOwn = booking.userId === currentUserId;
    const isPending = booking.clientStatus === "pending";
    return (
      <td className="px-1 py-1.5 text-center">
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
          <span className={cn(
            "text-xs font-medium truncate",
            isPending
              ? "text-amber-800"
              : isOwn
                ? "text-blue-800"
                : "text-gray-700"
          )}>
            {getBookingDisplayName(booking)} ({booking.crewCount})
          </span>
        </button>
      </td>
    );
  }

  return (
    <td className="px-1 py-1.5 text-center">
      <button
        className="h-8 w-full rounded border border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
        onClick={onAddClick}
        title="Click to book"
        aria-label="Book this slot"
      />
    </td>
  );
});
