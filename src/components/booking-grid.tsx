"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TIME_SLOTS, BOAT_SECTIONS, SECTION_COLORS } from "@/lib/constants";
import { BookingModal } from "@/components/booking-modal";
import { BookingDetailPopover } from "@/components/booking-detail-popover";
import { MobileBookingView } from "@/components/mobile-booking-view";
import { TotalsBar } from "@/components/totals-bar";
import { ChevronDown, ChevronRight, Circle, Lock, Ban, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { BoatWithRelations, EquipmentItem, OarSetItem, UserProfile } from "@/lib/types";

type SerializedBooking = {
  id: string;
  date: string;
  resourceType: string;
  boatId: string | null;
  equipmentId: string | null;
  oarSetId: string | null;
  userId: string;
  bookerName: string;
  crewCount: number;
  startSlot: number;
  endSlot: number;
  isRaceSpecific: boolean;
  raceDetails?: string | null;
  notes: string | null;
};

type Props = {
  boats: BoatWithRelations[];
  equipment: EquipmentItem[];
  oarSets: OarSetItem[];
  bookings: SerializedBooking[];
  selectedDate: string;
  user: UserProfile;
  loadedAt?: string;
};

type BookingTarget = {
  resourceType: "boat" | "equipment" | "oar_set";
  resourceId: string;
  resourceName: string;
  slot: number;
};

export function BookingGrid({
  boats,
  equipment,
  oarSets,
  bookings,
  selectedDate,
  user,
  loadedAt,
}: Props) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [bookingTarget, setBookingTarget] = useState<BookingTarget | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<SerializedBooking | null>(null);
  const [editingBooking, setEditingBooking] = useState<SerializedBooking | null>(null);

  function handleEdit(booking: SerializedBooking) {
    const resourceId = booking.boatId ?? booking.equipmentId ?? booking.oarSetId ?? "";
    const boat = boats.find((b) => b.id === booking.boatId);
    const equip = equipment.find((e) => e.id === booking.equipmentId);
    const oar = oarSets.find((o) => o.id === booking.oarSetId);
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

  function toggleSection(section: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  function getBooking(resourceId: string, slot: number): SerializedBooking | undefined {
    return bookingIndex[resourceId]?.[slot];
  }

  function handleCellClick(
    resourceType: "boat" | "equipment" | "oar_set",
    resourceId: string,
    resourceName: string,
    slot: number
  ) {
    const existing = getBooking(resourceId, slot);
    if (existing) {
      setSelectedBooking(existing);
      return;
    }
    setBookingTarget({ resourceType, resourceId, resourceName, slot });
  }

  // Group club boats by section
  const clubBoats = boats.filter((b) => b.category === "club");
  const privateBoats = boats.filter((b) => b.category === "private");
  const tinnies = boats.filter((b) => b.category === "tinny");

  const ergs = equipment.filter((e) => e.type === "erg");
  const bikes = equipment.filter((e) => e.type === "bike");
  const gyms = equipment.filter((e) => e.type === "gym");

  // Calculate totals
  const totals = useMemo(() => {
    const inShed: Record<number, number> = {};
    const rowing: Record<number, number> = {};
    for (let s = 1; s <= 9; s++) {
      inShed[s] = 0;
      rowing[s] = 0;
    }
    for (const b of dayBookings) {
      for (let s = b.startSlot; s <= b.endSlot; s++) {
        if (b.resourceType === "boat") {
          const boat = boats.find((bt) => bt.id === b.boatId);
          if (boat?.category === "tinny") {
            inShed[s] += b.crewCount; // tinnies count in shed
          } else {
            rowing[s] += b.crewCount;
            if (!boat?.isOutside) {
              inShed[s] += b.crewCount;
            }
          }
        } else {
          // Equipment bookings count in shed total
          inShed[s] += b.crewCount;
        }
      }
    }
    return { inShed, rowing };
  }, [dayBookings, boats]);

  return (
    <>
      {loadedAt && <RefreshIndicator loadedAt={loadedAt} />}
      <TotalsBar inShed={totals.inShed} rowing={totals.rowing} />

      {/* Mobile view */}
      <MobileBookingView
        boats={boats}
        equipment={equipment}
        oarSets={oarSets}
        bookings={bookings}
        selectedDate={selectedDate}
        user={user}
        onBookingClick={(booking) => setSelectedBooking(booking)}
        onSlotClick={(type, id, name, slot) =>
          setBookingTarget({ resourceType: type, resourceId: id, resourceName: name, slot })
        }
      />

      {/* Desktop view */}
      <div className="overflow-x-auto rounded-lg border bg-white hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium w-48">
                Boat
              </th>
              <th className="px-2 py-2 text-left font-medium w-20">Type</th>
              <th className="px-2 py-2 text-left font-medium w-16">Wt</th>
              <th className="px-2 py-2 text-left font-medium w-28">Squad</th>
              {TIME_SLOTS.map((ts) => (
                <th
                  key={ts.slot}
                  className="px-2 py-2 text-center font-medium min-w-[110px]"
                >
                  {ts.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ── Club Boats by section ── */}
            {BOAT_SECTIONS.map((section) => {
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
                  />
                  {!isCollapsed &&
                    sectionBoats.map((boat) => (
                      <BoatRow
                        key={boat.id}
                        boat={boat}
                        getBooking={getBooking}
                        onCellClick={handleCellClick}
                        colorClass={section.color}
                        currentUserId={user.id}
                      />
                    ))}
                </SectionGroup>
              );
            })}

            {/* ── Oar Sets ── */}
            <SectionGroup>
              <SectionHeader
                label="Oar Sets"
                count={oarSets.length}
                isCollapsed={collapsedSections.has("Oar Sets")}
                onToggle={() => toggleSection("Oar Sets")}
                colorClass={SECTION_COLORS.oars}
              />
              {!collapsedSections.has("Oar Sets") &&
                oarSets.map((os) => (
                  <ResourceRow
                    key={os.id}
                    id={os.id}
                    name={os.name}
                    resourceType="oar_set"
                    colorClass={SECTION_COLORS.oars}
                    getBooking={getBooking}
                    onCellClick={handleCellClick}
                    currentUserId={user.id}
                  />
                ))}
            </SectionGroup>

            {/* ── Private Boats ── */}
            <SectionGroup>
              <SectionHeader
                label="Private Boats"
                count={privateBoats.length}
                isCollapsed={collapsedSections.has("Private Boats")}
                onToggle={() => toggleSection("Private Boats")}
                colorClass={SECTION_COLORS.private}
              />
              {!collapsedSections.has("Private Boats") &&
                privateBoats.map((boat) => (
                  <BoatRow
                    key={boat.id}
                    boat={boat}
                    getBooking={getBooking}
                    onCellClick={handleCellClick}
                    colorClass={SECTION_COLORS.private}
                    currentUserId={user.id}
                  />
                ))}
            </SectionGroup>

            {/* ── Tinnies ── */}
            <SectionGroup>
              <SectionHeader
                label="Tinnies (Coach Boats)"
                count={tinnies.length}
                isCollapsed={collapsedSections.has("Tinnies")}
                onToggle={() => toggleSection("Tinnies")}
                colorClass={SECTION_COLORS.tinny}
              />
              {!collapsedSections.has("Tinnies") &&
                tinnies.map((boat) => (
                  <BoatRow
                    key={boat.id}
                    boat={boat}
                    getBooking={getBooking}
                    onCellClick={handleCellClick}
                    colorClass={SECTION_COLORS.tinny}
                    currentUserId={user.id}
                  />
                ))}
            </SectionGroup>

            {/* ── Equipment ── */}
            <SectionGroup>
              <SectionHeader
                label="Ergs, Bikes & Gym"
                count={equipment.length}
                isCollapsed={collapsedSections.has("Equipment")}
                onToggle={() => toggleSection("Equipment")}
                colorClass={SECTION_COLORS.equipment}
              />
              {!collapsedSections.has("Equipment") && (
                <>
                  {ergs.map((e) => (
                    <ResourceRow
                      key={e.id}
                      id={e.id}
                      name={`Erg ${e.number}`}
                      subtitle="ONE SLOT ONLY"
                      resourceType="equipment"
                      colorClass={SECTION_COLORS.equipment}
                      getBooking={getBooking}
                      onCellClick={handleCellClick}
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
                      getBooking={getBooking}
                      onCellClick={handleCellClick}
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
                      getBooking={getBooking}
                      onCellClick={handleCellClick}
                      currentUserId={user.id}
                    />
                  ))}
                </>
              )}
            </SectionGroup>
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
          onEdit={handleEdit}
        />
      )}
    </>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function SectionGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function SectionHeader({
  label,
  count,
  isCollapsed,
  onToggle,
  colorClass,
}: {
  label: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
  colorClass: string;
}) {
  return (
    <tr
      className={cn("border-t cursor-pointer hover:bg-gray-100", colorClass)}
      onClick={onToggle}
    >
      <td colSpan={4 + TIME_SLOTS.length} className="px-3 py-2 font-semibold">
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {label}
          <span className="text-xs text-muted-foreground font-normal">
            ({count})
          </span>
        </div>
      </td>
    </tr>
  );
}

function BoatRow({
  boat,
  getBooking,
  onCellClick,
  colorClass,
  currentUserId,
}: {
  boat: BoatWithRelations;
  getBooking: (id: string, slot: number) => SerializedBooking | undefined;
  onCellClick: (type: "boat", id: string, name: string, slot: number) => void;
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
            <span title="Black boat (restricted)"><Circle className="h-3 w-3 fill-gray-800 text-gray-800" /></span>
          )}
          {!isBlack && !isPrivate && (
            <span title="Green boat (open)"><Circle className="h-3 w-3 fill-green-500 text-green-500" /></span>
          )}
          {isPrivate && <span title="Private boat"><Lock className="h-3 w-3 text-blue-500" /></span>}
          {isNotInUse && <span title="Not in use"><Ban className="h-3 w-3 text-red-500" /></span>}
          <span className="truncate max-w-[160px]">{boat.name}</span>
        </div>
      </td>
      <td className="px-2 py-1.5 text-muted-foreground">{boat.boatType}</td>
      <td className="px-2 py-1.5 text-muted-foreground">
        {boat.avgWeightKg ? `${boat.avgWeightKg}` : "—"}
      </td>
      <td className="px-2 py-1.5 text-muted-foreground text-xs truncate max-w-[120px]">
        {boat.responsibleSquad?.name ?? boat.responsiblePerson ?? "—"}
      </td>
      {TIME_SLOTS.map((ts) => {
        const booking = getBooking(boat.id, ts.slot);
        return (
          <BookingCell
            key={ts.slot}
            booking={booking}
            isNotInUse={isNotInUse}
            currentUserId={currentUserId}
            onClick={() =>
              !isNotInUse && onCellClick("boat", boat.id, boat.name, ts.slot)
            }
          />
        );
      })}
    </tr>
  );
}

function ResourceRow({
  id,
  name,
  subtitle,
  resourceType,
  colorClass,
  getBooking,
  onCellClick,
  currentUserId,
}: {
  id: string;
  name: string;
  subtitle?: string;
  resourceType: "equipment" | "oar_set";
  colorClass: string;
  getBooking: (id: string, slot: number) => SerializedBooking | undefined;
  onCellClick: (type: "equipment" | "oar_set", id: string, name: string, slot: number) => void;
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
      <td className="px-2 py-1.5" />
      <td className="px-2 py-1.5" />
      <td className="px-2 py-1.5" />
      {TIME_SLOTS.map((ts) => {
        const booking = getBooking(id, ts.slot);
        return (
          <BookingCell
            key={ts.slot}
            booking={booking}
            currentUserId={currentUserId}
            onClick={() => onCellClick(resourceType, id, name, ts.slot)}
          />
        );
      })}
    </tr>
  );
}

function RefreshIndicator({ loadedAt }: { loadedAt: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const updateLabel = useCallback(() => {
    setLabel(formatDistanceToNow(new Date(loadedAt), { addSuffix: true }));
  }, [loadedAt]);

  useEffect(() => {
    updateLabel();
    const interval = setInterval(updateLabel, 30_000);
    return () => clearInterval(interval);
  }, [updateLabel]);

  function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    // The page will re-render with new loadedAt, resetting this component
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Last refreshed {label}</span>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
        Refresh
      </button>
    </div>
  );
}

function BookingCell({
  booking,
  isNotInUse,
  currentUserId,
  onClick,
}: {
  booking?: SerializedBooking;
  isNotInUse?: boolean;
  currentUserId: string;
  onClick: () => void;
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

  if (booking) {
    const isOwn = booking.userId === currentUserId;
    return (
      <td className="px-1 py-1.5 text-center">
        <button
          className={cn(
            "h-8 w-full rounded border flex items-center justify-center px-1 cursor-pointer transition-colors",
            isOwn
              ? "bg-blue-100 border-blue-300 hover:bg-blue-200"
              : "bg-gray-100 border-gray-200 hover:bg-gray-200",
            booking.isRaceSpecific && "ring-1 ring-amber-400"
          )}
          onClick={onClick}
        >
          <span className={cn(
            "text-xs font-medium truncate",
            isOwn ? "text-blue-800" : "text-gray-700"
          )}>
            {booking.bookerName} ({booking.crewCount})
          </span>
        </button>
      </td>
    );
  }

  return (
    <td className="px-1 py-1.5 text-center">
      <button
        className="h-8 w-full rounded border border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
        onClick={onClick}
        title="Click to book"
      />
    </td>
  );
}
