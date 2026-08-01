import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { t } from '../i18n/es';
import { ipc, isTauri } from '../lib/ipc';
import { useAppStore, type ConnState, type TabId } from '../store/appStore';
import PlaceholderTab from './tabs/PlaceholderTab';
import ArtNetTab from './tabs/ArtNetTab';
import GeneralTab from './tabs/GeneralTab';
import LedsTab from './tabs/LedsTab';
import StatusTab from './tabs/StatusTab';
import TestTab from './tabs/TestTab';

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: t.device.tabs.general },
  { id: 'leds', label: t.device.tabs.leds },
  { id: 'artnet', label: t.device.tabs.artnet },
  { id: 'playback', label: t.device.tabs.playback },
  { id: 'grabacion', label: t.device.tabs.grabacion },
  { id: 'test', label: t.device.tabs.test },
  { id: 'estado', label: t.device.tabs.estado },
];

const CONN_STYLE: Record<ConnState, { dot: string; text: string; label: string }> = {
  disconnected: { dot: 'bg-muted', text: 'text-muted', label: t.device.conn.disconnected },
  connecting: { dot: 'bg-warn animate-pulse', text: 'text-warn', label: t.device.conn.connecting },
  connected: { dot: 'bg-ok', text: 'text-ok', label: t.device.conn.connected },
  lost: { dot: 'bg-danger animate-pulse', text: 'text-danger', label: t.device.conn.lost },
};

/** Vista de configuración de un dispositivo: vive en su propia ventana OS
 *  (estilo Advatek); el botón de cerrar cierra la ventana. */
export default function DeviceView({ ip }: { ip: string }) {
  const device = useAppStore((s) => s.devices[ip]);
  const conn = useAppStore((s) => s.connState[ip] ?? 'disconnected');
  const latency = useAppStore((s) => s.latency[ip]);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  // Ciclo de vida de la conexión: conectar al entrar, cerrar limpio al salir.
  // (El cierre de la ventana OS además desconecta desde Rust: es el camino
  // robusto cuando el webview se destruye sin desmontar React.)
  useEffect(() => {
    if (isTauri) void ipc.connect(ip);
    return () => {
      if (isTauri) void ipc.disconnect(ip);
    };
  }, [ip]);

  const closeWindow = () => {
    if (isTauri) void getCurrentWebviewWindow().close();
  };

  const style = CONN_STYLE[conn];
  const title = device?.nick?.trim() || device?.model?.trim() || ip;

  // Si la conexión no cuaja en 15 s, probablemente el firmware v1 tiene un
  // cliente zombie ocupando su único slot TCP (solo se libera reiniciando).
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    if (conn === 'connected' || conn === 'disconnected') {
      setStalled(false);
      return;
    }
    const timer = window.setTimeout(() => setStalled(true), 15000);
    return () => window.clearTimeout(timer);
  }, [conn]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Cabecera del dispositivo */}
      <div className="flex items-center gap-4 border-b border-border bg-panel px-4 py-2.5">
        <button type="button" className="btn" onClick={closeWindow}>
          <X size={16} />
          {t.device.close}
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
          <p className="font-mono text-xs text-muted">{ip}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {conn === 'connected' && latency !== undefined && (
            <span className="font-mono text-xs text-muted">{t.device.latency(latency)}</span>
          )}
          <span className={`flex items-center gap-2 text-sm ${style.text}`}>
            <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden="true" />
            {style.label}
          </span>
        </div>
      </div>

      {/* Aviso de posible cliente zombie (v1: un solo cliente TCP) */}
      {stalled && (
        <div className="border-b border-border bg-panel px-4 py-2 text-xs text-warn">
          {t.device.stalledHint}
        </div>
      )}

      {/* Tira de pestañas */}
      <div className="flex gap-1 border-b border-border bg-panel px-4 pt-2" role="tablist">        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t border-b-2 px-3 py-1.5 text-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
              activeTab === tab.id
                ? 'border-accent text-fg'
                : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de la pestaña */}
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {activeTab === 'general' ? (
          <GeneralTab ip={ip} />
        ) : activeTab === 'leds' ? (
          <LedsTab ip={ip} />
        ) : activeTab === 'artnet' ? (
          <ArtNetTab ip={ip} />
        ) : activeTab === 'test' ? (
          <TestTab ip={ip} />
        ) : activeTab === 'estado' ? (
          <StatusTab ip={ip} />
        ) : (
          <PlaceholderTab label={TABS.find((tab) => tab.id === activeTab)?.label ?? ''} />
        )}
      </div>
    </div>
  );
}
