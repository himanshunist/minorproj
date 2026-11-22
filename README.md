# Sentinel IDS — Intrusion Detection Dashboard

A college minor project that adds a professional React frontend and a FastAPI prediction API to the
machine-learning approach in [JayantUppal/Intrusion-Detection-System](https://github.com/JayantUppal/Intrusion-Detection-System).
The original **Gaussian Naive Bayes + Decision Tree + XGBoost max-voting** approach is reused; no
replacement or dummy model was introduced.

> **Deployment status:** live and verified on 22 Nov 2026.
>
> - Frontend: https://sentinel-ids-frontend.vercel.app
> - Backend: https://sentinel-ids-backend-4say.onrender.com
> - GitHub: https://github.com/himanshunist/minorproj

---

## 1. What the original repository does

Inspected files are preserved unmodified in [`original/`](original/) together with
[`original/NOTES.md`](original/NOTES.md).

| Item | Finding from `IDS.ipynb` |
| --- | --- |
| Dataset | `kddcup.data_10_percent_corrected`, read with 41 named predictors + `intrusion_type` |
| Raw rows | 494,021; 23 intrusion labels; 348,435 duplicate rows removed |
| Target | Binary: `normal.` → `1`, all other 22 labels → `0` |
| Numeric pipeline | 38 numeric features → `StandardScaler` → `PCA(n_components=0.98)` (GNB and XGBoost) |
| Categorical pipeline | `protocol_type`, `service`, `flag` → binary `CountVectorizer` with a fixed vocabulary (XGBoost) |
| Decision Tree input | All 41 original columns, including categorical strings |
| Models | Hand-written Gaussian NB, hand-written Gini decision tree, `XGBClassifier()` |
| Ensemble | `np.bincount(votes).argmax()` — majority / max voting |
| Saved artifacts | **None in the upstream repository**; the notebook must be run once to export them |
| License | **No LICENSE file**; redistribution rights are not explicit |

The notebook's printed accuracy figures (96.15% GNB, 99.7% DT, 99.85% XGBoost, 99.92% ensemble)
are quoted in the UI as *historical notebook reference only*. They are not presented as a measurement
of the artifacts shipped here. The artifacts have their own evaluation in `backend/models/metrics.json`.

---

## 2. Project structure

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI routes, CORS, validation
│   │   ├── config.py               # Environment configuration
│   │   ├── schemas.py              # Pydantic request/response models
│   │   └── ml/
│   │       ├── features.py         # Exact feature order from the notebook
│   │       ├── legacy_models.py    # GNB + decision tree ported from the notebook
│   │       ├── ensemble.py         # np.bincount majority vote
│   │       └── pipeline.py         # Artifact loading, preprocessing, inference
│   ├── scripts/train.py            # One-time training + artifact export
│   ├── examples/                   # Ready-to-use JSON request bodies
│   ├── models/                     # Generated artifacts (committed for deployment)
│   ├── data/                       # Local dataset goes here (gitignored)
│   ├── requirements.txt
│   ├── runtime.txt                 # Python version for Render
│   └── tests/test_api.py
├── frontend/
│   ├── src/pages/                  # Dashboard, Detection, CSV Upload, History, About
│   ├── src/components/             # Layout, cards, charts, toasts, form fields
│   ├── src/context/ApiContext.jsx  # Shared health/model-info state
│   ├── src/api/client.js           # Axios API client
│   ├── public/sample_records.csv   # Two real KDD rows for testing
│   ├── .env.example
│   └── vercel.json                 # SPA rewrites for Vercel
├── original/                       # Unmodified upstream files + analysis notes
├── .env.example
├── render.yaml                     # Render Blueprint
└── README.md
```

### Runtime flow

```text
Browser (React/Vite)
   │  GET /health, GET /model-info, POST /predict, POST /predict-batch
   ▼
FastAPI (loads artifacts once at startup)
   │
   ├─ numeric: StandardScaler → PCA(0.98) ─┬─► Gaussian NB
   │                                       └─► XGBoost (+ one-hot categorical)
   ├─ all 41 raw columns ─────────────────────► Decision Tree
   ▼
majority vote → NORMAL (1) / ATTACK (0) → JSON → charts, table, CSV download
```

---

## 3. Local setup

### Prerequisites

* Python 3.10+ (Render configuration uses 3.11.9)
* Node.js 18+ and npm
* The KDD Cup 1999 10% corrected dataset (only needed to retrain)

### 3.1 Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # Windows
pip install -r backend\requirements.txt
```

Artifacts are already included in `backend/models/`, so the API can run immediately:

```powershell
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open <http://localhost:8000/docs> for interactive Swagger UI.

### 3.2 Retrain the artifacts (optional)

The original UCI download link is no longer reliable. A verified mirror with the same row count and
labels was used. Place the dataset in `backend/data/`:

```powershell
curl.exe -L -o backend\data\kddcup.data_10_percent_corrected `
  "https://raw.githubusercontent.com/JeevanSandhu/Intrusion-Detection/master/dataset/kddcup.data_10_percent_corrected"
```

Then run:

```powershell
python backend\scripts\train.py `
  --data backend\data\kddcup.data_10_percent_corrected `
  --output backend\models --seed 42
```

The script writes `metadata.json`, `metrics.json`, `scaler.joblib`, `pca.joblib`, `gnb.npz`,
`dt_tree.json` and `xgb_model.json`. It follows the notebook workflow but makes three documented,
minimal changes: a fixed seed, sorted/saved categorical vocabularies, and one shared stratified
80/20 evaluation split instead of the notebook's independent splits. The decision tree is stored as
JSON instead of a pickle so it does not depend on Python import paths.

### 3.3 Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local     # VITE_API_URL=http://localhost:8000
npm run dev
```

Open <http://localhost:5173>. For a production build check: `npm run build && npm run preview`.

---

## 4. Environment variables

| Variable | Where | Default | Purpose |
| --- | --- | --- | --- |
| `ALLOWED_ORIGINS` | backend | localhost:5173/4173/3000 | Comma-separated CORS allowlist |
| `MAX_BATCH_ROWS` | backend | `5000` | Maximum rows per `/predict-batch` |
| `MAX_UPLOAD_BYTES` | backend | `10485760` | CSV upload limit |
| `LOG_LEVEL` | backend | `INFO` | Uvicorn/application logging |
| `MODEL_DIR` | backend | `backend/models` | Artifact location override |
| `VITE_API_URL` | frontend | `http://localhost:8000` | Backend base URL (public, not a secret) |

Copy [`.env.example`](.env.example) to `.env` / `.env.local` as needed. Never commit real `.env`
files.

---

## 5. API reference

Base URL locally: `http://localhost:8000`. Swagger UI: `/docs`.

### `GET /health`

```powershell
curl http://localhost:8000/health
```

Returns API status, version, `model_ready`, `model_version` and UTC timestamp. A `503` response means
artifacts could not be loaded; check the backend console.

### `GET /model-info`

```powershell
curl http://localhost:8000/model-info
```

Returns the feature contract, categorical vocabularies, label mapping, preprocessing details,
artifact evaluation metrics and the historical notebook reference metrics. The frontend builds its
form directly from this response.

### `POST /predict`

One record; all 41 predictors are required. A ready-to-use JSON body is in
[`frontend/public/sample_records.csv`](frontend/public/sample_records.csv) (CSV form).

```powershell
curl -X POST http://localhost:8000/predict `
  -H "Content-Type: application/json" `
  --data-binary "@backend/examples/record.json"
```

### `POST /predict-batch`

Accepts either multipart CSV or JSON:

```powershell
curl -X POST http://localhost:8000/predict-batch `
  -F "file=@frontend/public/sample_records.csv"

curl -X POST http://localhost:8000/predict-batch `
  -H "Content-Type: application/json" `
  --data-binary "@backend/examples/batch.json"
```

CSV must contain all 41 feature headers in any order; an optional `intrusion_type` column is ignored.
Invalid values produce HTTP `422` with the row number and field-level message. Results include one
entry per input record with `prediction`, numeric `label`, `confidence`, `confidence_type`, the
three `votes`, and `model_version`.

### Captured local responses

These are real responses from the committed artifacts on this machine (2026-11-17). Your exact
confidence decimals can differ if you retrain with a different seed or library version.

**`GET /health`**

```json
{
  "status": "ok",
  "api": "Intrusion Detection System API",
  "version": "1.0.0",
  "model_ready": true,
  "model_version": "kdd99-nb-dt-xgb-v1",
  "error": null,
  "timestamp": "2026-11-17T14:49:34.039861+00:00"
}
```

**`GET /model-info`** (abbreviated — the real response includes all 41 feature names and all
categorical values):

```json
{
  "version": "kdd99-nb-dt-xgb-v1",
  "dataset": {
    "name": "KDD Cup 1999 10% corrected",
    "rows_read": 494021,
    "rows_after_deduplication": 145586,
    "duplicate_rows_removed": 348435,
    "normal_rows": 87832,
    "attack_rows": 57754
  },
  "label_mapping": { "0": "ATTACK", "1": "NORMAL" },
  "preprocessing": {
    "scaler": "StandardScaler",
    "pca_variance_threshold": 0.98,
    "pca_components": 24,
    "categorical_encoding": "CountVectorizer(vocabulary=saved values, binary=True)"
  },
  "ensemble": {
    "method": "majority / max voting",
    "decision_rule": "np.bincount([gnb, dt, xgb]).argmax()",
    "confidence": "winning votes / 3 (model agreement, not a calibrated probability)"
  },
  "status": "ready"
}
```

**`POST /predict`** with `backend/examples/record.json`:

```json
{
  "index": 0,
  "prediction": "NORMAL",
  "label": 1,
  "confidence": 1.0,
  "confidence_type": "ensemble_vote_share",
  "votes": {
    "gaussian_naive_bayes": { "label": 1, "prediction": "NORMAL", "confidence": 0.999857 },
    "decision_tree": { "label": 1, "prediction": "NORMAL", "confidence": 1.0 },
    "xgboost": { "label": 1, "prediction": "NORMAL", "confidence": 0.999872 }
  },
  "model_version": "kdd99-nb-dt-xgb-v1"
}
```

**`POST /predict-batch`** with `frontend/public/sample_records.csv` (two results; note that the
model does not label the second example as an attack — the UI never hardcodes a label):

```json
{
  "count": 2,
  "source": "csv:sample_records.csv",
  "results": [
    {
      "index": 0,
      "prediction": "NORMAL",
      "label": 1,
      "confidence": 1.0,
      "confidence_type": "ensemble_vote_share",
      "votes": {
        "gaussian_naive_bayes": { "label": 1, "prediction": "NORMAL", "confidence": 0.999857 },
        "decision_tree": { "label": 1, "prediction": "NORMAL", "confidence": 1.0 },
        "xgboost": { "label": 1, "prediction": "NORMAL", "confidence": 0.999872 }
      },
      "model_version": "kdd99-nb-dt-xgb-v1"
    },
    {
      "index": 1,
      "prediction": "NORMAL",
      "label": 1,
      "confidence": 0.6667,
      "confidence_type": "ensemble_vote_share",
      "votes": {
        "gaussian_naive_bayes": { "label": 1, "prediction": "NORMAL", "confidence": 0.610261 },
        "decision_tree": { "label": 1, "prediction": "NORMAL", "confidence": 1.0 },
        "xgboost": { "label": 0, "prediction": "ATTACK", "confidence": 0.996127 }
      },
      "model_version": "kdd99-nb-dt-xgb-v1"
    }
  ]
}
```

**Validation error** (`POST /predict` with `src_bytes: -5` and all other fields valid):

```json
{
  "detail": [
    {
      "field": "src_bytes",
      "message": "Input should be greater than or equal to 0",
      "type": "greater_than_equal"
    }
  ]
}
```

A CSV missing required columns returns HTTP 422 with `detail.missing_columns` and
`detail.unexpected_columns` arrays plus the full `required_columns` list.

---

## 6. Deployment

### 6.1 Backend on Render

1. Push this repository to GitHub.
2. In Render, create **Blueprint** from [`render.yaml`](render.yaml), or create a **Web Service**:
   * Repository: your fork of this project
   * Root Directory: `backend`
   * Runtime: Python 3.11 (`backend/runtime.txt`)
   * Build: `pip install -r requirements.txt`
   * Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   * Health Check Path: `/health`
3. Set `ALLOWED_ORIGINS` to the **exact Vercel frontend URL** (no trailing slash), for example
   `https://your-ids-frontend.vercel.app`. Keep localhost entries only for development.
4. Confirm `backend/models/*` artifacts are committed; Render does not run training during deploy.
5. Wait for the service to become **Live**, then copy its URL (for example `https://ids-backend.onrender.com`).

Free Render instances sleep when idle; the first request after inactivity can take ~30–60 seconds.

### 6.2 Frontend on Vercel

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`. Vercel detects Vite automatically.
3. Build command: `npm run build`; Output directory: `dist`.
4. Add environment variable `VITE_API_URL` = the Render backend URL (no trailing slash).
5. Deploy. [`frontend/vercel.json`](frontend/vercel.json) rewrites client routes to `index.html` so
   refreshing `/history` or `/detect` works.
6. Return to Render and update `ALLOWED_ORIGINS` with the final Vercel domain if it differs from the
   placeholder.

`VITE_*` variables are compiled into the browser bundle. They must never contain secrets.

### 6.3 Verified live deployment and health check

The current deployment was verified on 22 Nov 2026:

| Service | URL | Result |
| --- | --- | --- |
| Frontend (Vercel) | https://sentinel-ids-frontend.vercel.app | Production build served; all routes render; green **Model online** chip |
| Backend (Render) | https://sentinel-ids-backend-4say.onrender.com | `GET /health` → 200, `model_ready: true`; `GET /model-info` → 200 |
| Prediction from deployed UI | `POST /predict` | 200 with a real 3-model vote result; no browser console errors |

Health-check commands for this deployment:

```powershell
curl https://sentinel-ids-backend-4say.onrender.com/health
curl https://sentinel-ids-backend-4say.onrender.com/model-info
```

Expected: HTTP 200, `"model_ready": true`, and a non-null `version`. The Render free instance sleeps
when idle, so the first request can take 50 seconds or more. Open the Vercel URL, check the green
**Model online** chip, and run an example in Intrusion Detection. `ALLOWED_ORIGINS` on Render is set
to the exact deployed Vercel origin, so browser calls are restricted to that frontend.

---

## 7. Testing checklist

### Local

- [ ] `python -m pip install -r backend/requirements-dev.txt` and `python -m pytest -q` from `backend/` → 5 passed.
- [ ] `uvicorn app.main:app` starts without artifact errors.
- [ ] `GET /health` returns `200` and `model_ready: true`.
- [ ] `GET /model-info` lists 41 features and 3 categorical vocabularies.
- [ ] `POST /predict` with `frontend/public/sample_records.csv` row 1 returns a valid label.
- [ ] A negative or non-numeric value returns HTTP 422 with a readable field error.
- [ ] `POST /predict-batch` with the sample CSV returns 2 results and preserves row order.
- [ ] CSV with a missing column returns 422 listing the missing columns.
- [ ] Frontend shows all five pages and the API status chip is green.
- [ ] Detection form loads example records, validates, saves history and shows vote details.
- [ ] CSV upload filters results and downloads a CSV containing original columns + predictions.
- [ ] History survives a page refresh; clear history removes entries.
- [ ] Layout checked at mobile (~390 px), tablet (~768 px) and desktop (~1440 px).
- [ ] `npm run build` succeeds with no errors.

### After deployment

- [ ] Render service status is Live and `/health` reports `model_ready: true`.
- [ ] Vercel build succeeds and all routes render after a hard refresh.
- [ ] Browser console has no CORS or mixed-content errors.
- [ ] `VITE_API_URL` points to the deployed Render URL, not localhost.
- [ ] `ALLOWED_ORIGINS` contains the deployed Vercel origin.
- [ ] Batch upload and CSV download work against the live API.
- [ ] Record the live URLs and test date in your project report; do not claim deployment before this.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `model_ready: false`, 503 on all prediction routes | Missing artifacts | Run `backend/scripts/train.py` or commit `backend/models/*` |
| `ModuleNotFoundError: app` | Uvicorn started from repo root | Run `cd backend` first, then `uvicorn app.main:app ...` |
| CORS error in browser | Origin not in allowlist | Add exact Vercel origin to `ALLOWED_ORIGINS`, redeploy backend |
| Frontend calls localhost after deploy | Stale `VITE_API_URL` | Set Vite env var, rebuild/redeploy frontend |
| 422 "value is not in the training vocabulary" | Categorical value unseen during training | Use a value from `/model-info.categorical_values` |
| CSV 422 missing columns | Wrong header names/namespaced export | Download the template from the CSV Upload page |
| Slow first Render request | Free instance sleeping | Wait ~30–60 s or upgrade plan |
| Dataset download 404 on UCI | Archive moved | Use the verified mirror in section 3.2 |
| Accuracy differs from notebook | Different split/seed/artifacts | Compare `metrics.json`; notebook figures are historical only |

---

## 9. Viva talking points

1. **Problem:** binary IDS — normal connections (label 1) versus attacks (label 0), because blocking
   an attack matters more than naming its exact family.
2. **Preprocessing:** duplicate removal; 38 numeric features standardised and reduced with PCA to
   retain 98% variance; 3 categorical fields binary-encoded for XGBoost; the tree keeps raw columns.
3. **Models:** the notebook's own Gaussian NB, Gini decision tree and XGBoost. The API does not
   retrain per request; it loads exported artifacts at startup.
4. **Ensemble:** each model votes; `np.bincount(votes).argmax()` picks the majority. UI confidence is
   vote agreement, not a made-up probability.
5. **Engineering:** FastAPI validation, CORS, batch CSV, SPA charts/history, Vercel + Render split,
   health checks and a documented dataset/license caveat.

---

## 10. Attribution and license

The ML approach and notebook come from
[JayantUppal/Intrusion-Detection-System](https://github.com/JayantUppal/Intrusion-Detection-System).
That repository has **no license file**, so redistribution rights are not explicit. Obtain permission
from the original author before redistributing the notebook or derived artifacts. The KDD Cup 1999
dataset is distributed under the UCI KDD Archive terms and is not included in this repository.

The frontend, API wrapper and training-export script in this project are original work layered on
top of that research.
