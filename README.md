# UzomaBox Assistant

Aplicación de escritorio (Tauri 2 + React 18 + TypeScript) para descubrir y configurar controladores LED Art-Net **UzomaBox** (Teensy 4.1) por TCP/UDP. Interfaz inspirada en Advatek PixLite Assistant.

> **Esta es la reescritura desde cero (v2) del proyecto [uzoma_box](https://github.com/uzomamozu/uzoma_box)** — la app de escritorio ahora es standalone (Tauri + Rust + React, sin Python). Roadmap: **Fase 1** (este repo, v1.0.0/M1) app de escritorio completa contra el firmware actual; **Fase 2** reescritura del firmware (PlatformIO) con protocolo v2 y salida DMX512.

![UzomaBox Assistant](docs/screenshot-m1.png)

## Requisitos

- Node.js 20+ y npm 9+
- Rust stable (vía rustup). Cargo no está en el `PATH` por defecto: hay que hacer `source $HOME/.cargo/env` en cada terminal antes de usar comandos de Rust.
- Xcode Command Line Tools (macOS)

## Puesta en marcha

```bash
npm install

# Terminal 1 — simulador de dispositivo (UDP 7777 + TCP 8888, protocolo v1 completo)
npm run sim

# Terminal 2 — aplicación de escritorio en modo desarrollo
source $HOME/.cargo/env
npm run tauri dev
```

### Firewall de macOS (OBLIGATORIO para que el discovery funcione)

El Application Firewall de macOS **descarta silenciosamente los datagramas UDP entrantes hacia binarios sin firma**: la app envía `UZOMA:SEARCH` pero nunca ve las respuestas (la tabla queda vacía). Además, ALF no honra reglas sobre binarios sin firmar, así que el binario debe estar **firmado** (basta firma ad-hoc) y tener su regla de firewall.

Esto ya está **automatizado**, no requiere pasos manuales:

- `src-tauri/.cargo/config.toml` registra un *runner* de cargo (`scripts/cargo-run-signed.sh`) que **firma el binario justo antes de ejecutarlo** en cada `cargo run`/`cargo test` — es decir, `npm run tauri dev` siempre arranca la app firmada, aunque recompile.
- La firma usa el identificador estable `dev.uzomabox.assistant`, así que la regla de firewall (creada una sola vez por `scripts/sign-dev.sh`, que pide tu contraseña) sigue valiendo entre recompilaciones.
- Si alguna vez ejecutas el binario directamente sin cargo, corre `npm run sign:dev` antes.
- Diagnóstico: `src-tauri/src/bin/udp_diag.rs` prueba ida y vuelta UDP; el test `cargo test -- --ignored collects_simulator_replies` valida el discovery contra el simulador (requiere estar en la misma subred). En producción esto no aplica: la `.app` firmada con Developer ID (M4) no necesita nada de esto.

**Nota de red**: el discovery es por broadcast — la Mac y el dispositivo deben estar en la **misma subred** (p. ej. el UzomaBox físico en `192.168.1.211` solo aparece cuando la Mac está en `192.168.1.x`). Si cambias de red, pulsa «Actualizar adaptadores» o reinicia la app.

Otros scripts:

- `npm run dev` — solo el frontend (Vite, <http://localhost:5173>), con datos de demostración si no hay backend Tauri.
- `npm run build` — typecheck (tsc) + build de producción del frontend.
- `npm run sim` — simulador UzomaBox sin dependencias (`simulator/uzomabox-sim.mjs`).

## Estructura del proyecto

```
uzomabox-assistant/
├── horz.png / vert.png        # Logos originales (no modificar; se copian a src/assets)
├── package.json               # Scripts: dev, build, tauri, sim
├── index.html                 # Entrada Vite (título: UzomaBox Assistant)
├── vite.config.ts / tsconfig.json / tailwind.config.js / postcss.config.js
├── simulator/
│   └── uzomabox-sim.mjs       # Simulador del dispositivo (protocolo v1 completo)
├── scripts/
│   └── sign-dev.sh            # Firma ad-hoc del binario dev + regla de firewall (tras cada recompilación)
├── src/
│   ├── main.tsx / App.tsx     # Entrada React y conmutación de vistas
│   ├── index.css              # Temas (variables CSS + data-theme) y clases base
│   ├── assets/                # Copias de los logos usadas por la app
│   ├── i18n/es.ts             # Todas las cadenas de UI (ES; EN llega en M2)
│   ├── store/appStore.ts      # Estado global (Zustand): dispositivos, conexiones, tema
│   ├── lib/
│   │   ├── ipc.ts             # Wrappers de comandos Tauri + suscripción a eventos
│   │   └── actions.ts         # Acciones de UI (descubrir, agregar IP, identificar…)
│   └── components/
│       ├── Header.tsx         # Logo horizontal, selector de tema (3 paletas), Ayuda/Acerca de
│       ├── MainView.tsx       # Vista principal (toolbar + tabla)
│       ├── Toolbar.tsx        # Buscar controladores, adaptador, actualizar, agregar por IP
│       ├── DeviceTable.tsx    # Tabla ordenable + menú contextual
│       ├── ContextMenu.tsx    # Menú contextual genérico
│       ├── StatusBar.tsx      # Barra de estado inferior
│       ├── AboutDialog.tsx    # Diálogo Acerca de (logo vertical)
│       ├── HelpDialog.tsx     # Diálogo de ayuda
│       ├── DeviceView.tsx     # Vista de dispositivo + tira de pestañas
│       └── tabs/
│           ├── StatusTab.tsx  # Pestaña Estado: grid STATUS, Identify, consola TX/RX
│           └── PlaceholderTab.tsx  # Marcador M2/M3 para el resto de pestañas
└── src-tauri/
    ├── Cargo.toml / tauri.conf.json / build.rs
    ├── capabilities/default.json  # Permisos Tauri 2: core + bus de eventos (sin esto listen() es rechazado y la app queda muda)
    ├── icons/icon.png
    └── src/
        ├── main.rs            # Comandos Tauri + ciclo de vida de la app
        ├── protocol.rs        # Protocolo de líneas v1 (encode/decode + tests)
        ├── discovery.rs       # Descubrimiento UDP 7777 (broadcast UZOMA:SEARCH)
        ├── connection.rs      # Worker TCP persistente por dispositivo (reconexión, PING, STATUS)
        └── events.rs          # Payloads de eventos hacia el frontend
```

## Notas de arquitectura

- **Cero E/S de red en el hilo de UI**: todos los sockets viven en Rust (tokio). El frontend solo invoca comandos (`list_adapters`, `discover`, `add_manual_device`, `connect`, `disconnect`, `send_command`, `identify`) y se suscribe a eventos (`device_found`, `discovery_status`, `connection_state`, `latency`, `status_update`, `log_line`).
- El firmware solo admite **un cliente TCP** a la vez: el worker cierra el socket limpiamente al desconectar, cambiar de vista o cerrar la app.
- **Temas**: tres paletas oscuras conmutables al instante desde la barra superior (`electric-cyan` por defecto, `uzoma-red`, `amber-stage`), persistidas en `localStorage` vía variables CSS y `data-theme`.
- **wry vendorizado** (`src-tauri/vendor/wry` + `[patch.crates-io]` en `Cargo.toml`): wry 0.55.1 con el parche de [tauri-apps/wry#1744](https://github.com/tauri-apps/wry/pull/1744) — sin él, la app abortaba (`panic_cannot_unwind` en `url_scheme_handler::start_task`) cuando WebKit entregaba una petición de esquema con URL/método/header nil, típicamente al abrir la vista de dispositivo. Quitar cuando una release oficial de wry incluya el fix.
