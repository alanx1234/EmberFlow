"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError, getModelInfo, postRotation } from "@/lib/api";
import { ModelInfo, RotationResponse } from "@/lib/schemas";
import { sigFigs } from "@/lib/format-age";
import { ForwardResult } from "@/components/forward-result";

const MAX_SAMPLES = 100_000;

export default function ForwardPage() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [age, setAge] = useState("");
  const [ageUnit, setAgeUnit] = useState<"Myr" | "Gyr">("Gyr");
  const [mass, setMass] = useState("");
  const [massErr, setMassErr] = useState("");
  const [nSamples, setNSamples] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RotationResponse | null>(null);

  useEffect(() => {
    getModelInfo().then(setModelInfo).catch(() => {});
  }, []);

  const parse = (v: string): number | null => {
    const n = Number(v.trim());
    return v.trim() !== "" && Number.isFinite(n) ? n : null;
  };

  const fillExample = () => {
    setAge("500");
    setAgeUnit("Myr");
    setMass("0.35");
    setMassErr("0.02");
    setNSamples("2000");
    setErrors({});
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const a = parse(age);
    const m = parse(mass);
    const me = massErr.trim() === "" ? 0 : parse(massErr);
    const ns = nSamples.trim() === "" ? 0 : parse(nSamples);
    if (a === null || a <= 0) errs.age = "Enter a positive age.";
    if (m === null || m <= 0) errs.mass = "Enter a positive mass in M☉.";
    if (me === null || me < 0) errs.massErr = "Enter a non-negative uncertainty.";
    if (ns === null || ns < 0 || !Number.isInteger(ns) || ns > MAX_SAMPLES)
      errs.nSamples = `Enter a whole number up to ${MAX_SAMPLES.toLocaleString()}.`;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const ageGyr = ageUnit === "Gyr" ? a! : a! / 1000;
    setBusy(true);
    setError(null);
    try {
      setResult(
        await postRotation({
          age_gyr: ageGyr,
          mass_msun: m!,
          mass_msun_err: me!,
          n_samples: ns!,
        }),
      );
    } catch (err) {
      setResult(null);
      setError(
        err instanceof ApiError ? err.message : "Something went wrong running the forward model.",
      );
    } finally {
      setBusy(false);
    }
  };

  const range = modelInfo?.training_range;
  const outOfRange =
    range &&
    (() => {
      const a = parse(age);
      const m = parse(mass);
      const ageGyr = a === null ? null : ageUnit === "Gyr" ? a : a / 1000;
      const notes: string[] = [];
      if (ageGyr !== null && (ageGyr < range.age_gyr[0] || ageGyr > range.age_gyr[1]))
        notes.push(
          `age outside ${sigFigs(range.age_gyr[0] * 1000)} Myr–${sigFigs(range.age_gyr[1])} Gyr`,
        );
      if (m !== null && (m < range.mass_msun[0] || m > range.mass_msun[1]))
        notes.push(
          `mass outside ${sigFigs(range.mass_msun[0])}–${sigFigs(range.mass_msun[1])} M☉`,
        );
      return notes;
    })();

  return (
    <div className="container page">
      <div className="page-head">
        <h1>Forward model</h1>
        <p className="lede">
          Go the other way: given an age and mass, what rotation periods does
          the learned density p(log P<sub>rot</sub> | τ, M<sub>★</sub>) predict?
        </p>
      </div>

      <div className="two-col">
        <section className="card">
          <div className="card-title">Inputs</div>
          <form onSubmit={submit} noValidate>
            <div className="field-row">
              <div className="field">
                <label htmlFor="fw-age">Age</label>
                <input
                  id="fw-age"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder={ageUnit === "Gyr" ? "e.g. 1.5" : "e.g. 500"}
                  aria-invalid={!!errors.age}
                />
                {errors.age && <div className="error-text">{errors.age}</div>}
              </div>
              <div className="field">
                <label htmlFor="fw-age-unit">Age unit</label>
                <select
                  id="fw-age-unit"
                  value={ageUnit}
                  onChange={(e) => setAgeUnit(e.target.value as "Myr" | "Gyr")}
                >
                  <option value="Myr">Myr</option>
                  <option value="Gyr">Gyr</option>
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="fw-mass">
                  Stellar mass <span className="hint">M☉</span>
                </label>
                <input
                  id="fw-mass"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={mass}
                  onChange={(e) => setMass(e.target.value)}
                  placeholder="e.g. 0.35"
                  aria-invalid={!!errors.mass}
                />
                {errors.mass && <div className="error-text">{errors.mass}</div>}
              </div>
              <div className="field">
                <label htmlFor="fw-mass-err">
                  Mass uncertainty <span className="hint">M☉, 1σ</span>
                </label>
                <input
                  id="fw-mass-err"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={massErr}
                  onChange={(e) => setMassErr(e.target.value)}
                  placeholder="e.g. 0.02"
                  aria-invalid={!!errors.massErr}
                />
                {errors.massErr && (
                  <div className="error-text">{errors.massErr}</div>
                )}
              </div>
            </div>

            <div className="field">
              <label htmlFor="fw-samples">
                Rotation-period samples{" "}
                <span className="hint">optional — draws from sample_prot()</span>
              </label>
              <input
                id="fw-samples"
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                max={MAX_SAMPLES}
                value={nSamples}
                onChange={(e) => setNSamples(e.target.value)}
                placeholder="e.g. 2000"
                aria-invalid={!!errors.nSamples}
              />
              {errors.nSamples && (
                <div className="error-text">{errors.nSamples}</div>
              )}
            </div>

            {outOfRange && outOfRange.length > 0 && (
              <p className="note" style={{ marginBottom: "0.9rem" }}>
                Heads-up: {outOfRange.join("; ")}. The model will extrapolate
                beyond its training range.
              </p>
            )}

            <div className="btn-row">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <span className="spinner light" aria-hidden />}
                {busy ? "Evaluating…" : "Predict rotation"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={fillExample}
                disabled={busy}
              >
                Example
              </button>
            </div>
          </form>
        </section>

        <div>
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          {!result && !busy && !error && (
            <div className="card empty-state">
              <div className="glyph" aria-hidden>☉</div>
              <h3>No prediction yet</h3>
              <p>
                Give the model an age and a mass and it will return the full
                rotation-period distribution it has learned.
              </p>
            </div>
          )}
          {busy && !result && (
            <div className="card loading-block">
              <span className="spinner" aria-hidden /> Evaluating density…
            </div>
          )}
          {result && <ForwardResult result={result} />}
        </div>
      </div>
    </div>
  );
}
