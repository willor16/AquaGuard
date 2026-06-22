// ============================================================
//  PRUEBA — Sensor ultrasónico HC-SR04 (ESP32)
// ============================================================
//  Solo mide la distancia y la imprime por el monitor serial.
//  NO usa WiFi ni Firebase. Sirve para verificar el sensor.
//
//  Compilar y subir SOLO esta prueba:
//    pio run -e test_ultrasonic -t upload
//  Ver la consola:
//    pio device monitor
//  Todo junto:
//    pio run -e test_ultrasonic -t upload && pio device monitor
// ============================================================

#include <Arduino.h>
#include "config.h"   // reutiliza PIN_TRIG (D21) y PIN_ECHO (D22)

// Mide la distancia en cm. Devuelve -1 si no hay eco.
float medirDistanciaCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  // pulseIn espera el eco; timeout 30ms (~5 m máx)
  long duracion = pulseIn(PIN_ECHO, HIGH, 30000);
  if (duracion == 0) return -1.0;

  // velocidad del sonido ≈ 0.0343 cm/µs, ida y vuelta → /2
  return (duracion * 0.0343) / 2.0;
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println(F("==================================="));
  Serial.println(F("  Prueba HC-SR04 — AquaGuard ESP32"));
  Serial.println(F("==================================="));
  Serial.print(F("  TRIG = GPIO"));
  Serial.print(PIN_TRIG);
  Serial.print(F("   ECHO = GPIO"));
  Serial.println(PIN_ECHO);
  Serial.println(F("  (recuerda el divisor de voltaje en ECHO)"));
  Serial.println();

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);
}

void loop() {
  float d = medirDistanciaCm();

  if (d < 0) {
    Serial.println(F("Sin eco  ->  revisa TRIG, ECHO y el divisor de voltaje"));
  } else if (d < 2.0 || d > 400.0) {
    Serial.print(F("Fuera de rango: "));
    Serial.print(d, 1);
    Serial.println(F(" cm  (el HC-SR04 mide ~2 a 400 cm)"));
  } else {
    Serial.print(F("Distancia: "));
    Serial.print(d, 1);
    Serial.println(F(" cm"));
  }

  delay(500);
}
