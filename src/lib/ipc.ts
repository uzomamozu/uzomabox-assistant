import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useAppStore, type Adapter, type ConnState, type Device } from '../store/appStore';

/** True cuando la app corre dentro del webview de Tauri. */
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const ipc = {
  listAdapters: () => invoke<Adapter[]>('list_adapters'),
  discover: (adapterIp: string) => invoke<void>('discover', { adapterIp }),
  addManualDevice: (ip: string) => invoke<void>('add_manual_device', { ip }),
  connect: (ip: string) => invoke<void>('connect', { ip }),
  disconnect: (ip: string) => invoke<void>('disconnect', { ip }),
  sendCommand: (ip: string, command: string) => invoke<void>('send_command', { ip, command }),
  identify: (ip: string) => invoke<void>('identify', { ip }),
  listFiles: (ip: string) => invoke<string[]>('list_files', { ip }),
  openDeviceWindow: (ip: string, title: string) =>
    invoke<void>('open_device_window', { ip, title }),
};

let wired = false;

/**
 * Suscribe el store a los eventos del backend. Idempotente.
 * Con `ipFilter` (ventana de dispositivo) solo se procesan los eventos de esa
 * IP y se ignoran los de descubrimiento, que solo usa la ventana principal.
 */
export async function wireEvents(ipFilter?: string): Promise<void> {
  if (!isTauri || wired) return;
  wired = true;
  const s = () => useAppStore.getState();
  const forIp = <P extends { ip: string }>(handler: (payload: P) => void) => {
    return (e: { payload: P }) => {
      if (!ipFilter || e.payload.ip === ipFilter) handler(e.payload);
    };
  };

  try {
    if (!ipFilter) {
      await listen<Device>('device_found', (e) => s().deviceFound(e.payload));
      await listen<{ running: boolean; message: string }>('discovery_status', (e) =>
        s().setDiscovery(e.payload.running, e.payload.message),
      );
    }
    await listen<{ ip: string; state: ConnState }>(
      'connection_state',
      forIp((p) => s().setConnState(p.ip, p.state)),
    );
    await listen<{ ip: string; ms: number }>(
      'latency',
      forIp((p) => s().setLatency(p.ip, p.ms)),
    );
    await listen<{ ip: string; values: Record<string, string> }>(
      'status_update',
      forIp((p) => s().statusUpdate(p.ip, p.values)),
    );
    await listen<{ ip: string; dir: 'tx' | 'rx' | 'sys'; text: string; ts: number }>(
      'log_line',
      forIp((p) => s().logLine(p.ip, { dir: p.dir, text: p.text, ts: p.ts })),
    );
  } catch (err) {
    // Sin esto, un fallo de permisos deja la app muda (ver capabilities/default.json).
    console.error('[ipc] error registrando listeners de eventos:', err);
  }
}
