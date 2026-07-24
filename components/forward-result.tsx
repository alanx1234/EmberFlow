"use client";

import { useMemo } from "react";
import { RotationResponse } from "@/lib/schemas";
import { formatAgeGyr, sigFigs } from "@/lib/format-age";
import { rotationHoverLabel } from "@/lib/hover";
import { rotationDensityToCsv } from "@/lib/csv";
import { downloadCsv } from "@/lib/download";
import {
  CurveSeries,
  DensityChart,
  PROT_RANGE,
  PROT_TICKS,
  VLine,
} from "./density-chart";

const CURVE_COLOR = "#1f7a8c";
const CURVE_FILL = "rgba(31, 122, 140, 0.10)";
const BAND_FILL = "rgba(31, 122, 140, 0.12)";
const PERCENTILE = "#e8785a";

/** Density chart, percentile summary, and downloads for the forward model. */
export function ForwardResult({ result }: { result: RotationResponse }) {
  const { summary, density, input } = result;

  const series = useMemo<CurveSeries[]>(
    () => [
      {
        name: "p(log P_rot)",
        logX: density.log_prot,
        y: density.density_per_dex,
        color: CURVE_COLOR,
        fillColor: CURVE_FILL,
        hoverLabels: density.prot_days.map((d, i) =>
          rotationHoverLabel(d, density.density_per_dex[i]),
        ),
      },
    ],
    [density],
  );

  const vlines = useMemo<VLine[]>(
    () => [
      {
        logX: Math.log10(summary.p50_days),
        color: PERCENTILE,
        width: 2,
        label: `Median ${sigFigs(summary.p50_days)} d`,
      },
    ],
    [summary],
  );

  const ageText = formatAgeGyr(input.age_gyr).text;

  return (
    <div>
      <section className="card result-hero" aria-live="polite">
        <div className="label">Predicted rotation period</div>
        <div className="star-name">
          at {ageText}, {sigFigs(input.mass_msun)} M☉
        </div>
        <div className="estimate">
          {sigFigs(summary.p50_days)}
          <span className="unit">days</span>
        </div>
        <div className="uncertainty">
          −{sigFigs(summary.p50_days - summary.p16_days)} / +
          {sigFigs(summary.p84_days - summary.p50_days)} days
        </div>
      </section>

      <section className="card" style={{ marginTop: "1.25rem" }}>
        <div className="card-title">
          p(log₁₀ P<sub>rot</sub> | τ, M<sub>★</sub>,{" "}
          <span style={{ textTransform: "none" }}>σ</span>
          <sub>M</sub>)
        </div>
        <div className="chart-box">
          <DensityChart
            series={series}
            ticks={PROT_TICKS}
            xRange={PROT_RANGE}
            yTitle="Density"
            vlines={vlines}
            band={{
              fromLogX: Math.log10(summary.p16_days),
              toLogX: Math.log10(summary.p84_days),
              color: BAND_FILL,
            }}
            height={380}
            ariaLabel={`Rotation-period density at ${ageText} with median ${sigFigs(summary.p50_days)} days and 68% interval ${sigFigs(summary.p16_days)} to ${sigFigs(summary.p84_days)} days`}
          />
        </div>
        <div className="btn-row" style={{ marginTop: "0.8rem" }}>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <button
              className="btn btn-secondary btn-sm"
              onClick={() =>
                downloadCsv("emberflow_prot_density.csv", rotationDensityToCsv(density))
              }
            >
              Density CSV
            </button>
            <span
              className="info-tip info-tip-right"
              tabIndex={0}
              role="note"
              aria-label="Download the rotation-period distribution — 500 candidate periods evaluated by the flow."
              data-tip="Download the rotation-period distribution — 500 candidate periods evaluated by the flow."
            >
              i
            </span>
          </span>
        </div>
      </section>
    </div>
  );
}
