import { Radio } from 'lucide-react';
import { t } from '../../i18n';
import { ipc, isTauri } from '../../lib/ipc';
import { useAppStore } from '../../store/appStore';
import { TabShell } from '../controls';

export default function ArtNetTab({ ip }: { ip: string }) {
  const status = useAppStore((s) => s.status[ip]);

  const mode = status?.mode ?? '';
  const artnetActive = status?.artnet_active === '1';
  const artnetFps = status?.artnet_fps ?? '0';
  const isArtnetMode = mode === 'artnet';

  const activate = () => {
    if (isTauri) void ipc.sendCommand(ip, 'MODE:artnet').catch(() => undefined);
  };

  return (
    <TabShell ip={ip}>
      <div className="flex h-full items-center justify-center">
        <section className="panel flex w-[26rem] max-w-full flex-col items-center gap-5 p-8">
          <span className="text-xs text-muted">{status ? t.artnet.currentMode(mode) : '—'}</span>

          {/* Lectura FPS grande: artnet_fps es la tasa real (fps es un contador de arranque) */}
          <div className="flex flex-col items-center gap-1">
            <span
              className={`font-mono text-7xl font-semibold tabular-nums leading-none transition-colors duration-200 ${
                artnetActive ? 'text-accent' : 'text-muted'
              }`}
            >
              {artnetFps}
            </span>
            <span className="text-xs uppercase tracking-widest text-muted">{t.artnet.fpsLabel}</span>
          </div>

          <span className={`flex items-center gap-2 text-sm ${artnetActive ? 'text-ok' : 'text-muted'}`}>
            <span className={`h-2 w-2 rounded-full ${artnetActive ? 'bg-ok' : 'bg-muted'}`} aria-hidden="true" />
            {artnetActive ? t.artnet.receiving : t.artnet.idle}
          </span>

          <button
            type="button"
            className={`btn w-full justify-center py-2.5 ${isArtnetMode ? '' : 'btn-primary'}`}
            onClick={activate}
            disabled={isArtnetMode}
          >
            <Radio size={16} />
            {isArtnetMode ? t.artnet.active : t.artnet.activate}
          </button>
        </section>
      </div>
    </TabShell>
  );
}
