import { describe, expect, it } from "vitest";
import {
  deriveBoatSpecFromLegacyType,
  deriveBoatTypeLabel,
  getBoatSectionLabel,
  getMaxCrewForBoat,
  matchesCoxedFilter,
} from "@/lib/boats";

describe("deriveBoatTypeLabel", () => {
  it("uses x-first notation for pairs and fours", () => {
    expect(
      deriveBoatTypeLabel({
        boatClass: "pair",
        supportsSweep: true,
        supportsScull: true,
        isCoxed: false,
      })
    ).toBe("2x/-");

    expect(
      deriveBoatTypeLabel({
        boatClass: "four",
        supportsSweep: true,
        supportsScull: true,
        isCoxed: false,
      })
    ).toBe("4x/-");

    expect(
      deriveBoatTypeLabel({
        boatClass: "four",
        supportsSweep: true,
        supportsScull: true,
        isCoxed: true,
      })
    ).toBe("4x/+");
  });

  it("handles fixed classes", () => {
    expect(
      deriveBoatTypeLabel({
        boatClass: "eight",
        supportsSweep: true,
        supportsScull: false,
        isCoxed: true,
      })
    ).toBe("8+");
    expect(
      deriveBoatTypeLabel({
        boatClass: "single",
        supportsSweep: false,
        supportsScull: true,
        isCoxed: false,
      })
    ).toBe("1x");
  });
});

describe("deriveBoatSpecFromLegacyType", () => {
  it("backfills legacy mixed-rig labels into normalized fields", () => {
    const spec = deriveBoatSpecFromLegacyType("4x/4-/4+", "club");

    expect(spec.boatClass).toBe("four");
    expect(spec.supportsScull).toBe(true);
    expect(spec.supportsSweep).toBe(true);
    expect(spec.isCoxed).toBe(true);
  });
});

describe("getMaxCrewForBoat", () => {
  it("derives crew count from normalized metadata", () => {
    expect(
      getMaxCrewForBoat({
        boatClass: "four",
        supportsSweep: true,
        supportsScull: false,
        isCoxed: false,
      })
    ).toBe(4);

    expect(
      getMaxCrewForBoat({
        boatClass: "four",
        supportsSweep: true,
        supportsScull: false,
        isCoxed: true,
      })
    ).toBe(5);
  });
});

describe("section labels and coxed filter", () => {
  it("uses the renamed section labels", () => {
    expect(getBoatSectionLabel("four")).toBe("Quads & Fours");
    expect(getBoatSectionLabel("pair")).toBe("Doubles & Pairs");
  });

  it("matches coxed shells as intended", () => {
    expect(
      matchesCoxedFilter(
        {
          boatClass: "eight",
          supportsSweep: true,
          supportsScull: false,
          isCoxed: true,
        },
        "coxed"
      )
    ).toBe(true);
    expect(
      matchesCoxedFilter(
        {
          boatClass: "pair",
          supportsSweep: true,
          supportsScull: false,
          isCoxed: false,
        },
        "coxed"
      )
    ).toBe(false);
    expect(
      matchesCoxedFilter(
        {
          boatClass: "pair",
          supportsSweep: true,
          supportsScull: false,
          isCoxed: false,
        },
        "coxless"
      )
    ).toBe(true);
  });
});
