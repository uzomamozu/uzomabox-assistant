import { useState } from 'react';
import { Power } from 'lucide-react';
import { t } from '../../i18n/es';
import { useRebootWatch, useSyncedValue } from '../../lib/hooks';
import { ipc, isTauri } from '../../lib/ipc';
import { isValidIpv4, isValidMac } from '../../lib/protocol';
import { useAppStore } from '../../store/appStore';
import { ConfirmDialog, Field, Notice, Section, TabShell } from '../controls';

type ConfirmKind = 'ip' | 'mac' | 'restart' | null;

export default function RedTab({ ip }: { ip: string }) {
  const device = useAppStore((s) => s.devices[ip]);
  const status = useAppStore((s) => s.status[ip]);
  const setDeviceNick = useAppStore((s) => s.setDeviceNick);

  const nick = useSyncedValue(device?.nick);
  const staticIp = useSyncedValue(status?.ip);
  const [mac, setMac] = useState('');
  const [macDirty, setMacDirty] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [ipError, setIpError] = useState('');
  const [macError, setMacError] = useState('');
  const { rebooting, start } = useRebootWatch(ip);

  const send = (cmd: string) => {
    if (isTauri) void ipc.sendCommand(ip, cmd).catch(() => undefined);
  };

  const applyNickname = () => {
    const value = (nick.value ?? '').trim();
    if (!value) return;
    send(`CONFIG:nickname=${value}`);
    setDeviceNick(ip, value);
    nick.markClean();
  };

  const applyIp = () => {
    const value = (staticIp.value ?? '').trim();
    if (!isValidIpv4(value)) {
      setIpError(t.red.invalidIp);
      return;
    }
    setIpError('');
    setConfirm('ip');
  };

  const applyMac = () => {
    const value = mac.trim();
    if (!isValidMac(value)) {
      setMacError(t.red.invalidMac);
      return;
    }
    setMacError('');
    setConfirm('mac');
  };

  const handleConfirm = () => {
    if (confirm === 'ip') {
      send(`CONFIG:ip=${(staticIp.value ?? '').trim()}`);
      staticIp.markClean();
      start();
    } else if (confirm === 'mac') {
      send(`CONFIG:mac=${mac.trim()}`);
      start();
    } else if (confirm === 'restart') {
      // v1 no tiene REBOOT: reenviar record_fps fuerza el reinicio.
      send(`CONFIG:record_fps=${status?.record_fps ?? '30'}`);
      start();
    }
    setConfirm(null);
  };

  const info: [string, string][] = [
    [t.red.model, device?.model?.trim() || t.table.unknown],
    [t.red.firmware, device?.fw?.trim() || t.table.unknown],
    [t.red.currentIp, status?.ip ?? t.table.unknown],
    [t.red.outputs, status?.output_count ?? t.table.unknown],
    [t.red.temp, t.red.tempUnavailable],
  ];

  return (
    <TabShell ip={ip}>
      {rebooting && <Notice kind="warn">{t.shared.rebooting}</Notice>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title={t.red.identity}>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label={t.red.nickname}>
                <input
                  className="input w-full"
                  value={nick.value ?? ''}
                  onChange={(e) => nick.set(e.target.value)}
                />
              </Field>
            </div>
            <button type="button" className="btn btn-primary" onClick={applyNickname} disabled={!nick.dirty}>
              {t.shared.apply}
            </button>
          </div>
        </Section>

        <Section title={t.red.info}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-3">
            {info.map(([key, value]) => (
              <div key={key} className="flex items-baseline justify-between gap-2 border-b border-border pb-1">
                <dt className="text-xs text-muted">{key}</dt>
                <dd className="font-mono text-xs">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>

      <Section title={t.red.network}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label={t.red.staticIp} error={ipError || undefined}>
                <input
                  className={`input w-full font-mono ${ipError ? '!border-danger' : ''}`}
                  value={staticIp.value ?? ''}
                  onChange={(e) => {
                    staticIp.set(e.target.value);
                    setIpError('');
                  }}
                />
              </Field>
            </div>
            <button type="button" className="btn btn-primary" onClick={applyIp} disabled={!staticIp.dirty}>
              {t.shared.apply}
            </button>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label={t.red.mac} error={macError || undefined} hint={macError ? undefined : t.red.macBlindNote}>
                <input
                  className={`input w-full font-mono ${macError ? '!border-danger' : ''}`}
                  placeholder={t.red.macPlaceholder}
                  value={mac}
                  onChange={(e) => {
                    setMac(e.target.value);
                    setMacDirty(true);
                    setMacError('');
                  }}
                />
              </Field>
            </div>
            <button type="button" className="btn btn-primary" onClick={applyMac} disabled={!macDirty}>
              {t.shared.apply}
            </button>
          </div>
        </div>
      </Section>

      <Section title={t.red.maintenance}>
        <div className="flex items-center gap-3">
          <button type="button" className="btn !border-danger text-danger hover:!border-danger hover:text-danger" onClick={() => setConfirm('restart')}>
            <Power size={15} />
            {t.red.restart}
          </button>
          <span className="text-xs text-muted">{t.red.restartNote}</span>
        </div>
      </Section>

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm === 'ip'
            ? t.red.confirmIpTitle
            : confirm === 'mac'
              ? t.red.confirmMacTitle
              : t.red.confirmRestartTitle
        }
        body={
          confirm === 'ip'
            ? t.red.confirmIpBody
            : confirm === 'mac'
              ? t.red.confirmMacBody
              : t.red.confirmRestartBody
        }
        confirmLabel={t.shared.confirm}
        danger={confirm === 'restart'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </TabShell>
  );
}
