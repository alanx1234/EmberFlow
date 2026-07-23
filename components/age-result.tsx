"use client";

import { useState } from "react";
import { AgeResponse, PRIOR_LABELS } from "@/lib/schemas";
import { formatAgeGyr, formatAgeWithErrors } from "@/lib/format-age";
import { posteriorToCsv, toCsv } from "@/lib/csv";
import { downloadCsv, downloadJson, slugify } from "@/lib/download";
import { BIBTEX } from "@/lib/citation";
import { PosteriorChart } from "./posterior-chart";

/** Result card + posterior chart + downloads for a single-star estimate. */
export function AgeResult({ result }: { result: AgeResponse }) {
  const [copied, setCopied] = useState(false);
  const { summary, posterior, input, metadata } = result;
  const fmt = formatAgeWithErrors(
    summary.p50_gyr,
    summary.p50_gyr - summary.p16_gyr,
    summary.p84_gyr - summary.p50_gyr,
  );
  const name = input.source_id?.trim() || null;
  const stem = slugify(name ?? "emberflow-star");

  const downloadSummary = () =>
    downloadCsv(
      `${stem}_summary.csv`,
      toCsv(
        [
          "source_id",
          "prot_days",
          "mass_msun",
          "mass_msun_err",
          "prior",
          "p16_gyr",
          "p50_gyr",
          "p84_gyr",
          "mode_gyr",
          "model_version",
        ],
        [
          [
            name ?? "",
            input.prot_days,
            input.mass_msun,
            input.mass_msun_err,
            metadata.prior,
            summary.p16_gyr.toPrecision(6),
            summary.p50_gyr.toPrecision(6),
            summary.p84_gyr.toPrecision(6),
            summary.mode_gyr.toPrecision(6),
            metadata.model_version,
          ],
        ],
      ),
    );

  const copyCitation = async () => {
    try {
      await navigator.clipboard.writeText(BIBTEX);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy the citation below:", BIBTEX);
    }
  };

  return (
    <div>
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
        <div className="interval">68% credible interval: {fmt.intervalText}</div>

        <div className="result-details">
          <div className="detail-item">
            <div className="k">Posterior mode</div>
            <div className="v">{formatAgeGyr(summary.mode_gyr).text}</div>
          </div>
          <div className="detail-item">
            <div className="k">Prior</div>
            <div className="v">{PRIOR_LABELS[metadata.prior]}</div>
          </div>
          <div className="detail-item">
            <div className="k">EmberFlow</div>
            <div className="v">v{metadata.model_version}</div>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: "1.25rem" }}>
        <div className="card-title">
          Posterior p(log₁₀ τ | P<sub>rot</sub>, M<sub>★</sub>, σ<sub>M</sub>)
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
          <button className="btn btn-secondary btn-sm" onClick={downloadSummary}>
            Summary CSV
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() =>
              downloadCsv(`${stem}_posterior.csv`, posteriorToCsv(posterior))
            }
          >
            Posterior CSV
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => downloadJson(`${stem}.json`, result)}
          >
            JSON
          </button>
          <button className="btn btn-ghost btn-sm" onClick={copyCitation}>
            {copied ? "✓ Copied" : "Copy citation"}
          </button>
        </div>
      </section>
    </div>
  );
}
