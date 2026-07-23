"use client";

import { useEffect, useRef, useState } from "react";
import type { Config, Data, Layout, PlotHoverEvent } from "plotly.js";

type PlotlyModule = typeof import("plotly.js-dist-min");

/** Module-level promise so plotly.js (heavy) is fetched once per session. */
let plotlyPromise: Promise<PlotlyModule> | null = null;
const loadPlotly = () => {
  plotlyPromise ??= import("plotly.js-dist-min");
  return plotlyPromise;
};

export interface PlotlyChartProps {
  data: Data[];
  layout: Partial<Layout>;
  /** Called with the hovered point; use with `hoverDotTrace` to move the dot. */
  onHover?: (ev: PlotHoverEvent, plotly: PlotlyModule, el: HTMLDivElement) => void;
  onUnhover?: (plotly: PlotlyModule, el: HTMLDivElement) => void;
  ariaLabel?: string;
  height?: number;
}

const BASE_CONFIG: Partial<Config> = {
  displayModeBar: false,
  responsive: true,
  scrollZoom: false,
};

/** Thin client-only wrapper around plotly.js-dist-min. Renders a placeholder
 * until the library is loaded, then keeps the plot in sync with props. */
export function PlotlyChart({
  data,
  layout,
  onHover,
  onUnhover,
  ariaLabel,
  height = 360,
}: PlotlyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // stash the latest handlers so the plotly listeners never go stale
  const handlers = useRef({ onHover, onUnhover });
  handlers.current = { onHover, onUnhover };

  useEffect(() => {
    let cancelled = false;
    const el = ref.current;
    if (!el) return;

    loadPlotly().then((Plotly) => {
      if (cancelled || !ref.current) return;
      void Plotly.react(el, data, { ...layout }, BASE_CONFIG).then(() => {
        if (cancelled) return;
        setReady(true);
        const anyEl = el as unknown as {
          on: (evt: string, cb: (e: PlotHoverEvent) => void) => void;
          removeAllListeners?: (evt: string) => void;
        };
        anyEl.removeAllListeners?.("plotly_hover");
        anyEl.removeAllListeners?.("plotly_unhover");
        anyEl.on("plotly_hover", (e: PlotHoverEvent) =>
          handlers.current.onHover?.(e, Plotly, el),
        );
        anyEl.on("plotly_unhover", () =>
          handlers.current.onUnhover?.(Plotly, el),
        );
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, layout]);

  useEffect(
    () => () => {
      const el = ref.current;
      if (el) {
        loadPlotly().then((Plotly) => Plotly.purge(el));
      }
    },
    [],
  );

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      {!ready && (
        <div className="loading-block" style={{ position: "absolute", inset: 0 }}>
          <span className="spinner" aria-hidden /> Loading chart…
        </div>
      )}
      <div
        ref={ref}
        role="img"
        aria-label={ariaLabel}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
