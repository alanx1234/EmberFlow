import { describe, expect, it } from "vitest";
import {
  nearestIndex,
  posteriorHoverLabel,
  rotationHoverLabel,
} from "@/lib/hover";

describe("posteriorHoverLabel", () => {
  it("shows linear Myr below 1 Gyr", () => {
    expect(posteriorHoverLabel(0.247, 0.64)).toBe(
      "Age: 247 Myr<br>Posterior density: 0.64 per dex",
    );
  });

  it("shows linear Gyr at or above 1 Gyr", () => {
    expect(posteriorHoverLabel(2.41, 0.38)).toBe(
      "Age: 2.41 Gyr<br>Posterior density: 0.38 per dex",
    );
  });

  it("never shows log age", () => {
    const label = posteriorHoverLabel(1.77, 0.5);
    expect(label).not.toMatch(/log/i);
  });
});

describe("rotationHoverLabel", () => {
  it("shows linear days", () => {
    expect(rotationHoverLabel(12.3, 0.42)).toBe(
      "Period: 12.3 days<br>Density: 0.42 per dex",
    );
  });
});

describe("nearestIndex", () => {
  const grid = [0, 1, 2, 3, 4];

  it("snaps to the closest grid point", () => {
    expect(nearestIndex(grid, 1.2)).toBe(1);
    expect(nearestIndex(grid, 1.6)).toBe(2);
    expect(nearestIndex(grid, 2.5)).toBe(2); // ties go low
  });

  it("clamps to the ends", () => {
    expect(nearestIndex(grid, -10)).toBe(0);
    expect(nearestIndex(grid, 99)).toBe(4);
  });

  it("handles empty grids", () => {
    expect(nearestIndex([], 1)).toBe(-1);
  });
});
