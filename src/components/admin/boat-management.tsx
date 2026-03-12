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
import {
  BOAT_CLASS_FILTER_OPTIONS,
  BOAT_CLASS_OPTIONS,
  CATEGORY_FILTER_OPTIONS,
  CLASSIFICATION_FILTER_OPTIONS,
  COXED_FILTER_OPTIONS,
  deriveBoatTypeLabel,
  getBoatCategoryLabel,
  isPrivateLikeCategory,
  matchesBoatClassFilter,
  matchesClassificationFilter,
  matchesCoxedFilter,
  normalizeBoatSpec,
  validateBoatSpec,
  type BoatClass,
  type BoatClassFilter,
  type CategoryFilter,
  type CoxedFilter,
} from "@/lib/boats";
import type { BoatWithRelations } from "@/lib/types";

type Squad = { id: string; name: string };
type AdminUser = { id: string; fullName: string; email: string };

const EMPTY_USER_IDS: string[] = [];
const STATUS_OPTIONS: BoatWithRelations["status"][] = ["available", "not_in_use"];

type BoatApiResponse = BoatWithRelations;

type BoatFormState = {
  name: string;
  boatClass: BoatClass;
  supportsSweep: boolean;
  supportsScull: boolean;
  isCoxed: boolean;
  category: BoatWithRelations["category"];
  classification: BoatWithRelations["classification"];
  status: BoatWithRelations["status"];
  responsibleSquadId: string;
  ownerUserId: string;
  avgWeightKg: string;
  privateBoatAccessUserIds: string[];
};

type BoatFilters = {
  boatClass: BoatClassFilter;
  classification: "all" | BoatWithRelations["classification"];
  category: CategoryFilter;
  coxed: CoxedFilter;
};

function sortBoats(boats: BoatWithRelations[]) {
  return [...boats].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }
    return left.name.localeCompare(right.name);
  });
}

function normalizeBoat(boat: BoatApiResponse) {
  return {
    ...boat,
    privateBoatAccessUserIds: boat.privateBoatAccessUserIds ?? EMPTY_USER_IDS,
  } satisfies BoatWithRelations;
}

function getSpecDefaults(boatClass: BoatClass) {
  switch (boatClass) {
    case "eight":
      return { supportsSweep: true, supportsScull: false, isCoxed: true };
    case "four":
      return { supportsSweep: true, supportsScull: true, isCoxed: false };
    case "pair":
      return { supportsSweep: true, supportsScull: true, isCoxed: false };
    case "single":
      return { supportsSweep: false, supportsScull: true, isCoxed: false };
    case "tinny":
      return { supportsSweep: false, supportsScull: false, isCoxed: false };
  }
}

