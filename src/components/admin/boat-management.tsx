"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Circle, Lock, Users, ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BoatWithRelations } from "@/lib/types";

type Squad = { id: string; name: string };
type AdminUser = { id: string; fullName: string; email: string };
const EMPTY_USER_IDS: string[] = [];

type BoatApiResponse = {
  id: string;
  ownerUserId: string | null;
  avgWeightKg: string | number | null;
  status: BoatWithRelations["status"];
  classification: BoatWithRelations["classification"];
  responsibleSquadId: string | null;
  privateBoatAccess?: { userId: string }[];
};

function normalizeBoat(boat: BoatApiResponse, previous: BoatWithRelations): BoatWithRelations {
  return {
    ...previous,
    ...boat,
    avgWeightKg:
      boat.avgWeightKg === null || boat.avgWeightKg === undefined
        ? null
        : Number(boat.avgWeightKg),
    privateBoatAccessUserIds:
      boat.privateBoatAccess?.map((entry) => entry.userId) ?? previous.privateBoatAccessUserIds ?? [],
  };
}

function buildWeightDrafts(boats: BoatWithRelations[]) {
  return Object.fromEntries(
    boats.map((boat) => [boat.id, boat.avgWeightKg == null ? "" : String(boat.avgWeightKg)])
  );
}

