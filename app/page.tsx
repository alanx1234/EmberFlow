"use client";

import { useEffect, useState } from "react";
import { getModelInfo, postAge, ApiError } from "@/lib/api";
import { AgeRequest, AgeResponse, ModelInfo } from "@/lib/schemas";
import { sigFigs } from "@/lib/format-age";
import { StarForm } from "@/components/star-form";
import { AgeResult } from "@/components/age-result";

export default function EstimatePage() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgeResponse | null>(null);

  useEffect(() => {
    getModelInfo().then(setModelInfo).catch(() => {
      /* range hints are optional; inference errors surface on submit */
    });
  }, []);

  const run = async (req: AgeRequest) => {
    setBusy(true);
    setError(null);
    try {
      setResult(await postAge(req));
    } catch (e) {
      setResult(null);
      setError(e instanceof ApiError ? e.message : "Something went wrong running inference.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <div className="page-head">
        <h1>Estimate a stellar age</h1>
        <p className="lede">
          A full Bayesian age posterior for an M dwarf from its rotation period
          and mass — learned from {modelInfo ? modelInfo.n_train.toLocaleString() : "6,584"} literature-calibrated
          rotators by a conditional normalizing flow.
        </p>
      </div>

      <div className="two-col">
        <section className="card">
          <div className="card-title">Star inputs</div>
          <StarForm onSubmit={run} busy={busy} modelInfo={modelInfo} />
          {modelInfo && (
            <p className="note" style={{ marginTop: "1rem" }}>
              Trained on masses {sigFigs(modelInfo.training_range.mass_msun[0])}–
              {sigFigs(modelInfo.training_range.mass_msun[1])} M☉ and periods{" "}
              {sigFigs(modelInfo.training_range.prot_days[0])}–
              {sigFigs(modelInfo.training_range.prot_days[1])} days.
            </p>
          )}
        </section>

        <div>
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          {!result && !busy && !error && (
            <div className="card empty-state">
              <div className="glyph" aria-hidden>✦</div>
              <h3>No estimate yet</h3>
              <p>
                Enter a rotation period and mass, or try the{" "}
                <strong>Example star</strong> to see a full posterior.
              </p>
            </div>
          )}
          {busy && !result && (
            <div className="card loading-block">
              <span className="spinner" aria-hidden /> Running inference…
            </div>
          )}
          {result && <AgeResult result={result} />}
        </div>
      </div>
    </div>
  );
}
