import { describe, expect, it } from 'vitest';
import {
  buildOutputRows,
  clampTestOutput,
  computeOutputRow,
  isValidIpv4,
  isValidLedWidth,
  isValidMac,
  isValidStartUniverse,
  parseCsv,
  stripChannels,
  subnetUniverse,
  TEST_OUTPUT_ALL,
  toCsv,
  universesPerStrip,
} from './protocol';

describe('isValidIpv4', () => {
  it('acepta IPv4 válidas', () => {
    expect(isValidIpv4('192.168.1.50')).toBe(true);
    expect(isValidIpv4('0.0.0.0')).toBe(true);
    expect(isValidIpv4('255.255.255.255')).toBe(true);
    expect(isValidIpv4('10.0.0.99')).toBe(true);
  });
  it('rechaza valores inválidos', () => {
    expect(isValidIpv4('256.1.1.1')).toBe(false);
    expect(isValidIpv4('192.168.1')).toBe(false);
    expect(isValidIpv4('192.168.1.1.1')).toBe(false);
    expect(isValidIpv4('192.168.1.x')).toBe(false);
    expect(isValidIpv4('192.168.01.1')).toBe(false); // ceros a la izquierda
    expect(isValidIpv4('')).toBe(false);
    expect(isValidIpv4('...')).toBe(false);
  });
});

describe('isValidMac', () => {
  it('acepta formatos válidos', () => {
    expect(isValidMac('AA:BB:CC:DD:EE:FF')).toBe(true);
    expect(isValidMac('de:ad:be:ef:00:01')).toBe(true);
    expect(isValidMac('00:11:22:33:44:55')).toBe(true);
  });
  it('rechaza formatos inválidos', () => {
    expect(isValidMac('AA-BB-CC-DD-EE-FF')).toBe(false);
    expect(isValidMac('AABBCCDDEEFF')).toBe(false);
    expect(isValidMac('AA:BB:CC:DD:EE')).toBe(false);
    expect(isValidMac('AA:BB:CC:DD:EE:GG')).toBe(false);
    expect(isValidMac('AA:BB:CC:DD:EE:FF:00')).toBe(false);
    expect(isValidMac('')).toBe(false);
  });
});

describe('isValidLedWidth / isValidStartUniverse', () => {
  it('led_width en 1..1020', () => {
    expect(isValidLedWidth(1)).toBe(true);
    expect(isValidLedWidth(1020)).toBe(true);
    expect(isValidLedWidth(0)).toBe(false);
    expect(isValidLedWidth(1021)).toBe(false);
    expect(isValidLedWidth(1.5)).toBe(false);
    expect(isValidLedWidth(NaN)).toBe(false);
  });
  it('start_universe en 0..255', () => {
    expect(isValidStartUniverse(0)).toBe(true);
    expect(isValidStartUniverse(255)).toBe(true);
    expect(isValidStartUniverse(-1)).toBe(false);
    expect(isValidStartUniverse(256)).toBe(false);
  });
});

describe('CSV', () => {
  it('parseCsv valida longitud y enteros', () => {
    expect(parseCsv('1,0,1,0', 4)).toEqual([1, 0, 1, 0]);
    expect(parseCsv('1,0,1', 4)).toBeNull();
    expect(parseCsv('1,0,1,x', 4)).toBeNull();
    expect(parseCsv('1,0,1,1.5', 4)).toBeNull();
    expect(parseCsv('', 4)).toBeNull();
  });
  it('toCsv y parseCsv son inversos', () => {
    const nums = Array.from({ length: 16 }, (_, i) => i * 6);
    expect(parseCsv(toCsv(nums), 16)).toEqual(nums);
  });
});

describe('matemática de universos', () => {
  it('canales y universos por tira', () => {
    expect(stripChannels(170)).toBe(510);
    expect(universesPerStrip(170)).toBe(1); // 510 <= 512
    expect(universesPerStrip(171)).toBe(2); // 513 > 512
    expect(stripChannels(1020)).toBe(3060);
    expect(universesPerStrip(1020)).toBe(6); // el máximo documentado
    expect(universesPerStrip(300)).toBe(2); // 900 canales
  });
  it('computeOutputRow con 170 px (1 universo)', () => {
    const row = computeOutputRow(0, true, 0, 170);
    expect(row).toEqual({
      output: 1,
      active: true,
      startUniverse: 0,
      endUniverse: 0,
      endChannel: 510,
      subnetUniverse: '0:0',
    });
  });
  it('computeOutputRow con 300 px (2 universos)', () => {
    const row = computeOutputRow(2, true, 12, 300);
    expect(row.output).toBe(3);
    expect(row.endUniverse).toBe(13);
    expect(row.endChannel).toBe(388); // (900-1) % 512 + 1
    expect(row.subnetUniverse).toBe('0:12');
  });
  it('computeOutputRow con 1020 px (6 universos, cruza subnet)', () => {
    const row = computeOutputRow(3, true, 18, 1020);
    expect(row.endUniverse).toBe(23);
    expect(row.endChannel).toBe(500); // (3060-1) % 512 + 1
    expect(row.subnetUniverse).toBe('1:2');
  });
  it('subnetUniverse', () => {
    expect(subnetUniverse(0)).toBe('0:0');
    expect(subnetUniverse(15)).toBe('0:15');
    expect(subnetUniverse(16)).toBe('1:0');
    expect(subnetUniverse(255)).toBe('15:15');
  });
  it('buildOutputRows produce 16 filas desde CSV', () => {
    const rows = buildOutputRows(
      [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      Array.from({ length: 16 }, (_, i) => i * 6),
      1020,
    );
    expect(rows).toHaveLength(16);
    expect(rows[7].active).toBe(true);
    expect(rows[8].active).toBe(false);
    expect(rows[1].startUniverse).toBe(6);
    expect(rows[1].endUniverse).toBe(11);
  });
});

describe('clampTestOutput', () => {
  it('nunca supera outputCount - 1 (bug de overflow del firmware)', () => {
    expect(clampTestOutput(7, 8)).toBe(7);
    expect(clampTestOutput(8, 8)).toBe(7);
    expect(clampTestOutput(99, 8)).toBe(7);
    expect(clampTestOutput(0, 8)).toBe(0);
    expect(clampTestOutput(TEST_OUTPUT_ALL, 8)).toBe(255);
    expect(clampTestOutput(5, 0)).toBe(0);
  });
});
