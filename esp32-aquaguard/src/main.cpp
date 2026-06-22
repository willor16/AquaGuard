// ============================================================
//  AquaGuard — Firmware ESP32
//  Control automático de llenado de tanques de agua
// ============================================================
//  Board:   ESP32 DevKit (ESP-WROOM-32, 30 pines)
//
//  Este firmware:
//  1. Lee el sensor ultrasónico HC-SR04 (nivel del tanque)
//  2. Lee el sensor de humedad FC-28 (cisterna tiene agua)
//  3. Controla una bomba 12V vía módulo de relé de 8 canales
//  4. Se conecta a Firebase Realtime Database
//  5. Publica el estado en reported/
//  6. Lee comandos de desired/ y configuración de config/
//  7. Opera en modo automático o manual
//  8. Protecciones: anti-marcha en seco, anti-desbordamiento,
//     paro de emergencia (botón físico + remoto)
// ============================================================

// Habilitar módulos de FirebaseClient ANTES del include
#define ENABLE_USER_AUTH
#define ENABLE_DATABASE

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <FirebaseClient.h>
#include <time.h>
#include "config.h"

// ════════════════════════════════════════════════════════════
//  FORWARD DECLARATIONS
// ════════════════════════════════════════════════════════════

void checkMaintenanceWindows();
void publishEvent(const char* type, const char* detail);
void publishAlert(const char* code, const char* message);

// ════════════════════════════════════════════════════════════
//  ESTRUCTURAS DE DATOS
// ════════════════════════════════════════════════════════════

struct SensorData {
  float distanceCm;
  float levelPct;
  int   moistureRaw;
  bool  cisternHasWater;
  bool  sensorOk;
  float healthBuffer[HEALTH_WINDOW];
  int   healthIndex;
  int   healthCount;
  int   invalidReadings;
  int   totalReadings;
};

struct DeviceConfig {
  char  mode[8];
  int   startPct;
  int   stopPct;
  bool  emergencyStop;
  bool  pumpEnabled;
  int   pumpRelayChannel;
  float emptyDistanceCm;
  float fullDistanceCm;
  bool  ultrasonicCalibrated;
  int   moistureThreshold;
  bool  moistureCalibrated;
  bool  maintenanceActive;
};

struct DesiredCommands {
  int  pumpManual;       // -1=null, 0=false, 1=true
  char requestedMode[8]; // "" = null
};

struct ActuatorState {
  bool pumpOn;
  bool estopPressed;
  bool estopLatched;
};

// ════════════════════════════════════════════════════════════
//  VARIABLES GLOBALES
// ════════════════════════════════════════════════════════════

SensorData      sensors;
DeviceConfig    cfg;
DesiredCommands desired;
ActuatorState   actuators;

// Firebase
WiFiClientSecure ssl_client;
using AsyncClient = AsyncClientClass;
AsyncClient aClient(ssl_client);
UserAuth user_auth(FIREBASE_API_KEY, DEVICE_EMAIL, DEVICE_PASSWORD, 3000);
FirebaseApp fbApp;
RealtimeDatabase Database;
bool firebaseReady = false;

// Temporización
unsigned long lastSensorRead     = 0;
unsigned long lastFirebasePublish = 0;
unsigned long lastDesiredRead    = 0;
unsigned long lastConfigRead     = 0;
unsigned long lastWifiCheck      = 0;
unsigned long wifiDisconnectedAt = 0;

// E-STOP debounce
unsigned long lastEstopChange    = 0;
bool          lastEstopState     = HIGH;

// Alertas anti-spam
bool alertDryRunSent    = false;
bool alertOverflowSent  = false;
bool alertSensorSent    = false;

// Ruta base
String tankBasePath;

// ════════════════════════════════════════════════════════════
//  WiFi
// ════════════════════════════════════════════════════════════

void setupWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print(F("[WiFi] Conectando a \""));
  Serial.print(WIFI_SSID);
  Serial.print(F("\""));

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print(F("[WiFi] Conectado! IP: "));
    Serial.println(WiFi.localIP());
    wifiDisconnectedAt = 0;
  } else {
    Serial.println(F("\n[WiFi] No se pudo conectar. Reintentando..."));
    wifiDisconnectedAt = millis();
  }
}

void checkWiFi() {
  if (millis() - lastWifiCheck < WIFI_CHECK_MS) return;
  lastWifiCheck = millis();

  if (WiFi.status() == WL_CONNECTED) {
    wifiDisconnectedAt = 0;
    return;
  }

  Serial.println(F("[WiFi] Desconectado. Reconectando..."));
  if (wifiDisconnectedAt == 0) wifiDisconnectedAt = millis();

  if (millis() - wifiDisconnectedAt > WIFI_RESTART_TIMEOUT) {
    Serial.println(F("[WiFi] Sin conexion por 5 min. Reiniciando..."));
    ESP.restart();
  }

  WiFi.disconnect();
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("[WiFi] Reconectado! IP: "));
    Serial.println(WiFi.localIP());
    wifiDisconnectedAt = 0;
  }
}

// ════════════════════════════════════════════════════════════
//  NTP
// ════════════════════════════════════════════════════════════

void setupNTP() {
  configTime(NTP_OFFSET_S, 0, NTP_SERVER_1, NTP_SERVER_2);
  Serial.print(F("[NTP] Sincronizando hora"));

  time_t now = time(nullptr);
  int attempts = 0;
  while (now < 1000000000 && attempts < 20) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    attempts++;
  }
  Serial.println(now > 1000000000 ? F(" OK") : F(" (usando millis)"));
}

unsigned long getEpoch() {
  time_t now = time(nullptr);
  if (now > 1000000000) return (unsigned long)now;
  return millis() / 1000;
}

// ════════════════════════════════════════════════════════════
//  SENSORES
// ════════════════════════════════════════════════════════════

float readUltrasonicMedian() {
  float readings[MEDIAN_SAMPLES];
  int validCount = 0;

  for (int i = 0; i < MEDIAN_SAMPLES; i++) {
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);

    long duration = pulseIn(PIN_ECHO, HIGH, US_TIMEOUT_US);
    if (duration > 0) {
      float d = duration * 0.034 / 2.0;
      if (d >= US_MIN_DISTANCE_CM && d <= US_MAX_DISTANCE_CM) {
        readings[validCount++] = d;
      }
    }
    delay(US_DELAY_MS);
  }

  sensors.totalReadings += MEDIAN_SAMPLES;
  sensors.invalidReadings += (MEDIAN_SAMPLES - validCount);

  if (validCount == 0) return -1.0;

  // Bubble sort para mediana
  for (int i = 0; i < validCount - 1; i++) {
    for (int j = i + 1; j < validCount; j++) {
      if (readings[j] < readings[i]) {
        float tmp = readings[i];
        readings[i] = readings[j];
        readings[j] = tmp;
      }
    }
  }
  return readings[validCount / 2];
}

float calculateLevelPct(float distanceCm) {
  float range = cfg.emptyDistanceCm - cfg.fullDistanceCm;
  if (range <= 0) return 0.0;
  float pct = ((cfg.emptyDistanceCm - distanceCm) / range) * 100.0;
  if (pct < 0.0) pct = 0.0;
  if (pct > 100.0) pct = 100.0;
  return pct;
}

void updateSensorHealth(float distanceCm) {
  if (distanceCm < 0) return;
  sensors.healthBuffer[sensors.healthIndex] = distanceCm;
  sensors.healthIndex = (sensors.healthIndex + 1) % HEALTH_WINDOW;
  if (sensors.healthCount < HEALTH_WINDOW) sensors.healthCount++;
}

