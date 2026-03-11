"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { BoatWithRelations } from "@/lib/types";

type Squad = { id: string; name: string };
type AdminUser = { id: string; fullName: string; email: string };

const EMPTY_USER_IDS: string[] = [];
const PRIVATE_LIKE_CATEGORIES = new Set<BoatWithRelations["category"]>(["private", "syndicate"]);
const CATEGORY_OPTIONS: BoatWithRelations["category"][] = ["club", "private", "syndicate", "tinny"];
const CLASSIFICATION_OPTIONS: BoatWithRelations["classification"][] = ["green", "black"];
const STATUS_OPTIONS: BoatWithRelations["status"][] = ["available", "not_in_use"];

type BoatApiResponse = {
  id: string;
  name: string;
  boatType: string;
  category: BoatWithRelations["category"];
  classification: BoatWithRelations["classification"];
  status: BoatWithRelations["status"];
  ownerUserId: string | null;
  avgWeightKg: string | number | null;
  responsibleSquadId: string | null;
  responsibleSquad?: { id: string; name: string } | null;
  responsiblePerson: string | null;
  privateBoatAccess?: { userId: string }[];
  privateBoatAccessUserIds?: string[];
  displayOrder: number;
  notes: string | null;
  isOutside: boolean;
};

type BoatFormState = {
  name: string;
  boatType: string;
  category: BoatWithRelations["category"];
  classification: BoatWithRelations["classification"];
  status: BoatWithRelations["status"];
  responsibleSquadId: string;
  ownerUserId: string;
  avgWeightKg: string;
  privateBoatAccessUserIds: string[];
};

function sortBoats(boats: BoatWithRelations[]) {
  return [...boats].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }
    return left.name.localeCompare(right.name);
  });
}

function normalizeBoat(
  boat: BoatApiResponse | BoatWithRelations,
  previous?: BoatWithRelations
): BoatWithRelations {
  const privateBoatAccessUserIds =
    "privateBoatAccess" in boat && Array.isArray(boat.privateBoatAccess)
      ? boat.privateBoatAccess.map((entry) => entry.userId)
      : previous?.privateBoatAccessUserIds ?? boat.privateBoatAccessUserIds ?? EMPTY_USER_IDS;

  return {
    ...(previous ?? {}),
    ...boat,
    avgWeightKg:
      boat.avgWeightKg === null || boat.avgWeightKg === undefined
        ? null
        : Number(boat.avgWeightKg),
    privateBoatAccessUserIds,
  };
}

function buildWeightDrafts(boats: BoatWithRelations[]) {
  return Object.fromEntries(
    boats.map((boat) => [boat.id, boat.avgWeightKg == null ? "" : String(boat.avgWeightKg)])
  );
}

function createEmptyForm(): BoatFormState {
  return {
    name: "",
    boatType: "",
    category: "club",
    classification: "green",
    status: "available",
    responsibleSquadId: "",
    ownerUserId: "",
    avgWeightKg: "",
    privateBoatAccessUserIds: [],
  };
}

function createFormFromBoat(boat: BoatWithRelations): BoatFormState {
  return {
    name: boat.name,
    boatType: boat.boatType,
    category: boat.category,
    classification: boat.classification,
    status: boat.status,
    responsibleSquadId: boat.responsibleSquadId ?? "",
    ownerUserId: boat.ownerUserId ?? "",
    avgWeightKg: boat.avgWeightKg == null ? "" : String(boat.avgWeightKg),
    privateBoatAccessUserIds: boat.privateBoatAccessUserIds ?? [],
  };
}

function isPrivateLikeCategory(category: BoatWithRelations["category"]) {
  return PRIVATE_LIKE_CATEGORIES.has(category);
}

