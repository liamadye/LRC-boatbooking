"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekNav } from "@/components/week-nav";
import { BookingGrid } from "@/components/booking-grid";
import { TotalsBar } from "@/components/totals-bar";
import { useToast } from "@/hooks/use-toast";
import { getWeekStartKey } from "@/lib/booking-utils";
import type {
  BoatWithRelations,
  BookingWeekPayload,
  EquipmentItem,
  OarSetItem,
  SerializedBooking,
  UserProfile,
} from "@/lib/types";

type Props = {
  boats: BoatWithRelations[];
  equipment: EquipmentItem[];
  oarSets: OarSetItem[];
  initialSelectedDate: string;
  initialWeekData: BookingWeekPayload;
  user: UserProfile;
};

function sortBookings(bookings: SerializedBooking[]) {
  return [...bookings].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.startSlot !== b.startSlot) return a.startSlot - b.startSlot;
    return a.id.localeCompare(b.id);
  });
}

export function BookingsClient({
  boats,
  equipment,
  oarSets,
  initialSelectedDate,
  initialWeekData,
  user,
}: Props) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [weekData, setWeekData] = useState(initialWeekData);
  const [pendingBookings, setPendingBookings] = useState<SerializedBooking[]>([]);
  const [loadedAt, setLoadedAt] = useState(new Date().toISOString());
  const [loadingWeek, setLoadingWeek] = useState(false);
  const cacheRef = useRef(new Map<string, BookingWeekPayload>([
    [initialWeekData.weekStart, initialWeekData],
  ]));
  const requestIdRef = useRef(0);

  const selectedDateObj = useMemo(() => parseISO(selectedDate), [selectedDate]);
  const weekStartObj = useMemo(() => parseISO(weekData.weekStart), [weekData.weekStart]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStartObj, index)),
    [weekStartObj]
  );
  const visibleBookings = useMemo(() => {
    const pendingForWeek = pendingBookings.filter(
      (booking) => getWeekStartKey(parseISO(booking.date)) === weekData.weekStart
    );

    if (pendingForWeek.length === 0) {
      return weekData.bookings;
    }

    return sortBookings([...weekData.bookings, ...pendingForWeek]);
  }, [pendingBookings, weekData.bookings, weekData.weekStart]);

  const updateUrl = useCallback((nextDate: string) => {
    window.history.replaceState(null, "", `/bookings?date=${nextDate}`);
  }, []);

  const fetchWeekData = useCallback(async (weekStart: string) => {
    const res = await fetch(`/api/bookings?weekStart=${weekStart}`, {
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to load bookings");
    }

    const payload = data as BookingWeekPayload;
    cacheRef.current.set(weekStart, payload);
    return payload;
  }, []);

  const prefetchAdjacentWeeks = useCallback(
    async (currentWeekStart: string) => {
      const current = parseISO(currentWeekStart);
      const adjacent = [
        format(addDays(current, -7), "yyyy-MM-dd"),
        format(addDays(current, 7), "yyyy-MM-dd"),
      ];

      await Promise.all(
        adjacent.map(async (weekStart) => {
          if (cacheRef.current.has(weekStart)) {
            return;
          }

          try {
            await fetchWeekData(weekStart);
          } catch {
            // Ignore background prefetch failures.
          }
        })
      );
    },
    [fetchWeekData]
  );

  useEffect(() => {
    prefetchAdjacentWeeks(weekData.weekStart).catch(() => undefined);
  }, [prefetchAdjacentWeeks, weekData.weekStart]);

  const refreshCurrentWeek = useCallback(async () => {
    setLoadingWeek(true);
    const requestId = ++requestIdRef.current;

    try {
      const fresh = await fetchWeekData(weekData.weekStart);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setWeekData(fresh);
      setLoadedAt(new Date().toISOString());
    } catch (error) {
      toast({
        title: "Failed to refresh bookings",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingWeek(false);
      }
    }
  }, [fetchWeekData, toast, weekData.weekStart]);

  const handleSelectDate = useCallback(
    async (nextDate: Date) => {
      const nextDateString = format(nextDate, "yyyy-MM-dd");
      const previousDate = selectedDate;
      setSelectedDate(nextDateString);
      updateUrl(nextDateString);

      const nextWeekStart = getWeekStartKey(nextDate);
      if (nextWeekStart === weekData.weekStart) {
        return;
      }

      const cached = cacheRef.current.get(nextWeekStart);
      if (cached) {
        setWeekData(cached);
        setLoadedAt(new Date().toISOString());
        return;
      }

      setLoadingWeek(true);
      const requestId = ++requestIdRef.current;

      try {
        const fresh = await fetchWeekData(nextWeekStart);
        if (requestId !== requestIdRef.current) {
          return;
        }
        setWeekData(fresh);
        setLoadedAt(new Date().toISOString());
      } catch (error) {
        setSelectedDate(previousDate);
        updateUrl(previousDate);
        toast({
          title: "Failed to load bookings",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingWeek(false);
        }
      }
    },
    [fetchWeekData, selectedDate, toast, updateUrl, weekData.weekStart]
  );

  const applyBookingChange = useCallback(
    (updater: (current: SerializedBooking[]) => SerializedBooking[]) => {
      setWeekData((current) => {
        const next = {
          ...current,
          bookings: sortBookings(updater(current.bookings)),
        };
        cacheRef.current.set(current.weekStart, next);
        return next;
      });
      setLoadedAt(new Date().toISOString());
    },
    []
  );

  const applyBookingChangeForWeek = useCallback(
    (targetWeekStart: string, updater: (current: SerializedBooking[]) => SerializedBooking[]) => {
      if (weekData.weekStart === targetWeekStart) {
        setWeekData((current) => {
          const next = {
            ...current,
            bookings: sortBookings(updater(current.bookings)),
          };
          cacheRef.current.set(current.weekStart, next);
          return next;
        });
        setLoadedAt(new Date().toISOString());
        return;
      }

      const cached = cacheRef.current.get(targetWeekStart);
      if (!cached) {
        return;
      }

      cacheRef.current.set(targetWeekStart, {
        ...cached,
        bookings: sortBookings(updater(cached.bookings)),
      });
    },
    [weekData.weekStart]
  );

  const handleBookingSaved = useCallback(
    (booking: SerializedBooking) => {
      applyBookingChange((current) => {
        const remaining = current.filter((entry) => entry.id !== booking.id);
        return [...remaining, booking];
      });
    },
    [applyBookingChange]
  );

  const handleBookingPending = useCallback((booking: SerializedBooking) => {
    setPendingBookings((current) => sortBookings([...current, booking]));
    setLoadedAt(new Date().toISOString());
  }, []);

  const handlePendingBookingResolved = useCallback(
    (tempId: string, booking: SerializedBooking | null) => {
      setPendingBookings((current) => current.filter((entry) => entry.id !== tempId));

      if (!booking) {
        return;
      }

      const bookingWeekStart = getWeekStartKey(parseISO(booking.date));
      applyBookingChangeForWeek(bookingWeekStart, (current) => {
        const remaining = current.filter((entry) => entry.id !== booking.id);
        return [...remaining, booking];
      });
    },
    [applyBookingChangeForWeek]
  );

  const handleBookingDeleted = useCallback(
    (bookingId: string) => {
      applyBookingChange((current) => current.filter((entry) => entry.id !== bookingId));
    },
    [applyBookingChange]
  );

  // Build boat lookup from all boats for totals calculation
  const boatMap = useMemo(() => {
    const m = new Map<string, BoatWithRelations>();
    boats.forEach((b) => m.set(b.id, b));
    return m;
  }, [boats]);

  // Calculate totals across ALL resources (not per-tab)
  const dayBookings = useMemo(
    () => visibleBookings.filter((b) => b.date === selectedDate),
    [visibleBookings, selectedDate]
  );

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
          const boat = boatMap.get(b.boatId ?? "");
          if (boat?.category === "tinny") {
            inShed[s] += b.crewCount;
          } else {
            rowing[s] += b.crewCount;
            if (!boat?.isOutside) {
              inShed[s] += b.crewCount;
            }
          }
        } else {
          inShed[s] += b.crewCount;
        }
      }
    }
    return { inShed, rowing };
  }, [dayBookings, boatMap]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-bold">
          Bookings — W/C {format(weekStartObj, "d MMM yyyy")}
        </h1>
        {weekData.bookingWeek?.pymbleNotes && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm text-amber-800">
            {weekData.bookingWeek.pymbleNotes}
          </div>
        )}
      </div>

      <WeekNav
        weekDays={weekDays}
        selectedDate={selectedDateObj}
        onSelectDate={handleSelectDate}
        loading={loadingWeek}
      />

      <TotalsBar inShed={totals.inShed} rowing={totals.rowing} />

      <Tabs defaultValue="shells">
        <TabsList>
          <TabsTrigger value="shells">Shells</TabsTrigger>
          <TabsTrigger value="tinnies">Tinnies</TabsTrigger>
          <TabsTrigger value="oars">Oars</TabsTrigger>
          <TabsTrigger value="gym">Gym & Equipment</TabsTrigger>
        </TabsList>

        <TabsContent value="shells">
          <BookingGrid
            tab="shells"
            boats={boats.filter((b) => b.category === "club" || b.category === "private")}
            equipment={[]}
            oarSets={[]}
            bookings={visibleBookings}
            selectedDate={selectedDate}
            user={user}
            loadedAt={loadedAt}
            onRefresh={refreshCurrentWeek}
            refreshing={loadingWeek}
            onBookingPending={handleBookingPending}
            onPendingBookingResolved={handlePendingBookingResolved}
            onBookingSaved={handleBookingSaved}
            onBookingDeleted={handleBookingDeleted}
          />
        </TabsContent>

        <TabsContent value="tinnies">
          <BookingGrid
            tab="tinnies"
            boats={boats.filter((b) => b.category === "tinny")}
            equipment={[]}
            oarSets={[]}
            bookings={visibleBookings}
            selectedDate={selectedDate}
            user={user}
            loadedAt={loadedAt}
            onRefresh={refreshCurrentWeek}
            refreshing={loadingWeek}
            onBookingPending={handleBookingPending}
            onPendingBookingResolved={handlePendingBookingResolved}
            onBookingSaved={handleBookingSaved}
            onBookingDeleted={handleBookingDeleted}
          />
        </TabsContent>

        <TabsContent value="oars">
          <BookingGrid
            tab="oars"
            boats={[]}
            equipment={[]}
            oarSets={oarSets}
            bookings={visibleBookings}
            selectedDate={selectedDate}
            user={user}
            loadedAt={loadedAt}
            onRefresh={refreshCurrentWeek}
            refreshing={loadingWeek}
            onBookingPending={handleBookingPending}
            onPendingBookingResolved={handlePendingBookingResolved}
            onBookingSaved={handleBookingSaved}
            onBookingDeleted={handleBookingDeleted}
          />
        </TabsContent>

        <TabsContent value="gym">
          <BookingGrid
            tab="gym"
            boats={[]}
            equipment={equipment}
            oarSets={[]}
            bookings={visibleBookings}
            selectedDate={selectedDate}
            user={user}
            loadedAt={loadedAt}
            onRefresh={refreshCurrentWeek}
            refreshing={loadingWeek}
            onBookingPending={handleBookingPending}
            onPendingBookingResolved={handlePendingBookingResolved}
            onBookingSaved={handleBookingSaved}
            onBookingDeleted={handleBookingDeleted}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
