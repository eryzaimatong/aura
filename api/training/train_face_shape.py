"""
Train the face-shape classifier on the five landmark ratios.

    python -m training.train_face_shape             (run from api/, after extract_features)

Compares RandomForest vs gradient boosting (5-fold CV on the training split, macro F1),
calibrates the winner so its confidences mean something, then evaluates once on the
held-out test split — overall and per Monk skin-tone band (hard rule 11).

Writes
  app/ml/models/face_shape.joblib        model + metadata, loaded by the API
  app/ml/reports/<version>.md            human-readable report
  ../db/metrics/<version>.sql            model_metrics rows (service-role table: run in the SQL editor)
"""

import argparse
import csv
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import sklearn
from sklearn.base import ClassifierMixin, clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_validate

from app.ml.features import FEATURES

API_DIR = Path(__file__).resolve().parents[1]
ROOT = API_DIR.parent
DEFAULT_CSV = ROOT / "data" / "features" / "face_shape_features.csv"
MODEL_OUT = API_DIR / "app" / "ml" / "models" / "face_shape.joblib"
REPORT_DIR = API_DIR / "app" / "ml" / "reports"
SQL_DIR = ROOT / "db" / "metrics"

CLASSES = ["heart", "oblong", "oval", "round", "square"]
LOW_CONF = 0.5

# Hard rule 11: per-band accuracy must not diverge. A band with too few test images
# can't be shown to be fair, so it fails the gate too.
MIN_BAND_N = 30
MAX_BAND_GAP = 0.05

CANDIDATES: dict[str, ClassifierMixin] = {
    # Sized for serving: 5 calibration folds × these trees ship in the model file.
    "rf": RandomForestClassifier(n_estimators=150, min_samples_leaf=5, random_state=0, n_jobs=-1),
    "gb": HistGradientBoostingClassifier(max_iter=300, learning_rate=0.05, random_state=0),
}


@dataclass
class Split:
    X: np.ndarray
    y: np.ndarray
    band: np.ndarray  # Monk band per row, 0 when unknown


def load(path: Path) -> tuple[Split, Split, dict[str, int]]:
    rows = list(csv.DictReader(path.open()))
    status_counts: dict[str, int] = {}
    for r in rows:
        status_counts[r["status"]] = status_counts.get(r["status"], 0) + 1
    ok = [r for r in rows if r["status"] == "ok"]

    def split(name: str) -> Split:
        sel = [r for r in ok if r["split"] == name]
        return Split(
            X=np.array([[float(r[f]) for f in FEATURES] for r in sel]),
            y=np.array([r["label"] for r in sel]),
            band=np.array([int(r["monk_band"]) if r["monk_band"] else 0 for r in sel]),
        )

    return split("train"), split("test"), status_counts


def pick_model(train: Split) -> tuple[str, dict[str, dict[str, float]]]:
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
    scores: dict[str, dict[str, float]] = {}
    for name, est in CANDIDATES.items():
        res = cross_validate(clone(est), train.X, train.y, cv=cv, scoring=["accuracy", "f1_macro"])
        scores[name] = {
            "accuracy": float(res["test_accuracy"].mean()),
            "macro_f1": float(res["test_f1_macro"].mean()),
            "macro_f1_std": float(res["test_f1_macro"].std()),
        }
    best = max(scores, key=lambda n: scores[n]["macro_f1"])
    return best, scores


def evaluate(model: ClassifierMixin, test: Split) -> dict[str, object]:
    proba = model.predict_proba(test.X)
    classes = list(model.classes_)
    pred = np.array(classes)[proba.argmax(axis=1)]
    conf = proba.max(axis=1)
    correct = pred == test.y

    bands = []
    for b in range(1, 11):
        m = test.band == b
        n = int(m.sum())
        bands.append({
            "band": b, "n": n,
            "accuracy": float(correct[m].mean()) if n else None,
            "macro_f1": float(f1_score(test.y[m], pred[m], labels=CLASSES, average="macro", zero_division=0)) if n else None,
            "mean_conf": float(conf[m].mean()) if n else None,
        })

    measured = [b for b in bands if b["n"] >= MIN_BAND_N]
    gap = (max(b["accuracy"] for b in measured) - min(b["accuracy"] for b in measured)) if len(measured) > 1 else None
    thin = [b["band"] for b in bands if b["n"] < MIN_BAND_N]
    return {
        "n": len(test.y),
        "accuracy": float(correct.mean()),
        "macro_f1": float(f1_score(test.y, pred, labels=CLASSES, average="macro")),
        "mean_conf": float(conf.mean()),
        "low_conf_rate": float((conf < LOW_CONF).mean()),
        "confusion": confusion_matrix(test.y, pred, labels=CLASSES).tolist(),
        "bands": bands,
        "fairness": {
            "band_gap": gap,
            "gap_ok": gap is not None and gap <= MAX_BAND_GAP,
            "unverified_bands": thin,
            "launch_ok": gap is not None and gap <= MAX_BAND_GAP and not thin,
        },
    }


def pct(x: float | None) -> str:
    return "—" if x is None else f"{x * 100:.1f}%"


