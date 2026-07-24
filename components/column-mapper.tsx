"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnMapping,
  ColumnRole,
  Confidence,
  guessColumns,
  REQUIRED_ROLES,
  ROLE_LABELS,
  ROLE_UNITS,
  ValidationResult,
  validateRows,
  ValidRow,
} from "@/lib/csv";

const ROLES: ColumnRole[] = [
  "source_id",
  "prot_days",
  "mass_msun",
  "mass_msun_err_lo",
  "mass_msun_err_hi",
];

const PREVIEW_ROWS = 10;

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "confident guess",
  medium: "likely guess",
  low: "possible guess",
};

const isNumeric = (v: unknown) => {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  return s !== "" && Number.isFinite(Number(s));
};

interface ColumnMapperProps {
  fileName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  busy: boolean;
  onRun: (valid: ValidRow[], mapping: ColumnMapping) => void;
  onReset: () => void;
}

/** Column mapping driven by a confidence-scored auto-map: each CSV column shows
 * its guessed role for one-click accept, and any column can be reassigned by
 * clicking its header (click-to-assign). */
export function ColumnMapper({
  fileName,
  headers,
  rows,
  busy,
  onRun,
  onReset,
}: ColumnMapperProps) {
  const guess = useMemo(() => guessColumns(headers), [headers]);

  const [mapping, setMapping] = useState<ColumnMapping>(guess.mapping);
  // roles whose guess the user has explicitly accepted or set; high-confidence
  // guesses count as accepted up front so only the shakier ones need a look.
  const [confirmed, setConfirmed] = useState<Set<ColumnRole>>(
    () =>
      new Set(
        (Object.keys(guess.confidence) as ColumnRole[]).filter(
          (r) => guess.confidence[r] === "high",
        ),
      ),
  );
  const [openHeader, setOpenHeader] = useState<string | null>(null);
  // a still-missing required role whose "pick a column" menu is open (guided flow)
  const [guidedRole, setGuidedRole] = useState<ColumnRole | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openHeaderMenu = (header: string) => {
    setGuidedRole(null);
    setOpenHeader((cur) => (cur === header ? null : header));
  };
  const openGuidedMenu = (role: ColumnRole) => {
    setOpenHeader(null);
    setGuidedRole((cur) => (cur === role ? null : role));
  };
  const closeMenus = () => {
    setOpenHeader(null);
    setGuidedRole(null);
  };

  const anyMenuOpen = openHeader !== null || guidedRole !== null;
  useEffect(() => {
    if (!anyMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenus();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [anyMenuOpen]);

  const validation: ValidationResult = useMemo(
    () => validateRows(rows, mapping),
    [rows, mapping],
  );

  const missingRequired = REQUIRED_ROLES.filter((r) => !mapping[r]);
  const excludedByReason = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of validation.excluded) {
      counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [validation]);

  const excludedTip = excludedByReason
    .map(([reason, n]) => `${reason} — ${n.toLocaleString()} row${n === 1 ? "" : "s"}`)
    .join("\n");

  const roleOfHeader = (header: string): ColumnRole | undefined =>
    (Object.keys(mapping) as ColumnRole[]).find((r) => mapping[r] === header);

  /** Assign a header to a role (or clear it with role === null), keeping the
   * one-header-one-role invariant. Any touched role is marked confirmed. */
  const assign = (header: string, role: ColumnRole | null) => {
    setMapping((m) => {
      const next = { ...m };
      // header can serve only one role
      for (const r of Object.keys(next) as ColumnRole[]) {
        if (next[r] === header) delete next[r];
      }
      if (role) next[role] = header;
      return next;
    });
    if (role) setConfirmed((c) => new Set(c).add(role));
    closeMenus();
  };

  const acceptGuess = (role: ColumnRole) =>
    setConfirmed((c) => new Set(c).add(role));

  const requiredHeaders = new Set(
    REQUIRED_ROLES.map((r) => mapping[r]).filter(Boolean) as string[],
  );

  // roles still available to assign to the open header (plus its current role)
  const rolesForMenu = (header: string) => {
    const current = roleOfHeader(header);
    return ROLES.filter((r) => !mapping[r] || mapping[r] === header || r === current);
  };

  // columns not yet assigned to any role — candidates for the guided picker
  const unmappedHeaders = headers.filter((h) => !roleOfHeader(h));

  return (
    <div>
      <div
        className="btn-row"
        style={{ justifyContent: "space-between", marginBottom: "1rem" }}
      >
        <h3 style={{ margin: 0 }}>
          Map columns{" "}
          <span className="hint">
            — {fileName}, {rows.length.toLocaleString()} rows
          </span>
        </h3>
        <button className="btn btn-ghost btn-sm" onClick={onReset} disabled={busy}>
          ← Choose another file
        </button>
      </div>

      {missingRequired.length > 0 && (
        <div className="map-guide">
          <span className="map-guide-label">
            We couldn&apos;t match {missingRequired.length === 1 ? "a" : "these"}{" "}
            required column{missingRequired.length > 1 ? "s" : ""} — assign{" "}
            {missingRequired.length > 1 ? "them" : "it"}:
          </span>
          {missingRequired.map((role) => (
            <div
              className="map-guide-item"
              key={role}
              ref={guidedRole === role ? menuRef : undefined}
            >
              <button
                type="button"
                className="map-guide-chip"
                onClick={() => openGuidedMenu(role)}
                aria-haspopup="listbox"
                aria-expanded={guidedRole === role}
              >
                {ROLE_LABELS[role]} <span aria-hidden>▸</span>
              </button>
              {guidedRole === role && (
                <div className="map-menu" role="listbox">
                  {unmappedHeaders.length > 0 ? (
                    unmappedHeaders.map((h) => (
                      <button
                        key={h}
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="map-menu-item"
                        onClick={() => assign(h, role)}
                      >
                        {h}
                      </button>
                    ))
                  ) : (
                    <div className="map-menu-empty">
                      Every column is assigned — reassign one from the table above.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="table-scroll mapper-table" style={{ marginBottom: "1rem" }}>
        <table className="data">
          <thead>
            <tr>
              {headers.map((h) => {
                const role = roleOfHeader(h);
                const conf = role ? guess.confidence[role] : undefined;
                const isGuess = role ? guess.mapping[role] === h : false;
                const needsReview =
                  role != null && isGuess && !confirmed.has(role);
                return (
                  <th
                    key={h}
                    className={`map-th${role ? " mapped" : ""}${needsReview ? " review" : ""}`}
                  >
                    <div className="map-th-name">{h}</div>

                    <div
                      className="map-th-controls"
                      ref={openHeader === h ? menuRef : undefined}
                    >
                      <button
                        type="button"
                        className="map-role-btn"
                        onClick={() => openHeaderMenu(h)}
                        aria-haspopup="listbox"
                        aria-expanded={openHeader === h}
                      >
                        {role ? (
                          <>
                            {needsReview && conf && (
                              <span
                                className={`conf-dot ${conf}`}
                                title={CONFIDENCE_LABEL[conf]}
                                aria-hidden
                              />
                            )}
                            <span className="map-role-label">
                              {ROLE_LABELS[role]}
                            </span>
                          </>
                        ) : (
                          <span className="map-role-none">＋ assign role</span>
                        )}
                        <span className="map-caret" aria-hidden>
                          ▾
                        </span>
                      </button>

                      {needsReview && (
                        <button
                          type="button"
                          className="map-accept"
                          onClick={() => role && acceptGuess(role)}
                          title="Accept this guess"
                        >
                          ✓ accept
                        </button>
                      )}

                      {openHeader === h && (
                        <div className="map-menu" role="listbox">
                          {rolesForMenu(h).map((r) => (
                            <button
                              key={r}
                              type="button"
                              role="option"
                              aria-selected={role === r}
                              className={`map-menu-item${role === r ? " active" : ""}`}
                              onClick={() => assign(h, r)}
                            >
                              {ROLE_LABELS[r]}
                              <span className="hint">{ROLE_UNITS[r]}</span>
                            </button>
                          ))}
                          {role && (
                            <button
                              type="button"
                              className="map-menu-item clear"
                              onClick={() => assign(h, null)}
                            >
                              Unassign
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
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
        <span className="pill ok">
          ✓ {validation.valid.length.toLocaleString()} valid
        </span>
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          <span className={`pill${validation.excluded.length ? " err" : ""}`}>
            {validation.excluded.length.toLocaleString()} excluded
          </span>
          {validation.excluded.length > 0 && (
            <span
              className="info-tip info-tip-right"
              tabIndex={0}
              role="note"
              aria-label={excludedTip}
              data-tip={excludedTip}
            >
              i
            </span>
          )}
        </span>
      </div>

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
