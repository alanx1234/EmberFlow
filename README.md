# emberflow-web

Web interface for [EmberFlow](https://github.com/alanx1234/EmberFlow) —
probabilistic gyrochronology for M dwarfs. A Next.js frontend talks to a small
FastAPI bridge (`api/index.py`) that wraps the EmberFlow Python package
directly; all scientific inference happens in the package, never in the web
code.

**Pages**

- `/` — single-star age estimator with the full posterior, hover-follow dot,
  and CSV/JSON downloads
- `/batch` — CSV upload → column mapping → validation → one age estimate per
  star, with lazy per-row posteriors and up-to-5-star comparison overlays
- `/forward` — the forward model: p(log P_rot | τ, M★) with percentiles and
  optional `sample_prot()` draws
- `/docs` — scientific documentation

## Local development

The site expects the EmberFlow package checkout as a **sibling directory**:

```
projects/
├── emberflow/       # the Python package (this repo's sibling)
└── emberflow-web/   # this repo
```

Requirements: Node 20+, [uv](https://docs.astral.sh/uv/). Then:

```bash
npm install
npm run dev
```

`npm run dev` starts both services:

- `dev:web` — Next.js on http://localhost:3000, which proxies `/api/*` to the
  bridge (see `next.config.ts`)
- `dev:api` — uvicorn on http://localhost:8000, run via
  `uv run --with-editable ../emberflow`, so edits to the sibling package are
  picked up without reinstalling. The model loads once per process; the first
  request takes a few seconds while torch warms up.

If your package checkout lives elsewhere, adjust the `--with-editable` path in
`package.json`.

## Tests

```bash
npm test        # vitest: formatting, CSV mapping/validation, schemas, hover labels
npm run test:e2e  # playwright smoke tests (starts the full stack; run `npx playwright install chromium` once)

# API tests against the real model:
uv run --python 3.13 --with fastapi --with pytest --with httpx \
  --with-editable ../emberflow -m pytest api/test_api.py -q
```

The API tests pin the tutorial star (P_rot = 20 d, M★ = 0.55 M☉,
σ_M = 0.02 M☉ → 1.77 −0.64/+1.04 Gyr) so any drift between the web bridge and
the package is caught immediately.

## Production (Vercel)

The sibling checkout does not exist on Vercel, so `requirements.txt` pins
EmberFlow to an **exact commit** of the GitHub repository:

```
emberflow @ git+https://github.com/alanx1234/EmberFlow.git@<PINNED_COMMIT>
```

Never depend on `@main` in production — bump the pin deliberately. Once
EmberFlow is published to PyPI, replace the pin with `emberflow==0.1.0`.

`vercel.json` routes `/api/*` to the Python function and raises its memory
limit. Two caveats to check at deploy time:

- **Bundle size** — torch (even the CPU wheel pulled via the
  `download.pytorch.org/whl/cpu` index) plus the model weights must fit
  Vercel's Python function size limit. If the build exceeds it, host the
  bridge on a small always-on service (Fly.io, Render, Railway) instead and
  point a `next.config.ts` production rewrite at it; nothing else changes.
- **Cold starts** — the model loads once per warm process (module scope). The
  first request after a cold start pays the torch import + load cost.

No user-uploaded data is ever persisted: CSVs are parsed in the browser, only
validated numbers are sent to the API, and the API holds nothing beyond the
request lifetime.

## Design notes

- Playfair Display for titles and the large estimates, Work Sans for
  everything functional (loaded via `next/font`).
- Chart hover always reports **linear** ages (Myr/Gyr) and periods (days) even
  though both axes are logarithmically positioned; a dot follows the curve
  under the cursor.
- The batch comparison overlay uses a fixed 5-color categorical palette
  validated for color-vision-deficiency separation and contrast.
