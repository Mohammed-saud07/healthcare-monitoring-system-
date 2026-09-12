#include <Wire.h>

void setup() {
  Wire.begin(21, 22); // SDA, SCL
  Serial.begin(115200);
  while (!Serial) delay(10);
  Serial.println("\nI2C Scanner starting...");
}

void loop() {
  byte error, address;
  int devicesFound = 0;
  Serial.println("Scanning...");
  for (address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    if (error == 0) {
      Serial.print("Device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      devicesFound++;
    }
  }
  if (devicesFound == 0) Serial.println("No I2C devices found - check wiring!");
  else { Serial.print(devicesFound); Serial.println(" device(s) found."); }
  delay(3000);
}
