"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export type Filters = {
  search: string;
  classification: "all" | "black" | "green";
  status: "all" | "available" | "not_in_use";
};

export function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white px-3 py-2">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search boats..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">Classification:</label>
        <select
          className="text-sm border rounded px-2 py-1 h-8"
          value={filters.classification}
          onChange={(e) =>
            onChange({ ...filters, classification: e.target.value as Filters["classification"] })
          }
        >
          <option value="all">All</option>
          <option value="green">Green (open)</option>
          <option value="black">Black (restricted)</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">Status:</label>
        <select
          className="text-sm border rounded px-2 py-1 h-8"
          value={filters.status}
          onChange={(e) =>
            onChange({ ...filters, status: e.target.value as Filters["status"] })
          }
        >
          <option value="all">All</option>
          <option value="available">Available</option>
          <option value="not_in_use">Not in use</option>
        </select>
      </div>
    </div>
  );
}
