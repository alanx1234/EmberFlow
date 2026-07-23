import { z } from "zod";

/** Zod schemas mirroring the FastAPI bridge (api/index.py). */

export const priorSchema = z.enum(["flat_in_log_age", "flat_in_age"]);
export type Prior = z.infer<typeof priorSchema>;

export const PRIOR_LABELS: Record<Prior, string> = {
  flat_in_log_age: "Uniform in log age",
  flat_in_age: "Uniform in linear age",
};

// ---------------------------------------------------------------- requests

export const starInputSchema = z.object({
  source_id: z.string().nullable().optional(),
  prot_days: z.number().positive(),
  mass_msun: z.number().positive(),
  mass_msun_err: z.number().min(0).default(0),
});
export type StarInput = z.infer<typeof starInputSchema>;

export const ageRequestSchema = starInputSchema.extend({
  prior: priorSchema.default("flat_in_log_age"),
});
export type AgeRequest = z.infer<typeof ageRequestSchema>;

export const batchRequestSchema = z.object({
  stars: z.array(starInputSchema).min(1),
  prior: priorSchema.default("flat_in_log_age"),
});
export type BatchRequest = z.infer<typeof batchRequestSchema>;

export const rotationRequestSchema = z.object({
  age_gyr: z.number().positive(),
  mass_msun: z.number().positive(),
  mass_msun_err: z.number().min(0).default(0),
  n_samples: z.number().int().min(0).default(0),
});
export type RotationRequest = z.infer<typeof rotationRequestSchema>;

// --------------------------------------------------------------- responses

export const modelInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  n_train: z.number(),
  training_range: z.object({
    mass_msun: z.tuple([z.number(), z.number()]),
    prot_days: z.tuple([z.number(), z.number()]),
    age_gyr: z.tuple([z.number(), z.number()]),
  }),
  age_grid: z.object({
    min_myr: z.number(),
    max_gyr: z.number(),
    points: z.number(),
  }),
  priors: z.array(z.string()),
});
export type ModelInfo = z.infer<typeof modelInfoSchema>;

export const posteriorSchema = z.object({
  log_age_myr: z.array(z.number()),
  age_gyr: z.array(z.number()),
  density_per_dex: z.array(z.number()),
});
export type Posterior = z.infer<typeof posteriorSchema>;

export const ageResponseSchema = z.object({
  input: z.object({
    source_id: z.string().nullable(),
    prot_days: z.number(),
    mass_msun: z.number(),
    mass_msun_err: z.number(),
    prior: priorSchema,
  }),
  summary: z.object({
    p16_gyr: z.number(),
    p50_gyr: z.number(),
    p84_gyr: z.number(),
    mode_gyr: z.number(),
  }),
  posterior: posteriorSchema,
  metadata: z.object({ model_version: z.string(), prior: priorSchema }),
});
export type AgeResponse = z.infer<typeof ageResponseSchema>;

export const batchResultSchema = z.object({
  source_id: z.string().nullable(),
  prot_days: z.number(),
  mass_msun: z.number(),
  mass_msun_err: z.number(),
  age_gyr: z.number(),
  age_err_lo_gyr: z.number(),
  age_err_hi_gyr: z.number(),
  level: z.number(),
});
export type BatchResult = z.infer<typeof batchResultSchema>;

export const batchResponseSchema = z.object({
  results: z.array(batchResultSchema),
  metadata: z.object({
    model_version: z.string(),
    prior: priorSchema,
    n_stars: z.number(),
  }),
});
export type BatchResponse = z.infer<typeof batchResponseSchema>;

export const rotationResponseSchema = z.object({
  input: z.object({
    age_gyr: z.number(),
    mass_msun: z.number(),
    mass_msun_err: z.number(),
    n_samples: z.number(),
  }),
  summary: z.object({
    p16_days: z.number(),
    p50_days: z.number(),
    p84_days: z.number(),
  }),
  density: z.object({
    log_prot: z.array(z.number()),
    prot_days: z.array(z.number()),
    density_per_dex: z.array(z.number()),
  }),
  metadata: z.object({ model_version: z.string() }),
  samples_days: z.array(z.number()).optional(),
});
export type RotationResponse = z.infer<typeof rotationResponseSchema>;
