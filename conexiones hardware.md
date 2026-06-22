# Conexiones de Hardware — AquaGuard ESP32

> Placa: **ESP32 DevKit de 30 pines (ESP-WROOM-32)** — la del módulo plateado
> que dice `ESP-WROOM-32` con USB-C.

## Componentes necesarios

| # | Componente | Cantidad |
|---|---|---|
| 1 | ESP32 DevKit 30 pines (ESP-WROOM-32) | 1 |
| 2 | Sensor ultrasónico HC-SR04 | 1 |
| 3 | Sensor de humedad FC-28 / YL-69 | 1 |
| 4 | Módulo de relé (1 u 8 canales) | 1 |
| 5 | Bomba de agua 12V DC | 1 |
| 6 | Fuente de alimentación 12V DC | 1 |
| 7 | Botón pulsador (Paro de emergencia) | 1 |
| 8 | Resistencia 1kΩ | 1 |
| 9 | Resistencia 2kΩ | 1 |
| 10 | LED 5mm (verde, amarillo, azul) | 3 |
| 11 | Resistencia 220Ω–330Ω (una por LED) | 3 |
| 12 | Protoboard o PCB | 1 |
| 13 | Cables dupont (macho-macho, macho-hembra) | ~18 |

> ♻️ **Reutilizar lo ya soldado:** vas a quitar todos los sensores del proyecto
> anterior (memoria SD + sensor de efecto Hall), así que esos cables quedan **libres**
> y los puedes reaprovechar para AquaGuard. Lo único que importa es que cada cable
> llegue al **GPIO correcto** de la tabla de abajo; revisa a dónde va soldado cada
> uno y, si hace falta, resuéldalo al pin que corresponde.

---

## Mapa de pines del ESP32

| Pin en la placa | GPIO | Componente | Función |
|---|---|---|---|
| **VIN (5V)** | — | HC-SR04 VCC, Relé VCC | Salida 5V (desde USB) |
| **3V3** | — | Sensor Humedad VCC | Salida 3.3V regulada |
| **GND** | — | Todos los GND | Tierra común |
| **D5** | GPIO5 | HC-SR04 TRIG | Disparo del pulso ultrasónico |
| **D18** | GPIO18 | HC-SR04 ECHO (con divisor) | Recepción del eco |
| **D23** | GPIO23 | Relé IN1 | Control de la bomba |
| **D19** | GPIO19 | Botón E-STOP | Paro de emergencia |
| **D25** | GPIO25 | LED **verde** | Sistema OK / online |
| **D26** | GPIO26 | LED **amarillo** | Bomba encendida (llenando) |
| **D27** | GPIO27 | LED **azul** | Alerta / paro de emergencia |
| **D34** | GPIO34 | Sensor Humedad AO | Lectura analógica (0–4095) |

> 🔧 **Diferencias clave vs. ESP8266:**
> - El ADC del ESP32 es de **12 bits (0–4095)**, no 10 bits (0–1023). El firmware
>   ya está ajustado (umbral por defecto = 2048).
> - **No existe un pin "A0"**: la lectura analógica entra por un GPIO normal. Usamos
>   el **GPIO34**, que es de *solo entrada* (ADC1) — ideal porque funciona aunque
>   el WiFi esté activo.
> - **Nunca uses los GPIO 6–11**: están cableados a la memoria flash del chip.

---

## Conexión 1 — Sensor Ultrasónico HC-SR04

> ⚠️ **IMPORTANTE:** El pin ECHO del HC-SR04 emite 5V pero el ESP32 solo tolera 3.3V.
> Es **obligatorio** usar un divisor de voltaje con las 2 resistencias.

### Cables

| De | A | Color sugerido |
|---|---|---|
| HC-SR04 **VCC** | ESP32 **VIN** (5V) | Rojo |
| HC-SR04 **GND** | ESP32 **GND** | Negro |
| HC-SR04 **TRIG** | ESP32 **D5** (GPIO5) | Amarillo |
| HC-SR04 **ECHO** | Resistencia 1kΩ → punto medio → ESP32 **D18** | Naranja / Verde |

### Divisor de voltaje en el pin ECHO

```
                        1kΩ
  ECHO (5V) ────[████]────┬──── D18 (GPIO18, ESP32)
                          │
                        [████]  2kΩ
                          │
                         GND
```

**Fórmula:** V_out = 5V × 2kΩ / (1kΩ + 2kΩ) = **3.33V** ✓

### Prueba

