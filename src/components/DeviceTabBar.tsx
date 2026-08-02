import { X } from 'lucide-react';
import { t } from '../i18n';
import { useAppStore, type ConnState } from '../store/appStore';

const DOT: Record<ConnState, string> = {
  disconnected: 'bg-muted',
  connecting: 'bg-warn animate-pulse',
  connected: 'bg-ok',
  lost: 'bg-danger animate-pulse',
};

/** Tira de pestañas de dispositivo (la primera es siempre la tabla). */
export default function DeviceTabBar() {
  const openDevices = useAppStore((s) => s.openDevices);
  const activeView = useAppStore((s) => s.activeView);
  const devices = useAppStore((s) => s.devices);
  const connState = useAppStore((s) => s.connState);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const closeDevice = useAppStore((s) => s.closeDevice);

  const tabCls = (active: boolean) =>
    `flex items-center gap-1 rounded-t border-b-2 px-3 py-1.5 text-sm transition-colors duration-150 ${
      active ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'
    }`;

  return (
    <div className="flex items-end gap-1 overflow-x-auto border-b border-border bg-panel px-2 pt-1.5" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={activeView === 'devices'}
        className={tabCls(activeView === 'devices')}
        onClick={() => setActiveView('devices')}
      >
        {t.tabs.devices}
      </button>

      {openDevices.map((ip) => {
        const d = devices[ip];
        const label = d?.nick?.trim() || d?.model?.trim() || ip;
        const conn = connState[ip] ?? 'disconnected';
        return (
          <div
            key={ip}
            role="tab"
            aria-selected={activeView === ip}
            className={tabCls(activeView === ip)}
          >
            <button
              type="button"
              className="flex min-w-0 items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              onClick={() => setActiveView(ip)}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[conn]}`} aria-hidden="true" />
              <span className="max-w-40 truncate">{label}</span>
              <span className="hidden font-mono text-xs text-muted sm:inline">{ip}</span>
            </button>
            <button
              type="button"
              className="rounded p-0.5 text-muted transition-colors duration-150 hover:bg-bg hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              aria-label={`${t.device.close} ${label}`}
              onClick={() => closeDevice(ip)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
