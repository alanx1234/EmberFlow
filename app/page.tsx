"use client";

import { useEffect, useState } from "react";
import { getModelInfo, postAge, ApiError } from "@/lib/api";
import { AgeRequest, AgeResponse, ModelInfo } from "@/lib/schemas";
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
        <h1>
          <span className="title-glyph" aria-hidden>✦</span>
          Estimate a stellar age
        </h1>
        <p className="lede">
          Generate a full Bayesian age posterior for a single M dwarf based on
          its rotation period and mass.
        </p>
      </div>

      <div className="two-col">
        <section className="card">
          <div className="card-title">Star inputs</div>
          <StarForm onSubmit={run} busy={busy} modelInfo={modelInfo} />
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
                Enter a rotation period and mass to see a full posterior
              </p>
            </div>
          )}
          {busy && !result && (
            <div className="card empty-state is-loading">
              <div className="glyph" aria-hidden>✦</div>
              <h3>Running inference…</h3>
              <p>Producing the age posterior</p>
            </div>
          )}
          {result && <AgeResult result={result} />}
        </div>
      </div>
    </div>
  );
}
