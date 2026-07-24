"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ApiError, postAge, postAgeBatch } from "@/lib/api";
import { AgeResponse, BatchResult } from "@/lib/schemas";
import { posteriorToCsv, toCsv, ValidRow } from "@/lib/csv";
import { downloadCsv, slugify } from "@/lib/download";
import { formatAgeWithErrors } from "@/lib/format-age";
import { BatchUploader, ParsedCsv } from "@/components/batch-uploader";
import { ColumnMapper } from "@/components/column-mapper";
import { BatchTable, MAX_COMPARE } from "@/components/batch-table";
import { PosteriorChart } from "@/components/posterior-chart";
import { CompareEntry, PosteriorCompare, COMPARE_COLORS } from "@/components/posterior-compare";

// Sent per request to the Cloud Run bridge (2 GB / 2 CPU). 500/request runs in
// ~6s there, comfortably under the proxy timeout, with no memory pressure.
const CHUNK = 500;
const MAX_STARS = 10000;
const PRIOR = "flat_in_log_age" as const;

type Stage = "upload" | "map" | "results";

export default function BatchPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BatchResult[] | null>(null);

  const [inspectedIdx, setInspectedIdx] = useState<number | null>(null);
  const [selectedIdxs, setSelectedIdxs] = useState<number[]>([]);
  const [posteriors, setPosteriors] = useState<Record<number, AgeResponse>>({});
  const inflight = useRef(new Set<number>());

  const reset = () => {
    setStage("upload");
    setParsed(null);
    setResults(null);
    setError(null);
    setInspectedIdx(null);
    setSelectedIdxs([]);
    setPosteriors({});
    inflight.current.clear();
  };

  const onParsed = (p: ParsedCsv) => {
    setError(null);
    setParsed(p);
    setStage("map");
  };

  const run = async (valid: ValidRow[]) => {
    if (valid.length > MAX_STARS) {
      setError(
        `That is ${valid.length.toLocaleString()} stars — the web tool caps batches at ${MAX_STARS.toLocaleString()}. For large catalogs use the Python package's age_posteriors() / summarize().`,
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const all: BatchResult[] = [];
      for (let i = 0; i < valid.length; i += CHUNK) {
        const chunk = valid.slice(i, i + CHUNK);
        const res = await postAgeBatch({
          stars: chunk.map((v) => v.star),
          prior: PRIOR,
        });
        all.push(...res.results);
      }
      setResults(all);
      setStage("results");
      setInspectedIdx(null);
      setSelectedIdxs([]);
      setPosteriors({});
      inflight.current.clear();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Batch inference failed — please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  // lazily fetch full posteriors for the inspected row and compare selection
  const ensurePosterior = useCallback(
    (idx: number) => {
      if (!results || posteriors[idx] || inflight.current.has(idx)) return;
      const r = results[idx];
      inflight.current.add(idx);
      postAge({
        source_id: r.source_id,
        prot_days: r.prot_days,
        mass_msun: r.mass_msun,
        mass_msun_err: r.mass_msun_err,
        prior: PRIOR,
      })
        .then((res) => setPosteriors((p) => ({ ...p, [idx]: res })))
        .catch(() =>
          setError("Could not load a posterior for that star — please retry."),
        )
        .finally(() => inflight.current.delete(idx));
    },
    [results, posteriors],
  );

  useEffect(() => {
    if (inspectedIdx !== null) ensurePosterior(inspectedIdx);
    selectedIdxs.forEach(ensurePosterior);
  }, [inspectedIdx, selectedIdxs, ensurePosterior]);

  const downloadSummary = () => {
    if (!results) return;
    downloadCsv(
      "emberflow_batch_summary.csv",
      toCsv(
        [
          "source_id",
          "prot_days",
          "mass_msun",
          "mass_msun_err",
          "p16_gyr",
          "p50_gyr",
          "p84_gyr",
          "age_err_lo_gyr",
          "age_err_hi_gyr",
        ],
        results.map((r) => [
          r.source_id ?? "",
          r.prot_days,
          r.mass_msun,
          r.mass_msun_err,
          (r.age_gyr - r.age_err_lo_gyr).toPrecision(6),
          r.age_gyr.toPrecision(6),
          (r.age_gyr + r.age_err_hi_gyr).toPrecision(6),
          r.age_err_lo_gyr.toPrecision(6),
          r.age_err_hi_gyr.toPrecision(6),
        ]),
      ),
    );
  };

  const inspected =
    inspectedIdx !== null && results ? results[inspectedIdx] : null;
  const inspectedPosterior =
    inspectedIdx !== null ? posteriors[inspectedIdx] : undefined;
  const inspectedFmt = inspectedPosterior
    ? formatAgeWithErrors(
        inspectedPosterior.summary.p50_gyr,
        inspectedPosterior.summary.p50_gyr - inspectedPosterior.summary.p16_gyr,
        inspectedPosterior.summary.p84_gyr - inspectedPosterior.summary.p50_gyr,
      )
    : null;

  const compareEntries: CompareEntry[] = selectedIdxs
    .filter((idx) => posteriors[idx])
    .map((idx) => ({
      label: results?.[idx]?.source_id ?? `row ${idx + 1}`,
      posterior: posteriors[idx].posterior,
    }));

  return (
    <div className="container page">
      <div className="page-head">
        <h1>
          <span className="title-glyph" aria-hidden>⁂</span>
          Batch age estimates
        </h1>
        <p className="lede">
          Upload a CSV of independent stars and get one age estimate per star.
        </p>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {stage === "upload" && (
        <section className="card">
          <BatchUploader onParsed={onParsed} onError={setError} />
        </section>
      )}

      {stage === "map" && parsed && (
        <section className="card">
          <ColumnMapper
            fileName={parsed.fileName}
            headers={parsed.headers}
            rows={parsed.rows}
            busy={busy}
            onRun={run}
            onReset={reset}
          />
        </section>
      )}

      {stage === "results" && results && (
        <>
          <section className="card">
            <div
              className="btn-row"
              style={{ justifyContent: "space-between", marginBottom: "0.9rem" }}
            >
              <h3 style={{ margin: 0 }}>
                Results{" "}
                <span className="hint">
                  — {results.length.toLocaleString()} stars
                </span>
              </h3>
              <div className="btn-row">
                <button className="btn btn-secondary btn-sm" onClick={downloadSummary}>
                  Download summary CSV
                </button>
                <button className="btn btn-ghost btn-sm" onClick={reset}>
                  Start over
                </button>
              </div>
            </div>
            <BatchTable
              results={results}
              inspectedIdx={inspectedIdx}
              selectedIdxs={selectedIdxs}
              onInspect={(idx) =>
                setInspectedIdx((cur) => (cur === idx ? null : idx))
              }
              onToggleSelect={(idx) =>
                setSelectedIdxs((cur) =>
                  cur.includes(idx)
                    ? cur.filter((i) => i !== idx)
                    : cur.length < MAX_COMPARE
                      ? [...cur, idx]
                      : cur,
                )
              }
            />
          </section>

          {inspected && (
            <section className="card" style={{ marginTop: "1.25rem" }}>
              <div
                className="btn-row"
                style={{ justifyContent: "space-between", marginBottom: "0.6rem" }}
              >
                <h3 style={{ margin: 0 }}>
                  {inspected.source_id ?? "Selected star"}
                </h3>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setInspectedIdx(null)}
                >
                  Close
                </button>
              </div>
              {inspectedFmt && (
                <div className="batch-estimate">
                  <span className="batch-estimate-val">
                    {inspectedFmt.value}
                    <span className="unit"> {inspectedFmt.unit}</span>
                  </span>
                  <span className="batch-estimate-unc">
                    −{inspectedFmt.errLo} / +{inspectedFmt.errHi} {inspectedFmt.unit}
                  </span>
                </div>
              )}
              {!inspectedPosterior ? (
                <div className="loading-block">
                  <span className="spinner" aria-hidden /> Loading posterior…
                </div>
              ) : (
                <>
                  <PosteriorChart
                    posterior={inspectedPosterior.posterior}
                    p16Gyr={inspectedPosterior.summary.p16_gyr}
                    p50Gyr={inspectedPosterior.summary.p50_gyr}
                    p84Gyr={inspectedPosterior.summary.p84_gyr}
                    height={340}
                  />
                  <div className="btn-row" style={{ marginTop: "0.6rem" }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        downloadCsv(
                          `${slugify(inspected.source_id ?? "star")}_posterior.csv`,
                          posteriorToCsv(inspectedPosterior.posterior),
                        )
                      }
                    >
                      Download posterior CSV
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {selectedIdxs.length > 0 && (
            <section className="card" style={{ marginTop: "1.25rem" }}>
              <h3 style={{ marginBottom: "0.3rem" }}>
                Posterior comparison{" "}
                <span className="hint">
                  — {selectedIdxs.length} of {MAX_COMPARE} stars
                </span>
              </h3>
              {selectedIdxs.length === 1 && (
                <p className="note" style={{ marginBottom: "0.6rem" }}>
                  Select at least one more row to compare posteriors.
                </p>
              )}
              {compareEntries.length < selectedIdxs.length && (
                <div className="loading-block" style={{ padding: "1rem" }}>
                  <span className="spinner" aria-hidden /> Loading posteriors…
                </div>
              )}
              {compareEntries.length > 0 && (
                <>
                  <PosteriorCompare entries={compareEntries} />
                  <div
                    className="btn-row"
                    style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}
                  >
                    {compareEntries.map((e, i) => (
                      <span key={e.label} className="pill">
                        <span
                          className="legend-dot"
                          style={{ background: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
                        />
                        {e.label}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          <p className="note" style={{ marginTop: "1.25rem" }}>
            Inspect any star to download its posterior CSV of 1,000 age points
            evaluated by the model. For every full posterior at once, see the{" "}
            <Link href="/docs">Python guide in the documentation</Link>.
          </p>
        </>
      )}
    </div>
  );
}
