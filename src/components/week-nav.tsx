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
}: {
  weekDays: Date[];
  selectedDate: Date;
}) {
  const router = useRouter();

  function navigateTo(date: Date) {
    router.push(`/bookings?date=${format(date, "yyyy-MM-dd")}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => navigateTo(addDays(weekDays[0], -7))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex gap-1">
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => navigateTo(day)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              isSameDay(day, selectedDate)
                ? "bg-blue-600 text-white"
                : "bg-white border text-gray-700 hover:bg-gray-50"
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
        className="h-8 w-8"
        onClick={() => navigateTo(addDays(weekDays[0], 7))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
