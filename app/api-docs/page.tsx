import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "REST API",
  description:
    "Reference for the EmberFlow HTTP API: model card, single-star ages, batch summaries, and the forward rotation model.",
};

function Endpoint({
  method,
  path,
  children,
}: {
  method: string;
  path: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card" style={{ marginBottom: "1.25rem" }}>
      <h3 style={{ marginBottom: "0.2rem" }}>
        <code
          style={{
            background: method === "GET" ? "var(--ok-bg)" : "#eef1f8",
            marginRight: "0.5rem",
          }}
        >
          {method}
        </code>
        <code>{path}</code>
      </h3>
      {children}
    </section>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="container page">
      <div className="page-head">
        <h1>REST API</h1>
        <p className="lede">
          The same FastAPI bridge that powers this site. All endpoints accept
          and return JSON; no uploaded data is stored. For heavy programmatic
          use (full posteriors for whole catalogs), prefer the{" "}
          <a
            href="https://github.com/alanx1234/EmberFlow"
            target="_blank"
            rel="noreferrer"
          >
            Python package
          </a>
          .
        </p>
      </div>

      <Endpoint method="GET" path="/api/health">
        <p>Liveness check: returns status and the loaded model version.</p>
      </Endpoint>

      <Endpoint method="GET" path="/api/model">
        <p>
          The model card: training-set size, training ranges, age grid, and
          available priors. The web tools use these ranges for validation —
          clients should too.
        </p>
        <pre>
          <code>{`{
  "name": "EmberFlow",
  "version": "0.1.0",
  "n_train": 6584,
  "training_range": {
    "mass_msun": [0.098, 0.674],
    "prot_days": [0.0824, 174.4],
    "age_gyr": [0.0015, 11.5]
  },
  "age_grid": { "min_myr": 1, "max_gyr": 13.8, "points": 1000 },
  "priors": ["flat_in_log_age", "flat_in_age"]
}`}</code>
        </pre>
      </Endpoint>

      <Endpoint method="POST" path="/api/age">
        <p>
          Full age posterior for a single star. <code>mass_msun_err</code>{" "}
          defaults to 0; <code>prior</code> defaults to{" "}
          <code>flat_in_log_age</code>.
        </p>
        <pre>
          <code>{`// request
{
  "source_id": "example-star",
  "prot_days": 20.0,
  "mass_msun": 0.55,
  "mass_msun_err": 0.02,
  "prior": "flat_in_log_age"
}

// response
{
  "input": { ... },
  "summary": {
    "p16_gyr": 1.13,
    "p50_gyr": 1.77,
    "p84_gyr": 2.81,
    "mode_gyr": 1.79
  },
  "posterior": {
    "log_age_myr": [ ...1000 points... ],
    "age_gyr": [ ... ],
    "density_per_dex": [ ... ]
  },
  "metadata": { "model_version": "0.1.0", "prior": "flat_in_log_age" }
}`}</code>
        </pre>
      </Endpoint>

      <Endpoint method="POST" path="/api/age/batch">
        <p>
          Summary estimates (median and 68% interval) for up to 5,000
          independent stars. Full posteriors are deliberately not included in
          the batch response — fetch one star&apos;s posterior from{" "}
          <code>/api/age</code>, or use the package&apos;s{" "}
          <code>age_posteriors()</code> for everything at once.
        </p>
        <pre>
          <code>{`// request
{
  "stars": [
    { "source_id": "star_001", "prot_days": 18.7, "mass_msun": 0.42, "mass_msun_err": 0.025 },
    { "source_id": "star_002", "prot_days": 2.4,  "mass_msun": 0.21, "mass_msun_err": 0.010 }
  ],
  "prior": "flat_in_log_age"
}

// response
{
  "results": [
    {
      "source_id": "star_001",
      "prot_days": 18.7, "mass_msun": 0.42, "mass_msun_err": 0.025,
      "age_gyr": 1.24, "age_err_lo_gyr": 0.52, "age_err_hi_gyr": 0.98,
      "level": 0.68
    },
    ...
  ],
  "metadata": { "model_version": "0.1.0", "prior": "flat_in_log_age", "n_stars": 2 }
}`}</code>
        </pre>
      </Endpoint>

      <Endpoint method="POST" path="/api/rotation">
        <p>
          The forward model: evaluates <code>prot_density()</code> on the
          log-period grid, computes p16/p50/p84 from it, and optionally draws
          rotation-period samples with <code>sample_prot()</code> (
          <code>n_samples</code> up to 100,000).
        </p>
        <pre>
          <code>{`// request
{ "age_gyr": 0.5, "mass_msun": 0.35, "mass_msun_err": 0.02, "n_samples": 2000 }

// response
{
  "input": { ... },
  "summary": { "p16_days": ..., "p50_days": ..., "p84_days": ... },
  "density": {
    "log_prot": [ ...500 points... ],
    "prot_days": [ ... ],
    "density_per_dex": [ ... ]
  },
  "samples_days": [ ... ],
  "metadata": { "model_version": "0.1.0" }
}`}</code>
        </pre>
      </Endpoint>

      <p className="note">
        Interactive OpenAPI docs are served by the bridge itself at{" "}
        <code>/api/docs</code> when running locally. See the{" "}
        <Link href="/docs">documentation</Link> for scientific background.
      </p>
    </div>
  );
}