float calculateNoiseStd() {
  if (sensors.healthCount < 3) return 0.0;
  float sum = 0;
  for (int i = 0; i < sensors.healthCount; i++) sum += sensors.healthBuffer[i];
  float mean = sum / sensors.healthCount;
  float variance = 0;
  for (int i = 0; i < sensors.healthCount; i++) {
    float diff = sensors.healthBuffer[i] - mean;
    variance += diff * diff;
  }
  return sqrt(variance / sensors.healthCount);
}

float calculateInvalidRate() {
  if (sensors.totalReadings == 0) return 0.0;
  return (float)sensors.invalidReadings / sensors.totalReadings * 100.0;
}

int readMoisture() {
  int sum = 0;
  for (int i = 0; i < 3; i++) { sum += analogRead(PIN_MOISTURE); delay(10); }
  return sum / 3;
}

bool isCisternWet(int moistureRaw) {
  return moistureRaw < cfg.moistureThreshold;
}

void readAllSensors() {
  float dist = readUltrasonicMedian();
  if (dist > 0) {
    sensors.distanceCm = dist;
    sensors.levelPct = calculateLevelPct(dist);
    sensors.sensorOk = true;
    updateSensorHealth(dist);
  } else {
    sensors.sensorOk = false;
  }

  sensors.moistureRaw = readMoisture();
  sensors.cisternHasWater = isCisternWet(sensors.moistureRaw);

  Serial.print(F("[Sensor] Dist: "));
  Serial.print(sensors.distanceCm, 1);
  Serial.print(F("cm | Nivel: "));
  Serial.print(sensors.levelPct, 1);
  Serial.print(F("% | Hum: "));
  Serial.print(sensors.moistureRaw);
  Serial.print(F(" | Cisterna: "));
  Serial.println(sensors.cisternHasWater ? "CON AGUA" : "SECA");
}

// ════════════════════════════════════════════════════════════
//  ACTUADORES
// ════════════════════════════════════════════════════════════

void setPump(bool on) {
  if (on == actuators.pumpOn) return;
  actuators.pumpOn = on;

  if (RELAY_ACTIVE_LOW) {
    digitalWrite(PIN_RELAY, on ? LOW : HIGH);
  } else {
    digitalWrite(PIN_RELAY, on ? HIGH : LOW);
  }

  Serial.print(F("[Bomba] "));
  Serial.println(on ? "ENCENDIDA" : "APAGADA");

  if (firebaseReady) {
    publishEvent(on ? "PUMP_ON" : "PUMP_OFF", "");
  }
}

void checkEstopButton() {
  bool currentState = digitalRead(PIN_ESTOP);
  if (currentState != lastEstopState) lastEstopChange = millis();
  lastEstopState = currentState;
  if (millis() - lastEstopChange < ESTOP_DEBOUNCE_MS) return;

  if (currentState == LOW && !actuators.estopPressed) {
    actuators.estopPressed = true;
    actuators.estopLatched = true;
    Serial.println(F("[E-STOP] PARO DE EMERGENCIA ACTIVADO!"));
    setPump(false);

    if (firebaseReady) {
      Database.set<bool>(aClient, tankBasePath + "/config/emergencyStop", true);
      publishEvent("ESTOP_ON", "Boton fisico presionado");
    }
  }
  if (currentState == HIGH) actuators.estopPressed = false;
}

// Actualiza los 3 LEDs indicadores según el estado del sistema:
//   Verde    = online y sin alertas (operación normal)
//   Amarillo = bomba encendida (llenando)
//   Azul     = alerta activa (E-STOP, marcha en seco, desbordamiento, sensor)
void updateLeds() {
  bool alert = cfg.emergencyStop || actuators.estopLatched
            || alertDryRunSent || alertOverflowSent || alertSensorSent;
  bool online = firebaseReady && (WiFi.status() == WL_CONNECTED);

  digitalWrite(PIN_LED_YELLOW, actuators.pumpOn ? LED_ON : LED_OFF);
  digitalWrite(PIN_LED_BLUE,   alert ? LED_ON : LED_OFF);
  digitalWrite(PIN_LED_GREEN,  (online && !alert) ? LED_ON : LED_OFF);
}

