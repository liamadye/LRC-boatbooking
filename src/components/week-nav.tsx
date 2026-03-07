"use client";

import { format, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function WeekNav({
  weekDays,
  selectedDate,
  onDayChange,
  onWeekChange,
}: {
  weekDays: Date[];
  selectedDate: string;
  onDayChange: (date: Date) => void;
  onWeekChange: (offset: number) => void;
}) {
  const selected = parseISO(selectedDate);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onWeekChange(-7)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex gap-1">
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onDayChange(day)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              isSameDay(day, selected)
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
        onClick={() => onWeekChange(7)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