export function BoatManagement({
  boats,
  squads,
  users,
}: {
  boats: BoatWithRelations[];
  squads: Squad[];
  users: AdminUser[];
}) {
  const { toast } = useToast();
  const [managedBoats, setManagedBoats] = useState(sortBoats(boats));
  const [weightDrafts, setWeightDrafts] = useState<Record<string, string>>(buildWeightDrafts(boats));
  const [expandedBoatId, setExpandedBoatId] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingBoatId, setEditingBoatId] = useState<string | null>(null);
  const [formState, setFormState] = useState<BoatFormState>(createEmptyForm());

  useEffect(() => {
    setManagedBoats(sortBoats(boats));
    setWeightDrafts(buildWeightDrafts(boats));
  }, [boats]);

  const editingBoat = useMemo(
    () => managedBoats.find((boat) => boat.id === editingBoatId) ?? null,
    [editingBoatId, managedBoats]
  );
  const formIsPrivateLike = isPrivateLikeCategory(formState.category);

  function setPending(key: string, pending: boolean) {
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

  function isPending(key: string) {
    return !!pendingActions[key];
  }

  async function mutateBoat(args: {
    boatId: string;
    action: string;
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

    const pendingKey = `${args.boatId}:${args.action}`;
    setManagedBoats((current) =>
      sortBoats(current.map((boat) => (boat.id === args.boatId ? args.optimistic(boat) : boat)))
    );
    setPending(pendingKey, true);

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
        sortBoats(
          current.map((boat) =>
            boat.id === args.boatId ? normalizeBoat(data as BoatApiResponse, boat) : boat
          )
        )
      );
      setWeightDrafts((current) => ({
        ...current,
        [args.boatId]:
          data.avgWeightKg === null || data.avgWeightKg === undefined
            ? ""
            : String(Number(data.avgWeightKg)),
      }));
      toast({ title: args.successTitle });
    } catch (error) {
      setManagedBoats((current) =>
        sortBoats(current.map((boat) => (boat.id === args.boatId ? previousBoat : boat)))
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
      setPending(pendingKey, false);
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

  function openCreateDialog() {
    setDialogMode("create");
    setEditingBoatId(null);
    setFormState(createEmptyForm());
  }

  function openEditDialog(boat: BoatWithRelations) {
    setDialogMode("edit");
    setEditingBoatId(boat.id);
    setFormState(createFormFromBoat(boat));
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingBoatId(null);
    setFormState(createEmptyForm());
  }

  function updateForm<K extends keyof BoatFormState>(key: K, value: BoatFormState[K]) {
    setFormState((current) => ({
      ...current,
      [key]: value,
      ...(key === "category" && !isPrivateLikeCategory(value as BoatWithRelations["category"])
        ? { ownerUserId: "", privateBoatAccessUserIds: [] }
        : {}),
    }));
  }

  function addFormAccessUser(userId: string) {
    if (!userId) {
      return;
    }

    setFormState((current) => ({
      ...current,
      privateBoatAccessUserIds: current.privateBoatAccessUserIds.includes(userId)
        ? current.privateBoatAccessUserIds
        : [...current.privateBoatAccessUserIds, userId],
    }));
  }

  function removeFormAccessUser(userId: string) {
    setFormState((current) => ({
      ...current,
      privateBoatAccessUserIds: current.privateBoatAccessUserIds.filter((entry) => entry !== userId),
    }));
  }

  async function saveBoatForm() {
    const name = formState.name.trim();
    const boatType = formState.boatType.trim();
    const weightDraft = formState.avgWeightKg.trim();

    if (name.length === 0) {
      toast({ title: "Boat name is required", variant: "destructive" });
      return;
    }

    if (boatType.length === 0) {
      toast({ title: "Boat type is required", variant: "destructive" });
      return;
    }

    if (weightDraft !== "" && Number.isNaN(Number(weightDraft))) {
      toast({
        title: "Invalid weight",
        description: "Weight must be a number in kilograms.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name,
      boatType,
      category: formState.category,
      classification: formState.classification,
      status: formState.status,
      responsibleSquadId: formState.responsibleSquadId || null,
      ownerUserId: formIsPrivateLike ? formState.ownerUserId || null : null,
      avgWeightKg: weightDraft === "" ? null : Number(weightDraft),
      privateBoatAccessUserIds: formIsPrivateLike ? formState.privateBoatAccessUserIds : [],
    };

    const pendingKey = dialogMode === "create" ? "boat:create" : `boat:${editingBoatId}:details`;
    setPending(pendingKey, true);

    try {
      const res = await fetch(
        dialogMode === "create" ? "/api/admin/boats" : `/api/admin/boats/${editingBoatId}`,
        {
          method: dialogMode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
            ? data.error
            : "Request failed."
        );
      }

      if (dialogMode === "create") {
        const createdBoat = normalizeBoat(data as BoatApiResponse);
        setManagedBoats((current) => sortBoats([...current, createdBoat]));
        setWeightDrafts((current) => ({
          ...current,
          [createdBoat.id]: createdBoat.avgWeightKg == null ? "" : String(createdBoat.avgWeightKg),
        }));
        toast({ title: "Boat created" });
      } else if (editingBoatId) {
        setManagedBoats((current) =>
          sortBoats(
            current.map((boat) =>
              boat.id === editingBoatId ? normalizeBoat(data as BoatApiResponse, boat) : boat
            )
          )
        );
        setWeightDrafts((current) => ({
          ...current,
          [editingBoatId]:
            data.avgWeightKg === null || data.avgWeightKg === undefined
              ? ""
              : String(Number(data.avgWeightKg)),
        }));
        toast({ title: "Boat updated" });
      }

      closeDialog();
    } catch (error) {
      toast({
        title: dialogMode === "create" ? "Failed to create boat" : "Failed to update boat",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPending(pendingKey, false);
    }
  }

  async function deleteBoat(boat: BoatWithRelations) {
    if (!window.confirm(`Delete ${boat.name}? This cannot be undone.`)) {
      return;
    }

    const pendingKey = `${boat.id}:delete`;
    setPending(pendingKey, true);

    try {
      const res = await fetch(`/api/admin/boats/${boat.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
            ? data.error
            : "Request failed."
        );
      }

      setManagedBoats((current) => current.filter((entry) => entry.id !== boat.id));
      setWeightDrafts((current) => {
        const next = { ...current };
        delete next[boat.id];
        return next;
      });
      if (expandedBoatId === boat.id) {
        setExpandedBoatId(null);
      }
      toast({ title: "Boat deleted" });
    } catch (error) {
      toast({
        title: "Failed to delete boat",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPending(pendingKey, false);
    }
  }

  const availableFormAccessUsers = users.filter(
    (user) =>
      user.id !== formState.ownerUserId && !formState.privateBoatAccessUserIds.includes(user.id)
  );
  const selectedFormAccessUsers = users.filter((user) =>
    formState.privateBoatAccessUserIds.includes(user.id)
  );

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Boat Management</h2>
          <p className="text-xs text-muted-foreground">
            Create, edit, disable, and delete boats. Private and syndicate boats can also manage owners and access.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Boat
        </Button>
      </div>

      {managedBoats.map((boat) => {
        const isExpanded = expandedBoatId === boat.id;
        const isPrivateLike = isPrivateLikeCategory(boat.category);
        const ownerSaving = isPending(`${boat.id}:owner`);
        const accessSaving = isPending(`${boat.id}:access`);
        const weightSaving = isPending(`${boat.id}:weight`);
        const statusSaving = isPending(`${boat.id}:status`);
        const classificationSaving = isPending(`${boat.id}:classification`);
        const deleteSaving = isPending(`${boat.id}:delete`);

        return (
          <Card key={boat.id} className={boat.status === "not_in_use" ? "opacity-60" : ""}>
            <CardContent className="py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {boat.classification === "black" ? (
                    <Circle className="h-4 w-4 flex-shrink-0 fill-gray-800 text-gray-800" style={{ aspectRatio: "1/1" }} />
                  ) : (
                    <Circle className="h-4 w-4 flex-shrink-0 fill-green-500 text-green-500" style={{ aspectRatio: "1/1" }} />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {boat.name}
                      {isPrivateLike && <Lock className="inline h-3 w-3 ml-1 text-blue-500" />}
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

                <div className="flex items-center gap-1 flex-wrap justify-end">
                  <Badge variant="outline">{boat.category}</Badge>
                  {isPrivateLike && (
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
                    onClick={() => openEditDialog(boat)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-red-600 hover:text-red-700"
                    onClick={() => deleteBoat(boat)}
                    disabled={deleteSaving}
                  >
                    {deleteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

              {isExpanded && isPrivateLike && (
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

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Add Boat" : `Edit ${editingBoat?.name ?? "Boat"}`}</DialogTitle>
            <DialogDescription>
              Configure the boat details, category, and private access settings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Boat name</label>
              <Input
                className="mt-1"
                value={formState.name}
                onChange={(event) => updateForm("name", event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Boat type</label>
              <Input
                className="mt-1"
                value={formState.boatType}
                onChange={(event) => updateForm("boatType", event.target.value)}
                placeholder="e.g. 8+, 4x/4-/4+, 1x"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={formState.category}
                onChange={(event) =>
                  updateForm("category", event.target.value as BoatWithRelations["category"])
                }
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Responsible squad</label>
              <select
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={formState.responsibleSquadId}
                onChange={(event) => updateForm("responsibleSquadId", event.target.value)}
              >
                <option value="">Unassigned</option>
                {squads.map((squad) => (
                  <option key={squad.id} value={squad.id}>
                    {squad.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Classification</label>
              <select
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={formState.classification}
                onChange={(event) =>
                  updateForm(
                    "classification",
                    event.target.value as BoatWithRelations["classification"]
                  )
                }
              >
                {CLASSIFICATION_OPTIONS.map((classification) => (
                  <option key={classification} value={classification}>
                    {classification}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={formState.status}
                onChange={(event) =>
                  updateForm("status", event.target.value as BoatWithRelations["status"])
                }
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Boat weight (kg)</label>
              <Input
                className="mt-1"
                type="number"
                step="0.1"
                inputMode="decimal"
                value={formState.avgWeightKg}
                onChange={(event) => updateForm("avgWeightKg", event.target.value)}
              />
            </div>
          </div>

          {formIsPrivateLike && (
            <div className="space-y-3 rounded-lg border p-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Owner</label>
                <select
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  value={formState.ownerUserId}
                  onChange={(event) => updateForm("ownerUserId", event.target.value)}
                >
                  <option value="">No owner</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Allowed users ({selectedFormAccessUsers.length})
                </label>
                {selectedFormAccessUsers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedFormAccessUsers.map((user) => (
                      <Badge key={user.id} variant="secondary" className="gap-1">
                        {user.fullName}
                        <button
                          type="button"
                          className="hover:text-red-600"
                          onClick={() => removeFormAccessUser(user.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <select
                    className="flex-1 rounded-md border px-3 py-2 text-sm"
                    value=""
                    onChange={(event) => addFormAccessUser(event.target.value)}
                  >
                    <option value="">Select a member to add...</option>
                    {availableFormAccessUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveBoatForm()}
              disabled={isPending(dialogMode === "create" ? "boat:create" : `boat:${editingBoatId}:details`)}
            >
              {isPending(dialogMode === "create" ? "boat:create" : `boat:${editingBoatId}:details`) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {dialogMode === "create" ? "Create Boat" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
                  type="button"
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
