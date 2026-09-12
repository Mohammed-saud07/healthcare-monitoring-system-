"""
Model 3 - Predictive Health Score (XGBoost regressor)

Input: 72-hour historical vital trends per patient, engineered into
summary features (means, slopes, variability) per row.
Output: a composite 0-100 deterioration risk score.

Replace `load_dataset()` with your actual feature table.
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from xgboost import XGBRegressor
import joblib


def load_dataset(path: str = "data/risk_features.csv") -> pd.DataFrame:
    return pd.read_csv(path)


def main():
    df = load_dataset()
    feature_cols = [c for c in df.columns if c not in ("patientId", "risk_score")]
    X = df[feature_cols]
    y = df["risk_score"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = XGBRegressor(
        n_estimators=300, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, random_state=42
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    y_pred = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    print(f"RMSE: {rmse:.3f}")
    print(f"R^2:  {r2:.3f}")

    joblib.dump(model, "risk_regressor.pkl")
    joblib.dump(feature_cols, "risk_regressor_features.pkl")
    print("\nSaved risk_regressor.pkl - copy this into backend/app/models/")


if __name__ == "__main__":
    main()
