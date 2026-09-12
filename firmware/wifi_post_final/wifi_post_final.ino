#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <math.h>

// ---------- CONFIG - fill these in ----------
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverURL = "http://192.168.1.XX:5000/api/v1/vitals"; // your laptop IP + route
const char* authToken = "YOUR_JWT_TOKEN_HERE"; // if your backend requires auth
const char* patientId = "P001";
const unsigned long SEND_INTERVAL_MS = 5000;
// ---------------------------------------------

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
unsigned long lastSend = 0;

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

  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected. IP: " + WiFi.localIP().toString());
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

  if (millis() - lastSend >= SEND_INTERVAL_MS) {
    lastSend = millis();
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(serverURL);
      http.addHeader("Content-Type", "application/json");
      if (strlen(authToken) > 0) {
        http.addHeader("Authorization", String("Bearer ") + authToken);
      }

      StaticJsonDocument<256> doc;
      doc["patientId"] = patientId;
      doc["heartRate"] = beatAvg > 0 ? beatAvg : 0;
      doc["fingerDetected"] = fingerDetected;
      doc["accelMagnitude"] = magnitude;
      doc["fall"] = fallDetected;

      String requestBody;
      serializeJson(doc, requestBody);
      int httpResponseCode = http.POST(requestBody);
      Serial.print("POST sent | Response code: ");
      Serial.println(httpResponseCode);
      http.end();
    } else {
      Serial.println("WiFi disconnected - skipping send.");
    }
  }

  delay(100);
}
