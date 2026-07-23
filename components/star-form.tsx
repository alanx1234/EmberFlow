"use client";

import { FormEvent, useState } from "react";
import { AgeRequest, ModelInfo, Prior, PRIOR_LABELS } from "@/lib/schemas";
import { sigFigs } from "@/lib/format-age";

const EXAMPLE = {
  name: "Example star",
  prot: "20",
  mass: "0.55",
  massErr: "0.02",
};

interface StarFormProps {
  onSubmit: (req: AgeRequest) => void;
  busy: boolean;
  modelInfo: ModelInfo | null;
}

/** Input form for the single-star estimator. */
export function StarForm({ onSubmit, busy, modelInfo }: StarFormProps) {
  const [name, setName] = useState("");
  const [prot, setProt] = useState("");
  const [mass, setMass] = useState("");
  const [massErr, setMassErr] = useState("");
  const [prior, setPrior] = useState<Prior>("flat_in_log_age");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const range = modelInfo?.training_range;

  const fillExample = () => {
    setName(EXAMPLE.name);
    setProt(EXAMPLE.prot);
    setMass(EXAMPLE.mass);
    setMassErr(EXAMPLE.massErr);
    setPrior("flat_in_log_age");
    setErrors({});
  };

  const parse = (v: string): number | null => {
    const n = Number(v.trim());
    return v.trim() !== "" && Number.isFinite(n) ? n : null;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const p = parse(prot);
    const m = parse(mass);
    const me = massErr.trim() === "" ? 0 : parse(massErr);
    if (p === null || p <= 0) errs.prot = "Enter a positive period in days.";
    if (m === null || m <= 0) errs.mass = "Enter a positive mass in M☉.";
    if (me === null || me < 0) errs.massErr = "Enter a non-negative uncertainty.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit({
      source_id: name.trim() || null,
      prot_days: p!,
      mass_msun: m!,
      mass_msun_err: me!,
      prior,
    });
  };

  const outOfRange =
    range &&
    (() => {
      const p = parse(prot);
      const m = parse(mass);
      const notes: string[] = [];
      if (p !== null && (p < range.prot_days[0] || p > range.prot_days[1]))
        notes.push(
          `period outside ${sigFigs(range.prot_days[0])}–${sigFigs(range.prot_days[1])} days`,
        );
      if (m !== null && (m < range.mass_msun[0] || m > range.mass_msun[1]))
        notes.push(
          `mass outside ${sigFigs(range.mass_msun[0])}–${sigFigs(range.mass_msun[1])} M☉`,
        );
      return notes;
    })();

  return (
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="star-name">
          Star name or ID <span className="hint">optional, labels the result</span>
        </label>
        <input
          id="star-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Gaia DR3 123…"
          autoComplete="off"
        />
      </div>

      <div className="field">
        <label htmlFor="prot">
          Rotation period <span className="hint">days</span>
        </label>
        <input
          id="prot"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={prot}
          onChange={(e) => setProt(e.target.value)}
          placeholder="e.g. 20"
          aria-invalid={!!errors.prot}
        />
        {errors.prot && <div className="error-text">{errors.prot}</div>}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="mass">
            Stellar mass <span className="hint">M☉</span>
          </label>
          <input
            id="mass"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={mass}
            onChange={(e) => setMass(e.target.value)}
            placeholder="e.g. 0.55"
            aria-invalid={!!errors.mass}
          />
          {errors.mass && <div className="error-text">{errors.mass}</div>}
        </div>
        <div className="field">
          <label htmlFor="mass-err">
            Mass uncertainty <span className="hint">M☉, 1σ</span>
          </label>
          <input
            id="mass-err"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={massErr}
            onChange={(e) => setMassErr(e.target.value)}
            placeholder="e.g. 0.02"
            aria-invalid={!!errors.massErr}
          />
          {errors.massErr && <div className="error-text">{errors.massErr}</div>}
        </div>
      </div>

      <div className="field">
        <label>Age prior</label>
        <div className="radio-row" role="radiogroup" aria-label="Age prior">
          {(Object.keys(PRIOR_LABELS) as Prior[]).map((p) => (
            <label key={p}>
              <input
                type="radio"
                name="prior"
                checked={prior === p}
                onChange={() => setPrior(p)}
              />
              {PRIOR_LABELS[p]}
              {p === "flat_in_log_age" && (
                <span className="hint">default</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {outOfRange && outOfRange.length > 0 && (
        <p className="note" style={{ marginBottom: "0.9rem" }}>
          Heads-up: {outOfRange.join("; ")}. The model will extrapolate beyond
          its training range.
        </p>
      )}

      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy && <span className="spinner light" aria-hidden />}
          {busy ? "Estimating…" : "Estimate age"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={fillExample}
          disabled={busy}
        >
          Example star
        </button>
      </div>
    </form>
  );
}
