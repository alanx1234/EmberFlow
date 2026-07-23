"""API tests. Run from emberflow-web with:

    uv run --python 3.13 --with fastapi --with pytest --with httpx \
        --with-editable ../emberflow -m pytest api/test_api.py -q

Loads the real model, so the first test takes a few seconds.
"""

import numpy as np
import pytest
from fastapi.testclient import TestClient

from api.index import _log_grid_quantiles, app

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_model_card():
    r = client.get("/api/model")
    assert r.status_code == 200
    card = r.json()
    assert card["name"] == "EmberFlow"
    assert card["n_train"] == 6584
    lo, hi = card["training_range"]["mass_msun"]
    assert 0.09 < lo < 0.11 and 0.6 < hi < 0.7
    assert card["age_grid"]["points"] == 1000
    assert set(card["priors"]) == {"flat_in_log_age", "flat_in_age"}


def test_age_matches_tutorial():
    """The repository tutorial star: 1.77 −0.64/+1.04 Gyr, 68% 1.13–2.81."""
    r = client.post(
        "/api/age",
        json={"prot_days": 20.0, "mass_msun": 0.55, "mass_msun_err": 0.02},
    )
    assert r.status_code == 200
    body = r.json()
    s = body["summary"]
    assert s["p50_gyr"] == pytest.approx(1.77, abs=0.02)
    assert s["p16_gyr"] == pytest.approx(1.13, abs=0.02)
    assert s["p84_gyr"] == pytest.approx(2.81, abs=0.03)
    assert s["mode_gyr"] == pytest.approx(1.79, abs=0.05)

    post = body["posterior"]
    assert len(post["log_age_myr"]) == 1000
    assert len(post["age_gyr"]) == 1000
    assert len(post["density_per_dex"]) == 1000
    # normalized over the log-age grid
    integral = np.trapezoid(post["density_per_dex"], post["log_age_myr"])
    assert integral == pytest.approx(1.0, abs=0.01)


def test_age_prior_changes_result():
    base = {"prot_days": 20.0, "mass_msun": 0.55, "mass_msun_err": 0.02}
    log = client.post("/api/age", json={**base, "prior": "flat_in_log_age"}).json()
    lin = client.post("/api/age", json={**base, "prior": "flat_in_age"}).json()
    # a prior flat in linear age puts more weight at old ages
    assert lin["summary"]["p50_gyr"] > log["summary"]["p50_gyr"]


def test_age_validation():
    r = client.post("/api/age", json={"prot_days": -1, "mass_msun": 0.5})
    assert r.status_code == 422
    r = client.post("/api/age", json={"mass_msun": 0.5})
    assert r.status_code == 422


def test_batch_matches_single():
    star = {
        "source_id": "tut",
        "prot_days": 20.0,
        "mass_msun": 0.55,
        "mass_msun_err": 0.02,
    }
    single = client.post("/api/age", json=star).json()["summary"]
    batch = client.post("/api/age/batch", json={"stars": [star]}).json()
    assert batch["metadata"]["n_stars"] == 1
    row = batch["results"][0]
    assert row["source_id"] == "tut"
    assert row["age_gyr"] == pytest.approx(single["p50_gyr"], rel=1e-6)
    assert row["age_gyr"] - row["age_err_lo_gyr"] == pytest.approx(
        single["p16_gyr"], rel=1e-6
    )
    assert row["age_gyr"] + row["age_err_hi_gyr"] == pytest.approx(
        single["p84_gyr"], rel=1e-6
    )
    # summaries only — no posterior arrays in the batch response
    assert "posterior" not in row


def test_batch_rejects_empty():
    r = client.post("/api/age/batch", json={"stars": []})
    assert r.status_code == 422


def test_rotation_density_and_samples():
    r = client.post(
        "/api/rotation",
        json={"age_gyr": 0.5, "mass_msun": 0.35, "mass_msun_err": 0.02, "n_samples": 500},
    )
    assert r.status_code == 200
    body = r.json()
    s = body["summary"]
    assert 0 < s["p16_days"] < s["p50_days"] < s["p84_days"]
    d = body["density"]
    assert len(d["log_prot"]) == len(d["prot_days"]) == len(d["density_per_dex"]) == 500
    assert len(body["samples_days"]) == 500
    # sampled medians should land near the density median
    assert np.median(body["samples_days"]) == pytest.approx(s["p50_days"], rel=0.25)


def test_rotation_omits_samples_by_default():
    body = client.post(
        "/api/rotation", json={"age_gyr": 1.0, "mass_msun": 0.4}
    ).json()
    assert "samples_days" not in body


def test_log_grid_quantiles_gaussian():
    """Quantiles of a Gaussian in log-space must invert to 10**(mu ± sigma).

    The helper mirrors AgePosterior._quantile (cumsum CDF), which carries a
    half-grid-step discretization offset — the tolerance allows for it.
    """
    grid = np.linspace(-2, 2, 4001)
    mu, sigma = 0.3, 0.25
    pdf = np.exp(-0.5 * ((grid - mu) / sigma) ** 2)
    p16, p50, p84 = _log_grid_quantiles(grid, pdf)
    assert p50 == pytest.approx(10**mu, rel=5e-3)
    assert p16 == pytest.approx(10 ** (mu - sigma), rel=5e-3)
    assert p84 == pytest.approx(10 ** (mu + sigma), rel=5e-3)
    assert p16 < p50 < p84