// ════════════════════════════════════════════════════════════
//  FIREBASE
// ════════════════════════════════════════════════════════════

void setupFirebase() {
  Serial.println(F("[Firebase] Inicializando..."));

  ssl_client.setInsecure();
#if defined(ESP8266)
  ssl_client.setBufferSizes(4096, 1024);
#endif

  // Inicializar y esperar autenticación (timeout 120s)
  initializeApp(aClient, fbApp, getAuth(user_auth), 120 * 1000);

  if (fbApp.ready()) {
    Serial.println(F("[Firebase] Autenticado!"));
    fbApp.getApp<RealtimeDatabase>(Database);
    Database.url(FIREBASE_DB_URL);
    firebaseReady = true;
  } else {
    Serial.println(F("[Firebase] Error de autenticacion. Verifica credenciales."));
    firebaseReady = false;
  }
}

/** Verifica si la última operación de Firebase fue exitosa */
bool fbOk() {
  return aClient.lastError().code() == 0;
}

void publishReported() {
  if (!firebaseReady) return;

  String path = tankBasePath + "/reported";
  float invalidRate = calculateInvalidRate();
  float noiseStd = calculateNoiseStd();
  bool healthOk = (invalidRate < HEALTH_DEGRADED_RATE && noiseStd < HEALTH_DEGRADED_NOISE);

  // Construir JSON
  String json = "{";
  json += "\"levelPct\":";       json += String(sensors.levelPct, 1);
  json += ",\"distanceCm\":";    json += String(sensors.distanceCm, 1);
  json += ",\"pumpOn\":";        json += actuators.pumpOn ? "true" : "false";
  json += ",\"valveOn\":false";
  json += ",\"cisternHasWater\":"; json += sensors.cisternHasWater ? "true" : "false";
  json += ",\"online\":true";
  json += ",\"lastSeen\":";      json += String(getEpoch());
  json += ",\"moistureRaw\":";   json += String(sensors.moistureRaw);
  json += ",\"moistureWet\":";   json += sensors.cisternHasWater ? "true" : "false";
  json += ",\"sensorHealth\":{";
  json +=   "\"invalidRatePct\":"; json += String(invalidRate, 1);
  json +=   ",\"noiseStd\":";     json += String(noiseStd, 1);
  json +=   ",\"status\":\"";     json += (healthOk ? "ok" : "degraded");
  json += "\"}";
  json += ",\"mode\":\"";        json += String(cfg.mode);
  json += "\"}";

  Database.set<object_t>(aClient, path, object_t(json));

  if (fbOk()) {
    Serial.println(F("[Firebase] reported/ publicado"));
  } else {
    Serial.print(F("[Firebase] Error: "));
    Serial.println(aClient.lastError().message().c_str());
  }
}

/** Lee un valor String de Firebase. Retorna "" si falla. */
String fbGetString(const String &path) {
  String val = Database.get<String>(aClient, path);
  if (!fbOk()) return "";
  // Limpiar comillas que Firebase puede envolver
  val.replace("\"", "");
  if (val == "null") return "";
  return val;
}

void readDesired() {
  if (!firebaseReady) return;

  String path = tankBasePath + "/desired";

  // Leer pumpManual
  String pumpVal = fbGetString(path + "/pumpManual");
  if (pumpVal == "true") desired.pumpManual = 1;
  else if (pumpVal == "false") desired.pumpManual = 0;
  else desired.pumpManual = -1;

  // Leer requestedMode
  String modeVal = fbGetString(path + "/requestedMode");
  if (modeVal == "auto" || modeVal == "manual") {
    strncpy(desired.requestedMode, modeVal.c_str(), sizeof(desired.requestedMode) - 1);
    strncpy(cfg.mode, modeVal.c_str(), sizeof(cfg.mode) - 1);
    Serial.print(F("[Firebase] Modo cambiado a: "));
    Serial.println(cfg.mode);

    // Limpiar el comando
    Database.remove(aClient, path + "/requestedMode");

    String detail = "Modo cambiado a ";
    detail += cfg.mode;
    publishEvent("MODE_CHANGE", detail.c_str());
  }
}

