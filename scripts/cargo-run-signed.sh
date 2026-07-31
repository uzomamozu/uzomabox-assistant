#!/bin/bash
# Runner de cargo (configurado en src-tauri/.cargo/config.toml).
# Firma ad-hoc el binario recién enlazado ANTES de ejecutarlo, para que el
# Application Firewall de macOS —cuya regla está ligada al identificador
# estable `dev.uzomabox.assistant`— permita su tráfico entrante. Así la app
# siempre arranca firmada aunque `cargo run`/`tauri dev` recompile.
set -e
BIN="$1"
shift
case "$(basename "$BIN")" in
  uzomabox* | udp_diag*)
    codesign --force --sign - --identifier dev.uzomabox.assistant "$BIN" 2>/dev/null || true
    ;;
esac
exec "$BIN" "$@"
