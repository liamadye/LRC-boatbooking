"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekNav } from "@/components/week-nav";
import { BookingGrid } from "@/components/booking-grid";
import { useToast } from "@/hooks/use-toast";
import { getWeekStartKey } from "@/lib/booking-utils";
import { useLocalCache } from "@/hooks/use-local-cache";
import type {
  BoatWithRelations,
  BookingWeekPayload,
  ReferenceData,
  SerializedBooking,
  UserProfile,
} from "@/lib/types";

type Props = {
  initialSelectedDate: string;
  initialWeekStart: string;
};

const PRIVILEGED_ROLES = new Set(["admin", "captain", "vice_captain"]);

const REF_DATA_MAX_AGE = 30 * 60 * 1000; // 30 minutes
const USER_PROFILE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

function sortBookings(bookings: SerializedBooking[]) {
  return [...bookings].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.startSlot !== b.startSlot) return a.startSlot - b.startSlot;
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    if (a.endMinutes !== b.endMinutes) return a.endMinutes - b.endMinutes;
    return a.id.localeCompare(b.id);
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

function filterVisibleBoats(boats: BoatWithRelations[], user: UserProfile): BoatWithRelations[] {
  const isPrivileged = PRIVILEGED_ROLES.has(user.role);
  return boats.filter((b) => {
    if (b.category !== "private" && b.category !== "syndicate") return true;
    if (isPrivileged) return true;
    if (b.ownerUserId === user.id) return true;
    if (b.privateBoatAccessUserIds?.includes(user.id)) return true;
    return false;
  });
}

