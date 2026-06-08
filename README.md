# TANK·CTRL — Dashboard de control de tanques

Dashboard web para **monitorear y controlar a distancia** uno o varios tanques de agua,
según `especificacion-app-web-tanque.md`. Estética de **sala de control / SCADA**: fondo oscuro,
instrumentos, lecturas en monoespaciado y acentos técnicos en cian.

> El dispositivo (ESP32) es una **caja negra**: la app solo habla con Firebase respetando el
> contrato de datos (escribe `config/` y `desired/`, lee `reported/`, `alerts/`, `events/`, `history/`).

## Características (v1)

- **Multi-tanque**: flota con estado resumido + dashboard individual.
- **Monitoreo en vivo**: medidor de nivel animado con umbrales ON/OFF, distancia del sensor,
  estado de actuadores, cisterna, salud del sensor y conexión online/offline.
- **Control remoto**: conmutador Auto/Manual y encendido/apagado por actuador con el flujo
  `desired → reported` (estado "enviando…" y "sin confirmación" por timeout).
- **Configuración**: umbrales `startPct`/`stopPct` con validación, selección de actuadores y
  **mapeo a canales de un módulo de relés** (ej. tira de 8 canales), estrategia con dos actuadores.
- **Gestión de tanques** (admin): alta/baja de tanques; cada uno se reconoce por su `tankId`.
- **Paro de emergencia**: corta todos los actuadores de inmediato (1 toque) y bloquea los
  controles hasta reanudar (con confirmación). Se persiste en `config/emergencyStop`.
- **Mantenimiento programado**: calendario mensual + lista de actividades; durante una ventana
  activa se **suspende automáticamente el llenado automático**. Se persiste en `config/maintenance`.
- **Alertas** activas diferenciadas por severidad (`DRY_RUN`, `OVERFLOW`, `SENSOR_FAULT`, …).
- **Histórico**: gráfica de nivel (SVG, sin dependencias) + bitácora de eventos
  (incluye paros y mantenimientos).
- **Roles**: `admin`, `operador`, `lectura`.
- **Responsive**, en español (Guatemala), tiempo real por listeners.

## Modo demo vs Firebase real

La app detecta automáticamente la fuente de datos:

| | Sin variables de entorno | Con variables de Firebase |
|---|---|---|
| Datos | **Modo demo**: un "dispositivo" simulado vive en el navegador (física de llenado, lógica auto/manual, protecciones, alertas e histórico). Persiste en `localStorage`. | **Firebase Realtime Database** en tiempo real. |
| Auth | Login simulado (cualquier correo, rol admin). | **Firebase Authentication** + rol desde `/users/{uid}`. |

Así puedes ver el dashboard funcionando **hoy, sin configurar nada**.

## Arrancar en local

```bash
npm install
npm run dev
# http://localhost:3000  → entra como "operador demo"
```

## Conectar Firebase real

1. Copia `.env.local.example` a `.env.local` y completa las variables `NEXT_PUBLIC_FIREBASE_*`.
2. Publica las reglas de seguridad (`firebase.rules.json`) **antes** de exponer la app.
3. Crea en `/users/{uid}` el perfil de cada usuario: `{ role, tanks: { <tankId>: true } }`.
4. `npm run dev` (o despliega en Vercel) — la app pasa sola a modo Firebase.

## Despliegue en Vercel

- Conecta el repositorio, framework **Next.js** (auto-detectado).
- Configura las variables `NEXT_PUBLIC_FIREBASE_*` en *Environment Variables*.
- Publica las reglas de Firebase antes de exponer la URL.

## Estructura

```
src/
  app/
    login/                     acceso (SCADA)
    page.tsx                   flota de tanques (multi-tanque)
    tank/[tankId]/             dashboard (monitoreo + control)
    tank/[tankId]/config/      umbrales, actuadores, canales de relé
    tank/[tankId]/history/     histórico + bitácora
    tank/[tankId]/maintenance/ calendario y mantenimientos programados
    settings/tanks/            alta/baja de tanques (admin)
  components/                  UI (medidor, controles, gráfica, chrome)
  lib/
    types.ts                   contrato de datos
    firebase.ts                init (null si no hay credenciales)
    auth.tsx                   sesión demo / Firebase Auth
    data/                      capa de datos (demo | firebase) intercambiable
    hooks.ts                   suscripciones en tiempo real
```

## Extensión del contrato

La app es dueña de `config/`, así que el ESP32 lee como parte de su configuración los siguientes
campos añadidos (no alteran el resto del contrato):

- `config/actuators.{pump|valve}.relayChannel` — número de canal en el módulo de relés.
- `config/emergencyStop` — `true` mientras el paro de emergencia está activo (bloquea actuadores).
- `config/maintenance/{id}` — ventanas de mantenimiento `{ title, startTs, endTs, disableAuto, … }`.
  El dispositivo debe suspender el llenado automático mientras `now ∈ [startTs, endTs)` y
  `disableAuto === true`.