void readConfig() {
  if (!firebaseReady) return;

  String path = tankBasePath + "/config";

  // Modo
  String modeVal = fbGetString(path + "/mode");
  if (modeVal == "auto" || modeVal == "manual") {
    strncpy(cfg.mode, modeVal.c_str(), sizeof(cfg.mode) - 1);
  }

  // Umbrales
  String startVal = fbGetString(path + "/startPct");
  if (startVal.length() > 0) {
    int v = startVal.toInt();
    if (v > 0 && v < 100) cfg.startPct = v;
  }

  String stopVal = fbGetString(path + "/stopPct");
  if (stopVal.length() > 0) {
    int v = stopVal.toInt();
    if (v > 0 && v <= 100) cfg.stopPct = v;
  }

  // Paro de emergencia
  String estopVal = fbGetString(path + "/emergencyStop");
  if (estopVal == "true") {
    cfg.emergencyStop = true;
  } else if (estopVal == "false") {
    cfg.emergencyStop = false;
    actuators.estopLatched = false;
  }

  // Calibración ultrasónico
  String emptyVal = fbGetString(path + "/calibration/ultrasonic/emptyDistanceCm");
  if (emptyVal.length() > 0) {
    float v = emptyVal.toFloat();
    if (v > 0) cfg.emptyDistanceCm = v;
  }

  String fullVal = fbGetString(path + "/calibration/ultrasonic/fullDistanceCm");
  if (fullVal.length() > 0) {
    float v = fullVal.toFloat();
    if (v >= 0) cfg.fullDistanceCm = v;
  }

  String calUltVal = fbGetString(path + "/calibration/ultrasonic/isCalibrated");
  cfg.ultrasonicCalibrated = (calUltVal == "true");

  // Calibración humedad
  String threshVal = fbGetString(path + "/calibration/moisture/threshold");
  if (threshVal.length() > 0) {
    int v = threshVal.toInt();
    if (v >= 0) cfg.moistureThreshold = v;
  }

  String calMoistVal = fbGetString(path + "/calibration/moisture/isCalibrated");
  cfg.moistureCalibrated = (calMoistVal == "true");

  // Actuadores (bomba)
  String pumpEnVal = fbGetString(path + "/actuators/pump/enabled");
  if (pumpEnVal.length() > 0) cfg.pumpEnabled = (pumpEnVal == "true");

  String pumpChVal = fbGetString(path + "/actuators/pump/relayChannel");
  if (pumpChVal.length() > 0) cfg.pumpRelayChannel = pumpChVal.toInt();

  checkMaintenanceWindows();

  Serial.print(F("[Config] modo="));
  Serial.print(cfg.mode);
  Serial.print(F(" start="));
  Serial.print(cfg.startPct);
  Serial.print(F("% stop="));
  Serial.print(cfg.stopPct);
  Serial.print(F("% estop="));
  Serial.print(cfg.emergencyStop);
  Serial.print(F(" empty="));
  Serial.print(cfg.emptyDistanceCm);
  Serial.print(F(" full="));
  Serial.println(cfg.fullDistanceCm);
}

void checkMaintenanceWindows() {
  cfg.maintenanceActive = false;
  // Simplificado: se puede expandir para leer ventanas individuales
}

