"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

type AuditEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  user: { fullName: string; email: string };
};

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "user.update", label: "User update" },
  { value: "boat.update", label: "Boat update" },
  { value: "application.review", label: "Application review" },
  { value: "invitation.send", label: "Invitation send" },
  { value: "signup_request.approve", label: "Signup approve" },
  { value: "signup_request.deny", label: "Signup deny" },
  { value: "booking.cancel", label: "Booking cancel" },
];

const TARGET_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "user", label: "User" },
  { value: "boat", label: "Boat" },
  { value: "application", label: "Application" },
  { value: "invitation", label: "Invitation" },
  { value: "signup_request", label: "Signup request" },
  { value: "booking", label: "Booking" },
];

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  async function fetchLogs(p = page) {
    setLoading(true);
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (targetType) params.set("targetType", targetType);
    params.set("page", String(p));

    try {
      const res = await fetch(`/api/admin/audit-log?${params}`);
      if (!res.ok) {
        throw new Error("Failed to load audit log.");
      }
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setPage(data.page);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, targetType]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function formatChanges(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
    const parts: string[] = [];
    const keys = Array.from(new Set([
      ...Object.keys(before ?? {}),
      ...Object.keys(after ?? {}),
    ]));
    for (const key of keys) {
      const b = before?.[key];
      const a = after?.[key];
      if (b !== undefined && a !== undefined && b !== a) {
        parts.push(`${key}: ${String(b)} → ${String(a)}`);
      } else if (b === undefined && a !== undefined) {
        parts.push(`${key}: ${String(a)}`);
      } else if (b !== undefined && a === undefined) {
        parts.push(`${key}: ${String(b)} (removed)`);
      }
    }
    return parts.length > 0 ? parts.join(", ") : "—";
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <Label htmlFor="actionFilter">Action</Label>
          <select
            id="actionFilter"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="block w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="targetTypeFilter">Target Type</Label>
          <select
            id="targetTypeFilter"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="block w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TARGET_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {loading && logs.length === 0
          ? "Loading audit log..."
          : `${total} entr${total !== 1 ? "ies" : "y"} found`}
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-3 py-2 text-left font-medium">When</th>
              <th className="px-3 py-2 text-left font-medium">Who</th>
              <th className="px-3 py-2 text-left font-medium">Action</th>
              <th className="px-3 py-2 text-left font-medium">Target</th>
              <th className="px-3 py-2 text-left font-medium">Changes</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t hover:bg-gray-50/50">
                <td className="px-3 py-2 whitespace-nowrap">
                  {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm")}
                </td>
                <td className="px-3 py-2">
                  <div>{log.user.fullName}</div>
                  <div className="text-xs text-muted-foreground">{log.user.email}</div>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {log.action}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="text-xs text-muted-foreground">{log.targetType}</div>
                  <div className="text-xs font-mono truncate max-w-[120px]">{log.targetId.slice(0, 8)}</div>
                </td>
                <td className="px-3 py-2 text-muted-foreground max-w-[300px] truncate">
                  {formatChanges(log.before, log.after)}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  {loading ? "Loading..." : "No audit log entries found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => fetchLogs(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => fetchLogs(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
