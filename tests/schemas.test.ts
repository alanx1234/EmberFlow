import { describe, expect, it } from "vitest";
import {
  ageResponseSchema,
  batchResponseSchema,
  modelInfoSchema,
  rotationResponseSchema,
  starInputSchema,
} from "@/lib/schemas";

const modelInfo = {
  name: "EmberFlow",
  version: "0.1.0",
  n_train: 6584,
  training_range: {
    mass_msun: [0.098, 0.674],
    prot_days: [0.0824, 174.4],
    age_gyr: [0.0015, 11.5],
  },
  age_grid: { min_myr: 1, max_gyr: 13.8, points: 1000 },
  priors: ["flat_in_log_age", "flat_in_age"],
};

describe("modelInfoSchema", () => {
  it("accepts the documented model card", () => {
    expect(modelInfoSchema.parse(modelInfo)).toEqual(modelInfo);
  });

  it("rejects a malformed training range", () => {
    expect(() =>
      modelInfoSchema.parse({
        ...modelInfo,
        training_range: { mass_msun: [0.098] },
      }),
    ).toThrow();
  });
});

describe("starInputSchema", () => {
  it("defaults mass_msun_err to 0", () => {
    const star = starInputSchema.parse({ prot_days: 20, mass_msun: 0.55 });
    expect(star.mass_msun_err).toBe(0);
  });

  it("rejects non-positive periods", () => {
    expect(() =>
      starInputSchema.parse({ prot_days: 0, mass_msun: 0.5 }),
    ).toThrow();
  });
});

describe("response schemas", () => {
  it("accepts a well-formed /api/age response", () => {
    const res = ageResponseSchema.parse({
      input: {
        source_id: null,
        prot_days: 20,
        mass_msun: 0.55,
        mass_msun_err: 0.02,
        prior: "flat_in_log_age",
      },
      summary: { p16_gyr: 1.13, p50_gyr: 1.77, p84_gyr: 2.81, mode_gyr: 1.79 },
      posterior: {
        log_age_myr: [0, 1],
        age_gyr: [0.001, 0.01],
        density_per_dex: [0.1, 0.2],
      },
      metadata: { model_version: "0.1.0", prior: "flat_in_log_age" },
    });
    expect(res.summary.p50_gyr).toBe(1.77);
  });

  it("rejects an unknown prior", () => {
    expect(() =>
      batchResponseSchema.parse({
        results: [],
        metadata: { model_version: "0.1.0", prior: "jeffreys", n_stars: 0 },
      }),
    ).toThrow();
  });

  it("accepts a rotation response with optional samples", () => {
    const base = {
      input: { age_gyr: 0.5, mass_msun: 0.35, mass_msun_err: 0.02, n_samples: 0 },
      summary: { p16_days: 1.2, p50_days: 3.4, p84_days: 9.9 },
      density: { log_prot: [0], prot_days: [1], density_per_dex: [0.4] },
      metadata: { model_version: "0.1.0" },
    };
    expect(rotationResponseSchema.parse(base).samples_days).toBeUndefined();
    expect(
      rotationResponseSchema.parse({ ...base, samples_days: [1, 2, 3] })
        .samples_days,
    ).toHaveLength(3);
  });
});