En el monitor serial deberías ver:
```
[Sensor] Dist: 76.5cm | Nivel: 14% | ...
```

---

## Conexión 2 — Sensor de Humedad FC-28 / YL-69

> ⚠️ Alimentar a **3V3**, NO a 5V. La salida AO no debe superar 3.3V o dañas el ADC.

El sensor tiene dos partes: las **varillas** (sonda) y el **módulo** (plaquita con chip).

### Cables

| De | A | Color sugerido |
|---|---|---|
| Módulo **VCC** | ESP32 **3V3** | Rojo |
| Módulo **GND** | ESP32 **GND** | Negro |
| Módulo **AO** | ESP32 **D34** (GPIO34) | Azul |

### Prueba

```
[Sensor] ... Hum: 3200 | Cisterna: SECA
```
Al meter las varillas en agua → el valor baja y dice `CON AGUA`.
(Recuerda: en el ESP32 el rango es 0–4095, no 0–1023.)

---

## Conexión 3 — Módulo de Relé (lado de control)

Solo se conecta **1 canal** (IN1) para la bomba. Los demás quedan libres.

### Cables

| De | A | Color sugerido |
|---|---|---|
| Relé **VCC** | ESP32 **VIN** (5V) | Rojo |
| Relé **GND** | ESP32 **GND** | Negro |
| Relé **IN1** | ESP32 **D23** (GPIO23) | Morado |

> ⚠️ Al encender el ESP32, el relé (activo LOW) puede dar un "click" breve antes de
> que el firmware ponga el pin en HIGH. Es normal; la bomba no alcanza a arrancar.

### Prueba

Al activar la bomba desde la app web (modo manual), se escucha un **"click"** en el relé y el LED del canal 1 se enciende.

---

## Conexión 4 — Botón de Paro de Emergencia (E-STOP)

Solo 2 cables. **No necesita resistencia externa** porque el ESP usa su pull-up interno (`INPUT_PULLUP` en el firmware).

### Cables

| De | A | Color sugerido |
|---|---|---|
| Botón **Pin 1** | ESP32 **D19** (GPIO19) | Blanco |
| Botón **Pin 2** | ESP32 **GND** | Negro |

### Cómo funciona

```
  3.3V ──[pull-up interno]──┬── D19 (GPIO19)
                            │
                          BOTÓN
                            │
                           GND

  Botón suelto     → D19 lee HIGH (3.3V) → operación normal
  Botón presionado → D19 lee LOW (GND)   → ¡PARO DE EMERGENCIA!
```

### Prueba

```
[E-STOP] PARO DE EMERGENCIA ACTIVADO!
[Bomba] APAGADA
```

---

## Conexión 5 — Bomba 12V al Relé (lado de potencia)

> ⚠️ **PRECAUCIÓN:** Esta parte involucra la fuente de 12V. Asegurarse de que todo esté
> desconectado antes de cablear los tornillos del relé.

Cada canal del relé tiene 3 terminales de tornillo:
- **COM** = Común (siempre conectado)
- **NO** = Normalmente Abierto (conecta cuando el relé se activa) ← **usar este**
- **NC** = Normalmente Cerrado (no usar)

### Cables

| De | A | Cable |
|---|---|---|
| Fuente 12V **(+)** | Relé **NO₁** (tornillo) | Rojo grueso |
| Relé **COM₁** (tornillo) | Bomba **(+)** | Rojo grueso |
| Bomba **(-)** | Fuente 12V **(-)** | Negro grueso |

### Circuito

```
  Fuente 12V (+) ──→ Relé NO₁ ──→ Relé COM₁ ──→ Bomba (+)
                                                    │
  Fuente 12V (-) ←────────────────────────────── Bomba (-)
```

Cuando el relé se activa: NO y COM se conectan → la bomba recibe 12V → enciende.

> ⚠️ **GND común:** la fuente de 12V y el ESP32 deben compartir GND **solo** si lo
> exige tu módulo de relé. En la mayoría de módulos con optoacoplador NO hace falta
> unir el GND de potencia con el del ESP32, y es más seguro mantenerlos separados.

### Prueba

Conectar la fuente 12V → modo manual desde la app → encender bomba → la bomba arranca.

---

## Conexión 6 — LEDs indicadores (verde, amarillo, azul)

Tres LEDs muestran el estado del sistema de un vistazo:

