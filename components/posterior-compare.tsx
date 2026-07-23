"use client";

import { useMemo } from "react";
import {
  AGE_RANGE,
  AGE_TICKS,
  CurveSeries,
  DensityChart,
} from "./density-chart";
import { posteriorHoverLabel } from "@/lib/hover";
import { Posterior } from "@/lib/schemas";

/** Fixed categorical order for overlaid posteriors (validated for CVD
 * separation and contrast). Color follows selection order, never rank. */
export const COMPARE_COLORS = [
  "#8c7fc7",
  "#d95f3b",
  "#0e82ab",
  "#b08325",
  "#b04a98",
] as const;

export interface CompareEntry {
  label: string;
  posterior: Posterior;
}

/** Overlay of up to five batch posteriors with shared linear-age hover. */
export function PosteriorCompare({ entries }: { entries: CompareEntry[] }) {
  const series = useMemo<CurveSeries[]>(
    () =>
      entries.map((e, i) => ({
        name: e.label,
        logX: e.posterior.log_age_myr,
        y: e.posterior.density_per_dex,
        color: COMPARE_COLORS[i % COMPARE_COLORS.length],
        hoverLabels: e.posterior.age_gyr.map((a, j) =>
          posteriorHoverLabel(a, e.posterior.density_per_dex[j]),
        ),
      })),
    [entries],
  );

  return (
    <DensityChart
      series={series}
      ticks={AGE_TICKS}
      xRange={AGE_RANGE}
      yTitle="Posterior density (per dex)"
      height={400}
      showLegend
      ariaLabel={`Overlaid age posteriors for ${entries.map((e) => e.label).join(", ")}`}
    />
  );
}
