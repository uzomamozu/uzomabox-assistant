import { describe, expect, it } from 'vitest';
import { t as es } from './es';
import { en } from './en';

/** Rutas de clave de un catálogo (los arrays y funciones son hojas). */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value) || typeof value !== 'object' || value === null) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

/** Longitudes de los arrays indexadas por ruta de clave. */
function arrayLengths(value: unknown, prefix = '', out: Record<string, number> = {}): Record<string, number> {
  if (Array.isArray(value)) {
    out[prefix] = value.length;
    return out;
  }
  if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      arrayLengths(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

describe('paridad i18n es/en', () => {
  it('es y en exponen exactamente las mismas claves', () => {
    const esKeys = keyPaths(es).sort();
    const enKeys = keyPaths(en).sort();
    expect(enKeys).toEqual(esKeys);
  });

  it('los arrays de ambos catálogos tienen la misma longitud', () => {
    expect(arrayLengths(en)).toEqual(arrayLengths(es));
  });

  it('no hay cadenas vacías en en', () => {
    const empties = keyPaths(en).filter((path) => {
      const value = path.split('.').reduce<unknown>((acc, key) => {
        if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
        return undefined;
      }, en);
      return typeof value === 'string' && value.trim() === '';
    });
    expect(empties).toEqual([]);
  });
});
