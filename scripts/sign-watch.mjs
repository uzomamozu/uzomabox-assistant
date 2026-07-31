#!/usr/bin/env node
/**
 * Vigila el binario de desarrollo y lo re-firma ad-hoc tras cada recompilación.
 * El Application Firewall de macOS solo honra reglas sobre binarios firmados;
 * la regla está ligada al identificador estable `dev.uzomabox.assistant`, así
 * que basta re-firmar con el mismo identificador después de cada build.
 *
 * Uso: npm run sign:watch   (dejar corriendo en una terminal durante el desarrollo)
 */
import { execFile } from 'node:child_process';
import { existsSync, statSync, watch } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src-tauri',
  'target',
  'debug',
  'uzomabox-assistant',
);
const IDENTIFIER = 'dev.uzomabox.assistant';

let timer = null;
let lastMtime = 0;

function sign() {
  execFile('codesign', ['--force', '--sign', '-', '--identifier', IDENTIFIER, BIN], (err) => {
    if (err) {
      console.error(`[sign-watch] error al firmar: ${err.message}`);
    } else {
      console.log(`[sign-watch] firmado (${IDENTIFIER}) — ${new Date().toLocaleTimeString()}`);
    }
  });
}

function check() {
  let mtimeMs;
  try {
    ({ mtimeMs } = statSync(BIN));
  } catch {
    return; // el binario aún no existe
  }
  if (mtimeMs === lastMtime) return;
  lastMtime = mtimeMs;
  clearTimeout(timer);
  timer = setTimeout(sign, 600); // esperar a que el linker termine de escribir
}

watch(dirname(BIN), check);
setInterval(check, 1000); // respaldo por si se pierde algún evento del watcher
console.log(`[sign-watch] vigilando ${BIN}`);
if (existsSync(BIN)) check();