void publishAlert(const char* code, const char* message) {
  if (!firebaseReady) return;

  String alertId = String(code) + "_" + String(getEpoch());
  String path = tankBasePath + "/alerts/" + alertId;

  String json = "{\"code\":\"";
  json += code;
  json += "\",\"message\":\"";
  json += message;
  json += "\",\"ts\":";
  json += String(getEpoch());
  json += ",\"active\":true}";

  Database.set<object_t>(aClient, path, object_t(json));
  Serial.print(F("[Alerta] "));
  Serial.print(code);
  Serial.print(F(": "));
  Serial.println(message);
}

void publishEvent(const char* type, const char* detail) {
  if (!firebaseReady) return;

  String eventId = String(getEpoch()) + "_" + String(millis() % 1000);
  String path = tankBasePath + "/events/" + eventId;

  String json = "{\"ts\":";
  json += String(getEpoch());
  json += ",\"type\":\"";
  json += type;
  json += "\"";
  if (strlen(detail) > 0) {
    json += ",\"detail\":\"";
    json += detail;
    json += "\"";
  }
  json += "}";

  Database.set<object_t>(aClient, path, object_t(json));
}

void publishHistory() {
  if (!firebaseReady) return;

  String ts = String(getEpoch());
  String path = tankBasePath + "/history/" + ts;

  String json = "{\"ts\":";
  json += ts;
  json += ",\"levelPct\":";
  json += String(sensors.levelPct, 1);
  json += "}";

  Database.set<object_t>(aClient, path, object_t(json));
}

// ════════════════════════════════════════════════════════════
//  LÓGICA DE CONTROL
// ════════════════════════════════════════════════════════════

void runControlLogic() {
  // 1. PARO DE EMERGENCIA
  if (cfg.emergencyStop || actuators.estopLatched) {
    setPump(false);
    return;
  }

  // 2. ANTI-MARCHA EN SECO
  if (!sensors.cisternHasWater) {
    if (actuators.pumpOn) setPump(false);
    if (!alertDryRunSent) {
      publishAlert("DRY_RUN", "Cisterna sin agua, bomba bloqueada");
      alertDryRunSent = true;
    }
    return;
  } else {
    alertDryRunSent = false;
  }

  // 3. ANTI-DESBORDAMIENTO
  if (sensors.levelPct >= OVERFLOW_PCT) {
    if (actuators.pumpOn) setPump(false);
    if (!alertOverflowSent) {
      publishAlert("OVERFLOW", "Nivel del tanque excede el maximo seguro");
      alertOverflowSent = true;
    }
    return;
  } else if (alertOverflowSent && sensors.levelPct < OVERFLOW_PCT - 5) {
    alertOverflowSent = false;
  }

  // 4. SENSOR DEGRADADO
  if (!sensors.sensorOk && !alertSensorSent) {
    publishAlert("SENSOR_FAULT", "Sensor ultrasonico sin lecturas validas");
    alertSensorSent = true;
  } else if (sensors.sensorOk) {
    alertSensorSent = false;
  }

  // 5. MANTENIMIENTO
  if (cfg.maintenanceActive) { setPump(false); return; }

  // 6. BOMBA NO HABILITADA
  if (!cfg.pumpEnabled) { setPump(false); return; }

  // 7. MODO DE OPERACIÓN
  if (strcmp(cfg.mode, "auto") == 0) {
    if (sensors.levelPct < (float)cfg.startPct) setPump(true);
    else if (sensors.levelPct >= (float)cfg.stopPct) setPump(false);
  } else if (strcmp(cfg.mode, "manual") == 0) {
    if (desired.pumpManual == 1) setPump(true);
    else if (desired.pumpManual == 0) setPump(false);
  }
}

// ════════════════════════════════════════════════════════════
//  INICIALIZACIÓN
// ════════════════════════════════════════════════════════════

