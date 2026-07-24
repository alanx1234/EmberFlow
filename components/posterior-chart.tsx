"use client";

import { useMemo } from "react";
import {
  AGE_RANGE,
  AGE_TICKS,
  CurveSeries,
  DensityChart,
} from "./density-chart";
import { formatAgeGyr } from "@/lib/format-age";
import { posteriorHoverLabel } from "@/lib/hover";
import { Posterior } from "@/lib/schemas";

export const POSTERIOR_COLOR = "#8c7fc7";
export const POSTERIOR_FILL = "rgba(140, 127, 199, 0.14)";
export const BAND_FILL = "rgba(140, 127, 199, 0.12)";
export const PERCENTILE_COLOR = "#e8785a";

const logMyr = (gyr: number) => Math.log10(gyr * 1000);

interface PosteriorChartProps {
  posterior: Posterior;
  p16Gyr: number;
  p50Gyr: number;
  p84Gyr: number;
  height?: number;
}

/** p(log10 τ | P_rot, M*, σ_M) with the 16–84% band and coral median line.
 * The x-axis is log-positioned but hover always reports linear Myr/Gyr. */
export function PosteriorChart({
  posterior,
  p16Gyr,
  p50Gyr,
  p84Gyr,
  height = 380,
}: PosteriorChartProps) {
  const series = useMemo<CurveSeries[]>(
    () => [
      {
        name: "Posterior",
        logX: posterior.log_age_myr,
        y: posterior.density_per_dex,
        color: POSTERIOR_COLOR,
        fillColor: POSTERIOR_FILL,
        hoverLabels: posterior.age_gyr.map((a, i) =>
          posteriorHoverLabel(a, posterior.density_per_dex[i]),
        ),
      },
    ],
    [posterior],
  );

  return (
    <DensityChart
      series={series}
      ticks={AGE_TICKS}
      xRange={AGE_RANGE}
      yTitle="Posterior density"
      band={{
        fromLogX: logMyr(p16Gyr),
        toLogX: logMyr(p84Gyr),
        color: BAND_FILL,
      }}
      vlines={[
        {
          logX: logMyr(p50Gyr),
          color: PERCENTILE_COLOR,
          width: 2,
          label: `Median ${formatAgeGyr(p50Gyr).text}`,
        },
      ]}
      height={height}
      ariaLabel={`Age posterior density curve with median ${formatAgeGyr(p50Gyr).text} and 68% interval ${formatAgeGyr(p16Gyr).text} to ${formatAgeGyr(p84Gyr).text}`}
    />
  );
}
