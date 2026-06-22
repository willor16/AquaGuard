// ============================================================
// AquaGuard — Plantilla de configuración del ESP32
// ============================================================
// COPIA este archivo como "config.h" y rellena tus credenciales.
//   cp config.example.h config.h
// El config.h real está en .gitignore (no se sube a GitHub).
// ============================================================

#ifndef CONFIG_H
#define CONFIG_H

// ── WiFi ────────────────────────────────────────────────────
#define WIFI_SSID     "TU_RED_WIFI"        // solo 2.4 GHz
#define WIFI_PASSWORD "TU_CONTRASEÑA_WIFI"

// ── Firebase ────────────────────────────────────────────────
// Obtén estos datos de Firebase Console → Configuración del proyecto.
// La API Key es la misma NEXT_PUBLIC_FIREBASE_API_KEY de la app web.
// El Database URL está en Realtime Database.
// El email/contraseña es de un usuario creado para el dispositivo.
#define FIREBASE_API_KEY     "TU_API_KEY"
#define FIREBASE_DB_URL      "https://TU-PROYECTO-default-rtdb.firebaseio.com"
#define DEVICE_EMAIL         "device-tanque1@aquaguard.local"
#define DEVICE_PASSWORD      "CONTRASEÑA_DEL_DEVICE"

// ── Identificación del tanque ───────────────────────────────
// Debe coincidir con el tankId en Firebase / la app web.
#define TANK_ID              "tanque-uno"

// ── Pines del ESP32 (DevKit 30 pines / ESP-WROOM-32) ────────
//
//  Componente          Pin placa   GPIO    Notas
//  ──────────────────  ─────────   ────    ─────────────────────
//  HC-SR04 TRIG        D21         21      Salida digital
//  HC-SR04 ECHO        D22         22      Entrada (¡divisor de voltaje!)
//  Relé (bomba)        D18         18      Salida, activo LOW
//  Botón E-STOP        D5          5       Entrada, pull-up interno (strapping)
//  LED verde           D25         25      Sistema OK / online
//  LED amarillo        D26         26      Bomba encendida (llenando)
//  LED azul            D27         27      Alerta / paro de emergencia
//  Sensor humedad      D34         34      Entrada analógica ADC1 (0-4095)
//
//  Nota: en el ESP32 NO uses los GPIO 6-11 (van a la flash interna).
//  Los GPIO 34-39 son SOLO entrada: sirven para el ADC del sensor, pero
//  NO pueden manejar un LED ni un relé (no tienen salida).
//  D5 es strapping pin: no presiones el botón E-STOP durante el arranque.
//
#define PIN_TRIG        21   // D21
#define PIN_ECHO        22   // D22
#define PIN_RELAY       18   // D18
#define PIN_ESTOP       5    // D5
#define PIN_LED_GREEN   25   // D25 — sistema OK / online
#define PIN_LED_YELLOW  26   // D26 — bomba encendida (llenando)
#define PIN_LED_BLUE    27   // D27 — alerta / paro de emergencia
#define PIN_MOISTURE    34   // D34 (ADC1, solo entrada) — analogRead()

// ── LEDs indicadores ────────────────────────────────────────
// LEDs externos: GPIO → resistencia 220-330Ω → ánodo (+) del LED,
// cátodo (-) del LED → GND. Encienden con HIGH (activo ALTO).
#define LED_ON   HIGH
#define LED_OFF  LOW

// ── Relé ────────────────────────────────────────────────────
// true = el relé se activa con LOW (común en módulos de 8 canales)
#define RELAY_ACTIVE_LOW  true

// ── Intervalos de tiempo (milisegundos) ─────────────────────
#define SENSOR_READ_MS        2000   // Leer sensores cada 2s
#define FIREBASE_PUBLISH_MS   5000   // Publicar reported/ cada 5s
#define DESIRED_READ_MS       3000   // Leer desired/ cada 3s
#define CONFIG_READ_MS        30000  // Leer config/ cada 30s
#define WIFI_CHECK_MS         10000  // Verificar WiFi cada 10s
#define WIFI_RESTART_TIMEOUT  300000 // Reiniciar ESP si WiFi falla 5 min

// ── Sensor ultrasónico ──────────────────────────────────────
#define MEDIAN_SAMPLES        5      // Muestras para filtro de mediana
#define US_TIMEOUT_US         30000  // Timeout del pulseIn (30ms ≈ ~5m)
#define US_MIN_DISTANCE_CM    2.0    // Distancia mínima válida
#define US_MAX_DISTANCE_CM    400.0  // Distancia máxima válida
#define US_DELAY_MS           60     // Pausa entre mediciones

// ── Calibración por defecto (se sobreescribe con config/ de Firebase) ──
#define DEFAULT_EMPTY_DIST_CM   200.0  // Distancia con tanque vacío
#define DEFAULT_FULL_DIST_CM    3.0    // Distancia con tanque lleno
#define DEFAULT_MOISTURE_THRESH 2048   // Punto medio del ADC 0-4095

// ── Umbrales por defecto ────────────────────────────────────
#define DEFAULT_START_PCT     30     // Encender bomba al bajar de este %
#define DEFAULT_STOP_PCT      90     // Apagar bomba al alcanzar este %
#define OVERFLOW_PCT          98.0   // Protección anti-desbordamiento

// ── Salud del sensor ────────────────────────────────────────
#define HEALTH_WINDOW         20     // Ventana de muestras para estadísticas
#define HEALTH_DEGRADED_RATE  10.0   // % de lecturas inválidas → degradado
#define HEALTH_DEGRADED_NOISE 3.0    // Desviación estándar → degradado

// ── NTP (hora) ──────────────────────────────────────────────
// Guatemala = UTC-6, sin horario de verano
#define NTP_OFFSET_S          (-6 * 3600)
#define NTP_SERVER_1          "pool.ntp.org"
#define NTP_SERVER_2          "time.nist.gov"

// ── Debounce botón E-STOP ───────────────────────────────────
#define ESTOP_DEBOUNCE_MS     50

#endif // CONFIG_H
