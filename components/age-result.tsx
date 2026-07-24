"use client";

import { AgeResponse } from "@/lib/schemas";
import { formatAgeGyr, formatAgeWithErrors } from "@/lib/format-age";
import { posteriorToCsv } from "@/lib/csv";
import { downloadCsv, slugify } from "@/lib/download";
import { PosteriorChart } from "./posterior-chart";

/** Result card + posterior chart for a single-star estimate. */
export function AgeResult({ result }: { result: AgeResponse }) {
  const { summary, posterior, input } = result;
  const stem = slugify(input.source_id?.trim() || "emberflow-star");
  const fmt = formatAgeWithErrors(
    summary.p50_gyr,
    summary.p50_gyr - summary.p16_gyr,
    summary.p84_gyr - summary.p50_gyr,
  );
  const name = input.source_id?.trim() || null;

  return (
    <div className="result-in">
      <section className="card result-hero" aria-live="polite">
        <div className="label">Estimated age</div>
        {name && <div className="star-name">{name}</div>}
        <div className="estimate">
          {fmt.value}
          <span className="unit">{fmt.unit}</span>
        </div>
        <div className="uncertainty">
          −{fmt.errLo} / +{fmt.errHi} {fmt.unit}
        </div>

        <div className="result-details">
          <div className="detail-item">
            <div className="k">
              Posterior mode
              <span
                className="info-tip info-tip-right"
                tabIndex={0}
                role="note"
                aria-label="The single most likely age — the peak of the model's posterior distribution."
                data-tip="The single most likely age — the peak of the model's posterior distribution."
              >
                i
              </span>
            </div>
            <div className="v">{formatAgeGyr(summary.mode_gyr).text}</div>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: "1.25rem" }}>
        <div className="card-title">
          Posterior p(log₁₀ τ | P<sub>rot</sub>, M<sub>★</sub>,{" "}
          <span style={{ textTransform: "none" }}>σ</span>
          <sub>M</sub>)
        </div>
        <div className="chart-box">
          <PosteriorChart
            posterior={posterior}
            p16Gyr={summary.p16_gyr}
            p50Gyr={summary.p50_gyr}
            p84Gyr={summary.p84_gyr}
          />
        </div>
        <div className="btn-row" style={{ marginTop: "0.8rem" }}>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <button
              className="btn btn-secondary btn-sm"
              onClick={() =>
                downloadCsv(`${stem}_posterior.csv`, posteriorToCsv(posterior))
              }
            >
              Posterior CSV
            </button>
            <span
              className="info-tip info-tip-right"
              tabIndex={0}
              role="note"
              aria-label="Download the age posterior — 1,000 candidate ages evaluated by the flow."
              data-tip="Download the age posterior — 1,000 candidate ages evaluated by the flow."
            >
              i
            </span>
          </span>
        </div>
      </section>
    </div>
  );
}
