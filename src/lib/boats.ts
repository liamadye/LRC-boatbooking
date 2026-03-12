export type BoatClass = "eight" | "four" | "pair" | "single" | "tinny";
export type BoatCategory = "club" | "private" | "syndicate" | "tinny";
export type BoatClassification = "black" | "green";
export type BoatStatus = "available" | "not_in_use";
export type BoatClassFilter = "all" | "8s" | "4s" | "2s" | "1x";
export type CoxedFilter = "all" | "coxed" | "coxless";
export type CategoryFilter = "all" | BoatCategory;

export type BoatSpec = {
  boatClass: BoatClass;
  supportsSweep: boolean;
  supportsScull: boolean;
  isCoxed: boolean;
};

export type BoatLike = BoatSpec & {
  category?: BoatCategory | null;
  classification?: BoatClassification | null;
};

export const BOAT_CLASS_OPTIONS: { value: BoatClass; label: string }[] = [
  { value: "eight", label: "8" },
  { value: "four", label: "4" },
  { value: "pair", label: "2" },
  { value: "single", label: "1" },
  { value: "tinny", label: "Tinny" },
];

export const BOAT_CLASS_FILTER_OPTIONS: { value: BoatClassFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "8s", label: "8s" },
  { value: "4s", label: "4s" },
  { value: "2s", label: "2s" },
  { value: "1x", label: "1x" },
];

export const CLASSIFICATION_FILTER_OPTIONS: { value: "all" | BoatClassification; label: string }[] = [
  { value: "all", label: "All boats" },
  { value: "green", label: "Green" },
  { value: "black", label: "Black" },
];

export const COXED_FILTER_OPTIONS: { value: CoxedFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "coxed", label: "Coxed" },
  { value: "coxless", label: "Coxless" },
];

export const CATEGORY_FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "club", label: "Club" },
  { value: "private", label: "Private" },
  { value: "syndicate", label: "Syndicate" },
  { value: "tinny", label: "Tinny" },
];

export const SHELL_SECTIONS: { key: BoatClass; label: string; color: string }[] = [
  { key: "eight", label: "Eights", color: "bg-gray-100" },
  { key: "four", label: "Quads & Fours", color: "bg-gray-100" },
  { key: "pair", label: "Doubles & Pairs", color: "bg-gray-100" },
  { key: "single", label: "Singles", color: "bg-gray-50" },
];

export const PRIVATE_LIKE_CATEGORIES = new Set<BoatCategory>(["private", "syndicate"]);

export function isPrivateLikeCategory(category?: BoatCategory | null) {
  return !!category && PRIVATE_LIKE_CATEGORIES.has(category);
}

export function normalizeBoatSpec(spec: BoatSpec): BoatSpec {
  switch (spec.boatClass) {
    case "eight":
      return {
        boatClass: "eight",
        supportsSweep: true,
        supportsScull: false,
        isCoxed: true,
      };
    case "single":
      return {
        boatClass: "single",
        supportsSweep: false,
        supportsScull: true,
        isCoxed: false,
      };
    case "tinny":
      return {
        boatClass: "tinny",
        supportsSweep: false,
        supportsScull: false,
        isCoxed: false,
      };
    case "pair":
      return {
        boatClass: "pair",
        supportsSweep: spec.supportsSweep,
        supportsScull: spec.supportsScull,
        isCoxed: false,
      };
    case "four":
      return {
        boatClass: "four",
        supportsSweep: spec.supportsSweep,
        supportsScull: spec.supportsScull,
        isCoxed: spec.isCoxed,
      };
  }
}

export function validateBoatSpec(spec: BoatSpec): string | null {
  if ((spec.boatClass === "four" || spec.boatClass === "pair") && !spec.supportsSweep && !spec.supportsScull) {
    return `Select at least one rigging option for the ${spec.boatClass === "four" ? "4" : "2"}.`;
  }

  return null;
}

