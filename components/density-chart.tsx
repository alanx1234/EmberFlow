"use client";

import { useCallback, useMemo } from "react";
import type { Data, Layout, PlotHoverEvent } from "plotly.js";
import { PlotlyChart } from "./plotly-chart";

/** One curve on a log-positioned axis. `logX` are log10 positions; the
 * pre-formatted `hoverLabels` carry the linear-unit tooltip text. */
export interface CurveSeries {
  name: string;
  logX: number[];
  y: number[];
  color: string;
  /** rgba fill under the curve (omit for line-only) */
  fillColor?: string;
  hoverLabels: string[];
}

export interface VLine {
  logX: number;
  color: string;
  dash?: "solid" | "dash" | "dot";
  width?: number;
  label?: string;
}

export interface Band {
  fromLogX: number;
  toLogX: number;
  color: string;
}

export interface HistogramOverlay {
  logX: number[];
  y: number[];
  binWidth: number;
  color: string;
  name: string;
}

interface DensityChartProps {
  series: CurveSeries[];
  ticks: { vals: number[]; text: string[] };
  xRange: [number, number];
  yTitle: string;
  vlines?: VLine[];
  band?: Band;
  histogram?: HistogramOverlay;
  height?: number;
  ariaLabel: string;
  showLegend?: boolean;
}

const FONT = { family: "var(--font-work-sans), 'Work Sans', sans-serif", size: 12.5, color: "#555555" };
const GRID = "#edf0f7";

/** Shared density/posterior chart: logarithmically positioned x-axis with
 * human-readable ticks, a dot that follows the hovered curve, and tooltips
 * that always report linear units. */
