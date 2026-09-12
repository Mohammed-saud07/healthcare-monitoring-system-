"""
Model 2 - Fall Detection (LSTM)

Trained in software for real, reportable metrics (Chapter 8), even
though the physical ESP32 demo uses a simpler threshold check.

Expects windowed IMU sequences: shape (num_samples, 50, 6) for
[ax, ay, az, gx, gy, gz] over 50 timesteps, and binary labels
(1 = fall, 0 = ADL - activities of daily living).

Public datasets that fit this shape well: SisFall, MobiFall.
Replace `load_windows()` with your actual preprocessing pipeline.
"""

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score


def load_windows():
    """Return (X, y) where X has shape (N, 50, 6) and y has shape (N,)."""
    X = np.load("data/imu_windows.npy")
    y = np.load("data/imu_labels.npy")
    return X, y


def build_model(timesteps=50, features=6):
    model = models.Sequential([
        layers.Input(shape=(timesteps, features)),
        layers.LSTM(64, return_sequences=True),
        layers.Dropout(0.3),
        layers.LSTM(32),
        layers.Dropout(0.3),
        layers.Dense(16, activation="relu"),
        layers.Dense(1, activation="sigmoid"),
    ])
    model.compile(optimizer="adam", loss="binary_crossentropy",
                  metrics=["accuracy", tf.keras.metrics.AUC(name="auc")])
    return model


def main():
    X, y = load_windows()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = build_model(timesteps=X.shape[1], features=X.shape[2])
    model.summary()

    early_stop = tf.keras.callbacks.EarlyStopping(
        monitor="val_auc", mode="max", patience=8, restore_best_weights=True
    )
    model.fit(
        X_train, y_train, validation_split=0.15,
        epochs=60, batch_size=32, callbacks=[early_stop]
    )

    y_prob = model.predict(X_test).ravel()
    y_pred = (y_prob > 0.5).astype(int)
    print("\nHeld-out test report:")
    print(classification_report(y_test, y_pred))
    print("ROC-AUC:", roc_auc_score(y_test, y_prob))

    model.save("fall_lstm.h5")
    print("\nSaved fall_lstm.h5")

    # Optional: quantize for an on-device Raspberry Pi tier later
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()
    with open("fall_lstm.tflite", "wb") as f:
        f.write(tflite_model)
    print("Saved fall_lstm.tflite (for a future edge-tier deployment)")


if __name__ == "__main__":
    main()
