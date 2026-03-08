"use client";

import { format, isSameDay } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays } from "date-fns";

export function WeekNav({
  weekDays,
  selectedDate,
  onSelectDate,
  loading = false,
}: {
  weekDays: Date[];
  selectedDate: Date;
  onSelectDate?: (date: Date) => void;
  loading?: boolean;
}) {
  const router = useRouter();

  function navigateTo(date: Date) {
    if (onSelectDate) {
      onSelectDate(date);
      return;
    }

    router.push(`/bookings?date=${format(date, "yyyy-MM-dd")}`);
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 flex-shrink-0"
        aria-label="Previous week"
        disabled={loading}
        onClick={() => navigateTo(addDays(weekDays[0], -7))}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="flex gap-0.5 sm:gap-1 overflow-x-auto">
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => navigateTo(day)}
            disabled={loading}
            className={cn(
              "px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex-shrink-0 min-h-[44px] min-w-[44px]",
              isSameDay(day, selectedDate)
                ? "bg-blue-600 text-white"
                : "bg-white border text-gray-700 hover:bg-gray-50",
              loading && "opacity-60"
            )}
          >
            <span className="hidden sm:inline">
              {format(day, "EEE d MMM")}
            </span>
            <span className="sm:hidden">{format(day, "EEE")}</span>
          </button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 flex-shrink-0"
        aria-label="Next week"
        disabled={loading}
        onClick={() => navigateTo(addDays(weekDays[0], 7))}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