export function DensityChart({
  series,
  ticks,
  xRange,
  yTitle,
  vlines = [],
  band,
  histogram,
  height = 360,
  ariaLabel,
  showLegend = false,
}: DensityChartProps) {
  const multi = series.length > 1;

  const data = useMemo<Data[]>(() => {
    const traces: Data[] = [];
    if (histogram) {
      traces.push({
        type: "bar",
        x: histogram.logX,
        y: histogram.y,
        width: histogram.binWidth,
        name: histogram.name,
        marker: { color: histogram.color },
        hoverinfo: "skip",
        showlegend: showLegend,
      } as Data);
    }
    for (const s of series) {
      traces.push({
        type: "scatter",
        mode: "lines",
        x: s.logX,
        y: s.y,
        name: s.name,
        line: { color: s.color, width: 2.2, shape: "spline", smoothing: 0.6 },
        fill: s.fillColor ? "tozeroy" : "none",
        fillcolor: s.fillColor,
        customdata: s.hoverLabels,
        hovertemplate: multi
          ? "%{customdata}<extra>%{fullData.name}</extra>"
          : "%{customdata}<extra></extra>",
        showlegend: showLegend,
      } as Data);
    }
    // hover dot — always the last trace, moved via restyle on plotly_hover
    traces.push({
      type: "scatter",
      mode: "markers",
      x: [null],
      y: [null],
      marker: {
        size: 9.5,
        color: series[0]?.color ?? "#8c7fc7",
        line: { color: "#ffffff", width: 2 },
      },
      hoverinfo: "skip",
      showlegend: false,
    } as Data);
    return traces;
  }, [series, histogram, multi, showLegend]);

  const layout = useMemo<Partial<Layout>>(() => {
    const shapes: Partial<Layout>["shapes"] = [];
    const annotations: Partial<Layout>["annotations"] = [];
    if (band) {
      shapes.push({
        type: "rect",
        xref: "x",
        yref: "paper",
        x0: band.fromLogX,
        x1: band.toLogX,
        y0: 0,
        y1: 1,
        fillcolor: band.color,
        line: { width: 0 },
        layer: "below",
      });
    }
    for (const v of vlines) {
      shapes.push({
        type: "line",
        xref: "x",
        yref: "paper",
        x0: v.logX,
        x1: v.logX,
        y0: 0,
        y1: 1,
        line: { color: v.color, width: v.width ?? 2, dash: v.dash ?? "solid" },
      });
      if (v.label) {
        annotations.push({
          x: v.logX,
          y: 1,
          yref: "paper",
          yanchor: "bottom",
          text: v.label,
          showarrow: false,
          font: { ...FONT, size: 11, color: v.color },
        });
      }
    }
    return {
      autosize: true,
      margin: { l: 58, r: 14, t: 26, b: 44 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: FONT,
      hovermode: multi ? "closest" : "x",
      hoverdistance: multi ? 30 : -1,
      dragmode: false as unknown as Layout["dragmode"],
      xaxis: {
        range: xRange,
        tickvals: ticks.vals,
        ticktext: ticks.text,
        showgrid: true,
        gridcolor: GRID,
        zeroline: false,
        fixedrange: true,
        ticks: "outside",
        ticklen: 4,
        tickcolor: "#cdd4e4",
      },
      yaxis: {
        title: { text: yTitle, font: { ...FONT, size: 12 } },
        rangemode: "tozero",
        showgrid: true,
        gridcolor: GRID,
        zeroline: false,
        fixedrange: true,
      },
      shapes,
      annotations,
      showlegend: showLegend,
      legend: showLegend
        ? { orientation: "h", y: -0.18, x: 0, font: { ...FONT, size: 12 } }
        : undefined,
      hoverlabel: {
        bgcolor: "#ffffff",
        bordercolor: "#cdd4e4",
        font: { ...FONT, size: 12.5, color: "#111111" },
      },
    };
  }, [band, vlines, ticks, xRange, yTitle, multi, showLegend]);

  const firstSeriesTrace = histogram ? 1 : 0;
  const dotTrace = firstSeriesTrace + series.length;

  const onHover = useCallback(
    (
      ev: PlotHoverEvent,
      Plotly: typeof import("plotly.js-dist-min"),
      el: HTMLDivElement,
    ) => {
      const pt = ev.points?.find(
        (p) =>
          p.curveNumber >= firstSeriesTrace && p.curveNumber < dotTrace,
      );
      if (!pt) return;
      const s = series[pt.curveNumber - firstSeriesTrace];
      const i = pt.pointIndex as number;
      if (!s || i == null || s.logX[i] === undefined) return;
      void Plotly.restyle(
        el,
        {
          x: [[s.logX[i]]],
          y: [[s.y[i]]],
          "marker.color": s.color,
        } as Parameters<typeof Plotly.restyle>[1],
        [dotTrace],
      );
    },
    [series, firstSeriesTrace, dotTrace],
  );

  const onUnhover = useCallback(
    (Plotly: typeof import("plotly.js-dist-min"), el: HTMLDivElement) => {
      void Plotly.restyle(
        el,
        { x: [[null]], y: [[null]] } as Parameters<typeof Plotly.restyle>[1],
        [dotTrace],
      );
    },
    [dotTrace],
  );

  return (
    <PlotlyChart
      data={data}
      layout={layout}
      onHover={onHover}
      onUnhover={onUnhover}
      ariaLabel={ariaLabel}
      height={height}
    />
  );
}

/** Age axis ticks: grid is log10(age/Myr) ∈ [0, 4.14]. */
export const AGE_TICKS = {
  vals: [0, 1, 2, 3, 4],
  text: ["1 Myr", "10 Myr", "100 Myr", "1 Gyr", "10 Gyr"],
};
export const AGE_RANGE: [number, number] = [0, 4.14];

/** Rotation-period axis ticks: grid is log10(P/days) ∈ [-1.75, 2.5]. */
export const PROT_TICKS = {
  vals: [-1, 0, 1, 2],
  text: ["0.1 d", "1 d", "10 d", "100 d"],
};
export const PROT_RANGE: [number, number] = [-1.75, 2.5];
