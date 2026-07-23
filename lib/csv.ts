import { ModelInfo, StarInput } from "./schemas";

/** CSV column roles the batch uploader understands. */
export type ColumnRole =
  | "source_id"
  | "prot_days"
  | "mass_msun"
  | "mass_msun_err"
  | "mass_msun_err_lo"
  | "mass_msun_err_hi";

export const ROLE_LABELS: Record<ColumnRole, string> = {
  source_id: "Source ID",
  prot_days: "Rotation period",
  mass_msun: "Stellar mass",
  mass_msun_err: "Mass uncertainty (symmetric)",
  mass_msun_err_lo: "Mass uncertainty (lower)",
  mass_msun_err_hi: "Mass uncertainty (upper)",
};

export const ROLE_UNITS: Record<ColumnRole, string> = {
  source_id: "label",
  prot_days: "days",
  mass_msun: "M☉",
  mass_msun_err: "M☉",
  mass_msun_err_lo: "M☉",
  mass_msun_err_hi: "M☉",
};

export const REQUIRED_ROLES: ColumnRole[] = ["prot_days", "mass_msun"];

/** Common header spellings, matched after lowercasing and stripping
 * non-alphanumeric characters. Order matters: earlier = higher priority. */
const SYNONYMS: Record<ColumnRole, string[]> = {
  prot_days: [
    "prot_days",
    "prot",
    "period",
    "rotation_period",
    "p_rot",
    "period_days",
    "prot_day",
    "rot_period",
  ],
  mass_msun: ["mass_msun", "mass", "mstar", "stellar_mass", "m_star", "m_sun"],
  mass_msun_err: [
    "mass_msun_err",
    "mass_err",
    "e_mass",
    "mass_error",
    "sigma_mass",
    "mass_msun_err_avg",
    "mass_unc",
  ],
  mass_msun_err_lo: ["mass_msun_err_lo", "mass_err_lo", "e_mass_lo", "mass_lo_err"],
  mass_msun_err_hi: ["mass_msun_err_hi", "mass_err_hi", "e_mass_hi", "mass_hi_err"],
  source_id: [
    "source_id",
    "name",
    "id",
    "star_name",
    "star",
    "starid",
    "object",
    "gaia_id",
    "target",
  ],
};

const normalize = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

export type ColumnMapping = Partial<Record<ColumnRole, string>>;

/** Guess a mapping from CSV headers to column roles. Each header is used for
 * at most one role; exact canonical names win over looser synonyms. */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const taken = new Set<string>();
  // lo/hi before the symmetric error so "mass_msun_err_lo" is not swallowed
  // by a loose "mass_err" prefix match; id last so it never steals a data column.
  const roleOrder: ColumnRole[] = [
    "prot_days",
    "mass_msun",
    "mass_msun_err_lo",
    "mass_msun_err_hi",
    "mass_msun_err",
    "source_id",
  ];
  for (const role of roleOrder) {
    for (const syn of SYNONYMS[role]) {
      const hit = headers.find(
        (h) => !taken.has(h) && normalize(h) === normalize(syn),
      );
      if (hit) {
        mapping[role] = hit;
        taken.add(hit);
        break;
      }
    }
  }
  return mapping;
}

export interface ValidRow {
  index: number;
  star: StarInput;
}

export interface ExcludedRow {
  index: number;
  reason: string;
}

export interface ValidationResult {
  valid: ValidRow[];
  excluded: ExcludedRow[];
}

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Validate parsed CSV rows against a mapping and the model's training range.
 *
 * - missing / non-numeric required values are excluded with a reason
 * - rows outside the training range (mass or period) are excluded
 * - asymmetric errors are averaged: sigma = (lo + hi) / 2
 * - missing mass uncertainty defaults to 0
 */