function createEmptyForm(): BoatFormState {
  return {
    name: "",
    boatClass: "eight",
    ...getSpecDefaults("eight"),
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
    boatClass: boat.boatClass,
    supportsSweep: boat.supportsSweep,
    supportsScull: boat.supportsScull,
    isCoxed: boat.isCoxed,
    category: boat.category,
    classification: boat.classification,
    status: boat.status,
    responsibleSquadId: boat.responsibleSquadId ?? "",
    ownerUserId: boat.ownerUserId ?? "",
    avgWeightKg: boat.avgWeightKg == null ? "" : String(boat.avgWeightKg),
    privateBoatAccessUserIds: boat.privateBoatAccessUserIds ?? [],
  };
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
  const [expandedBoatId, setExpandedBoatId] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingBoatId, setEditingBoatId] = useState<string | null>(null);
  const [formState, setFormState] = useState<BoatFormState>(createEmptyForm());
  const [filters, setFilters] = useState<BoatFilters>({
    boatClass: "all",
    classification: "all",
    category: "all",
    coxed: "all",
  });

  useEffect(() => {
    setManagedBoats(sortBoats(boats));
  }, [boats]);

  const editingBoat = useMemo(
    () => managedBoats.find((boat) => boat.id === editingBoatId) ?? null,
    [editingBoatId, managedBoats]
  );
  const formIsPrivateLike = isPrivateLikeCategory(formState.category);

  const filteredBoats = useMemo(
    () =>
      managedBoats.filter((boat) => {
        if (!matchesBoatClassFilter(boat, filters.boatClass)) {
          return false;
        }
        if (!matchesClassificationFilter(boat, filters.classification)) {
          return false;
        }
        if (!matchesCoxedFilter(boat, filters.coxed)) {
          return false;
        }
        if (filters.category !== "all" && boat.category !== filters.category) {
          return false;
        }
        return true;
      }),
    [filters, managedBoats]
  );

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
            boat.id === args.boatId ? normalizeBoat(data as BoatApiResponse) : boat
          )
        )
      );
      toast({ title: args.successTitle });
    } catch (error) {
      setManagedBoats((current) =>
        sortBoats(current.map((boat) => (boat.id === args.boatId ? previousBoat : boat)))
      );
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
    setFormState((current) => {
      if (key === "boatClass") {
        const defaults = getSpecDefaults(value as BoatClass);
        return {
          ...current,
          boatClass: value as BoatClass,
          ...defaults,
        };
      }

      if (key === "category" && !isPrivateLikeCategory(value as BoatWithRelations["category"])) {
        return {
          ...current,
          [key]: value,
          ownerUserId: "",
          privateBoatAccessUserIds: [],
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
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
    const weightDraft = formState.avgWeightKg.trim();

    if (name.length === 0) {
      toast({ title: "Boat name is required", variant: "destructive" });
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

    const normalizedSpec = normalizeBoatSpec({
      boatClass: formState.boatClass,
      supportsSweep: formState.supportsSweep,
      supportsScull: formState.supportsScull,
      isCoxed: formState.isCoxed,
    });
    const specError = validateBoatSpec(normalizedSpec);
    if (specError) {
      toast({ title: specError, variant: "destructive" });
      return;
    }

    const payload = {
      name,
      boatClass: normalizedSpec.boatClass,
      supportsSweep: normalizedSpec.supportsSweep,
      supportsScull: normalizedSpec.supportsScull,
      isCoxed: normalizedSpec.isCoxed,
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
        toast({ title: "Boat created" });
      } else if (editingBoatId) {
        setManagedBoats((current) =>
          sortBoats(
            current.map((boat) =>
              boat.id === editingBoatId ? normalizeBoat(data as BoatApiResponse) : boat
            )
          )
        );
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
  const currentBoatTypeLabel = deriveBoatTypeLabel(
    normalizeBoatSpec({
      boatClass: formState.boatClass,
      supportsSweep: formState.supportsSweep,
      supportsScull: formState.supportsScull,
      isCoxed: formState.isCoxed,
    })
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

      <div className="grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Boat Type</label>
          <select
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            value={filters.boatClass}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                boatClass: event.target.value as BoatClassFilter,
              }))
            }
          >
            {BOAT_CLASS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Classification</label>
          <select
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            value={filters.classification}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                classification: event.target.value as BoatFilters["classification"],
              }))
            }
          >
            {CLASSIFICATION_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <select
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            value={filters.category}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                category: event.target.value as CategoryFilter,
              }))
            }
          >
            {CATEGORY_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Coxed</label>
          <select
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            value={filters.coxed}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                coxed: event.target.value as CoxedFilter,
              }))
            }
          >
            {COXED_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredBoats.map((boat) => {
        const isExpanded = expandedBoatId === boat.id;
        const isPrivateLike = isPrivateLikeCategory(boat.category);
        const ownerSaving = isPending(`${boat.id}:owner`);
        const accessSaving = isPending(`${boat.id}:access`);
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
                      <span>{boat.boatTypeLabel}</span>
                      <span>—</span>
                      <span>{getBoatCategoryLabel(boat.category)}</span>
                      {boat.avgWeightKg != null && <span>— {boat.avgWeightKg}kg</span>}
                      <span>—</span>
                      <select
                        className="text-xs border rounded px-1 py-0.5 bg-transparent hover:bg-gray-50"
                        value={boat.responsibleSquadId ?? ""}
                        onChange={(event) => updateResponsibleSquad(boat.id, event.target.value || null)}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <option value="">{boat.responsiblePerson ?? "Unassigned"}</option>
                        {squads.map((squad) => (
                          <option key={squad.id} value={squad.id}>{squad.name}</option>
                        ))}
                      </select>
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
              <select
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={formState.boatClass}
                onChange={(event) => updateForm("boatClass", event.target.value as BoatClass)}
              >
                {BOAT_CLASS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Display label: {currentBoatTypeLabel}</p>
            </div>
            {(formState.boatClass === "four" || formState.boatClass === "pair") && (
              <div className="sm:col-span-2 space-y-2 rounded-lg border p-3">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Rigging options</span>
                  <div className="mt-2 flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formState.supportsScull}
                        onChange={(event) => updateForm("supportsScull", event.target.checked)}
                      />
                      Scull riggers
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formState.supportsSweep}
                        onChange={(event) => updateForm("supportsSweep", event.target.checked)}
                      />
                      Sweep riggers
                    </label>
                  </div>
                </div>

                {formState.boatClass === "four" && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Crewing</span>
                    <div className="mt-2 flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="boat-coxed"
                          checked={!formState.isCoxed}
                          onChange={() => updateForm("isCoxed", false)}
                        />
                        Coxless
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="boat-coxed"
                          checked={formState.isCoxed}
                          onChange={() => updateForm("isCoxed", true)}
                        />
                        Coxed
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={formState.category}
                onChange={(event) =>
                  updateForm("category", event.target.value as BoatWithRelations["category"])
                }
              >
                {CATEGORY_FILTER_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
                {CLASSIFICATION_FILTER_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
    () =>
      users.filter(
        (user) => user.id !== boat.ownerUserId && !accessUserIds.includes(user.id)
      ),
    [accessUserIds, boat.ownerUserId, users]
  );

  return (
    <div className="mt-4 rounded-lg border bg-blue-50/50 p-3 space-y-3">
      <div>
        <div className="text-xs font-medium text-muted-foreground">Owner</div>
        <div className="mt-2 flex gap-2 flex-wrap items-center">
          <select
            className="min-w-[220px] rounded-md border px-3 py-2 text-sm"
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
          {ownerSaving && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground">Allowed users</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {accessUsers.length === 0 && (
            <span className="text-xs text-muted-foreground">No extra users yet.</span>
          )}
          {accessUsers.map((user) => (
            <Badge key={user.id} variant="secondary" className="gap-1 pr-1">
              {user.fullName}
              <button
                type="button"
                className="hover:text-red-600"
                onClick={() => onUpdateAccess(accessUserIds.filter((entry) => entry !== user.id))}
                disabled={accessSaving}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex gap-2 flex-wrap items-center">
          <select
            className="min-w-[220px] rounded-md border px-3 py-2 text-sm"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            disabled={accessSaving}
          >
            <option value="">Select a member...</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName} ({user.email})
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!selectedUserId) return;
              onUpdateAccess([...accessUserIds, selectedUserId]);
              setSelectedUserId("");
            }}
            disabled={!selectedUserId || accessSaving}
          >
            {accessSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add access
          </Button>
        </div>
      </div>
    </div>
  );
}