void initDefaults() {
  memset(&sensors, 0, sizeof(sensors));
  sensors.distanceCm = -1;
  sensors.sensorOk = false;

  strncpy(cfg.mode, "auto", sizeof(cfg.mode));
  cfg.startPct = DEFAULT_START_PCT;
  cfg.stopPct = DEFAULT_STOP_PCT;
  cfg.emergencyStop = false;
  cfg.pumpEnabled = true;
  cfg.pumpRelayChannel = 1;
  cfg.emptyDistanceCm = DEFAULT_EMPTY_DIST_CM;
  cfg.fullDistanceCm = DEFAULT_FULL_DIST_CM;
  cfg.ultrasonicCalibrated = false;
  cfg.moistureThreshold = DEFAULT_MOISTURE_THRESH;
  cfg.moistureCalibrated = false;
  cfg.maintenanceActive = false;

  desired.pumpManual = -1;
  memset(desired.requestedMode, 0, sizeof(desired.requestedMode));

  actuators.pumpOn = false;
  actuators.estopPressed = false;
  actuators.estopLatched = false;
}

// ════════════════════════════════════════════════════════════
//  SETUP & LOOP
// ════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println();
  Serial.println(F("========================================"));
  Serial.println(F("  AquaGuard - Firmware ESP32 v1.0"));
  Serial.println(F("========================================"));
  Serial.print(F("  Tanque: "));
  Serial.println(TANK_ID);
  Serial.println();

  initDefaults();
  tankBasePath = String("tanks/") + TANK_ID;

  // Pines
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_ESTOP, INPUT_PULLUP);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_BLUE, OUTPUT);

  digitalWrite(PIN_RELAY, RELAY_ACTIVE_LOW ? HIGH : LOW);
  digitalWrite(PIN_LED_GREEN, LED_OFF);
  digitalWrite(PIN_LED_YELLOW, LED_OFF);
  digitalWrite(PIN_LED_BLUE, LED_OFF);
  digitalWrite(PIN_TRIG, LOW);
  Serial.println(F("[Hardware] Pines configurados"));

  // WiFi
  setupWiFi();

  // NTP
  if (WiFi.status() == WL_CONNECTED) setupNTP();

  // CPU a 240MHz (máximo del ESP32) para SSL/TLS
  setCpuFrequencyMhz(240);
  Serial.println(F("[Sistema] CPU a 240MHz"));

  // Firebase
  if (WiFi.status() == WL_CONNECTED) {
    setupFirebase();
    if (firebaseReady) {
      readConfig();
      readDesired();
    }
  }

  // Primera lectura
  readAllSensors();

  Serial.println(F("========================================"));
  Serial.println(F("  Inicializacion completa"));
  Serial.println(F("========================================"));
  Serial.println();
}

int publishCount = 0;

void loop() {
  // Firebase maintenance
  if (firebaseReady) fbApp.loop();

  checkWiFi();
  checkEstopButton();

  // Leer sensores
  if (millis() - lastSensorRead >= SENSOR_READ_MS) {
    lastSensorRead = millis();
    readAllSensors();
  }

  // Control
  runControlLogic();

  // Indicadores LED (verde/amarillo/azul)
  updateLeds();

  // Firebase: leer comandos
  if (firebaseReady && millis() - lastDesiredRead >= DESIRED_READ_MS) {
    lastDesiredRead = millis();
    readDesired();
  }

  // Firebase: leer configuración
  if (firebaseReady && millis() - lastConfigRead >= CONFIG_READ_MS) {
    lastConfigRead = millis();
    readConfig();
  }

  // Firebase: publicar estado
  if (firebaseReady && millis() - lastFirebasePublish >= FIREBASE_PUBLISH_MS) {
    lastFirebasePublish = millis();
    publishReported();

    publishCount++;
    if (publishCount >= 6) { // Historial cada ~30s
      publishCount = 0;
      publishHistory();
    }
  }

  // Reconectar Firebase
  if (!firebaseReady && WiFi.status() == WL_CONNECTED
      && millis() - lastConfigRead > 30000) {
    setupFirebase();
    if (firebaseReady) {
      readConfig();
      lastConfigRead = millis();
    }
  }

  yield();
}