export function validateRows(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping,
  trainingRange: ModelInfo["training_range"],
): ValidationResult {
  const valid: ValidRow[] = [];
  const excluded: ExcludedRow[] = [];
  const [massLo, massHi] = trainingRange.mass_msun;
  const [protLo, protHi] = trainingRange.prot_days;

  rows.forEach((row, index) => {
    const prot = toNumber(mapping.prot_days ? row[mapping.prot_days] : null);
    const mass = toNumber(mapping.mass_msun ? row[mapping.mass_msun] : null);

    if (prot === null) {
      excluded.push({ index, reason: "Missing or non-numeric rotation period" });
      return;
    }
    if (mass === null) {
      excluded.push({ index, reason: "Missing or non-numeric mass" });
      return;
    }
    if (prot <= 0) {
      excluded.push({ index, reason: "Rotation period must be positive" });
      return;
    }
    if (mass <= 0) {
      excluded.push({ index, reason: "Mass must be positive" });
      return;
    }
    if (prot < protLo || prot > protHi) {
      excluded.push({
        index,
        reason: `Period outside training range (${protLo.toPrecision(3)}–${protHi.toPrecision(4)} days)`,
      });
      return;
    }
    if (mass < massLo || mass > massHi) {
      excluded.push({
        index,
        reason: `Mass outside training range (${massLo.toPrecision(3)}–${massHi.toPrecision(3)} M☉)`,
      });
      return;
    }

    let massErr = 0;
    const sym = toNumber(mapping.mass_msun_err ? row[mapping.mass_msun_err] : null);
    const lo = toNumber(
      mapping.mass_msun_err_lo ? row[mapping.mass_msun_err_lo] : null,
    );
    const hi = toNumber(
      mapping.mass_msun_err_hi ? row[mapping.mass_msun_err_hi] : null,
    );
    if (lo !== null && hi !== null) {
      massErr = (lo + hi) / 2;
    } else if (sym !== null) {
      massErr = sym;
    }
    if (massErr < 0) {
      excluded.push({ index, reason: "Mass uncertainty must be non-negative" });
      return;
    }

    const id = mapping.source_id ? row[mapping.source_id] : null;
    valid.push({
      index,
      star: {
        source_id:
          id === null || id === undefined || String(id).trim() === ""
            ? `row_${index + 1}`
            : String(id).trim(),
        prot_days: prot,
        mass_msun: mass,
        mass_msun_err: massErr,
      },
    });
  });

  return { valid, excluded };
}

// ------------------------------------------------------------- CSV builders

export const TEMPLATE_CSV = [
  "source_id,prot_days,mass_msun,mass_msun_err",
  "star_001,18.7,0.42,0.025",
  "star_002,2.4,0.21,0.010",
  "star_003,45.2,0.55,0.020",
  "",
].join("\n");

const csvEscape = (v: string): string =>
  /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(row.map((v) => csvEscape(String(v))).join(","));
  }
  return lines.join("\n") + "\n";
}

/** Posterior CSV in the documented format:
 * log_age_myr,age_myr,age_gyr,posterior_density_per_dex */
export function posteriorToCsv(posterior: {
  log_age_myr: number[];
  age_gyr: number[];
  density_per_dex: number[];
}): string {
  return toCsv(
    ["log_age_myr", "age_myr", "age_gyr", "posterior_density_per_dex"],
    posterior.log_age_myr.map((loga, i) => [
      loga.toFixed(4),
      (posterior.age_gyr[i] * 1000).toPrecision(6),
      posterior.age_gyr[i].toPrecision(6),
      posterior.density_per_dex[i].toPrecision(6),
    ]),
  );
}

export function rotationDensityToCsv(density: {
  log_prot: number[];
  prot_days: number[];
  density_per_dex: number[];
}): string {
  return toCsv(
    ["log_prot_days", "prot_days", "density_per_dex"],
    density.log_prot.map((lp, i) => [
      lp.toFixed(4),
      density.prot_days[i].toPrecision(6),
      density.density_per_dex[i].toPrecision(6),
    ]),
  );
}
