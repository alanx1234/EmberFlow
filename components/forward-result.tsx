"use client";

import { useMemo } from "react";
import { RotationResponse } from "@/lib/schemas";
import { formatAgeGyr, sigFigs } from "@/lib/format-age";
import { rotationHoverLabel } from "@/lib/hover";
import { rotationDensityToCsv, toCsv } from "@/lib/csv";
import { downloadCsv } from "@/lib/download";
import {
  CurveSeries,
  DensityChart,
  HistogramOverlay,
  PROT_RANGE,
  PROT_TICKS,
  VLine,
} from "./density-chart";

const CURVE_COLOR = "#1f7a8c";
const CURVE_FILL = "rgba(31, 122, 140, 0.10)";
const PERCENTILE = "#e8785a";
const HIST_COLOR = "rgba(140, 127, 199, 0.35)";
const HIST_BINS = 48;

/** Histogram of sampled periods on the log grid, normalized to density per
 * dex so it overlays the model curve directly. */
export function sampleHistogram(samplesDays: number[]): HistogramOverlay {
  const logs = samplesDays.map((d) => Math.log10(d));
  const [lo, hi] = PROT_RANGE;
  const width = (hi - lo) / HIST_BINS;
  const counts = new Array<number>(HIST_BINS).fill(0);
  let inRange = 0;
  for (const l of logs) {
    const b = Math.floor((l - lo) / width);
    if (b >= 0 && b < HIST_BINS) {
      counts[b] += 1;
      inRange += 1;
    }
  }
  const n = Math.max(inRange, 1);
  return {
    logX: counts.map((_, i) => lo + (i + 0.5) * width),
    y: counts.map((c) => c / (n * width)),
    binWidth: width * 0.92,
    color: HIST_COLOR,
    name: "Samples",
  };
}

/** Density chart, percentile summary, and downloads for the forward model. */
export function ForwardResult({ result }: { result: RotationResponse }) {
  const { summary, density, input, samples_days } = result;

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
        logX: Math.log10(summary.p16_days),
        color: PERCENTILE,
        dash: "dot",
        width: 1.6,
        label: "p16",
      },
      {
        logX: Math.log10(summary.p50_days),
        color: PERCENTILE,
        width: 2,
        label: `Median ${sigFigs(summary.p50_days)} d`,
      },
      {
        logX: Math.log10(summary.p84_days),
        color: PERCENTILE,
        dash: "dot",
        width: 1.6,
        label: "p84",
      },
    ],
    [summary],
  );

  const histogram = useMemo(
    () =>
      samples_days && samples_days.length > 0
        ? sampleHistogram(samples_days)
        : undefined,
    [samples_days],
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
        <div className="interval">
          68% interval: {sigFigs(summary.p16_days)}–{sigFigs(summary.p84_days)}{" "}
          days
        </div>
        <div className="result-details">
          <div className="detail-item">
            <div className="k">p16</div>
            <div className="v">{sigFigs(summary.p16_days)} d</div>
          </div>
          <div className="detail-item">
            <div className="k">Median</div>
            <div className="v">{sigFigs(summary.p50_days)} d</div>
          </div>
          <div className="detail-item">
            <div className="k">p84</div>
            <div className="v">{sigFigs(summary.p84_days)} d</div>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: "1.25rem" }}>
        <div className="card-title">
          p(log₁₀ P<sub>rot</sub> | τ, M<sub>★</sub>, σ<sub>M</sub>)
          {histogram ? " with sampled periods" : ""}
        </div>
        <div className="chart-box">
          <DensityChart
            series={series}
            ticks={PROT_TICKS}
            xRange={PROT_RANGE}
            yTitle="Density (per dex)"
            vlines={vlines}
            histogram={histogram}
            height={380}
            ariaLabel={`Rotation-period density at ${ageText} with median ${sigFigs(summary.p50_days)} days`}
          />
        </div>
        <div className="btn-row" style={{ marginTop: "0.8rem" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() =>
              downloadCsv("emberflow_prot_density.csv", rotationDensityToCsv(density))
            }
          >
            Density CSV
          </button>
          {samples_days && samples_days.length > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() =>
                downloadCsv(
                  "emberflow_prot_samples.csv",
                  toCsv(
                    ["prot_days"],
                    samples_days.map((d) => [d]),
                  ),
                )
              }
            >
              Samples CSV ({samples_days.length.toLocaleString()})
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
