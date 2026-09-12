"""
Model 1 - Vital Sign Anomaly Classifier (Random Forest)

Input: CSV with columns like heartRate, spo2, temperature, hr_mean_10s,
hr_std_10s, spo2_mean_10s, ... and a label column `severity`
(Normal / Mild / Moderate / Critical).

Replace `load_dataset()` with your actual data source (Kaggle vitals
dataset, synthetic generator, or your own collected demo data) and
document which one you used in Chapter 6.
"""

import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
import joblib


def load_dataset(path: str = "data/vitals_labeled.csv") -> pd.DataFrame:
    return pd.read_csv(path)


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Rolling 10s statistical descriptors per the report's Chapter 6.3 design.
    Adjust window size to match your actual sampling rate."""
    df = df.sort_values("timestamp")
    for col in ["heartRate", "spo2", "temperature"]:
        df[f"{col}_mean_10s"] = df[col].rolling(window=10, min_periods=1).mean()
        df[f"{col}_std_10s"] = df[col].rolling(window=10, min_periods=1).std().fillna(0)
    return df


def main():
    df = load_dataset()
    df = build_features(df)

    feature_cols = [c for c in df.columns if c.endswith("_10s") or c in
                    ["heartRate", "spo2", "temperature"]]
    X = df[feature_cols]
    y = df["severity"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    param_grid = {
        "n_estimators": [100, 200, 300],
        "max_depth": [None, 10, 20],
        "min_samples_split": [2, 5],
    }
    grid = GridSearchCV(
        RandomForestClassifier(random_state=42, class_weight="balanced"),
        param_grid, cv=5, scoring="f1_macro", n_jobs=-1
    )
    grid.fit(X_train, y_train)
    model = grid.best_estimator_

    print("Best params:", grid.best_params_)
    print("CV F1-macro:", cross_val_score(model, X_train, y_train, cv=5, scoring="f1_macro").mean())

    y_pred = model.predict(X_test)
    print("\nHeld-out test report:")
    print(classification_report(y_test, y_pred))
    print(confusion_matrix(y_test, y_pred))

    joblib.dump(model, "anomaly_classifier.pkl")
    joblib.dump(feature_cols, "anomaly_classifier_features.pkl")
    print("\nSaved anomaly_classifier.pkl - copy this into backend/app/models/")


if __name__ == "__main__":
    main()
