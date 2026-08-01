import { useEffect, useState } from 'react';
import { Power } from 'lucide-react';
import { t } from '../../i18n/es';
import { useRebootWatch } from '../../lib/hooks';
import { ipc, isTauri } from '../../lib/ipc';
import {
  buildCsvPreserving,
  COLOR_ORDERS,
  computeOutputRow,
  isValidLedWidth,
  isValidStartUniverse,
  OUTPUT_ROWS,
  parseCsv,
  toCsv,
} from '../../lib/protocol';
import { useAppStore } from '../../store/appStore';
import { ConfirmDialog, Field, Notice, Section, TabShell } from '../controls';

interface RowEdit {
  active: boolean;
  start: string;
}

type ConfirmKind = 'width' | 'restart' | null;

export default function LedsTab({ ip }: { ip: string }) {
  const status = useAppStore((s) => s.status[ip]);

  // --- LEDs por tira y orden de color (sincronizados con STATUS) ---
  const [width, setWidth] = useState(status?.led_width ?? '');
  const [widthDirty, setWidthDirty] = useState(false);
  const [widthError, setWidthError] = useState('');
  const [colorOrder, setColorOrder] = useState(status?.color_order ?? 'RGB');
  const [colorDirty, setColorDirty] = useState(false);

  useEffect(() => {
    if (!widthDirty && status?.led_width !== undefined) setWidth(status.led_width);
  }, [status?.led_width, widthDirty]);
  useEffect(() => {
    if (!colorDirty && status?.color_order !== undefined) setColorOrder(status.color_order);
  }, [status?.color_order, colorDirty]);

  // --- Tabla de salidas (dirty por fila) ---
  const [rows, setRows] = useState<RowEdit[]>(() =>
    Array.from({ length: OUTPUT_ROWS }, () => ({ active: false, start: '0' })),
  );
  const [dirtyRows, setDirtyRows] = useState<Set<number>>(new Set());

  const activeCsv = status?.output_active;
  const startCsv = status?.start_universe;
  useEffect(() => {
    const active = activeCsv ? parseCsv(activeCsv, OUTPUT_ROWS) : null;
    const starts = startCsv ? parseCsv(startCsv, OUTPUT_ROWS) : null;
    if (!active && !starts) return;
    setRows((prev) =>
      prev.map((row, i) =>
        dirtyRows.has(i)
          ? row
          : {
              active: active ? active[i] === 1 : row.active,
              start: starts ? String(starts[i]) : row.start,
            },
      ),
    );
  }, [activeCsv, startCsv, dirtyRows]);

  const [universePending, setUniversePending] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const { rebooting, start } = useRebootWatch(ip);

  const send = (cmd: string) => {
    if (isTauri) void ipc.sendCommand(ip, cmd).catch(() => undefined);
  };

  // La matemática de la tabla usa el ancho editado si es válido (vista previa
  // en vivo); si no, el valor actual del dispositivo.
  const parsedWidth = Number(width);
  const effectiveWidth = isValidLedWidth(parsedWidth)
    ? parsedWidth
    : Number(status?.led_width ?? 170);

  const markRowDirty = (index: number) =>
    setDirtyRows((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });

  const applyWidth = () => {
    if (!isValidLedWidth(parsedWidth)) {
      setWidthError(t.leds.widthInvalid);
      return;
    }
    setWidthError('');
    setConfirm('width');
  };

  const applyColorOrder = () => {
    send(`CONFIG:color_order=${colorOrder}`);
    setColorDirty(false);
  };

  const startValues = rows.map((r) => Number(r.start));
  // La tabla muestra exactamente output_count filas (fallback 8); los CSV de
  // CONFIG siempre llevan las 16 entradas, conservando las filas ocultas.
  const parsedCount = Number(status?.output_count ?? 8) || 8;
  const outputCount = Math.min(Math.max(parsedCount, 1), OUTPUT_ROWS);
  const visibleRows = rows.slice(0, outputCount);
  const rowsValid = startValues.slice(0, outputCount).every((v) => isValidStartUniverse(v));

  const applyOutputMap = () => {
    if (!rowsValid) return;
    const knownActive = activeCsv ? parseCsv(activeCsv, OUTPUT_ROWS) : null;
    const knownStarts = startCsv ? parseCsv(startCsv, OUTPUT_ROWS) : null;
    const activeValues = buildCsvPreserving(visibleRows.map((r) => (r.active ? 1 : 0)), knownActive);
    const universeValues = buildCsvPreserving(startValues.slice(0, outputCount), knownStarts);
    send(`CONFIG:output_active=${toCsv(activeValues)}`);
    send(`CONFIG:start_universe=${toCsv(universeValues)}`);
    setDirtyRows(new Set());
    setUniversePending(true);
  };

  const handleConfirm = () => {
    if (confirm === 'width') {
      send(`CONFIG:led_width=${parsedWidth}`);
      setWidthDirty(false);
      start();
    } else if (confirm === 'restart') {
      // v1 no tiene REBOOT: reenviar record_fps fuerza el reinicio.
      send(`CONFIG:record_fps=${status?.record_fps ?? '30'}`);
      setUniversePending(false);
      start();
    }
    setConfirm(null);
  };

  return (
    <TabShell ip={ip}>
      {rebooting && <Notice kind="warn">{t.shared.rebooting}</Notice>}

      <Section title={t.leds.strip}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label={t.leds.width} error={widthError || undefined} hint={widthError ? undefined : t.leds.widthHint}>
                <input
                  className={`input w-full font-mono ${widthError ? '!border-danger' : ''}`}
                  inputMode="numeric"
                  value={width}
                  onChange={(e) => {
                    setWidth(e.target.value);
                    setWidthDirty(true);
                    setWidthError('');
                  }}
                />
              </Field>
            </div>
            <button type="button" className="btn btn-primary" onClick={applyWidth} disabled={!widthDirty}>
              {t.shared.apply}
            </button>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label={t.leds.colorOrder}>
                <select
                  className="input w-full"
                  value={colorOrder}
                  onChange={(e) => {
                    setColorOrder(e.target.value);
                    setColorDirty(true);
                  }}
                >
                  {COLOR_ORDERS.map((order) => (
                    <option key={order} value={order}>
                      {order}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <button type="button" className="btn btn-primary" onClick={applyColorOrder} disabled={!colorDirty}>
              {t.shared.apply}
            </button>
          </div>
        </div>
      </Section>

      <Section title={t.leds.outputMap}>
        {universePending && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="grow">
              <Notice kind="warn">{t.leds.universePending}</Notice>
            </div>
            <button type="button" className="btn" onClick={() => setConfirm('restart')}>
              <Power size={15} />
              {t.leds.restartNow}
            </button>
          </div>
        )}
        <div className="overflow-auto scroll-thin">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs text-muted">
                <th className="border-b border-border px-2 py-1.5 font-medium">{t.leds.colOutput}</th>
                <th className="border-b border-border px-2 py-1.5 font-medium">{t.leds.colActive}</th>
                <th className="border-b border-border px-2 py-1.5 font-medium">{t.leds.colStart}</th>
                <th className="border-b border-border px-2 py-1.5 font-medium">{t.leds.colEnd}</th>
                <th className="border-b border-border px-2 py-1.5 font-medium">{t.leds.colEndChannel}</th>
                <th className="border-b border-border px-2 py-1.5 font-medium">{t.leds.colSubnet}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, i) => {
                const startValid = isValidStartUniverse(Number(row.start));
                const calc = computeOutputRow(i, row.active, startValid ? Number(row.start) : 0, effectiveWidth);
                return (
                  <tr key={i} className={`border-b border-border last:border-0 ${row.active ? '' : 'text-muted'}`}>
                    <td className="px-2 py-1 font-mono text-xs">{calc.output}</td>
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--color-accent)]"
                        checked={row.active}
                        onChange={(e) => {
                          markRowDirty(i);
                          setRows((prev) => prev.map((r, j) => (j === i ? { ...r, active: e.target.checked } : r)));
                        }}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        className={`input w-20 px-1.5 py-0.5 font-mono text-xs ${startValid ? '' : '!border-danger'}`}
                        inputMode="numeric"
                        value={row.start}
                        title={startValid ? undefined : t.leds.startInvalid}
                        onChange={(e) => {
                          markRowDirty(i);
                          setRows((prev) => prev.map((r, j) => (j === i ? { ...r, start: e.target.value } : r)));
                        }}
                      />
                    </td>
                    <td className="px-2 py-1 font-mono text-xs">{calc.endUniverse}</td>
                    <td className="px-2 py-1 font-mono text-xs">{calc.endChannel}</td>
                    <td className="px-2 py-1 font-mono text-xs">{calc.subnetUniverse}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={applyOutputMap}
            disabled={dirtyRows.size === 0 || !rowsValid}
          >
            {t.shared.apply}
          </button>
        </div>
      </Section>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'width' ? t.leds.confirmWidthTitle : t.leds.confirmRestartTitle}
        body={confirm === 'width' ? t.leds.confirmWidthBody : t.leds.confirmRestartBody}
        confirmLabel={t.shared.confirm}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </TabShell>
  );
}