export function BookingsClient({ initialSelectedDate, initialWeekStart }: Props) {
  const { toast } = useToast();

  // --- Cached reference data (boats, equipment, oar sets, squads) ---
  const { data: refData, loading: refLoading } = useLocalCache<ReferenceData>(
    "lrc-ref-data",
    () => fetchJson<ReferenceData>("/api/reference-data"),
    REF_DATA_MAX_AGE
  );

  // --- Cached user profile ---
  const { data: user, loading: userLoading } = useLocalCache<UserProfile>(
    "lrc-user-profile",
    () => fetchJson<UserProfile>("/api/profile"),
    USER_PROFILE_MAX_AGE
  );

  // --- Week bookings (always fetched client-side) ---
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [weekData, setWeekData] = useState<BookingWeekPayload | null>(null);
  const [pendingBookings, setPendingBookings] = useState<SerializedBooking[]>([]);
  const [loadedAt, setLoadedAt] = useState(new Date().toISOString());
  const [loadingWeek, setLoadingWeek] = useState(true);
  const cacheRef = useRef(new Map<string, BookingWeekPayload>());
  const requestIdRef = useRef(0);

  const selectedDateObj = useMemo(() => parseISO(selectedDate), [selectedDate]);
  const currentWeekStart = weekData?.weekStart ?? initialWeekStart;
  const weekStartObj = useMemo(() => parseISO(currentWeekStart), [currentWeekStart]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStartObj, index)),
    [weekStartObj]
  );

  const visibleBookings = useMemo(() => {
    if (!weekData) return [];
    const pendingForWeek = pendingBookings.filter(
      (booking) => getWeekStartKey(parseISO(booking.date)) === weekData.weekStart
    );

    if (pendingForWeek.length === 0) {
      return weekData.bookings;
    }

    return sortBookings([...weekData.bookings, ...pendingForWeek]);
  }, [pendingBookings, weekData]);

  // Derived data from caches
  const boats = useMemo(() => {
    if (!refData || !user) return [];
    return filterVisibleBoats(refData.boats, user);
  }, [refData, user]);

  const equipment = refData?.equipment ?? [];
  const oarSets = refData?.oarSets ?? [];

  const effectiveUser = useMemo(() => {
    if (!user || !refData) return null;
    if (user.role === "admin") {
      return { ...user, squads: refData.squads };
    }
    return user;
  }, [user, refData]);

  // --- Data fetching ---
  const fetchWeekData = useCallback(async (weekStart: string) => {
    const payload = await fetchJson<BookingWeekPayload>(
      `/api/bookings?weekStart=${weekStart}`
    );
    cacheRef.current.set(weekStart, payload);
    return payload;
  }, []);

  // Fetch initial week on mount
  useEffect(() => {
    setLoadingWeek(true);
    fetchWeekData(initialWeekStart)
      .then((payload) => {
        setWeekData(payload);
        setLoadedAt(new Date().toISOString());
      })
      .catch((error) => {
        toast({
          title: "Failed to load bookings",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      })
      .finally(() => setLoadingWeek(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prefetchAdjacentWeeks = useCallback(
    async (ws: string) => {
      const current = parseISO(ws);
      const adjacent = [
        format(addDays(current, -7), "yyyy-MM-dd"),
        format(addDays(current, 7), "yyyy-MM-dd"),
      ];

      await Promise.all(
        adjacent.map(async (weekStart) => {
          if (cacheRef.current.has(weekStart)) return;
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
    if (weekData) {
      prefetchAdjacentWeeks(weekData.weekStart).catch(() => undefined);
    }
  }, [prefetchAdjacentWeeks, weekData?.weekStart]);

  const updateUrl = useCallback((nextDate: string) => {
    window.history.replaceState(null, "", `/bookings?date=${nextDate}`);
  }, []);

  const refreshCurrentWeek = useCallback(async () => {
    if (!weekData) return;
    setLoadingWeek(true);
    const requestId = ++requestIdRef.current;

    try {
      const fresh = await fetchWeekData(weekData.weekStart);
      if (requestId !== requestIdRef.current) return;
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
  }, [fetchWeekData, toast, weekData?.weekStart]);

  const handleSelectDate = useCallback(
    async (nextDate: Date) => {
      const nextDateString = format(nextDate, "yyyy-MM-dd");
      const previousDate = selectedDate;
      setSelectedDate(nextDateString);
      updateUrl(nextDateString);

      const nextWeekStart = getWeekStartKey(nextDate);
      if (nextWeekStart === currentWeekStart) return;

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
        if (requestId !== requestIdRef.current) return;
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
    [currentWeekStart, fetchWeekData, selectedDate, toast, updateUrl]
  );

  const applyBookingChange = useCallback(
    (updater: (current: SerializedBooking[]) => SerializedBooking[]) => {
      setWeekData((current) => {
        if (!current) return current;
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
      if (currentWeekStart === targetWeekStart) {
        setWeekData((current) => {
          if (!current) return current;
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
      if (!cached) return;

      cacheRef.current.set(targetWeekStart, {
        ...cached,
        bookings: sortBookings(updater(cached.bookings)),
      });
    },
    [currentWeekStart]
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

      if (!booking) return;

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

  // --- Loading state: show skeleton while essential data loads ---
  const dataReady = !!effectiveUser && !refLoading && !userLoading;

  if (!dataReady) {
    return (
      <div className="space-y-4">
        <div className="sticky top-0 z-40 bg-background pb-3 space-y-3">
          <div className="h-7 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-1">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="h-10 flex-1 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {["Shells", "Tinnies", "Oars", "Gym"].map((tab) => (
            <div key={tab} className="h-9 w-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-10 w-full bg-gray-50 border rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-40 bg-background pb-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-bold">
            Bookings — W/C {format(weekStartObj, "d MMM yyyy")}
          </h1>
          {weekData?.bookingWeek?.pymbleNotes && (
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
      </div>
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
            boats={boats.filter(
              (b) =>
                b.category === "club" ||
                b.category === "private" ||
                b.category === "syndicate"
            )}
            equipment={[]}
            oarSets={[]}
            bookings={visibleBookings}
            selectedDate={selectedDate}
            user={effectiveUser}
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
            user={effectiveUser}
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
            user={effectiveUser}
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
            user={effectiveUser}
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