def write_report(version: str, best: str, cv: dict, ev: dict, status_counts: dict[str, int], sizes: dict[str, int]) -> Path:
    fair = ev["fairness"]
    lines = [
        f"# Face shape model `{version}`",
        "",
        f"Trained {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC · scikit-learn {sklearn.__version__} · "
        f"features: {', '.join(FEATURES)}",
        "",
        "## Data",
        "",
        f"Images measured: {sum(status_counts.values())} → usable: {status_counts.get('ok', 0)} "
        f"(train {sizes['train']}, test {sizes['test']}).",
        "",
        "| Status | Images |", "|---|---|",
        *[f"| {k} | {v} |" for k, v in sorted(status_counts.items())],
        "",
        "## Model selection (5-fold CV, training split)",
        "",
        "| Model | Accuracy | Macro F1 |", "|---|---|---|",
        *[f"| {'**' + n + '**' if n == best else n} | {pct(s['accuracy'])} | {pct(s['macro_f1'])} ± {s['macro_f1_std'] * 100:.1f} |"
          for n, s in cv.items()],
        "",
        f"Winner: **{best}**, then sigmoid-calibrated (5-fold) so confidence tracks accuracy.",
        "",
        "## Held-out test split",
        "",
        "| Metric | Value |", "|---|---|",
        f"| Images | {ev['n']} |",
        f"| Accuracy | {pct(ev['accuracy'])} |",
        f"| Macro F1 | {pct(ev['macro_f1'])} |",
        f"| Mean confidence | {pct(ev['mean_conf'])} |",
        f"| Low-confidence rate (< {LOW_CONF:.0%}) | {pct(ev['low_conf_rate'])} |",
        "",
        "Confusion matrix (rows = true, columns = predicted):",
        "",
        "| | " + " | ".join(CLASSES) + " |",
        "|---|" + "---|" * len(CLASSES),
        *[f"| **{c}** | " + " | ".join(str(v) for v in row) + " |" for c, row in zip(CLASSES, ev["confusion"])],
        "",
        "## Accuracy by Monk skin-tone band (hard rule 11)",
        "",
        "| Band | Test images | Accuracy | Macro F1 | Mean confidence |", "|---|---|---|---|---|",
        *[f"| {b['band']} | {b['n']} | {pct(b['accuracy'])} | {pct(b['macro_f1'])} | {pct(b['mean_conf'])} |" for b in ev["bands"]],
        "",
        f"- Gap between bands with ≥ {MIN_BAND_N} images: **{pct(fair['band_gap'])}** "
        f"(limit {MAX_BAND_GAP:.0%}) → {'within limit' if fair['gap_ok'] else 'OVER LIMIT'}",
        f"- Bands with < {MIN_BAND_N} test images (cannot be verified): "
        f"{', '.join(map(str, fair['unverified_bands'])) or 'none'}",
        "",
        f"### Launch gate: {'✅ PASS' if fair['launch_ok'] else '⛔ BLOCKED'}",
        "",
        ("Every band is covered and within the gap limit." if fair["launch_ok"] else
         "This model may serve development builds, but per hard rule 11 it must not ship until every Monk band "
         f"has ≥ {MIN_BAND_N} labelled test faces and the accuracy gap is ≤ {MAX_BAND_GAP:.0%}."),
        "",
        "Monk band here is estimated from cheek colour in each photo (studio lighting and makeup add noise).",
    ]
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORT_DIR / f"{version}.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out


def write_sql(version: str, ev: dict) -> Path:
    def val(x: float | None) -> str:
        return "null" if x is None else f"{x:.4f}"

    rows = [f"('face_shape', '{version}', 'holdout', null, {ev['n']}, {val(ev['accuracy'])}, {val(ev['macro_f1'])}, {val(ev['mean_conf'])})"]
    rows += [f"('face_shape', '{version}', 'holdout', {b['band']}, {b['n']}, {val(b['accuracy'])}, {val(b['macro_f1'])}, {val(b['mean_conf'])})"
             for b in ev["bands"] if b["n"]]
    sql = (
        f"-- model_metrics for {version}. Generated by api/training/train_face_shape.py.\n"
        "-- model_metrics is service-role only: run this in the Supabase SQL editor.\n"
        "insert into model_metrics (model_name, version, split, monk_band, n, accuracy, macro_f1, mean_conf) values\n  "
        + ",\n  ".join(rows) + ";\n"
    )
    SQL_DIR.mkdir(parents=True, exist_ok=True)
    out = SQL_DIR / f"{version}.sql"
    out.write_text(sql, encoding="utf-8")
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--features", type=Path, default=DEFAULT_CSV)
    args = parser.parse_args()

    train, test, status_counts = load(args.features)
    print(f"train {len(train.y)} · test {len(test.y)} · statuses {status_counts}")

    best, cv = pick_model(train)
    for name, s in cv.items():
        print(f"  CV {name}: accuracy {pct(s['accuracy'])}, macro F1 {pct(s['macro_f1'])}")

    model = CalibratedClassifierCV(clone(CANDIDATES[best]), method="sigmoid", cv=5).fit(train.X, train.y)
    # The API predicts one face at a time: thread start-up costs more than it saves.
    for fold in model.calibrated_classifiers_:
        if "n_jobs" in fold.estimator.get_params():
            fold.estimator.set_params(n_jobs=1)
    ev = evaluate(model, test)
    version = f"fs-{best}-{datetime.now(timezone.utc):%Y%m%d}"

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "model": model,
        "version": version,
        "features": list(FEATURES),
        "classes": list(model.classes_),
        "sklearn_version": sklearn.__version__,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "test_accuracy": ev["accuracy"],
        "launch_ok": ev["fairness"]["launch_ok"],
    }, MODEL_OUT, compress=3)

    report = write_report(version, best, cv, ev, status_counts, {"train": len(train.y), "test": len(test.y)})
    sql = write_sql(version, ev)
    print(json.dumps({k: ev[k] for k in ("accuracy", "macro_f1", "mean_conf", "low_conf_rate", "fairness")}, indent=2))
    print(f"Model  → {MODEL_OUT}\nReport → {report}\nSQL    → {sql}")


if __name__ == "__main__":
    main()
