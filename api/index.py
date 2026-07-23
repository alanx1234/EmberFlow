"""FastAPI bridge around the EmberFlow package.

The model is loaded once at module scope, so every request in a warm Python
process reuses the same flow. All scientific inference is delegated to
EmberFlow itself (age_posterior, summarize, prot_density, sample_prot);
this module only reshapes inputs and outputs for JSON.
"""

import warnings
from typing import Literal

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from emberflow import (
    LOGA_GRID,
    EmberFlow,
    __version__,
    flat_in_age,
    flat_in_log_age,
)

ef = EmberFlow.load()

PRIORS = {
    "flat_in_log_age": flat_in_log_age,
    "flat_in_age": flat_in_age,
}

MAX_BATCH_STARS = 5000
MAX_PROT_SAMPLES = 100_000

app = FastAPI(
    title="EmberFlow API",
    version=__version__,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

Prior = Literal["flat_in_log_age", "flat_in_age"]


# ---------------------------------------------------------------------------
# request / response models
# ---------------------------------------------------------------------------

class StarInput(BaseModel):
    source_id: str | None = None
    prot_days: float = Field(gt=0)
    mass_msun: float = Field(gt=0)
    mass_msun_err: float = Field(default=0.0, ge=0)


class AgeRequest(StarInput):
    prior: Prior = "flat_in_log_age"


class BatchRequest(BaseModel):
    stars: list[StarInput] = Field(min_length=1, max_length=MAX_BATCH_STARS)
    prior: Prior = "flat_in_log_age"


class RotationRequest(BaseModel):
    age_gyr: float = Field(gt=0)
    mass_msun: float = Field(gt=0)
    mass_msun_err: float = Field(default=0.0, ge=0)
    n_samples: int = Field(default=0, ge=0, le=MAX_PROT_SAMPLES)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _round(a: np.ndarray, decimals: int = 6) -> list[float]:
    return [float(v) for v in np.round(np.asarray(a, dtype=float), decimals)]


def _log_grid_quantiles(grid: np.ndarray, pdf: np.ndarray,
                        qs: tuple[float, ...] = (0.16, 0.5, 0.84)) -> list[float]:
    """Quantiles of a density defined per unit of `grid` (a log10 grid),
    returned in linear units (10**q)."""
    cdf = np.cumsum(pdf) * np.gradient(grid)
    cdf /= cdf[-1]
    return [float(10 ** np.interp(q, cdf, grid)) for q in qs]


# ---------------------------------------------------------------------------
# endpoints
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": True, "version": __version__}


@app.get("/api/model")
def model_card():
    r = ef.card["training_range"]
    return {
        "name": "EmberFlow",
        "version": __version__,
        "n_train": ef.card["n_train"],
        "training_range": {
            "mass_msun": [float(r["mass_msun"][0]), float(r["mass_msun"][1])],
            "prot_days": [float(r["prot_days"][0]), float(r["prot_days"][1])],
            "age_gyr": [float(r["age_gyr"][0]), float(r["age_gyr"][1])],
        },
        "age_grid": {
            "min_myr": float(10 ** LOGA_GRID[0]),
            "max_gyr": float(10 ** LOGA_GRID[-1] / 1000),
            "points": int(LOGA_GRID.size),
        },
        "priors": list(PRIORS),
    }


@app.post("/api/age")
def age(req: AgeRequest):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        post = ef.age_posterior(
            prot=req.prot_days,
            mass=req.mass_msun,
            mass_err=req.mass_msun_err,
            prior=PRIORS[req.prior],
        )
    lo, hi = post.interval(0.68)
    return {
        "input": req.model_dump(),
        "summary": {
            "p16_gyr": lo,
            "p50_gyr": post.median_gyr,
            "p84_gyr": hi,
            "mode_gyr": post.mode_gyr,
        },
        "posterior": {
            "log_age_myr": _round(post.loga_grid, 5),
            "age_gyr": _round(post.age_gyr_grid, 6),
            "density_per_dex": _round(post.pdf, 6),
        },
        "metadata": {"model_version": __version__, "prior": req.prior},
    }


@app.post("/api/age/batch")
def age_batch(req: BatchRequest):
    table = pd.DataFrame(
        {
            "prot_days": [s.prot_days for s in req.stars],
            "mass_msun": [s.mass_msun for s in req.stars],
            "mass_msun_err": [s.mass_msun_err for s in req.stars],
        }
    )
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        summary = ef.summarize(table, prior=PRIORS[req.prior])

    results = []
    for star, (_, row) in zip(req.stars, summary.iterrows()):
        results.append(
            {
                "source_id": star.source_id,
                "prot_days": star.prot_days,
                "mass_msun": star.mass_msun,
                "mass_msun_err": star.mass_msun_err,
                "age_gyr": float(row["age_gyr"]),
                "age_err_lo_gyr": float(row["age_err_lo_gyr"]),
                "age_err_hi_gyr": float(row["age_err_hi_gyr"]),
                "level": float(row["level"]),
            }
        )
    return {
        "results": results,
        "metadata": {
            "model_version": __version__,
            "prior": req.prior,
            "n_stars": len(results),
        },
    }


@app.post("/api/rotation")
def rotation(req: RotationRequest):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        logprot_grid, pdf = ef.prot_density(
            age_gyr=req.age_gyr,
            mass=req.mass_msun,
            mass_err=req.mass_msun_err,
        )
        samples = (
            ef.sample_prot(
                age_gyr=req.age_gyr,
                mass=req.mass_msun,
                mass_err=req.mass_msun_err,
                n=req.n_samples,
            )
            if req.n_samples > 0
            else None
        )

    p16, p50, p84 = _log_grid_quantiles(logprot_grid, pdf)
    body = {
        "input": req.model_dump(),
        "summary": {"p16_days": p16, "p50_days": p50, "p84_days": p84},
        "density": {
            "log_prot": _round(logprot_grid, 5),
            "prot_days": _round(10 ** logprot_grid, 5),
            "density_per_dex": _round(pdf, 6),
        },
        "metadata": {"model_version": __version__},
    }
    if samples is not None:
        body["samples_days"] = _round(samples, 5)
    return body
