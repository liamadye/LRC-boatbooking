"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Circle, Lock, Users, ChevronDown, ChevronRight, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BoatWithRelations } from "@/lib/types";

type Squad = { id: string; name: string };
type AdminUser = { id: string; fullName: string; email: string };

export function BoatManagement({
  boats,
  users,
}: {
  boats: BoatWithRelations[];
  squads: Squad[];
  users?: AdminUser[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [expandedBoatId, setExpandedBoatId] = useState<string | null>(null);
  const [savingAccess, setSavingAccess] = useState(false);

  async function toggleStatus(boatId: string, currentStatus: string) {
    const newStatus = currentStatus === "available" ? "not_in_use" : "available";
    const res = await fetch(`/api/admin/boats/${boatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      toast({ title: `Boat ${newStatus === "not_in_use" ? "disabled" : "enabled"}` });
      router.refresh();
    }
  }

  async function toggleClassification(boatId: string, current: string) {
    const newClass = current === "black" ? "green" : "black";
    const res = await fetch(`/api/admin/boats/${boatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classification: newClass }),
    });

    if (res.ok) {
      toast({ title: `Boat set to ${newClass}` });
      router.refresh();
    }
  }

  async function updateOwner(boatId: string, ownerUserId: string | null) {
    const res = await fetch(`/api/admin/boats/${boatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerUserId: ownerUserId || null }),
    });

    if (res.ok) {
      toast({ title: "Owner updated" });
      router.refresh();
    }
  }

  async function updateAccessList(boatId: string, userIds: string[]) {
    setSavingAccess(true);
    const res = await fetch(`/api/admin/boats/${boatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privateBoatAccessUserIds: userIds }),
    });

    if (res.ok) {
      toast({ title: "Access list updated" });
      router.refresh();
    } else {
      toast({ title: "Failed to update access", variant: "destructive" });
    }
    setSavingAccess(false);
  }

  return (
    <div className="space-y-2 mt-4">
      {boats.map((boat) => {
        const isExpanded = expandedBoatId === boat.id;
        const isPrivate = boat.category === "private" || boat.category === "syndicate";

        return (
          <Card key={boat.id} className={boat.status === "not_in_use" ? "opacity-60" : ""}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {boat.classification === "black" ? (
                    <Circle className="h-4 w-4 fill-gray-800 text-gray-800" />
                  ) : (
                    <Circle className="h-4 w-4 fill-green-500 text-green-500" />
                  )}
                  <div>
                    <div className="font-medium">
                      {boat.name}
                      {boat.category === "private" && (
                        <Lock className="inline h-3 w-3 ml-1 text-blue-500" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {boat.boatType} — {boat.responsibleSquad?.name ?? boat.responsiblePerson ?? "Unassigned"}
                      {boat.avgWeightKg && ` — ${boat.avgWeightKg}kg`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{boat.category}</Badge>
                  {isPrivate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedBoatId(isExpanded ? null : boat.id)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Access
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 ml-1" />
                      ) : (
                        <ChevronRight className="h-3 w-3 ml-1" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleClassification(boat.id, boat.classification)}
                  >
                    {boat.classification === "black" ? "Set Green" : "Set Black"}
                  </Button>
                  <Button
                    variant={boat.status === "not_in_use" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => toggleStatus(boat.id, boat.status)}
                  >
                    {boat.status === "not_in_use" ? "Enable" : "Disable"}
                  </Button>
                </div>
              </div>

              {isExpanded && isPrivate && users && (
                <PrivateBoatAccessPanel
                  boat={boat}
                  users={users}
                  onUpdateOwner={(userId) => updateOwner(boat.id, userId)}
                  onUpdateAccess={(userIds) => updateAccessList(boat.id, userIds)}
                  saving={savingAccess}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PrivateBoatAccessPanel({
  boat,
  users,
  onUpdateOwner,
  onUpdateAccess,
  saving,
}: {
  boat: BoatWithRelations;
  users: AdminUser[];
  onUpdateOwner: (userId: string | null) => void;
  onUpdateAccess: (userIds: string[]) => void;
  saving: boolean;
}) {
  const accessUserIds = boat.privateBoatAccessUserIds ?? [];
  const [selectedUserId, setSelectedUserId] = useState("");

  const accessUsers = users.filter((u) => accessUserIds.includes(u.id));
  const availableUsers = users.filter(
    (u) => !accessUserIds.includes(u.id) && u.id !== boat.ownerUserId
  );

  function handleAddUser() {
    if (!selectedUserId) return;
    onUpdateAccess([...accessUserIds, selectedUserId]);
    setSelectedUserId("");
  }

  function handleRemoveUser(userId: string) {
    onUpdateAccess(accessUserIds.filter((id) => id !== userId));
  }

  return (
    <div className="mt-3 pt-3 border-t space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Owner</label>
        <select
          className="mt-1 block w-full text-sm border rounded-md px-2 py-1.5"
          value={boat.ownerUserId ?? ""}
          onChange={(e) => onUpdateOwner(e.target.value || null)}
        >
          <option value="">No owner</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName} ({u.email})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Allowed Users ({accessUsers.length})
        </label>
        {accessUsers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {accessUsers.map((u) => (
              <Badge key={u.id} variant="secondary" className="gap-1">
                {u.fullName}
                <button
                  onClick={() => handleRemoveUser(u.id)}
                  disabled={saving}
                  className="hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <select
            className="flex-1 text-sm border rounded-md px-2 py-1.5"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Select a member to add...</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.email})
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleAddUser}
            disabled={!selectedUserId || saving}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
