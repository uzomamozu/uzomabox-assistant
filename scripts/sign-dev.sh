#!/bin/bash
# Firma ad-hoc el binario de desarrollo y verifica la regla del Application
# Firewall de macOS (ALF). Sin firma, ALF descarta silenciosamente los
# datagramas UDP entrantes hacia la app y el discovery no funciona.
#
# Úsalo después de cada recompilación del binario (cargo build / tauri dev).
set -euo pipefail

BIN="$(cd "$(dirname "$0")/.." && pwd)/src-tauri/target/debug/uzomabox-assistant"
IDENTIFIER="dev.uzomabox.assistant"

if [ ! -f "$BIN" ]; then
  echo "error: no existe $BIN (compila primero con: cd src-tauri && cargo build)" >&2
  exit 1
fi

echo "== Firmando $BIN (identificador: $IDENTIFIER)"
codesign --force --sign - --identifier "$IDENTIFIER" "$BIN"

FW=/usr/libexec/ApplicationFirewall/socketfilterfw
if "$FW" --getappblocked "$BIN" 2>/dev/null | grep -qi "permitted"; then
  echo "== Regla del firewall: ya permitido"
else
  echo "== Regla del firewall: agregando (macOS pedirá tu contraseña)"
  osascript -e "do shell script \"$FW --add '$BIN' && $FW --unblockapp '$BIN'\" with administrator privileges"
fi

echo "== Listo. Si la app estaba abierta, reiníciala para que la firma tome efecto."
