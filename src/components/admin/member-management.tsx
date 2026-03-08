"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  memberType: string;
  weightKg: number | null;
  hasBlackBoatEligibility: boolean;
  squads: { id: string; name: string }[];
};

type Squad = { id: string; name: string };

export function MemberManagement({
  users,
}: {
  users: AdminUser[];
  squads: Squad[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function updateUser(userId: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({ title: "Member updated" });
      router.refresh();
    } else {
      const body = await res.json();
      toast({
        title: body.error ?? "Failed to update member",
        variant: "destructive",
      });
    }
  }

  async function deleteUser(userId: string, fullName: string) {
    const confirmed = window.confirm(
      `Delete user "${fullName}"? This also removes their bookings, invitations, and squad memberships.`
    );
    if (!confirmed) {
      return;
    }

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });
    const body = await res.json();

    if (res.ok) {
      toast({ title: "Member deleted" });
      router.refresh();
    } else {
      toast({
        title: body.error ?? "Failed to delete member",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-2 mt-4">
      {users.map((user) => (
        <Card key={user.id}>
          <CardContent className="py-3">
            {/* Header: name + badges */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium flex items-center flex-wrap gap-1">
                  <span className="truncate">{user.fullName}</span>
                  {user.hasBlackBoatEligibility && (
                    <Badge variant="default">Black Eligible</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {user.email}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {user.role}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {user.memberType.replace("_", " ")}
                  </Badge>
                  {user.squads.map((s) => (
                    <Badge key={s.id} variant="outline" className="text-[10px]">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </div>
              {/* Desktop-only delete */}
              <Button
                variant="destructive"
                size="sm"
                className="hidden sm:flex flex-shrink-0"
                onClick={() => deleteUser(user.id, user.fullName)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t">
              <select
                className="text-xs border rounded px-2 py-1.5 flex-1 min-w-[120px] sm:flex-none"
                value={user.memberType}
                onChange={(e) =>
                  updateUser(user.id, { memberType: e.target.value })
                }
              >
                <option value="senior_competitive">Senior Competitive</option>
                <option value="student">Student</option>
                <option value="recreational">Recreational</option>
              </select>
              <select
                className="text-xs border rounded px-2 py-1.5 flex-1 min-w-[100px] sm:flex-none"
                value={user.role}
                onChange={(e) =>
                  updateUser(user.id, { role: e.target.value })
                }
              >
                <option value="member">Member</option>
                <option value="squad_captain">Squad Captain</option>
                <option value="vice_captain">Vice Captain</option>
                <option value="captain">Captain</option>
                <option value="admin">Admin</option>
              </select>
              <Button
                variant={user.hasBlackBoatEligibility ? "destructive" : "default"}
                size="sm"
                className="text-xs"
                onClick={() =>
                  updateUser(user.id, {
                    hasBlackBoatEligibility: !user.hasBlackBoatEligibility,
                  })
                }
              >
                {user.hasBlackBoatEligibility
                  ? "Revoke Black"
                  : "Grant Black"}
              </Button>
              {/* Mobile-only delete */}
              <Button
                variant="destructive"
                size="sm"
                className="sm:hidden text-xs"
                onClick={() => deleteUser(user.id, user.fullName)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