export function BoatManagement({
  boats,
  squads,
  users,
}: {
  boats: BoatWithRelations[];
  squads: Squad[];
  users?: AdminUser[];
}) {
  const { toast } = useToast();
  const [managedBoats, setManagedBoats] = useState(boats);
  const [weightDrafts, setWeightDrafts] = useState<Record<string, string>>(buildWeightDrafts(boats));
  const [expandedBoatId, setExpandedBoatId] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setManagedBoats(boats);
    setWeightDrafts(buildWeightDrafts(boats));
  }, [boats]);

  function setPending(boatId: string, action: string, pending: boolean) {
    const key = `${boatId}:${action}`;
    setPendingActions((current) => {
      if (!pending) {
        const next = { ...current };
        delete next[key];
        return next;
      }

      return {
        ...current,
        [key]: true,
      };
    });
  }

  function isPending(boatId: string, action: string) {
    return !!pendingActions[`${boatId}:${action}`];
  }

  async function mutateBoat(args: {
    boatId: string;
    action: "status" | "classification" | "owner" | "access" | "weight" | "responsibleSquad";
    payload: Record<string, unknown>;
    optimistic: (boat: BoatWithRelations) => BoatWithRelations;
    successTitle: string;
    errorTitle: string;
    rollbackWeightDraft?: string;
  }) {
    const previousBoat = managedBoats.find((boat) => boat.id === args.boatId);
    if (!previousBoat) {
      return;
    }

    setManagedBoats((current) =>
      current.map((boat) => (boat.id === args.boatId ? args.optimistic(boat) : boat))
    );
    setPending(args.boatId, args.action, true);

    try {
      const res = await fetch(`/api/admin/boats/${args.boatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args.payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
            ? data.error
            : "Request failed."
        );
      }

      setManagedBoats((current) =>
        current.map((boat) =>
          boat.id === args.boatId ? normalizeBoat(data as BoatApiResponse, boat) : boat
        )
      );
      setWeightDrafts((current) => ({
        ...current,
        [args.boatId]:
          data.avgWeightKg === null || data.avgWeightKg === undefined ? "" : String(Number(data.avgWeightKg)),
      }));
      toast({ title: args.successTitle });
    } catch (error) {
      setManagedBoats((current) =>
        current.map((boat) => (boat.id === args.boatId ? previousBoat : boat))
      );
      setWeightDrafts((current) => ({
        ...current,
        [args.boatId]:
          args.rollbackWeightDraft ??
          (previousBoat.avgWeightKg == null ? "" : String(previousBoat.avgWeightKg)),
      }));
      toast({
        title: args.errorTitle,
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPending(args.boatId, args.action, false);
    }
  }

  async function updateResponsibleSquad(boatId: string, squadId: string | null) {
    const selectedSquad = squads.find((squad) => squad.id === squadId) ?? null;
    await mutateBoat({
      boatId,
      action: "responsibleSquad",
      payload: { responsibleSquadId: squadId || null },
      optimistic: (boat) => ({
        ...boat,
        responsibleSquadId: squadId,
        responsibleSquad: selectedSquad,
      }),
      successTitle: "Responsible squad updated",
      errorTitle: "Failed to update responsible squad",
    });
  }

  async function toggleStatus(boatId: string, currentStatus: BoatWithRelations["status"]) {
    const newStatus = currentStatus === "available" ? "not_in_use" : "available";
    await mutateBoat({
      boatId,
      action: "status",
      payload: { status: newStatus },
      optimistic: (boat) => ({ ...boat, status: newStatus }),
      successTitle: `Boat ${newStatus === "not_in_use" ? "disabled" : "enabled"}`,
      errorTitle: "Failed to update boat status",
    });
  }

  async function toggleClassification(
    boatId: string,
    currentClassification: BoatWithRelations["classification"]
  ) {
    const newClassification = currentClassification === "black" ? "green" : "black";
    await mutateBoat({
      boatId,
      action: "classification",
      payload: { classification: newClassification },
      optimistic: (boat) => ({ ...boat, classification: newClassification }),
      successTitle: `Boat set to ${newClassification}`,
      errorTitle: "Failed to update boat classification",
    });
  }

  async function updateOwner(boatId: string, ownerUserId: string | null) {
    await mutateBoat({
      boatId,
      action: "owner",
      payload: { ownerUserId: ownerUserId || null },
      optimistic: (boat) => ({ ...boat, ownerUserId }),
      successTitle: "Owner updated",
      errorTitle: "Failed to update owner",
    });
  }

  async function updateAccessList(boatId: string, userIds: string[]) {
    await mutateBoat({
      boatId,
      action: "access",
      payload: { privateBoatAccessUserIds: userIds },
      optimistic: (boat) => ({ ...boat, privateBoatAccessUserIds: userIds }),
      successTitle: "Access list updated",
      errorTitle: "Failed to update access list",
    });
  }

  async function saveWeight(boatId: string) {
    const draft = weightDrafts[boatId]?.trim() ?? "";
    if (draft !== "" && Number.isNaN(Number(draft))) {
      toast({
        title: "Invalid weight",
        description: "Weight must be a number in kilograms.",
        variant: "destructive",
      });
      return;
    }

    const nextWeight = draft === "" ? null : Number(draft);
    await mutateBoat({
      boatId,
      action: "weight",
      payload: { avgWeightKg: nextWeight },
      optimistic: (boat) => ({ ...boat, avgWeightKg: nextWeight }),
      successTitle: "Boat weight updated",
      errorTitle: "Failed to update boat weight",
      rollbackWeightDraft: draft,
    });
  }

  return (
    <div className="space-y-2 mt-4">
      {managedBoats.map((boat) => {
        const isExpanded = expandedBoatId === boat.id;
        const isPrivate = boat.category === "private" || boat.category === "syndicate";
        const ownerSaving = isPending(boat.id, "owner");
        const accessSaving = isPending(boat.id, "access");
        const weightSaving = isPending(boat.id, "weight");
        const statusSaving = isPending(boat.id, "status");
        const classificationSaving = isPending(boat.id, "classification");

        return (
          <Card key={boat.id} className={boat.status === "not_in_use" ? "opacity-60" : ""}>
            <CardContent className="py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {boat.classification === "black" ? (
                    <Circle className="h-4 w-4 flex-shrink-0 fill-gray-800 text-gray-800" style={{ aspectRatio: "1/1" }} />
                  ) : (
                    <Circle className="h-4 w-4 flex-shrink-0 fill-green-500 text-green-500" style={{ aspectRatio: "1/1" }} />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {boat.name}
                      {boat.category === "private" && (
                        <Lock className="inline h-3 w-3 ml-1 text-blue-500" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                      <span>{boat.boatType}</span>
                      <span>—</span>
                      <select
                        className="text-xs border rounded px-1 py-0.5 bg-transparent hover:bg-gray-50"
                        value={boat.responsibleSquadId ?? ""}
                        onChange={(e) => updateResponsibleSquad(boat.id, e.target.value || null)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">{boat.responsiblePerson ?? "Unassigned"}</option>
                        {squads.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      {boat.avgWeightKg != null && <span>— {boat.avgWeightKg}kg</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge variant="outline">{boat.category}</Badge>
                  {isPrivate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs px-2"
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
                    className="h-8 text-xs px-2"
                    onClick={() => toggleClassification(boat.id, boat.classification)}
                    disabled={classificationSaving}
                  >
                    {classificationSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    {boat.classification === "black" ? "Set Green" : "Set Black"}
                  </Button>
                  <Button
                    variant={boat.status === "not_in_use" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 text-xs px-2"
                    onClick={() => toggleStatus(boat.id, boat.status)}
                    disabled={statusSaving}
                  >
                    {statusSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    {boat.status === "not_in_use" ? "Enable" : "Disable"}
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="w-full max-w-[180px]">
                  <label className="text-xs font-medium text-muted-foreground">Boat weight (kg)</label>
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={weightDrafts[boat.id] ?? ""}
                    onChange={(event) =>
                      setWeightDrafts((current) => ({
                        ...current,
                        [boat.id]: event.target.value,
                      }))
                    }
                    disabled={weightSaving}
                    className="mt-1"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveWeight(boat.id)}
                  disabled={weightSaving}
                >
                  {weightSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Save Weight
                </Button>
              </div>

              {isExpanded && isPrivate && users && (
                <PrivateBoatAccessPanel
                  boat={boat}
                  users={users}
                  ownerSaving={ownerSaving}
                  accessSaving={accessSaving}
                  onUpdateOwner={(userId) => updateOwner(boat.id, userId)}
                  onUpdateAccess={(userIds) => updateAccessList(boat.id, userIds)}
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
  ownerSaving,
  accessSaving,
  onUpdateOwner,
  onUpdateAccess,
}: {
  boat: BoatWithRelations;
  users: AdminUser[];
  ownerSaving: boolean;
  accessSaving: boolean;
  onUpdateOwner: (userId: string | null) => void;
  onUpdateAccess: (userIds: string[]) => void;
}) {
  const accessUserIds = boat.privateBoatAccessUserIds ?? EMPTY_USER_IDS;
  const [selectedUserId, setSelectedUserId] = useState("");

  const accessUsers = useMemo(
    () => users.filter((user) => accessUserIds.includes(user.id)),
    [accessUserIds, users]
  );
  const availableUsers = useMemo(
    () => users.filter((user) => !accessUserIds.includes(user.id) && user.id !== boat.ownerUserId),
    [accessUserIds, boat.ownerUserId, users]
  );

  function handleAddUser() {
    if (!selectedUserId) {
      return;
    }

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
        <div className="mt-1 relative">
          <select
            className="block w-full text-sm border rounded-md px-2 py-1.5"
            value={boat.ownerUserId ?? ""}
            onChange={(event) => onUpdateOwner(event.target.value || null)}
            disabled={ownerSaving}
          >
            <option value="">No owner</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName} ({user.email})
              </option>
            ))}
          </select>
          {ownerSaving && (
            <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Allowed Users ({accessUsers.length})
        </label>
        {accessUsers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {accessUsers.map((user) => (
              <Badge key={user.id} variant="secondary" className="gap-1">
                {user.fullName}
                <button
                  onClick={() => handleRemoveUser(user.id)}
                  disabled={accessSaving}
                  className="hover:text-red-600 disabled:opacity-50"
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
            onChange={(event) => setSelectedUserId(event.target.value)}
            disabled={accessSaving}
          >
            <option value="">Select a member to add...</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName} ({user.email})
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleAddUser}
            disabled={!selectedUserId || accessSaving}
          >
            {accessSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
