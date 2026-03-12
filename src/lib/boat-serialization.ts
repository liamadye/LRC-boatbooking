import type { BoatWithRelations } from "@/lib/types";
import { deriveBoatTypeLabel } from "@/lib/boats";

type BoatRecord = {
  id: string;
  name: string;
  boatType: string;
  boatClass: BoatWithRelations["boatClass"];
  supportsSweep: boolean;
  supportsScull: boolean;
  isCoxed: boolean;
  category: BoatWithRelations["category"];
  classification: BoatWithRelations["classification"];
  status: BoatWithRelations["status"];
  avgWeightKg: unknown;
  isOutside: boolean;
  responsibleSquadId: string | null;
  responsiblePerson: string | null;
  ownerUserId: string | null;
  displayOrder: number;
  notes: string | null;
  responsibleSquad?: { id: string; name: string } | null;
  privateBoatAccess?: { userId: string }[];
  privateBoatAccessUserIds?: string[];
};

export function serializeBoat(boat: BoatRecord): BoatWithRelations {
  return {
    id: boat.id,
    name: boat.name,
    boatClass: boat.boatClass,
    supportsSweep: boat.supportsSweep,
    supportsScull: boat.supportsScull,
    isCoxed: boat.isCoxed,
    boatTypeLabel: deriveBoatTypeLabel(boat),
    category: boat.category,
    classification: boat.classification,
    status: boat.status,
    avgWeightKg:
      boat.avgWeightKg === null || boat.avgWeightKg === undefined
        ? null
        : Number(boat.avgWeightKg),
    isOutside: boat.isOutside,
    responsibleSquadId: boat.responsibleSquadId,
    responsiblePerson: boat.responsiblePerson,
    ownerUserId: boat.ownerUserId,
    displayOrder: boat.displayOrder,
    notes: boat.notes,
    responsibleSquad: boat.responsibleSquad ?? null,
    privateBoatAccessUserIds:
      boat.privateBoatAccess?.map((entry) => entry.userId) ??
      boat.privateBoatAccessUserIds ??
      [],
  };
}
