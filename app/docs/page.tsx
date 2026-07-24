import type { Metadata } from "next";
import Link from "next/link";
import { BIBTEX, CITATION_NOTE } from "@/lib/citation";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "What EmberFlow estimates, how it infers ages from its learned density, model training ranges, and how to use the Python package.",
};

const SECTIONS = [
  ["what", "What EmberFlow estimates"],
  ["inputs", "Required inputs"],
  ["directions", "Age inference and forward modeling"],
  ["interpretation", "Medians and probability intervals"],
  ["ranges", "Model training ranges"],
  ["data", "Training data"],
  ["limitations", "Limitations"],
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
        <h1>
          <span className="title-glyph" aria-hidden>❋</span>
          Documentation
        </h1>
        <p className="lede">
          How EmberFlow turns a rotation period and a mass into a full age posterior — and how to read what it gives you.
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
            EmberFlow is a mass-conditioned probabilistic gyrochronology model
            calibrated for M dwarfs. It extends{" "}
            <a
              href="https://arxiv.org/abs/2412.12244"
              target="_blank"
              rel="noreferrer"
            >
              ChronoFlow (Van-Lane et al. 2025)
            </a>{" "}
            with a conditional normalizing flow that learns the density of
            rotation period conditioned on age, stellar mass, and mass
            uncertainty:
          </p>
          <p style={{ textAlign: "center" }}>
            <em>
              p(log P<sub>rot</sub> | log τ, M<sub>★</sub>,{" "}
              <span style={{ textTransform: "none" }}>σ</span>
              <sub>M</sub>)
            </em>
          </p>
          <p>
            It is trained on a catalog of 6,584 M dwarfs with measured rotation
            periods and age estimates. EmberFlow infers stellar ages by
            inverting this learned density with Bayes&apos; theorem. As a result,
            each star receives a full age posterior instead of a single point
            estimate. This especially matters for M dwarfs, as their
            mass-dependent spin-down means a single rotation period can map to
            multiple ages, and a posterior illustrates that ambiguity in an honest way.
          </p>

          <h2 id="inputs">Required inputs</h2>
          <ul>
            <li>
              <strong>Rotation period</strong> (days) — the measured P
              <sub>rot</sub>
            </li>
            <li>
              <strong>Stellar mass</strong> (M☉)
            </li>
            <li>
              <strong>Mass uncertainty</strong> (M☉, 1σ) — preferably a
              symmetric mass uncertainty. Asymmetric uncertainties are
              averaged,{" "}
              <span style={{ whiteSpace: "nowrap" }}>
                σ<sub>M</sub> = (σ<sub>lo</sub> + σ<sub>hi</sub>) / 2
              </span>
              
            </li>
          </ul>

          <h2 id="directions">Age inference and forward modeling</h2>
          <p>
            EmberFlow is trained as a forward model for the conditional
            distribution of rotation periods, p(log P<sub>rot</sub> | τ, M
            <sub>★</sub>). The <Link href="/forward">Forward Model</Link> page
            runs it in this direction: given an age and mass, it returns
            the distribution of rotation periods the model expects.
            Essentially, this is what the model has internalized about spin-down behavior
            at a fixed age and mass.
          </p>
          <p>
            <Link href="/">Estimate Age</Link> runs the model in the inverse direction.
            Like ChronoFlow
            , ages are inferred with Bayes&apos; theorem by evaluating the
            learned density over a grid of 1,000 candidate ages (1 Myr — 13.8 Gyr) at the
            star&apos;s fixed rotation period and mass, multiplying by a uniform prior in
            log τ, and then normalizing:
          </p>
          <p style={{ textAlign: "center" }}>
            <em>
              p(log τ | P<sub>rot</sub>, M<sub>★</sub>,{" "}
              <span style={{ textTransform: "none" }}>σ</span>
              <sub>M</sub>) ∝ p(log P<sub>rot</sub> | τ, M<sub>★</sub>,{" "}
              <span style={{ textTransform: "none" }}>σ</span>
              <sub>M</sub>) p(log τ)
            </em>
          </p>

          <p>
            <Link href="/batch">Batch Estimates</Link> allows you to upload your
            own file of M dwarf rotators and obtain age estimates. For more
            flexibility with large catalogs, please see the{" "}
            <a
              href="https://github.com/alanx1234/ChronoFlow-EmberFlow"
              target="_blank"
              rel="noreferrer"
            >
              Python package
            </a>
            .
          </p>

          <h2 id="interpretation">Medians and probability intervals</h2>
          <p>
            By convention, EmberFlow reports the <strong>median</strong> of the
            age posterior as the point estimate. The lower and upper uncertainties of
            the age estimate
            reflect the 68% probability interval of the posterior. For instance, an
            estimate of 1.77{" "}
            <span style={{ whiteSpace: "nowrap" }}>(−0.64 / +1.04) Gyr</span>{" "}
            means 68% of the posterior mass lies between 1.13 and 2.81 Gyr. 
          </p>

          <h2 id="ranges">Model training ranges</h2>
          <p>The released model was trained on:</p>
          <ul className="range-list">
            <li>
              <strong>Mass</strong>
              <span>0.098–0.674 M☉</span>
            </li>
            <li>
              <strong>Rotation period</strong>
              <span>0.0824–174.4 days</span>
            </li>
            <li>
              <strong>Age</strong>
              <span>1.5 Myr–11.5 Gyr</span>
            </li>
          </ul>

          <h2 id="data">Training data</h2>
          <p>
            The catalog contains 6,584 unique M dwarfs with measured rotation
            periods and calibrated ages, compiled from the following sources:
          </p>
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Population</th>
                  <th>Age calibration</th>
                  <th className="num">N★</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    MOCAdb (
                    <a
                      href="https://arxiv.org/abs/2602.15695"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Gagné et al. 2026
                    </a>
                    )
                  </td>
                  <td>Open clusters and associations</td>
                  <td>Group ages</td>
                  <td className="num">3,684</td>
                </tr>
                <tr>
                  <td>
                    ChronoFlow (
                    <a
                      href="https://arxiv.org/abs/2412.12244"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Van-Lane et al. 2025
                    </a>
                    )
                  </td>
                  <td>Open clusters and associations</td>
                  <td>Group ages</td>
                  <td className="num">2,126</td>
                </tr>
                <tr>
                  <td>
                    <a
                      href="https://arxiv.org/abs/2405.00850"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Feinstein et al. (2024)
                    </a>
                  </td>
                  <td>Young moving groups, clusters, and associations</td>
                  <td>Group ages</td>
                  <td className="num">487</td>
                </tr>
                <tr>
                  <td>
                    <a
                      href="https://arxiv.org/abs/2506.04465"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mamonova et al. (2025)
                    </a>
                  </td>
                  <td>Young moving groups and clusters</td>
                  <td>Group ages</td>
                  <td className="num">233</td>
                </tr>
                <tr>
                  <td>
                    <a
                      href="https://arxiv.org/abs/2307.01136"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Engle &amp; Guinan (2023)
                    </a>
                  </td>
                  <td>Age-benchmarked M dwarfs</td>
                  <td>Companion, kinematic, or system ages</td>
                  <td className="num">37</td>
                </tr>
                <tr>
                  <td>
                    <a
                      href="https://arxiv.org/abs/2206.15318"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Pass et al. (2022)
                    </a>
                  </td>
                  <td>Wide FGK–M and WD–M binaries</td>
                  <td>Ages from FGK or white-dwarf companions</td>
                  <td className="num">9</td>
                </tr>
                <tr>
                  <td>
                    <a
                      href="https://arxiv.org/abs/0707.2577"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Kiraga &amp; Stępień (2007)
                    </a>
                  </td>
                  <td>Old-disk M dwarfs</td>
                  <td>Approximate old-disk age (10 Gyr)</td>
                  <td className="num">4</td>
                </tr>
                <tr>
                  <td>
                    <a
                      href="https://arxiv.org/abs/2403.12129"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Chiti et al. (2024)
                    </a>
                  </td>
                  <td>Wide WD–M binaries</td>
                  <td>White-dwarf total ages</td>
                  <td className="num">4</td>
                </tr>
                <tr>
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td></td>
                  <td></td>
                  <td className="num">
                    <strong>6,584</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 id="limitations">Limitations</h2>
          <ul>
            <li>
              <strong>Fast rotators are weakly constrained.</strong> EmberFlow
              performs best for slow rotators that have converged onto the
              slow-rotating sequence. Fast rotators tend to give broad or
              multimodal posteriors, since a single fast period can map to
              several ages.
            </li>
            <li>
              <strong>Sparse coverage at the extremes.</strong> The training
              catalog has fewer stars at the youngest and oldest
              ages, as well as at the lowest masses, meaning estimates there are less 
              reliable.
            </li>
            <li>
              <strong>Extrapolation.</strong> The flow extrapolates outside of the training ranges
              , so these predictions should be treated with
              caution.
            </li>
          </ul>

          <h2 id="python">Python installation</h2>
          <pre>
            <code>{`git clone https://github.com/alanx1234/ChronoFlow-EmberFlow.git
cd ChronoFlow-EmberFlow
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
                href="https://github.com/alanx1234/ChronoFlow-EmberFlow"
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
          </ul>
        </article>
      </div>
    </div>
  );
}
