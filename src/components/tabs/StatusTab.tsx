import { useEffect, useRef } from 'react';
import { Ban, LocateFixed } from 'lucide-react';
import { t } from '../../i18n/es';
import { ipc, isTauri } from '../../lib/ipc';
import { useAppStore } from '../../store/appStore';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

const DIR_STYLE: Record<'tx' | 'rx' | 'sys', { marker: string; className: string }> = {
  tx: { marker: '>>', className: 'text-accent' },
  rx: { marker: '<<', className: 'text-fg' },
  sys: { marker: '--', className: 'text-muted' },
};

export default function StatusTab({ ip }: { ip: string }) {
  const status = useAppStore((s) => s.status[ip]);
  const logs = useAppStore((s) => s.logs[ip] ?? []);
  const clearLog = useAppStore((s) => s.clearLog);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando llegan líneas nuevas.
  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  const entries = Object.entries(status ?? {}).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Cuadrícula de estado */}
      <section className="panel shrink-0 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{t.estado.title}</h2>
          <div className="flex items-center gap-2">
            <span className="max-w-64 text-right text-xs text-muted">{t.estado.identifyHint}</span>
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (isTauri) void ipc.sendCommand(ip, 'IDENTIFY').catch(() => undefined);
              }}
            >
              <LocateFixed size={16} />
              {t.estado.identify}
            </button>
          </div>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">{t.estado.noData}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-3 xl:grid-cols-4">
            {entries.map(([key, value]) => (
              <div key={key} className="flex items-baseline justify-between gap-2 border-b border-border pb-1">
                <dt className="truncate font-mono text-xs text-muted">{key}</dt>
                <dd className="truncate font-mono text-xs" title={value || '—'}>
                  {value || '—'}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Consola TX/RX */}
      <section className="panel flex min-h-0 flex-1 flex-col p-4">
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <h2 className="text-sm font-semibold">{t.estado.consoleTitle}</h2>
          <button type="button" className="btn" onClick={() => clearLog(ip)}>
            <Ban size={15} />
            {t.estado.clear}
          </button>
        </div>
        <div
          ref={consoleRef}
          className="min-h-40 flex-1 overflow-auto scroll-thin rounded border border-border bg-bg p-2 font-mono text-xs leading-5"
        >
          {logs.length === 0 ? (
            <p className="text-muted">{t.estado.consoleEmpty}</p>
          ) : (
            logs.map((line, i) => {
              const style = DIR_STYLE[line.dir];
              return (
                <div key={`${line.ts}-${i}`} className="whitespace-pre-wrap break-all">
                  <span className="text-muted">[{formatTime(line.ts)}] </span>
                  <span className={style.className}>
                    {style.marker} {line.text}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
