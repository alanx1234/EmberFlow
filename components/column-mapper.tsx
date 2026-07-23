"use client";

import { useMemo, useState } from "react";
import {
  ColumnMapping,
  ColumnRole,
  REQUIRED_ROLES,
  ROLE_LABELS,
  ROLE_UNITS,
  ValidationResult,
  validateRows,
  ValidRow,
} from "@/lib/csv";
import { ModelInfo } from "@/lib/schemas";

const ROLES: ColumnRole[] = [
  "source_id",
  "prot_days",
  "mass_msun",
  "mass_msun_err",
  "mass_msun_err_lo",
  "mass_msun_err_hi",
];

const PREVIEW_ROWS = 10;

const isNumeric = (v: unknown) => {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  return s !== "" && Number.isFinite(Number(s));
};

interface ColumnMapperProps {
  fileName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  initialMapping: ColumnMapping;
  modelInfo: ModelInfo;
  busy: boolean;
  onRun: (valid: ValidRow[], mapping: ColumnMapping) => void;
  onReset: () => void;
}

/** Interactive mapping of CSV columns to model inputs, with a 10-row preview,
 * pre-inference validation, and valid/excluded counts. */
export function ColumnMapper({
  fileName,
  headers,
  rows,
  initialMapping,
  modelInfo,
  busy,
  onRun,
  onReset,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping);

  const validation: ValidationResult = useMemo(
    () => validateRows(rows, mapping, modelInfo.training_range),
    [rows, mapping, modelInfo],
  );

  const missingRequired = REQUIRED_ROLES.filter((r) => !mapping[r]);
  const excludedByReason = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of validation.excluded) {
      counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [validation]);

  const setRole = (role: ColumnRole, header: string) => {
    setMapping((m) => {
      const next = { ...m };
      if (header === "") {
        delete next[role];
        return next;
      }
      // one header can serve only one role
      for (const r of ROLES) {
        if (next[r] === header) delete next[r];
      }
      next[role] = header;
      return next;
    });
  };

  const requiredHeaders = new Set(
    REQUIRED_ROLES.map((r) => mapping[r]).filter(Boolean) as string[],
  );

  return (
    <div>
      <div
        className="btn-row"
        style={{ justifyContent: "space-between", marginBottom: "1rem" }}
      >
        <h3 style={{ margin: 0 }}>
          Map columns <span className="hint">— {fileName}, {rows.length.toLocaleString()} rows</span>
        </h3>
        <button className="btn btn-ghost btn-sm" onClick={onReset} disabled={busy}>
          ← Choose another file
        </button>
      </div>

      <div className="mapper-grid" style={{ marginBottom: "1.1rem" }}>
        {ROLES.map((role) => (
          <div className="field" key={role} style={{ marginBottom: 0 }}>
            <label htmlFor={`map-${role}`}>
              {ROLE_LABELS[role]}
              <span className="hint">
                {ROLE_UNITS[role]}
                {REQUIRED_ROLES.includes(role) ? " · required" : ""}
              </span>
            </label>
            <select
              id={`map-${role}`}
              value={mapping[role] ?? ""}
              onChange={(e) => setRole(role, e.target.value)}
            >
              <option value="">— not mapped —</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <p className="note" style={{ marginBottom: "1rem" }}>
        If both lower and upper mass uncertainties are mapped, the model uses
        their average, σ<sub>M</sub> = (σ<sub>lo</sub> + σ<sub>hi</sub>) / 2.
        Missing uncertainties default to 0. Rows outside the training range
        (mass {modelInfo.training_range.mass_msun[0].toPrecision(3)}–
        {modelInfo.training_range.mass_msun[1].toPrecision(3)} M☉, period{" "}
        {modelInfo.training_range.prot_days[0].toPrecision(3)}–
        {modelInfo.training_range.prot_days[1].toPrecision(4)} days) are
        excluded before inference.
      </p>

      <div className="card-title">Preview — first {PREVIEW_ROWS} rows</div>
      <div className="table-scroll" style={{ marginBottom: "1rem" }}>
        <table className="data">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>
                  {h}
                  {Object.entries(mapping).find(([, v]) => v === h) && (
                    <span style={{ color: "var(--accent-main)" }}>
                      {" "}
                      → {ROLE_LABELS[
                        Object.entries(mapping).find(([, v]) => v === h)![0] as ColumnRole
                      ]}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, PREVIEW_ROWS).map((row, i) => (
              <tr key={i}>
                {headers.map((h) => {
                  const invalid = requiredHeaders.has(h) && !isNumeric(row[h]);
                  return (
                    <td key={h} className={invalid ? "invalid-cell" : undefined}>
                      {String(row[h] ?? "")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="btn-row" style={{ marginBottom: "1rem" }}>
        <span className="pill ok">✓ {validation.valid.length.toLocaleString()} valid</span>
        <span className={`pill${validation.excluded.length ? " err" : ""}`}>
          {validation.excluded.length.toLocaleString()} excluded
        </span>
      </div>

      {excludedByReason.length > 0 && (
        <ul style={{ fontSize: "0.86rem", color: "var(--text-muted)", marginTop: 0 }}>
          {excludedByReason.map(([reason, n]) => (
            <li key={reason}>
              {reason} — {n.toLocaleString()} row{n === 1 ? "" : "s"}
            </li>
          ))}
        </ul>
      )}

      {missingRequired.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
          Map the required column{missingRequired.length > 1 ? "s" : ""}:{" "}
          {missingRequired.map((r) => ROLE_LABELS[r]).join(", ")}.
        </div>
      )}

      <div className="btn-row">
        <button
          className="btn btn-primary"
          disabled={busy || validation.valid.length === 0 || missingRequired.length > 0}
          onClick={() => onRun(validation.valid, mapping)}
        >
          {busy && <span className="spinner light" aria-hidden />}
          {busy
            ? "Running inference…"
            : `Estimate ages for ${validation.valid.length.toLocaleString()} star${validation.valid.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
