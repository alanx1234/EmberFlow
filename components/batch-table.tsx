"use client";

import { useMemo, useState } from "react";
import { BatchResult } from "@/lib/schemas";
import { formatAgeWithErrors, sigFigs } from "@/lib/format-age";

export const MAX_COMPARE = 5;
const PAGE_SIZE = 25;

type SortKey = "source_id" | "prot_days" | "mass_msun" | "age_gyr";

interface BatchTableProps {
  results: BatchResult[];
  inspectedIdx: number | null;
  selectedIdxs: number[];
  onInspect: (idx: number) => void;
  onToggleSelect: (idx: number) => void;
}

/** Sortable, searchable, paginated batch results. Click a row to inspect its
 * posterior; check up to five rows to overlay them. */
export function BatchTable({
  results,
  inspectedIdx,
  selectedIdxs,
  onInspect,
  onToggleSelect,
}: BatchTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("source_id");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const indexed = results.map((r, idx) => ({ r, idx }));
    const q = search.trim().toLowerCase();
    const filtered = q
      ? indexed.filter(({ r }) => (r.source_id ?? "").toLowerCase().includes(q))
      : indexed;
    const dir = sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "source_id") {
        return dir * (a.r.source_id ?? "").localeCompare(b.r.source_id ?? "", undefined, { numeric: true });
      }
      return dir * (a.r[sortKey] - b.r[sortKey]);
    });
  }, [results, search, sortKey, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const visible = rows.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE);

  const header = (key: SortKey, label: string, numeric = false) => (
    <th
      className={`sortable${numeric ? " num" : ""}`}
      onClick={() => {
        if (sortKey === key) setSortAsc((a) => !a);
        else {
          setSortKey(key);
          setSortAsc(true);
        }
        setPage(0);
      }}
      aria-sort={sortKey === key ? (sortAsc ? "ascending" : "descending") : "none"}
    >
      {label} {sortKey === key ? (sortAsc ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <div>
      <div
        className="btn-row"
        style={{ justifyContent: "space-between", marginBottom: "0.8rem" }}
      >
        <input
          type="text"
          placeholder="Search by source ID…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          style={{
            font: "inherit",
            fontSize: "0.9rem",
            padding: "0.45rem 0.7rem",
            border: "1px solid var(--border-strong)",
            borderRadius: "8px",
            minWidth: "220px",
          }}
          aria-label="Search by source ID"
        />
        <span className="hint" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Select up to {MAX_COMPARE} rows to compare posteriors · click a row to
          inspect it
        </span>
      </div>

      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>
              <th aria-label="Compare selection" />
              {header("source_id", "Source ID")}
              {header("prot_days", "Period (d)", true)}
              {header("mass_msun", "Mass (M☉)", true)}
              {header("age_gyr", "Median age", true)}
              <th className="num">− unc.</th>
              <th className="num">+ unc.</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ r, idx }) => {
              const fmt = formatAgeWithErrors(r.age_gyr, r.age_err_lo_gyr, r.age_err_hi_gyr);
              const selected = selectedIdxs.includes(idx);
              const atLimit = !selected && selectedIdxs.length >= MAX_COMPARE;
              return (
                <tr
                  key={idx}
                  className={`clickable${selected ? " selected-row" : ""}${idx === inspectedIdx ? " inspected" : ""}`}
                  onClick={() => onInspect(idx)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={atLimit}
                      onChange={() => onToggleSelect(idx)}
                      aria-label={`Compare ${r.source_id ?? `row ${idx + 1}`}`}
                    />
                  </td>
                  <td>{r.source_id ?? "—"}</td>
                  <td className="num">{sigFigs(r.prot_days, 4)}</td>
                  <td className="num">{sigFigs(r.mass_msun, 3)}</td>
                  <td className="num">
                    {fmt.value} {fmt.unit}
                  </td>
                  <td className="num">−{fmt.errLo}</td>
                  <td className="num">+{fmt.errHi}</td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  No rows match “{search}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="pager">
          <button
            className="btn btn-ghost btn-sm"
            disabled={clampedPage === 0}
            onClick={() => setPage(clampedPage - 1)}
          >
            ← Prev
          </button>
          <span>
            Page {clampedPage + 1} of {pageCount} · {rows.length.toLocaleString()} rows
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={clampedPage >= pageCount - 1}
            onClick={() => setPage(clampedPage + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