export function deriveBoatTypeLabel(spec: BoatSpec): string {
  const normalized = normalizeBoatSpec(spec);

  switch (normalized.boatClass) {
    case "eight":
      return "8+";
    case "single":
      return "1x";
    case "tinny":
      return "tinny";
    case "pair":
      if (normalized.supportsScull && normalized.supportsSweep) {
        return "2x/-";
      }
      if (normalized.supportsScull) {
        return "2x";
      }
      return "2-";
    case "four":
      if (normalized.supportsScull && normalized.supportsSweep) {
        return normalized.isCoxed ? "4x/+" : "4x/-";
      }
      if (normalized.supportsScull) {
        return normalized.isCoxed ? "4x+" : "4x";
      }
      return normalized.isCoxed ? "4+" : "4-";
  }
}

export function deriveBoatSpecFromLegacyType(
  legacyBoatType: string,
  category?: BoatCategory | null
): BoatSpec {
  const trimmedType = legacyBoatType.trim().toLowerCase();

  if (category === "tinny" || trimmedType === "tinny") {
    return normalizeBoatSpec({
      boatClass: "tinny",
      supportsSweep: false,
      supportsScull: false,
      isCoxed: false,
    });
  }

  if (trimmedType.startsWith("8")) {
    return normalizeBoatSpec({
      boatClass: "eight",
      supportsSweep: true,
      supportsScull: false,
      isCoxed: true,
    });
  }

  if (trimmedType.startsWith("4")) {
    return normalizeBoatSpec({
      boatClass: "four",
      supportsSweep: trimmedType.includes("-") || trimmedType.includes("+"),
      supportsScull: trimmedType.includes("x"),
      isCoxed: trimmedType.includes("+"),
    });
  }

  if (trimmedType.startsWith("2")) {
    return normalizeBoatSpec({
      boatClass: "pair",
      supportsSweep: trimmedType.includes("-") || trimmedType.includes("+"),
      supportsScull: trimmedType.includes("x"),
      isCoxed: false,
    });
  }

  return normalizeBoatSpec({
    boatClass: "single",
    supportsSweep: false,
    supportsScull: true,
    isCoxed: false,
  });
}

export function getMaxCrewForBoat(spec: BoatSpec): number {
  const normalized = normalizeBoatSpec(spec);

  switch (normalized.boatClass) {
    case "eight":
      return 9;
    case "four":
      return normalized.isCoxed ? 5 : 4;
    case "pair":
      return 2;
    case "single":
    case "tinny":
      return 1;
  }
}

export function getMinimumCrewForBoat(spec: BoatSpec): number {
  const normalized = normalizeBoatSpec(spec);

  switch (normalized.boatClass) {
    case "eight":
      return 8;
    case "four":
      return normalized.isCoxed ? 4 : 4;
    case "pair":
      return 2;
    case "single":
    case "tinny":
      return 1;
  }
}

export function supportsSquadBooking(boatClass?: BoatClass | null) {
  return boatClass === "eight" || boatClass === "four";
}

export function supportsCoxedBookingOption(spec: BoatSpec) {
  const normalized = normalizeBoatSpec(spec);
  return normalized.boatClass === "four" && normalized.isCoxed;
}

export function getBoatSectionLabel(boatClass: BoatClass): string | null {
  return SHELL_SECTIONS.find((section) => section.key === boatClass)?.label ?? null;
}

export function matchesBoatClassFilter(boat: BoatLike, filter: BoatClassFilter) {
  switch (filter) {
    case "all":
      return true;
    case "8s":
      return boat.boatClass === "eight";
    case "4s":
      return boat.boatClass === "four";
    case "2s":
      return boat.boatClass === "pair";
    case "1x":
      return boat.boatClass === "single";
  }
}

export function matchesClassificationFilter(
  boat: BoatLike,
  filter: "all" | BoatClassification
) {
  return filter === "all" || boat.classification === filter;
}

export function matchesCoxedFilter(boat: BoatLike, filter: CoxedFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "coxed") {
    return boat.boatClass === "eight" || (boat.boatClass === "four" && boat.isCoxed);
  }

  return (
    (boat.boatClass === "four" && !boat.isCoxed) ||
    boat.boatClass === "pair" ||
    boat.boatClass === "single"
  );
}

export function getBoatCategoryLabel(category: BoatCategory) {
  switch (category) {
    case "club":
      return "Club";
    case "private":
      return "Private";
    case "syndicate":
      return "Syndicate";
    case "tinny":
      return "Tinny";
  }
}
