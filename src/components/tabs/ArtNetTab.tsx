import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { t } from '../../i18n';
import { useSyncedValue } from '../../lib/hooks';
import { ipc, isTauri } from '../../lib/ipc';
import { isValidDmxUniverse } from '../../lib/protocol';
import { useAppStore } from '../../store/appStore';
import { Field, Section, TabShell } from '../controls';

export default function ArtNetTab({ ip }: { ip: string }) {
  const status = useAppStore((s) => s.status[ip]);

  const mode = status?.mode ?? '';
  const artnetActive = status?.artnet_active === '1';
  const artnetFps = status?.artnet_fps ?? '0';
  const isArtnetMode = mode === 'artnet';
  // proto=2 llega en el STATUS de firmware v2 (ausente = v1): la salida
  // DMX512 solo existe en proto>=2 (mismo criterio que los patrones de test).
  const isV2 = Number(status?.proto ?? 1) >= 2;

  // --- Salida DMX512 (v2): habilitado y universo, sincronizados con STATUS ---
  const dmxEnabled = useSyncedValue(status?.dmx_enabled);
  const dmxUniverse = useSyncedValue(status?.dmx_universe);
  const [universeError, setUniverseError] = useState('');

  // Tras un toggle el campo queda dirty hasta que STATUS confirma el valor:
  // el poll periódico no hace rebotar el control mientras tanto.
  useEffect(() => {
    if (dmxEnabled.dirty && status?.dmx_enabled !== undefined && status.dmx_enabled === dmxEnabled.value) {
      dmxEnabled.markClean();
    }
  }, [dmxEnabled, status?.dmx_enabled]);

  const send = (cmd: string) => {
    if (isTauri) void ipc.sendCommand(ip, cmd).catch(() => undefined);
  };

  const activate = () => {
    send('MODE:artnet');
  };

  const toggleDmx = (enabled: boolean) => {
    dmxEnabled.set(enabled ? '1' : '0');
    send(`DMX:ENABLE=${enabled ? 1 : 0}`);
  };

  const universeRaw = (dmxUniverse.value ?? '').trim();
  // Validación en cliente: el dispositivo nunca recibe un valor fuera de rango.
  const universeValid = universeRaw !== '' && isValidDmxUniverse(Number(universeRaw));

  const applyUniverse = () => {
    if (!universeValid) {
      setUniverseError(t.dmx.universeInvalid);
      return;
    }
    setUniverseError('');
    send(`DMX:UNIVERSE=${Number(universeRaw)}`);
    dmxUniverse.markClean();
  };

  return (
    <TabShell ip={ip}>
      <div className={isV2 ? 'grid grid-cols-1 gap-4 md:grid-cols-2' : 'flex h-full items-center justify-center'}>
        <section className={`panel flex flex-col items-center gap-5 p-8 ${isV2 ? '' : 'w-[26rem] max-w-full'}`}>
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

        {/* Salida DMX512: solo visible con firmware proto>=2 */}
        {isV2 && (
          <Section title={t.dmx.title}>
            <div className="flex flex-col gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--color-accent)]"
                  checked={dmxEnabled.value === '1'}
                  onChange={(e) => toggleDmx(e.target.checked)}
                />
                {t.dmx.enable}
              </label>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field
                    label={t.dmx.universe}
                    error={universeError || undefined}
                    hint={universeError ? undefined : t.dmx.universeHint}
                  >
                    <input
                      className={`input w-full font-mono ${universeError ? '!border-danger' : ''}`}
                      inputMode="numeric"
                      value={dmxUniverse.value ?? ''}
                      onChange={(e) => {
                        dmxUniverse.set(e.target.value);
                        setUniverseError('');
                      }}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={applyUniverse}
                  disabled={!dmxUniverse.dirty || !universeValid}
                >
                  {t.shared.apply}
                </button>
              </div>
            </div>
          </Section>
        )}
      </div>
    </TabShell>
  );
}
