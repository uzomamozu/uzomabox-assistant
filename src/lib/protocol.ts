/**
 * Lógica pura del protocolo v1 y de la UI de configuración:
 * validadores, parseo/construcción de CSV y matemática de universos.
 * Sin dependencias de React ni de Tauri (testeable con vitest).
 */

export const LED_WIDTH_MIN = 1;
/** 170 px por universo × 6 universos; el firmware pierde píxeles por encima. */
export const LED_WIDTH_MAX = 1020;

export const START_UNIVERSE_MIN = 0;
export const START_UNIVERSE_MAX = 255;

export const COLOR_ORDERS = ['RGB', 'GRB', 'BGR', 'RBG', 'GBR', 'BRG'] as const;
export type ColorOrder = (typeof COLOR_ORDERS)[number];

export const TEST_PATTERN_MIN = 0;
export const TEST_PATTERN_MAX = 4;
/** Índice de salida que significa "todas" en COMMAND:TEST_OUTPUT. */
export const TEST_OUTPUT_ALL = 255;

export const OUTPUT_ROWS = 16;
export const DMX_CHANNELS_PER_UNIVERSE = 512;
export const CHANNELS_PER_PIXEL = 3;
export const UNIVERSES_PER_SUBNET = 16;

/** IPv4 estricta: cuatro octetos decimales 0..255. */
export function isValidIpv4(ip: string): boolean {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    if (p.length > 1 && p.startsWith('0')) return false; // sin ceros a la izquierda
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

/** MAC en formato AA:BB:CC:DD:EE:FF (mayúsculas o minúsculas). */
export function isValidMac(mac: string): boolean {
  return /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac.trim());
}

/** LEDs por tira: entero en 1..1020. */
export function isValidLedWidth(n: number): boolean {
  return Number.isInteger(n) && n >= LED_WIDTH_MIN && n <= LED_WIDTH_MAX;
}

/** Universo inicial por salida: entero en 0..255. */
export function isValidStartUniverse(n: number): boolean {
  return Number.isInteger(n) && n >= START_UNIVERSE_MIN && n <= START_UNIVERSE_MAX;
}

/** Parsea un CSV de exactamente `expected` enteros. Devuelve null si no cuadra. */
export function parseCsv(csv: string, expected: number): number[] | null {
  const parts = csv.trim().split(',');
  if (parts.length !== expected) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n))) return null;
  return nums;
}

export function toCsv(nums: number[]): string {
  return nums.join(',');
}

/** Canales DMX que ocupa una tira de `ledWidth` píxeles (3 canales/px). */
export function stripChannels(ledWidth: number): number {
  return ledWidth * CHANNELS_PER_PIXEL;
}

/** Universos que abarca una tira: ceil(canales / 512). */
export function universesPerStrip(ledWidth: number): number {
  return Math.ceil(stripChannels(ledWidth) / DMX_CHANNELS_PER_UNIVERSE);
}

/** Dirección Art-Net subnet:universe de un universo absoluto (net = 0). */
export function subnetUniverse(universe: number): string {
  return `${Math.floor(universe / UNIVERSES_PER_SUBNET)}:${universe % UNIVERSES_PER_SUBNET}`;
}

export interface OutputRow {
  /** 1-based, para mostrar en la tabla. */
  output: number;
  active: boolean;
  startUniverse: number;
  /** Último universo que cubre la tira (start + universos - 1). */
  endUniverse: number;
  /** Último canal DMX usado dentro del último universo (1..512). */
  endChannel: number;
  /** Dirección Art-Net del universo inicial de la salida. */
  subnetUniverse: string;
}

/** Fila calculada de la tabla de salidas. `index` es 0-based. */
export function computeOutputRow(
  index: number,
  active: boolean,
  startUniverse: number,
  ledWidth: number,
): OutputRow {
  const channels = stripChannels(ledWidth);
  return {
    output: index + 1,
    active,
    startUniverse,
    endUniverse: startUniverse + universesPerStrip(ledWidth) - 1,
    endChannel: ((channels - 1) % DMX_CHANNELS_PER_UNIVERSE) + 1,
    subnetUniverse: subnetUniverse(startUniverse),
  };
}

/** Construye las 16 filas a partir de los CSV de STATUS. */
export function buildOutputRows(
  outputActive: number[],
  startUniverse: number[],
  ledWidth: number,
): OutputRow[] {
  return Array.from({ length: OUTPUT_ROWS }, (_, i) =>
    computeOutputRow(i, outputActive[i] === 1, startUniverse[i] ?? 0, ledWidth),
  );
}

/** Clamp del selector de salida de test: nunca enviar un índice >= outputCount
 *  (bug de desbordamiento del firmware v1). */
export function clampTestOutput(index: number, outputCount: number): number {
  if (index === TEST_OUTPUT_ALL) return TEST_OUTPUT_ALL;
  const maxIndex = Math.max(0, outputCount - 1);
  return Math.min(Math.max(0, index), maxIndex);
}
