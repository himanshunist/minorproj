# Analysis of the upstream repository

These notes summarise the repository at <https://github.com/JayantUppal/Intrusion-Detection-System>
as inspected on 2026-11-17. The unmodified notebook, README and requirements are kept
in this folder for reproducibility.

## Files in the upstream repository

| File | Role |
| --- | --- |
| `IDS.ipynb` | Full experiment: preprocessing, EDA, three custom/classifier implementations, evaluation and max voting |
| `README.md` | Project description, methodology image and dataset instructions |
| `requirements.txt` | Original Python dependencies (pinned to 2021-era versions) |

There is **no LICENSE file** in the upstream repository. Do not assume redistribution
rights; ask the original author before publishing derived code or artifacts.

## Notebook findings

* **Dataset:** `kddcup.data_10_percent_corrected`, read with 41 explicit feature names
  plus `intrusion_type`. 494,021 rows and 23 labels originally; 348,435 duplicate rows
  are removed, leaving 145,586 rows.
* **Target:** binary. `normal.` becomes `1`, the other 22 labels become `0`.
* **Numeric features:** 38 columns in the exact `select_dtypes(include=['float64','int64'])`
  order. They are standardised with `StandardScaler`, then reduced with
  `PCA(n_components=0.98)` for Gaussian NB and XGBoost.
* **Categorical features:** `protocol_type`, `service`, `flag`. They are encoded with
  `CountVectorizer(vocabulary=list(set(values)), binary=True)` and h-stacked with the
  PCA output for XGBoost. The custom Decision Tree instead receives all 41 original
  columns, including categorical strings.
* **Gaussian NB:** a hand-written class computing per-class mean/variance on PCA
  components, then multiplying Gaussian densities with a uniform prior.
* **Decision Tree:** a hand-written Gini/information-gain tree trained on 10,000
  shuffled rows; leaf class counts are used for prediction.
* **XGBoost:** `XGBClassifier()` with default parameters on PCA + one-hot features.
* **Ensemble:** `np.bincount((gnb_pred, dt_pred, xgb_pred)).argmax()` (max voting).
* **Historical results printed in cell 59:** GNB 96.15%, DT 99.7%, XGBoost 99.85%,
  max voting 99.92% accuracy; false positives 453, 56, 32 and 14 respectively.
  These are quoted from the notebook output only.

## Notes for the exported pipeline

The notebook never saves models or preprocessing objects. `backend/scripts/train.py`
runs the same workflow once and exports the scaler, PCA, Gaussian NB parameters,
decision tree (as JSON), XGBoost model, categorical vocabularies and metadata.
The export uses a fixed seed and a single shared stratified evaluation split for
comparable artifact metrics; those are deliberate, documented deviations.
