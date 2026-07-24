import { describe, expect, it } from "vitest";
import {
  autoMapColumns,
  guessColumns,
  posteriorToCsv,
  TEMPLATE_CSV,
  toCsv,
  validateRows,
} from "@/lib/csv";

describe("autoMapColumns", () => {
  it("maps the canonical template headers", () => {
    expect(
      autoMapColumns(["source_id", "prot_days", "mass_msun", "mass_msun_err"]),
    ).toEqual({
      source_id: "source_id",
      prot_days: "prot_days",
      mass_msun: "mass_msun",
      mass_msun_err: "mass_msun_err",
    });
  });

  it("recognizes common alternatives case-insensitively", () => {
    const m = autoMapColumns(["Name", "Prot", "Mstar", "e_mass"]);
    expect(m.source_id).toBe("Name");
    expect(m.prot_days).toBe("Prot");
    expect(m.mass_msun).toBe("Mstar");
    expect(m.mass_msun_err).toBe("e_mass");
  });

  it("maps asymmetric error columns separately", () => {
    const m = autoMapColumns([
      "id",
      "period",
      "mass",
      "mass_msun_err_lo",
      "mass_msun_err_hi",
    ]);
    expect(m.mass_msun_err_lo).toBe("mass_msun_err_lo");
    expect(m.mass_msun_err_hi).toBe("mass_msun_err_hi");
    expect(m.mass_msun_err).toBeUndefined();
  });

  it("never assigns one header to two roles", () => {
    const m = autoMapColumns(["mass"]);
    const used = Object.values(m);
    expect(new Set(used).size).toBe(used.length);
  });
});

describe("guessColumns", () => {
  it("scores canonical names high and other synonyms medium", () => {
    const { mapping, confidence } = guessColumns(["prot_days", "Mstar"]);
    expect(mapping.prot_days).toBe("prot_days");
    expect(confidence.prot_days).toBe("high");
    expect(mapping.mass_msun).toBe("Mstar");
    expect(confidence.mass_msun).toBe("medium");
  });

  it("falls back to a low-confidence fuzzy match", () => {
    const { mapping, confidence } = guessColumns(["rotation_period_days", "mass_msun"]);
    expect(mapping.prot_days).toBe("rotation_period_days");
    expect(confidence.prot_days).toBe("low");
    expect(confidence.mass_msun).toBe("high");
  });

  it("leaves unrecognized headers unmapped", () => {
    const { mapping } = guessColumns(["ra", "dec"]);
    expect(mapping.prot_days).toBeUndefined();
    expect(mapping.mass_msun).toBeUndefined();
  });

  it("uses each header for at most one role", () => {
    const { mapping } = guessColumns(["mass", "mass_err_lo", "mass_err_hi"]);
    const used = Object.values(mapping);
    expect(new Set(used).size).toBe(used.length);
  });
});

describe("validateRows", () => {
  const mapping = {
    source_id: "id",
    prot_days: "p",
    mass_msun: "m",
    mass_msun_err: "e",
  };

  it("accepts valid rows and defaults missing uncertainty to 0", () => {
    const { valid, excluded } = validateRows(
      [
        { id: "a", p: "18.7", m: "0.42", e: "0.025" },
        { id: "b", p: "2.4", m: "0.21", e: "" },
      ],
      mapping,
    );
    expect(excluded).toHaveLength(0);
    expect(valid).toHaveLength(2);
    expect(valid[0].star).toEqual({
      source_id: "a",
      prot_days: 18.7,
      mass_msun: 0.42,
      mass_msun_err: 0.025,
    });
    expect(valid[1].star.mass_msun_err).toBe(0);
  });

  it("excludes missing and non-numeric required values", () => {
    const { valid, excluded } = validateRows(
      [
        { id: "a", p: "", m: "0.4", e: "" },
        { id: "b", p: "abc", m: "0.4", e: "" },
        { id: "c", p: "10", m: "n/a", e: "" },
      ],
      mapping,
    );
    expect(valid).toHaveLength(0);
    expect(excluded).toHaveLength(3);
    expect(excluded[0].reason).toMatch(/rotation period/i);
    expect(excluded[2].reason).toMatch(/mass/i);
  });

  it("keeps rows outside the training range (mild extrapolation)", () => {
    const { valid, excluded } = validateRows(
      [
        { id: "too-heavy", p: "10", m: "0.95", e: "" },
        { id: "too-slow", p: "500", m: "0.4", e: "" },
        { id: "ok", p: "10", m: "0.4", e: "" },
      ],
      mapping,
    );
    expect(valid.map((v) => v.star.source_id)).toEqual([
      "too-heavy",
      "too-slow",
      "ok",
    ]);
    expect(excluded).toHaveLength(0);
  });

  it("averages asymmetric uncertainties: (lo + hi) / 2", () => {
    const { valid } = validateRows(
      [{ id: "a", p: "10", m: "0.4", lo: "0.02", hi: "0.04" }],
      {
        source_id: "id",
        prot_days: "p",
        mass_msun: "m",
        mass_msun_err_lo: "lo",
        mass_msun_err_hi: "hi",
      },
    );
    expect(valid[0].star.mass_msun_err).toBeCloseTo(0.03);
  });

  it("labels unnamed rows by row number", () => {
    const { valid } = validateRows(
      [{ p: "10", m: "0.4" }],
      { prot_days: "p", mass_msun: "m" },
    );
    expect(valid[0].star.source_id).toBe("row_1");
  });
});

describe("CSV builders", () => {
  it("escapes commas and quotes", () => {
    const csv = toCsv(["a", "b"], [['x,"y"', 1]]);
    expect(csv).toBe('a,b\n"x,""y""",1\n');
  });

  it("writes the documented posterior columns", () => {
    const csv = posteriorToCsv({
      log_age_myr: [0],
      age_gyr: [0.001],
      density_per_dex: [0.5],
    });
    const [header, row] = csv.trim().split("\n");
    expect(header).toBe("log_age_myr,age_myr,age_gyr,posterior_density_per_dex");
    const cols = row.split(",").map(Number);
    expect(cols[0]).toBe(0);
    expect(cols[1]).toBeCloseTo(1); // age_myr
    expect(cols[2]).toBeCloseTo(0.001); // age_gyr
  });

  it("template matches the canonical schema", () => {
    expect(TEMPLATE_CSV.split("\n")[0]).toBe(
      "source_id,prot_days,mass_msun,mass_msun_err",
    );
  });
});
