import type { Metadata } from "next";
import Link from "next/link";
import { BIBTEX, CITATION_NOTE } from "@/lib/citation";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "What EmberFlow estimates, how to interpret its posteriors, model training ranges, and how to use the Python package.",
};

const SECTIONS = [
  ["what", "What EmberFlow estimates"],
  ["inputs", "Required inputs"],
  ["directions", "Age inference vs. forward modeling"],
  ["priors", "Priors"],
  ["interpretation", "Medians and credible intervals"],
  ["multimodality", "Why posteriors can be multimodal"],
  ["ranges", "Model training ranges"],
  ["python", "Python installation"],
  ["single", "Single-star example"],
  ["catalog", "Catalog example"],
  ["citation", "Citation"],
  ["links", "Paper & code"],
] as const;

export default function DocsPage() {
  return (
    <div className="container page">
      <div className="page-head">
        <h1>Documentation</h1>
        <p className="lede">
          How EmberFlow turns a rotation period and a mass into a full age
          posterior — and how to read what it gives you.
        </p>
      </div>

      <div className="docs-layout">
        <aside>
          <nav className="toc" aria-label="On this page">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="docs-prose">
          <h2 id="what">What EmberFlow estimates</h2>
          <p>
            EmberFlow is a probabilistic gyrochronology model for M dwarfs. It
            extends{" "}
            <a
              href="https://arxiv.org/abs/2412.12244"
              target="_blank"
              rel="noreferrer"
            >
              ChronoFlow (Van-Lane et al. 2025)
            </a>{" "}
            with a conditional normalizing flow that learns the density of
            rotation period given age, stellar mass, and mass uncertainty:
          </p>
          <p style={{ textAlign: "center" }}>
            <em>
              p(log P<sub>rot</sub> | log τ, M<sub>★</sub>, σ<sub>M</sub>)
            </em>
          </p>
          <p>
            The model is trained on 6,584 unique M dwarfs with measured
            rotation periods and literature-calibrated ages. Inverting the
            learned density with Bayes&apos; theorem yields a{" "}
            <strong>full age posterior per star</strong> rather than a single
            point estimate. That matters for M dwarfs in particular: one
            rotation period can map to multiple plausible ages.
          </p>

          <h2 id="inputs">Required inputs</h2>
          <ul>
            <li>
              <strong>Rotation period</strong> (days) — the measured P
              <sub>rot</sub>.
            </li>
            <li>
              <strong>Stellar mass</strong> (M☉).
            </li>
            <li>
              <strong>Mass uncertainty</strong> (M☉, 1σ) — the model conditions
              on it directly, so passing a realistic value matters. If you have
              asymmetric uncertainties, use their average, σ<sub>M</sub> =
              (σ<sub>lo</sub> + σ<sub>hi</sub>) / 2 — the batch uploader does
              this automatically.
            </li>
          </ul>

          <h2 id="directions">Age inference vs. forward modeling</h2>
          <p>
            <Link href="/">Estimate Age</Link> runs the model in the{" "}
            <em>inverse</em> direction: it evaluates the learned density along
            a grid of 1,000 candidate ages at your star&apos;s fixed period and
            mass, multiplies by an age prior, and normalizes. The result is
            p(log τ | P<sub>rot</sub>, M<sub>★</sub>, σ<sub>M</sub>).
          </p>
          <p>
            <Link href="/forward">Forward Model</Link> runs it in the direction
            it was trained: given an age and mass, it returns the distribution
            of rotation periods the model expects, p(log P<sub>rot</sub> | τ,
            M<sub>★</sub>) — useful for building intuition, checking against
            observed samples, or simulating populations with{" "}
            <code>sample_prot()</code>.
          </p>

          <h2 id="priors">Priors</h2>
          <ul>
            <li>
              <strong>Uniform in log age</strong> (default) — flat in log₁₀ τ
              over the model grid; equal prior weight per decade of age.
            </li>
            <li>
              <strong>Uniform in linear age</strong> — flat in τ; this puts
              more prior weight at old ages, and typically shifts posteriors
              older.
            </li>
          </ul>
          <p>
            In the Python package these are <code>flat_in_log_age</code> and{" "}
            <code>flat_in_age</code>; custom priors can be any function of the
            log-age grid.
          </p>

          <h2 id="interpretation">Medians and credible intervals</h2>
          <p>
            By convention, EmberFlow reports the <strong>median</strong> of the
            age posterior as the point estimate, with the 16th and 84th
            percentiles as the lower and upper bounds of the 68% credible
            interval. An estimate of 1.77{" "}
            <span style={{ whiteSpace: "nowrap" }}>−0.64 / +1.04 Gyr</span>{" "}
            means 68% of the posterior mass lies between 1.13 and 2.81 Gyr. The
            interval is a statement about the posterior, not a Gaussian error
            bar — always inspect the full curve when the interval is wide.
          </p>

          <h2 id="multimodality">Why posteriors can be multimodal</h2>
          <p>
            M dwarfs of similar mass separate into fast- and slow-rotating
            populations, and spin-down can stall for billions of years. A
            single rotation period can therefore be consistent with both a
            young, still-fast star and an older one — the posterior honestly
            shows two (or more) peaks. Slow rotators that have converged onto
            the slow-rotating sequence give the tightest constraints; fast
            rotators tend to produce broad or multimodal posteriors. The
            median of a strongly bimodal posterior can fall between the peaks,
            which is one more reason to look at the curve, not just the
            summary.
          </p>

          <h2 id="ranges">Model training ranges</h2>
          <p>The released model (v0.1.0) was trained on:</p>
          <ul>
            <li>Mass: 0.098–0.674 M☉</li>
            <li>Rotation period: 0.0824–174.4 days</li>
            <li>Age: 1.5 Myr–11.5 Gyr</li>
          </ul>
          <p>
            The posterior grid itself spans 1 Myr–13.8 Gyr. Outside the
            training ranges the flow extrapolates and results should not be
            trusted; the batch tool excludes such rows before inference. The
            live ranges are always available from{" "}
            <Link href="/api-docs">
              <code>GET /api/model</code>
            </Link>
            .
          </p>

          <h2 id="python">Python installation</h2>
          <pre>
            <code>{`git clone https://github.com/alanx1234/EmberFlow.git
cd EmberFlow
uv sync          # or: pip install -e ".[plot]"`}</code>
          </pre>

          <h2 id="single">Single-star example</h2>
          <pre>
            <code>{`from emberflow import EmberFlow

ef = EmberFlow.load()
post = ef.age_posterior(prot=20.0, mass=0.55, mass_err=0.02)

print(post)                      # AgePosterior(1.77 -0.64/+1.04 Gyr, 68%)
print(post.median_gyr)           # 1.77
print(post.interval(0.68))       # (1.13, 2.81)
post.age_gyr_grid, post.pdf      # the full posterior curve`}</code>
          </pre>

          <h2 id="catalog">Catalog example</h2>
          <pre>
            <code>{`import pandas as pd
from emberflow import EmberFlow

ef = EmberFlow.load()
stars = pd.read_csv("my_stars.csv")   # prot_days, mass_msun, mass_msun_err

summary = ef.summarize(stars)          # median + 68% interval per star
posteriors = ef.age_posteriors(stars)  # full (n_stars, 1000) posteriors`}</code>
          </pre>

          <h2 id="citation">Citation</h2>
          <p>{CITATION_NOTE}</p>
          <pre className="citation-block">
            <code>{BIBTEX}</code>
          </pre>

          <h2 id="links">Paper &amp; code</h2>
          <ul>
            <li>
              <a
                href="https://github.com/alanx1234/EmberFlow"
                target="_blank"
                rel="noreferrer"
              >
                EmberFlow on GitHub
              </a>{" "}
              — the Python package, training data, and tutorial notebooks.
            </li>
            <li>
              EmberFlow paper — Xia, Van-Lane &amp; Theissen (in preparation).
            </li>
            <li>
              <a
                href="https://arxiv.org/abs/2412.12244"
                target="_blank"
                rel="noreferrer"
              >
                ChronoFlow: Van-Lane et al. (2025)
              </a>{" "}
              — the framework EmberFlow extends.
            </li>
            <li>
              <Link href="/api-docs">REST API reference</Link> — the endpoints
              behind this site.
            </li>
          </ul>
        </article>
      </div>
    </div>
  );
}