| LED | Pin | Significado |
|---|---|---|
| 🟢 **Verde** | **D25** (GPIO25) | Sistema OK y online (WiFi + Firebase, sin alertas) |
| 🟡 **Amarillo** | **D26** (GPIO26) | Bomba encendida (llenando el tanque) |
| 🔵 **Azul** | **D27** (GPIO27) | Alerta: paro de emergencia, marcha en seco, desbordamiento o sensor fallido |

### Cómo conectar cada LED

Cada LED necesita **una resistencia de 220Ω–330Ω** en serie para no quemarse:

```
  GPIO ──[220Ω]──►|── GND
                  LED
              (pata larga = ánodo +
               va hacia la resistencia/GPIO;
               pata corta = cátodo - va a GND)
```

| De | A | Color |
|---|---|---|
| ESP32 **D25** → resistencia → LED **verde (+)** | LED verde **(-)** → **GND** | Verde |
| ESP32 **D26** → resistencia → LED **amarillo (+)** | LED amarillo **(-)** → **GND** | Amarillo |
| ESP32 **D27** → resistencia → LED **azul (+)** | LED azul **(-)** → **GND** | Azul |

> 💡 Truco: las 3 patas cortas (cátodos) pueden ir juntas a un mismo riel de **GND**
> de la protoboard. Encienden con HIGH (el firmware ya los maneja como activo-ALTO).

### Prueba

Al arrancar y conectar a Firebase → se enciende el **verde**.
Al activar la bomba → se enciende el **amarillo**.
Al presionar el E-STOP o quedarse la cisterna sin agua → se enciende el **azul** y se apaga el verde.

---

## Resumen de todas las conexiones

```
  ESP32 DevKit            Componente
  ────────────────        ──────────────────────────
  VIN (5V)           →    HC-SR04 VCC
                     →    Relé VCC
  3V3 (3.3V)         →    Sensor Humedad VCC
  GND                →    HC-SR04 GND
                     →    Sensor Humedad GND
                     →    Relé GND
                     →    Divisor voltaje (extremo 2kΩ)
                     →    Botón E-STOP Pin 2
                     →    Cátodo (-) de los 3 LEDs
  D5  (GPIO5)        →    HC-SR04 TRIG
  D18 (GPIO18)       →    Divisor voltaje (punto medio) ← ECHO
  D23 (GPIO23)       →    Relé IN1
  D19 (GPIO19)       →    Botón E-STOP Pin 1
  D25 (GPIO25)       →    Resistencia → LED verde (+)
  D26 (GPIO26)       →    Resistencia → LED amarillo (+)
  D27 (GPIO27)       →    Resistencia → LED azul (+)
  D34 (GPIO34)       →    Sensor Humedad AO
```

### Total de materiales de conexión

| Cantidad | Descripción |
|---|---|
| 4 cables + 2 resistencias | HC-SR04 + divisor de voltaje |
| 3 cables | Sensor de humedad |
| 3 cables | Módulo de relé (control) |
| 2 cables | Botón E-STOP |
| 3 LEDs + 3 resistencias (220-330Ω) | LEDs verde / amarillo / azul |
| 3 cables | Bomba + fuente 12V (potencia) |
| **15 cables + 3 LEDs + 5 resistencias** | **Total** |

---

## Nota — Cables que liberas al quitar la SD y el sensor Hall

Vas a retirar todos los sensores del proyecto anterior (memoria SD + sensor de efecto
Hall), así que esos cables quedan **libres**. Reaprovéchalos sin problema: lo único
que importa es que cada cable termine en el **GPIO correcto** de las tablas de arriba.

Pasos recomendados para reutilizarlos:
1. Identifica a qué GPIO va soldado cada cable que liberaste (sigue el cable desde el
   pin del ESP32).
2. Si un cable ya cae justo en el pin que necesitas (p. ej. uno que iba a GPIO23 y lo
   quieres para el relé), reúsalo tal cual.
3. Si cae en un pin que **no** uso, resuéldalo (o muévelo con un dupont) al GPIO que
   corresponda según el mapa de pines.

> Si más adelante quieres **volver a usar la memoria SD** para guardar el historial de
> nivel localmente (respaldo si se cae el WiFi), o el **caudalímetro Hall (YF-S201)**
> para medir el flujo de agua que entra al tanque, dímelo: la SD usa el bus SPI
> (`CS=GPIO5, SCK=GPIO18, MOSI=GPIO23, MISO=GPIO19`) que chocaría con los pines
> actuales, así que tendría que darte un mapa de pines alternativo y ampliar el firmware.
