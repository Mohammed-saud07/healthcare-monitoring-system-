#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <math.h>

MAX30105 particleSensor;
Adafruit_MPU6050 mpu;

const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute;
int beatAvg = 0;

const float FALL_THRESHOLD_HIGH = 25.0;
const float FALL_THRESHOLD_LOW  = 2.0;
bool fallDetected = false;
unsigned long fallCooldown = 0;

void setup() {
  Serial.begin(115200);
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found.");
    while (1);
  }
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeGreen(0);

  if (!mpu.begin()) {
    Serial.println("MPU6050 not found.");
    while (1);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  Serial.println("Setup complete. Place finger on sensor and monitor.");
}

void loop() {
  long irValue = particleSensor.getIR();
  bool fingerDetected = irValue > 50000;
  if (fingerDetected && checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    beatsPerMinute = 60 / (delta / 1000.0);
    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;
      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++) beatAvg += rates[x];
      beatAvg /= RATE_SIZE;
    }
  }

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  float magnitude = sqrt(a.acceleration.x * a.acceleration.x +
                          a.acceleration.y * a.acceleration.y +
                          a.acceleration.z * a.acceleration.z);
  if (millis() > fallCooldown) {
    if (magnitude > FALL_THRESHOLD_HIGH || magnitude < FALL_THRESHOLD_LOW) {
      fallDetected = true;
      fallCooldown = millis() + 5000;
    } else {
      fallDetected = false;
    }
  }

  Serial.print("Finger: "); Serial.print(fingerDetected ? "YES" : "NO");
  Serial.print(" | BPM Avg: "); Serial.print(beatAvg);
  Serial.print(" | AccelMag: "); Serial.print(magnitude);
  Serial.print(" | FALL: "); Serial.println(fallDetected ? "*** DETECTED ***" : "no");
  delay(200);
}
