import { useEffect, useRef, useState } from 'react';
import { Circle, Disc, Square } from 'lucide-react';
import { t } from '../../i18n';
import { useRebootWatch, useSyncedValue } from '../../lib/hooks';
import { ipc, isTauri } from '../../lib/ipc';
import { useAppStore } from '../../store/appStore';
import { ConfirmDialog, Field, Notice, Section, TabShell } from '../controls';

function formatElapsed(secs: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${pad(m)}:${pad(s)}`;
}

export default function GrabacionTab({ ip }: { ip: string }) {
  const status = useAppStore((s) => s.status[ip]);

  const send = (cmd: string) => {
    if (isTauri) void ipc.sendCommand(ip, cmd).catch(() => undefined);
  };

  // --- FPS de grabación (CONFIG con reinicio) ---
  const fps = useSyncedValue(status?.record_fps);
  const [fpsError, setFpsError] = useState('');
  const [confirmFps, setConfirmFps] = useState(false);
  const { rebooting, start } = useRebootWatch(ip);

  const applyFps = () => {
    const n = Number((fps.value ?? '').trim());
    if (!Number.isInteger(n) || n < 5 || n > 60) {
      setFpsError(t.grabacion.fpsInvalid);
      return;
    }
    setFpsError('');
    setConfirmFps(true);
  };

  // --- Triggers (volátiles en v1: no legibles, estado local con envío inmediato) ---
  const [startMode, setStartMode] = useState(0);
  const [trigUniv, setTrigUniv] = useState('0');
  const [trigCh, setTrigCh] = useState('0');
  const [stopMode, setStopMode] = useState(0);
  const [stopSecs, setStopSecs] = useState('30');
  const trigTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(trigTimer.current), []);

  const sendDebounced = (cmd: string) => {
    window.clearTimeout(trigTimer.current);
    trigTimer.current = window.setTimeout(() => send(cmd), 400);
  };

  const changeUniv = (value: string) => {
    setTrigUniv(value);
    const n = Number(value);
    if (Number.isInteger(n) && n >= 0 && n <= 255) sendDebounced(`REC:TRIGGER_UNIV=${n}`);
  };
  const changeCh = (value: string) => {
    setTrigCh(value);
    const n = Number(value);
    if (Number.isInteger(n) && n >= 0 && n <= 511) sendDebounced(`REC:TRIGGER_CH=${n}`);
  };
  const changeSecs = (value: string) => {
    setStopSecs(value);
    const n = Number(value);
    if (Number.isInteger(n) && n >= 1 && n <= 999) sendDebounced(`REC:STOP_SECS=${n}`);
  };

  const mode = status?.mode ?? '';
  const isRecord = mode === 'record';
  const recording = status?.recording === '1';
  const elapsed = Number(status?.record_time ?? 0);
  const currentFile = status?.file?.trim() || t.table.unknown;

  return (
    <TabShell ip={ip}>
      {rebooting && <Notice kind="warn">{t.shared.rebooting}</Notice>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="flex flex-col gap-4">
          {/* Modo + estado */}
          <Section title={t.grabacion.state}>
            <div className="mb-3 flex items-center gap-3">
              <button
                type="button"
                className={`btn ${isRecord ? '' : 'btn-primary'}`}
                onClick={() => send('MODE:record')}
                disabled={isRecord}
              >
                <Disc size={15} />
                {isRecord ? t.grabacion.active : t.grabacion.activate}
              </button>
            </div>
            <dl className="grid grid-cols-3 gap-x-6 gap-y-1.5">
              <div className="flex items-baseline justify-between gap-2 border-b border-border pb-1">
                <dt className="text-xs text-muted">{t.grabacion.state}</dt>
                <dd className={`flex items-center gap-1.5 text-xs ${recording ? 'text-danger' : 'text-muted'}`}>
                  <span className={`h-2 w-2 rounded-full ${recording ? 'bg-danger animate-pulse' : 'bg-muted'}`} aria-hidden="true" />
                  {recording ? t.grabacion.recording : t.grabacion.idle}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-b border-border pb-1">
                <dt className="text-xs text-muted">{t.grabacion.elapsed}</dt>
                <dd className="font-mono text-xs">{formatElapsed(elapsed)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-b border-border pb-1">
                <dt className="text-xs text-muted">{t.grabacion.currentFile}</dt>
                <dd className="truncate font-mono text-xs">{currentFile}</dd>
              </div>
            </dl>
          </Section>

          {/* Controles */}
          <Section title={t.grabacion.controls}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => send('REC:START')}
                disabled={recording || !isRecord}
              >
                <Circle size={14} />
                {t.grabacion.start}
              </button>
              <button type="button" className="btn" onClick={() => send('REC:STOP')} disabled={!recording}>
                <Square size={14} />
                {t.grabacion.stop}
              </button>
              {startMode !== 0 && (
                <button type="button" className="btn" onClick={() => send('REC:ARM')} disabled={recording}>
                  <Disc size={14} />
                  {t.grabacion.arm}
                </button>
              )}
            </div>
          </Section>

          {/* FPS de grabación */}
          <Section title={t.grabacion.fps}>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field label={t.grabacion.fps} error={fpsError || undefined}>
                  <input
                    className={`input w-full font-mono ${fpsError ? '!border-danger' : ''}`}
                    inputMode="numeric"
                    value={fps.value ?? ''}
                    onChange={(e) => {
                      fps.set(e.target.value);
                      setFpsError('');
                    }}
                  />
                </Field>
              </div>
              <button type="button" className="btn btn-primary" onClick={applyFps} disabled={!fps.dirty}>
                {t.shared.apply}
              </button>
            </div>
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          {/* Trigger de inicio */}
          <Section title={t.grabacion.startTrigger}>
            <div className="flex flex-col gap-3">
              <Field label={t.grabacion.startTrigger}>
                <select
                  className="input w-full"
                  value={startMode}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setStartMode(n);
                    send(`REC:START_MODE=${n}`);
                  }}
                >
                  {t.grabacion.startModes.map((label, n) => (
                    <option key={label} value={n}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`${t.grabacion.universe} (0–255)`}>
                  <input
                    className="input w-full font-mono"
                    inputMode="numeric"
                    value={trigUniv}
                    onChange={(e) => changeUniv(e.target.value)}
                    disabled={startMode !== 2}
                  />
                </Field>
                <Field label={`${t.grabacion.channel} (0–511)`}>
                  <input
                    className="input w-full font-mono"
                    inputMode="numeric"
                    value={trigCh}
                    onChange={(e) => changeCh(e.target.value)}
                    disabled={startMode !== 2}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* Trigger de fin */}
          <Section title={t.grabacion.stopTrigger}>
            <div className="flex flex-col gap-3">
              <Field label={t.grabacion.stopTrigger}>
                <select
                  className="input w-full"
                  value={stopMode}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setStopMode(n);
                    send(`REC:STOP_MODE=${n}`);
                  }}
                >
                  {t.grabacion.stopModes.map((label, n) => (
                    <option key={label} value={n}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`${t.grabacion.seconds} (1–999)`}>
                <input
                  className="input w-full font-mono"
                  inputMode="numeric"
                  value={stopSecs}
                  onChange={(e) => changeSecs(e.target.value)}
                  disabled={stopMode !== 2}
                />
              </Field>
            </div>
          </Section>

          <Notice kind="info">{t.grabacion.volatileHint}</Notice>
        </div>
      </div>

      <ConfirmDialog
        open={confirmFps}
        title={t.grabacion.confirmFpsTitle}
        body={t.grabacion.confirmFpsBody}
        confirmLabel={t.shared.confirm}
        onConfirm={() => {
          send(`CONFIG:record_fps=${(fps.value ?? '').trim()}`);
          fps.markClean();
          start();
          setConfirmFps(false);
        }}
        onCancel={() => setConfirmFps(false)}
      />
    </TabShell>
  );
}
