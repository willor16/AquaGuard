# AquaGuard — Firmware ESP32

Firmware para el control automático de llenado de tanques de agua con ESP32, integrado con Firebase Realtime Database y el dashboard web AquaGuard.

## 📋 Requisitos

### Hardware
| Componente | Modelo | Cantidad |
|---|---|---|
| Microcontrolador | ESP32 DevKit 30 pines (ESP-WROOM-32) | 1 |
| Sensor ultrasónico | HC-SR04 | 1 |
| Sensor de humedad | FC-28 / YL-69 (varillas) | 1 |
| Módulo de relé | 8 canales, activo LOW | 1 |
| Bomba de agua | 12V DC | 1 |
| Fuente de alimentación | 5V / 2A (para ESP + sensores) | 1 |
| Fuente de alimentación | 12V (para bomba) | 1 |
| Resistencia | 1kΩ (divisor de voltaje) | 1 |
| Resistencia | 2kΩ (divisor de voltaje) | 1 |
| Botón pulsador | Para E-STOP | 1 |
| Cables jumper | Variados | ~20 |
| Protoboard | — | 1 |

### Software
- [VS Code](https://code.visualstudio.com/) con la extensión **PlatformIO IDE**
- PlatformIO descarga automáticamente el toolchain de ESP32 y las librerías

## 🔧 Instalación

### 1. Abrir el proyecto en VS Code

```bash
code esp32-aquaguard/
```

PlatformIO detecta automáticamente el `platformio.ini` y configura todo.

### 2. Configurar credenciales

Editar el archivo `include/config.h`:

```cpp
// WiFi
#define WIFI_SSID     "Tu papi"
#define WIFI_PASSWORD "sipapisi"

// Firebase (obtener de Firebase Console)
#define FIREBASE_API_KEY     "tu-api-key-aquí"
#define FIREBASE_DB_URL      "https://tu-proyecto.firebaseio.com"
#define DEVICE_EMAIL         "device-tanque1@aquaguard.local"
#define DEVICE_PASSWORD      "contraseña-segura"

// ID del tanque (debe coincidir con la app web)
#define TANK_ID              "tanque-uno"
```

### 3. Configurar Firebase

#### a) Crear proyecto (si no existe)
1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Crear proyecto o usar el existente de AquaGuard

#### b) Activar Realtime Database
1. En Firebase Console → **Build → Realtime Database**
2. Crear base de datos (modo de prueba inicialmente)

#### c) Activar Authentication
1. En Firebase Console → **Build → Authentication**
2. Ir a **Sign-in method** → Habilitar **Email/Password**

#### d) Crear usuario para el dispositivo
1. En **Authentication → Users** → **Add user**
2. Email: `device-tanque1@aquaguard.local`
3. Contraseña: (algo seguro)
4. Anotar el **UID** generado

#### e) Crear perfil del dispositivo en la DB
En **Realtime Database**, crear manualmente:
```json
{
  "users": {
    "UID_DEL_DISPOSITIVO": {
      "role": "device",
      "tanks": {
        "tanque-uno": true
      }
    }
  }
}
```

#### f) Actualizar reglas de seguridad
Publicar el archivo `firebase.rules.json` actualizado (en la raíz del proyecto) que permite al rol `device` escribir en `reported/`, `alerts/`, `events/` y `history/`.

### 4. Compilar y subir el firmware

**Desde terminal:**
```bash
cd esp32-aquaguard/

# Solo compilar (verificar que no hay errores)
pio run

# Compilar y subir al ESP32
pio run -t upload

# Abrir monitor serial (ver logs del ESP)
pio device monitor

# Todo junto: compilar, subir y monitorear
pio run -t upload && pio device monitor
```

**Desde VS Code:**
- Clic en el ícono de **✓** (Build) en la barra inferior
- Clic en el ícono de **→** (Upload) para subir
- Clic en el ícono de **🔌** (Serial Monitor) para monitorear

### 5. Verificar

1. El monitor serial (115200 baud) debería mostrar:
   ```
   ════════════════════════════════════════
     AquaGuard — Firmware ESP32 v1.0
   ════════════════════════════════════════
     Tanque: tanque-uno

   [Hardware] Pines configurados ✓
   [WiFi] Conectando a "Tu papi"......... ✓ Conectado! IP: 192.168.1.xxx
   [NTP] Sincronizando hora... ✓
   [Sistema] CPU a 240MHz ✓
   [Firebase] Inicializando...
   [Firebase] ✓ Autenticado!
   [Sensor] Distancia: 76.5 cm | Nivel: 14% | Humedad RAW: 3100 | Cisterna: CON AGUA
   ```
2. En Firebase Console → Realtime Database, verificar que `tanks/tanque-uno/reported/` se actualiza

## 🔌 Conexiones

```
          ESP32 DevKit
        ┌──────────────────┐
        │                  │
  HC-SR04 │  D5  (GPIO5)  ──→ TRIG
        │  D18 (GPIO18) ←── ECHO (con divisor de voltaje)
        │  VIN (5V)    ──→ VCC
        │  GND         ──→ GND
        │                  │
  Relé  │  D23 (GPIO23) ──→ IN1 (canal de la bomba)
        │  VIN (5V)    ──→ VCC
        │  GND         ──→ GND
        │                  │
  Sensor│  D34 (GPIO34) ←── AO (salida analógica)
  Hum.  │  3.3V        ──→ VCC
        │  GND         ──→ GND
        │                  │
  Botón │  D19 (GPIO19) ←── Botón → GND
  ESTOP │                  │
        │                  │
  LEDs  │  D25 (GPIO25) ──→ [220Ω] → LED verde    → GND
        │  D26 (GPIO26) ──→ [220Ω] → LED amarillo → GND
        │  D27 (GPIO27) ──→ [220Ω] → LED azul     → GND
        └──────────────────┘
```

### 💡 LEDs indicadores

| LED | Pin | Significado |
|---|---|---|
| 🟢 Verde | D25 | Sistema OK y online (sin alertas) |
| 🟡 Amarillo | D26 | Bomba encendida (llenando) |
| 🔵 Azul | D27 | Alerta (E-STOP, marcha en seco, desbordamiento o sensor fallido) |

Cada LED lleva una resistencia de **220Ω–330Ω** en serie. Pata larga (+) hacia el GPIO, pata corta (−) a GND.

### ⚠️ Divisor de voltaje para ECHO (OBLIGATORIO)

```
ECHO (5V) ── [1kΩ] ──┬── D18 (GPIO18) del ESP32
                      │
                    [2kΩ]
                      │
                     GND
```

El HC-SR04 envía 5V en ECHO, pero el ESP32 solo soporta 3.3V. Sin el divisor, **puedes quemar el GPIO**.

### Circuito de la bomba (12V)

```
Fuente 12V (+) ──→ Relé COM ──→ Bomba (+)
Bomba (-) ──→ Fuente 12V (-)

El relé actúa como interruptor. El ESP solo controla la bobina del relé.
```

## 📁 Estructura del proyecto

```
esp32-aquaguard/
├── platformio.ini         ← Configuración de PlatformIO (board, librerías)
├── include/
│   └── config.h           ← Credenciales WiFi/Firebase, pines, constantes
├── src/
│   └── main.cpp           ← Firmware principal
└── README.md              ← Este archivo
```

## 🔄 Cómo funciona

### Modo Automático
- Si el nivel baja de `startPct` (ej. 30%) → enciende la bomba
- Si el nivel sube a `stopPct` (ej. 90%) → apaga la bomba
- Entre ambos umbrales → mantiene el estado actual (histéresis)

### Modo Manual
- La app web envía `desired/pumpManual = true/false`
- El ESP lo lee y enciende/apaga la bomba

### Protecciones (siempre activas)
1. **Anti-marcha en seco**: si la cisterna está vacía → bomba OFF + alerta
2. **Anti-desbordamiento**: si nivel ≥ 98% → bomba OFF + alerta
3. **Paro de emergencia**: botón físico o `config/emergencyStop` → todo OFF
4. **Sensor fallido**: alerta si el sensor no da lecturas válidas
5. **WiFi caído**: el ESP sigue operando con la última configuración

## 🐛 Solución de problemas

| Problema | Solución |
|---|---|
| No conecta a WiFi | Verificar SSID y contraseña en `config.h`. El SSID es sensible a mayúsculas. |
| Firebase error de autenticación | Verificar API key, database URL, email y contraseña del dispositivo. |
| Sensor ultrasónico lee -1 | Verificar conexiones TRIG/ECHO. ¿Pusiste el divisor de voltaje en ECHO? |
| Sensor de humedad siempre en 0 o 4095 | Verificar que esté conectado a D34 (GPIO34) y alimentado a 3.3V. Probar sumergir/sacar del agua. |
| Bomba no enciende | Verificar alimentación 12V de la bomba. ¿El relé hace "click"? |
| ESP se reinicia constantemente | Posible brownout. Usar un cable USB bueno y/o agregar capacitor 100µF entre VIN/GND. |
| Error publicando en Firebase | Las reglas de Firebase no permiten escritura. Publicar `firebase.rules.json` actualizado. |
| `pio run` no encuentra el board | Ejecutar `pio platform install espressif32` |
| Error al subir / no detecta el puerto | Mantén presionado el botón **BOOT** del ESP32 al iniciar el upload. Verifica el driver CP210x/CH340. |
